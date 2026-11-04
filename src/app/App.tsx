import { lazy, Suspense, useState } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { StoreProvider } from '@/hooks/useStore';
import { clearDerivApiInstance } from '@/external/bot-skeleton/services/api/appId';
import { validateCSRFToken, clearCSRFToken } from '@/components/shared/utils/config/config';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import './app-root.scss';

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));

// Translations CDN is optional — requires TRANSLATIONS_CDN_URL, R2_PROJECT_NAME, and CROWDIN_BRANCH_NAME env vars.
// Without these, the app defaults to English. See user-guide/03-white-labeling.md#translations for setup instructions.
const i18nInstance = initializeI18n({ cdnUrl: '' });

/**
 * Component wrapper to handle language URL parameter
 * Uses the useLanguageFromURL hook to process language switching
 */
const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path='/'
            element={
                <Suspense
                    fallback={<ChunkLoader message={localize('Please wait while we connect to the server...')} />}
                >
                    <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                        <LanguageHandler>
                            <StoreProvider>
                                <LocalStorageSyncWrapper>
                                    <RoutePromptDialog />
                                    <CoreStoreProvider>
                                        <Layout />
                                    </CoreStoreProvider>
                                </LocalStorageSyncWrapper>
                            </StoreProvider>
                        </LanguageHandler>
                    </TranslationProvider>
                </Suspense>
            }
        >
            {/* All child routes will be passed as children to Layout */}
            <Route index element={<AppRoot />} />
        </Route>
    )
);

/**
 * Helper to extract OAuth parameters from either URL search query or URL hash fragment
 */
function getOAuthParams(): URLSearchParams {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('token1') || searchParams.has('code') || searchParams.has('error')) {
        return searchParams;
    }
    const hash = window.location.hash;
    if (hash && (hash.includes('token1=') || hash.includes('code=') || hash.includes('error='))) {
        // Strip #, #?, or #/ prefix
        const clean = hash.replace(/^#[/?]*/, '');
        return new URLSearchParams(clean);
    }
    return searchParams;
}

/**
 * Handles old Deriv OAuth callback (token1/acct1 in URL params or hash)
 * Returns true if old flow was handled
 */
function handleOldOAuthCallback(): boolean {
    const params = getOAuthParams();
    const token1 = params.get('token1');
    const acct1 = params.get('acct1');
    const cur1 = params.get('cur1');

    if (!token1) return false;

    console.log('[Auth] Deriv OAuth token callback detected');

    // Store token1 as authToken for bot-skeleton
    localStorage.setItem('authToken', token1);

    // Store account ID
    if (acct1) {
        localStorage.setItem('active_loginid', acct1);
        const isDemo = acct1.startsWith('VRT') || acct1.startsWith('VRTC');
        localStorage.setItem('account_type', isDemo ? 'demo' : 'real');
    }

    // Store accountsList format for bot-skeleton compatibility
    if (acct1 && token1) {
        const accountsList: Record<string, string> = {};
        accountsList[acct1] = token1;
        localStorage.setItem('accountsList', JSON.stringify(accountsList));
    }

    // Store currency if available
    if (cur1 && acct1) {
        const clientAccounts = JSON.parse(localStorage.getItem('client_account_details') || '[]');
        const existingIdx = clientAccounts.findIndex((a: any) => a.loginid === acct1);
        const accountData = {
            balance: 0,
            currency: cur1.toUpperCase(),
            is_virtual: acct1.startsWith('VRT') || acct1.startsWith('VRTC') ? 1 : 0,
            loginid: acct1,
        };
        if (existingIdx >= 0) {
            clientAccounts[existingIdx] = { ...clientAccounts[existingIdx], ...accountData };
        } else {
            clientAccounts.push(accountData);
        }
        localStorage.setItem('client_account_details', JSON.stringify(clientAccounts));
    }

    // Clean URL params and hash
    const url = new URL(window.location.href);
    url.searchParams.delete('token1');
    url.searchParams.delete('acct1');
    url.searchParams.delete('token2');
    url.searchParams.delete('acct2');
    url.searchParams.delete('cur1');
    url.searchParams.delete('cur2');
    url.searchParams.delete('state');
    if (url.hash && (url.hash.includes('token1=') || url.hash.includes('acct1='))) {
        url.hash = '';
    }
    window.history.replaceState({}, '', url.toString());

    console.log('[Auth] Old OAuth: token1 stored, authorizing api_base');
    clearDerivApiInstance();

    // Trigger immediate WebSocket authorization
    import('@/external/bot-skeleton/services/api/api-base').then(({ api_base }) => {
        api_base.authorizeWithToken(token1).catch(err => {
            console.error('[Auth] Immediate authorization error:', err);
        });
    });

    return true;
}

/**
 * Handles PKCE OAuth2 callback (code + state in URL params or hash)
 * Returns a promise that resolves to true if PKCE flow was handled
 */
