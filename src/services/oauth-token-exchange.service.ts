import { clearCodeVerifier, getCodeVerifier, getOAuthClientId, getOAuthRedirectURI, isProduction, OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI } from '@/components/shared';
import { isDemoAccount } from '@/utils/account-helpers';
import { ErrorLogger } from '@/utils/error-logger';
import brandConfig from '../../brand.config.json';

/**
 * Response from OAuth2 token exchange endpoint
 */
interface TokenExchangeResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

/**
 * Authentication information stored in sessionStorage
 */
interface AuthInfo {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number; // Timestamp when token expires
    scope?: string;
    refresh_token?: string;
}

/**
 * Service for handling OAuth2 token exchange operations
 */
export class OAuthTokenExchangeService {
    /**
     * Get the OAuth2 base URL
     * Always uses production auth.deriv.com for live and demo accounts
     * @returns OAuth2 base URL
     */
    private static getOAuth2BaseURL(): string {
        return brandConfig.platform.auth2_url.production || 'https://auth.deriv.com/oauth2/';
    }

    /**
     * Get stored authentication info from sessionStorage
     * @returns AuthInfo object or null if not found or expired
     */
    static getAuthInfo(): AuthInfo | null {
        try {
            const authInfoStr = sessionStorage.getItem('auth_info');
            if (!authInfoStr) {
                return null;
            }

            const authInfo: AuthInfo = JSON.parse(authInfoStr);

            // Check if token is expired
            if (authInfo.expires_at && Date.now() >= authInfo.expires_at) {
                this.clearAuthInfo();
                return null;
            }

            return authInfo;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error parsing auth_info', error);
            return null;
        }
    }

    /**
     * Clear authentication info from sessionStorage
     */
    static clearAuthInfo(): void {
        sessionStorage.removeItem('auth_info');
    }

    /**
     * Check if user is authenticated (has valid access token)
     * @returns true if authenticated with valid token
     */
    static isAuthenticated(): boolean {
        const authInfo = this.getAuthInfo();
        return authInfo !== null && !!authInfo.access_token;
    }

    /**
     * Get the current access token
     * @returns Access token string or null
     */
    static getAccessToken(): string | null {
        const authInfo = this.getAuthInfo();
        return authInfo?.access_token || null;
    }

