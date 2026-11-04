/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, getAccountType, isDemoAccount, removeUrlParameter } from '@/utils/account-helpers';
/* [/AI] */
import CommonStore from '@/stores/common-store';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { TAuthData } from '@/types/api-types';
import { clearAuthData } from '@/utils/auth-utils';
import { handleBackendError, isBackendError } from '@/utils/error-handler';
import { activeSymbolsProcessorService } from '../../../../services/active-symbols-processor.service';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import {
    CONNECTION_STATUS,
    setAccountList,
    setAuthData,
    setConnectionStatus,
    setIsAuthorized,
    setIsAuthorizing,
} from './observables/connection-status-stream';
import ApiHelpers from './api-helpers';
import { generateDerivApiInstance, V2GetActiveAccountId } from './appId';
import chart_api from './chart-api';

type CurrentSubscription = {
    id: string;
    unsubscribe: () => void;
};

type SubscriptionPromise = Promise<{
    subscription: CurrentSubscription;
}>;

type TApiBaseApi = {
    connection: {
        readyState: keyof typeof socket_state;
        addEventListener: (event: string, callback: () => void) => void;
        removeEventListener: (event: string, callback: () => void) => void;
    };
    send: (data: unknown) => void;
    disconnect: () => void;
    authorize: (token: string) => Promise<{ authorize: TAuthData; error: unknown }>;

    onMessage: () => {
        subscribe: (callback: (message: unknown) => void) => {
            unsubscribe: () => void;
        };
    };
} & ReturnType<typeof generateDerivApiInstance>;

class APIBase {
    api: TApiBaseApi | null = null;
    token: string = '';
    account_id: string = '';
    pip_sizes = {};
    account_info = {};
    is_running = false;
    subscriptions: CurrentSubscription[] = [];
    time_interval: ReturnType<typeof setInterval> | null = null;
    has_active_symbols = false;
    is_stopping = false;
    active_symbols: any[] = [];
    current_auth_subscriptions: SubscriptionPromise[] = [];
    is_authorized = false;
    active_symbols_promise: Promise<any[] | undefined> | null = null;
    common_store: CommonStore | undefined;
    reconnection_attempts: number = 0;

    // Constants for timeouts - extracted magic numbers for better maintainability
    private readonly ACTIVE_SYMBOLS_TIMEOUT_MS = 10000; // 10 seconds
    private readonly ENRICHMENT_TIMEOUT_MS = 10000; // 10 seconds
    private readonly MAX_RECONNECTION_ATTEMPTS = 5; // Maximum number of reconnection attempts before session reset

    unsubscribeAllSubscriptions = () => {
        this.current_auth_subscriptions?.forEach(subscription_promise => {
            subscription_promise.then(({ subscription }) => {
                if (subscription?.id) {
                    this.api?.send({
                        forget: subscription.id,
                    });
                }
            });
        });
        this.current_auth_subscriptions = [];
    };

    onsocketopen() {
        setConnectionStatus(CONNECTION_STATUS.OPENED);

        // Reset reconnection attempts on successful connection
        this.reconnection_attempts = 0;

        const currentClientStore = globalObserver.getState('client.store');
        if (currentClientStore) {
            currentClientStore.setIsAccountRegenerating(false);
        }

        this.handleTokenExchangeIfNeeded();
    }