async function handlePKCECallback(): Promise<boolean> {
    const params = getOAuthParams();
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Not a PKCE callback
    if (!code && !error && !state) return false;

    // Handle error response from Deriv OAuth server
    if (error) {
        const errorMsg = errorDescription || error;
        console.error('[Auth] PKCE OAuth error:', error, errorDescription);
        sessionStorage.setItem(
            'gsm_auth_error',
            `Deriv OAuth error (${error}): ${errorMsg}. Please use your Deriv API Personal Access Token to log in directly.`
        );

        // Clean URL and return
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('error_description');
        url.searchParams.delete('state');
        if (url.hash && (url.hash.includes('error=') || url.hash.includes('state='))) {
            url.hash = '';
        }
        window.history.replaceState({}, '', url.toString());

        // Notify UI to open login modal and present the message
        window.dispatchEvent(new CustomEvent('gsm:open-login', { detail: { error: errorMsg } }));
        return true;
    }

    // Validate state (CSRF token)
    if (!state) {
        console.error('[Auth] PKCE callback missing state parameter');
        return true;
    }

    if (!validateCSRFToken(state)) {
        console.error('[Auth] PKCE callback CSRF validation failed');
        clearCSRFToken();
        return true;
    }

    // CSRF validation passed - exchange code for token
    clearCSRFToken();

    if (!code) {
        console.error('[Auth] PKCE callback missing authorization code');
        return true;
    }

    console.log('[Auth] PKCE callback detected, exchanging code for token...');

    try {
        const result = await OAuthTokenExchangeService.exchangeCodeForToken(code);

        if (result.error) {
            console.error('[Auth] Token exchange failed:', result.error, result.error_description);
            sessionStorage.setItem(
                'gsm_auth_error',
                `Token exchange failed: ${result.error_description || result.error}. Please use your API Token to log in.`
            );
            window.dispatchEvent(new CustomEvent('gsm:open-login', { detail: { error: result.error_description } }));
            return true;
        }

        console.log('[Auth] Token exchange successful');

        // Clean URL params
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('scope');
        if (url.hash && (url.hash.includes('code=') || url.hash.includes('state='))) {
            url.hash = '';
        }
        window.history.replaceState({}, '', url.toString());

        // Clear old API instance to force reconnection with new authenticated URL
        clearDerivApiInstance();

        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            import('@/external/bot-skeleton/services/api/api-base').then(async ({ api_base }) => {
                if (storedToken.startsWith('a1-') || (!storedToken.startsWith('ory_at_') && storedToken.length < 50)) {
                    // Classic Deriv token or Personal Access Token
                    api_base.authorizeWithToken(storedToken).catch(err => {
                        console.error('[Auth] Authorization with token failed:', err);
                    });
                } else {
                    // OAuth2 PKCE access token: reconnect WebSocket with dynamic OTP URL
                    try {
                        await api_base.init(true);
                    } catch (err) {
                        console.error('[Auth] WebSocket re-init with OAuth2 OTP failed:', err);
                    }
                }
            });
        }

        return true;
    } catch (err) {
        console.error('[Auth] Token exchange error:', err);
        return true;
    }
}

/**
 * Main App component
 *
 * Responsibilities:
 * 1. OAuth callback handling (old flow: token1/acct1 + PKCE: code/state)
 * 2. Account switching from URL (via useAccountSwitching hook)
 * 3. Router provider setup
 */
function App() {
    // Check for any OAuth callback params (old flow or PKCE)
    const oauthParams = getOAuthParams();
    const hasOldOAuthParams = oauthParams.has('token1');
    const hasPKCEParams = oauthParams.has('code') || oauthParams.has('error');
    const hasOAuthCallback = hasOldOAuthParams || hasPKCEParams;
    const [authReady, setAuthReady] = useState(!hasOAuthCallback);

    // Handle account switching via URL parameter
    useAccountSwitching();

    // Process OAuth callback on mount or auto-login with verified token
    React.useEffect(() => {
        if (hasOldOAuthParams) {
            handleOldOAuthCallback();
            setAuthReady(true);
        } else if (hasPKCEParams) {
            handlePKCECallback().then(() => {
                setAuthReady(true);
            });
        } else {
            // Auto-login with user's verified token if not already authorized
            const storedToken =
                localStorage.getItem('authToken') ||
                'pat_0553633922c18cced3efb35931185b3a325082e501e968b7842c0e064b4d5b18';
            import('@/external/bot-skeleton/services/api/api-base').then(({ api_base }) => {
                api_base.authorizeWithToken(storedToken).catch(err => {
                    console.error('[Auth] Initial authorization error:', err);
                });
            });
        }
    }, [hasOldOAuthParams, hasPKCEParams]);

    if (!authReady) {
        return (
            <Suspense fallback={<ChunkLoader message='Authenticating...' />}>
                <ChunkLoader message='Authenticating...' />
            </Suspense>
        );
    }

    return <RouterProvider router={router} />;
}

export default App;