    /**
     * Exchange authorization code for access token
     *
     * This method exchanges the authorization code received from OAuth callback
     * for an access token that can be used to authenticate API requests.
     *
     * @param code - The authorization code from OAuth callback
     * @returns Promise with token exchange response
     *
     * @example
     * ```typescript
     * const result = await OAuthTokenExchangeService.exchangeCodeForToken('ory_ac_...');
     * if (result.access_token) {
     *   // Store token in session storage
     *   sessionStorage.setItem('access_token', result.access_token);
     * }
     * ```
     */
    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        try {
            const baseURL = this.getOAuth2BaseURL();
            const tokenEndpoint = `${baseURL}token`;

            // Retrieve the PKCE code verifier from session storage
            const codeVerifier = getCodeVerifier();

            if (!codeVerifier) {
                ErrorLogger.error('OAuth', 'PKCE code verifier not found or expired');
                return {
                    error: 'invalid_request',
                    error_description:
                        'PKCE code verifier not found or expired. Please restart the authentication flow.',
                };
            }
            // Prepare the request body
            // OAuth2 token exchange with PKCE requires:
            // - grant_type: 'authorization_code'
            // - code: the authorization code
            // - redirect_uri: must match EXACTLY the one used in authorization request
            // - client_id: your OAuth2 client ID
            // - code_verifier: the PKCE code verifier (proves we initiated the auth flow)

            const clientId = sessionStorage.getItem('oauth_client_id') || localStorage.getItem('oauth_client_id') || getOAuthClientId();
            const redirectUri = sessionStorage.getItem('oauth_redirect_uri') || localStorage.getItem('oauth_redirect_uri') || getOAuthRedirectURI();

            if (!clientId) {
                ErrorLogger.error('OAuth', 'CLIENT_ID is not configured');
                return {
                    error: 'invalid_client',
                    error_description: 'CLIENT_ID is not configured.',
                };
            }

            const requestBody = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            });

            let data: Record<string, unknown> | null = null;
            try {
                const response = await fetch(tokenEndpoint, {
                    method: 'POST',
                    credentials: 'include', // Include cookies for session-based auth
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: requestBody.toString(),
                });
                data = (await response.json()) as Record<string, unknown>;
            } catch (directError) {
                // If direct browser fetch failed (e.g. CORS block from unwhitelisted origin), fallback to serverless backend proxy
                console.warn('[OAuth] Direct token exchange failed, falling back to /api/token-exchange proxy...', directError);
                try {
                    const proxyResponse = await fetch('/api/token-exchange', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            grant_type: 'authorization_code',
                            code,
                            client_id: clientId,
                            redirect_uri: redirectUri,
                            code_verifier: codeVerifier,
                        }),
                    });
                    data = (await proxyResponse.json()) as Record<string, unknown>;
                } catch (proxyError) {
                    throw directError;
                }
            }

            if (!data) {
                throw new Error('Failed to retrieve token response from Deriv');
            }

            // Check for errors in response
            if (data.error) {
                ErrorLogger.error('OAuth', `Token exchange error: ${data.error}`, {
                    error: data.error,
                    description: data.error_description,
                });
                return {
                    error: data.error as string,
                    error_description: data.error_description as string,
                };
            }

            let derivAccountId = (data.acct1 as string) || '';
            const derivToken = (data.token1 as string) || '';
            const accessToken = (data.access_token as string) || '';

            if (derivToken || accessToken) {
                // Clear code verifier and stored redirect parameters
                clearCodeVerifier();
                sessionStorage.removeItem('oauth_redirect_uri');
                sessionStorage.removeItem('oauth_client_id');
                try {
                    localStorage.removeItem('oauth_redirect_uri');
                    localStorage.removeItem('oauth_client_id');
                } catch (_) { }

                const tokenToUse = accessToken || derivToken;
                const authInfo = {
                    access_token: tokenToUse,
                    deriv_token: derivToken,
                    token_type: (data.token_type as string) || 'bearer',
                    expires_in: (data.expires_in as number) || 3600,
                    expires_at: Date.now() + ((data.expires_in as number) || 3600) * 1000,
                    scope: (data.scope as string) || 'trade',
                    refresh_token: (data.refresh_token as string) || '',
                };

                const authInfoStr = JSON.stringify(authInfo);
                sessionStorage.setItem('auth_info', authInfoStr);
                try {
                    localStorage.setItem('auth_info', authInfoStr);
                } catch (_) { }

                // Store in localStorage for bot-skeleton compatibility
                localStorage.setItem('authToken', tokenToUse);

                try {
                    const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
                    const accounts = await DerivWSAccountsService.fetchAccountsList(tokenToUse);
                    if (!accounts || accounts.length === 0) {
                        ErrorLogger.error('OAuth', 'No accounts returned after token exchange');
                        this.clearAuthInfo();
                        return {
                            error: 'no_accounts',
                            error_description: 'No accounts available after successful authentication',
                        };
                    }

                    DerivWSAccountsService.storeAccounts(accounts);
                    const defaultAccount = accounts[0];
                    derivAccountId = defaultAccount.account_id;
                    localStorage.setItem('active_loginid', defaultAccount.account_id);
                    const isDemo = isDemoAccount(defaultAccount.account_id);
                    localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

                    const accountsList: Record<string, string> = {};
                    accounts.forEach(acc => {
                        accountsList[acc.account_id] = tokenToUse;
                    });
                    localStorage.setItem('accountsList', JSON.stringify(accountsList));

                    ErrorLogger.info('OAuth', 'Accounts fetched and stored', { loginid: defaultAccount.account_id });

                    try {
                        await this.initializeAuthenticatedConnection();
                    } catch (initErr) {
                        ErrorLogger.error('OAuth', 'WebSocket initialization will continue in background', initErr);
                    }
                } catch (accErr) {
                    ErrorLogger.error('OAuth', 'Error fetching accounts after token exchange', accErr);
                }

                ErrorLogger.info('OAuth', 'Token exchange successful', {
                    has_token1: !!derivToken,
                    has_access_token: !!accessToken,
                    account_id: derivAccountId,
                });
            }

            return data as unknown as TokenExchangeResponse;
        } catch (error: unknown) {
            ErrorLogger.error('OAuth', 'Token exchange network or parsing error', error);
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Initializes the authenticated WebSocket connection with retries
     * Matching the exact pattern in production live_index.js
     */
    static async initializeAuthenticatedConnection(): Promise<void> {
        const { api_base } = await import('@/external/bot-skeleton/services/api/api-base');
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await api_base.init(true);
                return;
            } catch (err) {
                ErrorLogger.error('OAuth', `WebSocket initialization attempt ${attempt} failed`, err);
                if (attempt === 3) throw err;
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
            }
        }
    }

    /**
     * Refresh access token using refresh token
     *
     * @param refreshToken - The refresh token
     * @returns Promise with token refresh response
     */
    static async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResponse> {
        try {
            const baseURL = this.getOAuth2BaseURL();
            const tokenEndpoint = `${baseURL}token`;

            const requestBody = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            });

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: requestBody.toString(),
            });

            const data: TokenExchangeResponse = await response.json();

            if (data.error) {
                ErrorLogger.error('OAuth', `Token refresh error: ${data.error}`, {
                    error: data.error,
                    description: data.error_description,
                });
                return {
                    error: data.error,
                    error_description: data.error_description,
                };
            }

            if (data.access_token) {
                // Update authentication info in sessionStorage
                const authInfo: AuthInfo = {
                    access_token: data.access_token,
                    token_type: data.token_type || 'bearer',
                    expires_in: data.expires_in || 3600,
                    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
                    scope: data.scope,
                };

                // Include refresh token if provided (or keep existing one)
                if (data.refresh_token) {
                    authInfo.refresh_token = data.refresh_token;
                } else {
                    // Keep the existing refresh token if new one not provided
                    const existingAuth = this.getAuthInfo();
                    if (existingAuth?.refresh_token) {
                        authInfo.refresh_token = existingAuth.refresh_token;
                    }
                }

                // Store updated auth info
                sessionStorage.setItem('auth_info', JSON.stringify(authInfo));
            }

            return data;
        } catch (error: unknown) {
            ErrorLogger.error('OAuth', 'Token refresh error', error);
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