    private async handleTokenExchangeIfNeeded() {
        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        const accountType = urlParams.get('account_type');

        if (account_id) {
            localStorage.setItem('active_loginid', account_id);
            // Remove account_id from URL after storing
            removeUrlParameter('account_id');
        }
        if (accountType) {
            localStorage.setItem('account_type', accountType);
            // Remove account_type from URL after storing
            removeUrlParameter('account_type');
        }

        // Check if we have an account_id from URL or localStorage
        let activeAccountId: string | null = getAccountId();
        const authToken = localStorage.getItem('authToken');

        // If no account_id in localStorage, check sessionStorage for accounts
        if (!activeAccountId) {
            try {
                const storedAccounts = sessionStorage.getItem('deriv_accounts');
                if (storedAccounts) {
                    const accounts = JSON.parse(storedAccounts);
                    if (accounts && accounts.length > 0 && accounts[0].account_id) {
                        // Use the first account as default
                        const accountId = accounts[0].account_id as string;
                        activeAccountId = accountId;
                        localStorage.setItem('active_loginid', accountId);

                        // Set account type based on account_id prefix
                        const isDemo = accountId.startsWith('VRT') || accountId.startsWith('VRTC');
                        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');
                    }
                }
            } catch (error) {
                console.error('[APIBase] Error reading accounts from sessionStorage:', error);
            }
        }

        // Now proceed with normal authorization if we have an account_id or authToken
        if (activeAccountId || authToken) {
            setIsAuthorizing(true);
            await this.authorizeAndSubscribe();
        }
    }

    onsocketclose() {
        setConnectionStatus(CONNECTION_STATUS.CLOSED);
        this.reconnectIfNotConnected();
    }

    async init(force_create_connection = false) {
        this.toggleRunButton(true);

        if (this.api) {
            this.unsubscribeAllSubscriptions();
        }

        // Reset reconnection attempts counter on successful connection initialization
        if (!force_create_connection) {
            this.reconnection_attempts = 0;
        }

        if (!this.api || this.api?.connection.readyState !== 1 || force_create_connection) {
            if (this.api?.connection) {
                ApiHelpers.disposeInstance();
                setConnectionStatus(CONNECTION_STATUS.CLOSED);
                this.api.disconnect();
                this.api.connection.removeEventListener('open', this.onsocketopen.bind(this));
                this.api.connection.removeEventListener('close', this.onsocketclose.bind(this));
            }

            this.api = await generateDerivApiInstance();

            this.api?.connection.addEventListener('open', this.onsocketopen.bind(this));
            this.api?.connection.addEventListener('close', this.onsocketclose.bind(this));

            // Store the current account ID used for this WebSocket connection
            // This will be used to check if we need to regenerate the connection when the tab becomes active
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore) {
                const active_login_id = getAccountId();
                if (active_login_id) {
                    currentClientStore.setWebSocketLoginId(active_login_id);
                }
            }
        }

        const hasAccountID = V2GetActiveAccountId();

        if (!this.has_active_symbols && !hasAccountID) {
            this.active_symbols_promise = this.getActiveSymbols()
                .then(() => undefined)
                .catch(err => {
                    console.warn('[APIBase] Active symbols initial fetch error (non-fatal):', err);
                    return undefined;
                });
        }

        this.initEventListeners();

        if (this.time_interval) clearInterval(this.time_interval);
        this.time_interval = null;

        chart_api.init(force_create_connection);
    }

    getConnectionStatus() {
        if (this.api?.connection) {
            const ready_state = this.api.connection.readyState;
            return socket_state[ready_state as keyof typeof socket_state] || 'Unknown';
        }
        return 'Socket not initialized';
    }

    terminate() {
        // eslint-disable-next-line no-console
        if (this.api) this.api.disconnect();
    }

    initEventListeners() {
        if (window) {
            window.addEventListener('online', this.reconnectIfNotConnected);
            window.addEventListener('focus', this.reconnectIfNotConnected);
        }
    }

    async createNewInstance(account_id: string) {
        if (this.account_id !== account_id) {
            await this.init();
        }
    }

    reconnectIfNotConnected = () => {
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            this.reconnection_attempts += 1;

            if (this.reconnection_attempts >= this.MAX_RECONNECTION_ATTEMPTS) {
                // Reset reconnection counter
                this.reconnection_attempts = 0;

                // Properly handle logout through the API
                setIsAuthorized(false);
                setAccountList([]);
                setAuthData(null);

                // Clear necessary storage items
                localStorage.removeItem('active_loginid');
                localStorage.removeItem('account_type');
                localStorage.removeItem('accountsList');
                localStorage.removeItem('clientAccounts');
            }

            this.init(true);
        }
    };

    async authorizeAndSubscribe() {
        if (!this.api) return;

        this.account_id = getAccountId() || '';
        setIsAuthorizing(true);

        try {
            // Send authorize with token from localStorage before calling balance
            const authToken = localStorage.getItem('authToken');
            let authorizedData: any = null;
            if (authToken) {
                try {
                    const authResult = await this.api.authorize(authToken);
                    if (authResult?.error) {
                        console.error('[APIBase] Authorize error:', JSON.stringify(authResult.error));
                    } else if (authResult?.authorize) {
                        authorizedData = authResult.authorize;
                    }
                } catch (authErr) {
                    console.error('[APIBase] Authorize call failed:', authErr);
                }
            }

            let balanceData: any = null;
            try {
                const { balance, error } = await this.api.balance();
                if (!error && balance) {
                    balanceData = balance;
                }
            } catch (err) {
                console.warn('[APIBase] Optional balance call error:', err);
            }

            // Derive active account details from either balance or authorize response
            const currentLoginid = balanceData?.loginid || authorizedData?.loginid || this.account_id;
            const currentBalance = typeof balanceData?.balance === 'number'
                ? balanceData.balance
                : typeof authorizedData?.balance === 'number'
                  ? authorizedData.balance
                  : 0;
            const currentCurrency = balanceData?.currency || authorizedData?.currency || 'USD';
            const account_type = getAccountType(currentLoginid);
            const is_virtual = authorizedData?.is_virtual ?? (account_type === 'real' ? 0 : 1);

            const currentAccount = currentLoginid
                ? {
                      balance: currentBalance,
                      currency: currentCurrency,
                      is_virtual: is_virtual ? 1 : 0,
                      loginid: currentLoginid,
                  }
                : null;

            // Build full account list from stored accounts or direct authorize account list
            const storedAccounts = DerivWSAccountsService.getStoredAccounts();
            let accountList: any[] = [];
            if (storedAccounts && storedAccounts.length > 0) {
                accountList = storedAccounts
                    .filter(a => !a.status || a.status === 'active')
                    .map(a => ({
                        balance: parseFloat(a.balance) || 0,
                        currency: a.currency || 'USD',
                        is_virtual: a.account_type === 'demo' ? 1 : 0,
                        loginid: a.account_id,
                    }));
            } else if (Array.isArray(authorizedData?.account_list) && authorizedData.account_list.length > 0) {
                accountList = authorizedData.account_list.map((a: any) => ({
                    balance: a.loginid === currentLoginid ? currentBalance : 0,
                    currency: a.currency || 'USD',
                    is_virtual: a.is_virtual ?? (a.loginid.startsWith('VRT') ? 1 : 0),
                    loginid: a.loginid,
                }));
            } else if (currentAccount) {
                accountList = [currentAccount];
            }

            setAccountList(accountList); // Observable stream
            setAuthData({
                balance: currentBalance,
                currency: currentCurrency,
                loginid: currentLoginid,
                is_virtual: is_virtual ? 1 : 0,
                account_list: accountList,
            });

            if (is_virtual) {
                localStorage.setItem('account_type', 'demo');
            } else {
                localStorage.setItem('account_type', 'real');
            }

            globalObserver.emit('api.authorize', {
                account_list: accountList,
                current_account: {
                    loginid: currentLoginid,
                    currency: currentCurrency,
                    is_virtual: is_virtual ? 1 : 0,
                    balance: currentBalance,
                },
            });

            // Update the WebSocket login ID in the client store
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore && currentLoginid) {
                currentClientStore.setWebSocketLoginId(currentLoginid);
                currentClientStore.setLoginId(currentLoginid);
                currentClientStore.setCurrency(currentCurrency);
                currentClientStore.setBalance(currentBalance.toString());
                currentClientStore.setIsLoggedIn(true);
            }

            setIsAuthorized(true);
            this.is_authorized = true;
            this.account_info = {
                balance: currentBalance,
                currency: currentCurrency,
                loginid: currentLoginid,
            };
            this.token = currentLoginid;

            localStorage.setItem('client_account_details', JSON.stringify(accountList));
            localStorage.setItem('client.country', authorizedData?.country || balanceData?.country || '');

            if (currentLoginid) {
                localStorage.setItem('active_loginid', currentLoginid);
            }

            if (authToken) {
                const accountsMap: Record<string, string> = {};
                accountList.forEach((acc: any) => {
                    accountsMap[acc.loginid] = authToken;
                });
                localStorage.setItem('accountsList', JSON.stringify(accountsMap));
            }

            if (this.has_active_symbols) {
                this.toggleRunButton(false);
            } else {
                this.active_symbols_promise = this.getActiveSymbols();
            }
            this.subscribe();
        } catch (e) {
            this.is_authorized = false;
            clearAuthData();
            setIsAuthorized(false);
            globalObserver.emit('Error', e);
        } finally {
            setIsAuthorizing(false);
        }
    }

    /**
     * Authorizes directly with a Deriv API Token (e.g. pat_... or classic token)
     */
    async authorizeWithToken(token: string): Promise<{ success: boolean; error?: string; loginid?: string; balance?: number; currency?: string }> {
        if (!token || typeof token !== 'string') {
            return { success: false, error: 'Token is required' };
        }
        const trimmed = token.trim();
        setIsAuthorizing(true);
        try {
            localStorage.setItem('authToken', trimmed);

            if (trimmed.startsWith('pat_') || trimmed.startsWith('ory_at_')) {
                // Modern Deriv Bearer / Personal Access Token flow
                const authInfo = {
                    access_token: trimmed,
                    token_type: 'bearer',
                    created_at: Date.now(),
                };
                sessionStorage.setItem('auth_info', JSON.stringify(authInfo));
                localStorage.setItem('auth_info', JSON.stringify(authInfo));

                const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
                const accounts = await DerivWSAccountsService.fetchAccountsList(trimmed);
                if (!accounts || accounts.length === 0) {
                    setIsAuthorizing(false);
                    return { success: false, error: 'No Deriv trading accounts found for this token.' };
                }

                // Prefer demo account or current selection, fallback to first account
                const existingLoginId = localStorage.getItem('active_loginid');
                const targetAccount =
                    (existingLoginId && accounts.find(a => a.account_id === existingLoginId)) ||
                    accounts.find(a => a.account_type === 'demo') ||
                    accounts[0];

                const activeLoginId = targetAccount.account_id;
                localStorage.setItem('active_loginid', activeLoginId);
                sessionStorage.setItem('active_loginid', activeLoginId);
                localStorage.setItem('account_type', targetAccount.account_type);

                // Build client.accounts mapping for header switcher
                const clientAccounts: Record<string, any> = {};
                accounts.forEach(acc => {
                    clientAccounts[acc.account_id] = {
                        token: trimmed,
                        currency: acc.currency,
                        is_virtual: acc.account_type === 'demo' ? 1 : 0,
                        balance: acc.balance,
                        session_token: trimmed,
                    };
                });
                localStorage.setItem('client.accounts', JSON.stringify(clientAccounts));

                // Initialize socket with OTP url
                await this.init(true);

                setIsAuthorizing(false);
                this.account_info = {
                    loginid: targetAccount.account_id,
                    balance: parseFloat(targetAccount.balance) || 0,
                    currency: targetAccount.currency,
                    email: '',
                    fullname: targetAccount.account_id,
                    is_virtual: targetAccount.account_type === 'demo' ? 1 : 0,
                };

                return {
                    success: true,
                    loginid: targetAccount.account_id,
                    balance: parseFloat(targetAccount.balance) || 0,
                    currency: targetAccount.currency,
                };
            }

            // Legacy token flow
            if (!this.api || this.api.connection?.readyState !== 1) {
                await this.init(true);
            }
            if (!this.api) {
                throw new Error('WebSocket connection could not be established');
            }
            const authResult = await this.api.authorize(trimmed);
            if (authResult?.error) {
                const errMsg = (authResult.error as any).message || 'Invalid Deriv API token';
                setIsAuthorizing(false);
                return { success: false, error: errMsg };
            }
            await this.authorizeAndSubscribe();
            return {
                success: true,
                loginid: this.account_info?.loginid || (authResult?.authorize as any)?.loginid,
                balance: this.account_info?.balance,
                currency: this.account_info?.currency,
            };
        } catch (err: any) {
            console.error('[APIBase] authorizeWithToken failed:', err);
            setIsAuthorizing(false);
            return { success: false, error: err?.message || 'Authorization failed' };
        }
    }

    async subscribe() {
        const subscribeToStream = (streamName: string) => {
            return doUntilDone(
                () => {
                    const subscription = this.api?.send({
                        [streamName]: 1,
                        subscribe: 1,
                    });

                    if (subscription) {
                        this.current_auth_subscriptions.push(subscription);
                    }
                    return subscription;
                },
                [],
                this
            );
        };

        const streamsToSubscribe = ['balance', 'transaction', 'proposal_open_contract'];

        await Promise.all(streamsToSubscribe.map(subscribeToStream));
    }

    getActiveSymbols = async () => {
        if (!this.api) {
            throw new Error('API connection not available for fetching active symbols');
        }

        try {
            // Add timeout to prevent hanging
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Active symbols fetch timeout')), this.ACTIVE_SYMBOLS_TIMEOUT_MS)
            );

            const activeSymbolsPromise = doUntilDone(() => this.api?.send({ active_symbols: 'brief' }), [], this);

            const apiResult = await Promise.race([activeSymbolsPromise, timeout]);

            const { active_symbols = [], error = {} } = apiResult as any;

            if (error && Object.keys(error).length > 0) {
                throw new Error(`Active symbols API error: ${error.message || 'Unknown error'}`);
            }

            if (!active_symbols.length) {
                throw new Error('No active symbols received from API');
            }

            this.has_active_symbols = true;

            // Process active symbols using the dedicated service with fallback
            try {
                const enrichmentTimeout = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Enrichment timeout')), this.ENRICHMENT_TIMEOUT_MS)
                );

                const enrichmentPromise = activeSymbolsProcessorService.processActiveSymbols(active_symbols);
                const processedResult = await Promise.race([enrichmentPromise, enrichmentTimeout]);

                this.active_symbols = processedResult.enrichedSymbols;
                this.pip_sizes = processedResult.pipSizes;
            } catch (enrichmentError) {
                console.warn('Symbol enrichment failed, using raw symbols:', enrichmentError);
                // Fallback to raw symbols if enrichment fails
                this.active_symbols = active_symbols;
                this.pip_sizes = {};
            }

            this.toggleRunButton(false);
            return this.active_symbols;
        } catch (error) {
            console.error('Failed to fetch and process active symbols:', error);
            throw error;
        }
    };

    toggleRunButton = (toggle: boolean) => {
        const run_button = document.querySelector('#db-animation__run-button');
        if (!run_button) return;
        (run_button as HTMLButtonElement).disabled = toggle;
    };

    setIsRunning(toggle = false) {
        this.is_running = toggle;
    }

    pushSubscription(subscription: CurrentSubscription) {
        this.subscriptions.push(subscription);
    }

    clearSubscriptions() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        // Resetting timeout resolvers
        const global_timeouts = globalObserver.getState('global_timeouts') ?? [];

        global_timeouts.forEach((_: unknown, i: number) => {
            clearTimeout(i);
        });
    }
}

export const api_base = new APIBase();
