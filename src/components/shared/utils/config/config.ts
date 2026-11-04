import brandConfig from '../../../../../brand.config.json';

// =============================================================================
// Constants - Domain & Server Configuration (from brand.config.json)
// =============================================================================

// Production app domains
export const PRODUCTION_DOMAINS = {
    COM: brandConfig.platform.hostname.production.com,
    SITE: brandConfig.platform.hostname.production.site || 'goldstandardmarket.site',
} as const;

// Staging app domains
export const STAGING_DOMAINS = {
    COM: brandConfig.platform.hostname.staging.com,
    SITE: brandConfig.platform.hostname.staging.site || 'goldstandardmarket.site',
} as const;

// Deriv OAuth2 PKCE configuration
// Registered at developers.deriv.com for goldstandardmarket-ai.vercel.app
export const VERCEL_OAUTH_CLIENT_ID = '34RKJmAi7xzHJnsMVB9YW';
export const VERCEL_OAUTH_APP_ID = '34RKJmAi7xzHJnsMVB9YW';
export const VERCEL_OAUTH_REDIRECT_URI = 'https://goldstandardmarket-ai.vercel.app';

// Registered at developers.deriv.com for goldstandardmarket.site
export const OAUTH_CLIENT_ID = '33ePrEQqvzFWwWfNncfoc';
export const OAUTH_APP_ID = '34469NlqBQq22EiKHEtRR';
export const OAUTH_REDIRECT_URI = 'https://goldstandardmarket.site';
export const WS_APP_ID = 342;

export const WS_SERVERS = {
    STAGING: `wss://ws.derivws.com/websockets/v3?app_id=${WS_APP_ID}`,
    PRODUCTION: `wss://ws.derivws.com/websockets/v3?app_id=${WS_APP_ID}`,
} as const;

/**
 * Returns active OAuth Client ID with runtime localStorage, env override, and domain matching
 */
export const getOAuthClientId = (): string => {
    const custom = localStorage.getItem('deriv_oauth_client_id');
    if (custom && custom.trim().length > 0) return custom.trim();
    if (typeof process !== 'undefined' && process.env?.VITE_DERIV_OAUTH_CLIENT_ID) {
        return process.env.VITE_DERIV_OAUTH_CLIENT_ID;
    }
    if (typeof process !== 'undefined' && process.env?.CLIENT_ID) {
        return process.env.CLIENT_ID;
    }
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        return VERCEL_OAUTH_CLIENT_ID;
    }
    return OAUTH_CLIENT_ID;
};

/**
 * Returns active Deriv App ID with runtime localStorage, env override, and domain matching
 */
export const getOAuthAppId = (): string => {
    const custom = localStorage.getItem('deriv_app_id');
    if (custom && custom.trim().length > 0) return custom.trim();
    if (typeof process !== 'undefined' && process.env?.VITE_DERIV_APP_ID) {
        return process.env.VITE_DERIV_APP_ID;
    }
    if (typeof process !== 'undefined' && process.env?.APP_ID) {
        return process.env.APP_ID;
    }
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        return VERCEL_OAUTH_APP_ID;
    }
    return OAUTH_APP_ID;
};

/**
 * Returns active Redirect URI matching registered Deriv developer portal configuration
 */
export const getOAuthRedirectURI = (): string => {
    const custom = localStorage.getItem('deriv_redirect_uri');
    if (custom && custom.trim().length > 0) {
        return custom.trim().replace(/\/+$/, '');
    }
    if (typeof process !== 'undefined' && process.env?.VITE_DERIV_REDIRECT_URI) {
        return process.env.VITE_DERIV_REDIRECT_URI.trim().replace(/\/+$/, '');
    }
    if (typeof process !== 'undefined' && process.env?.REDIRECT_URI) {
        return process.env.REDIRECT_URI.trim().replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const origin = window.location.origin.replace(/\/+$/, '');

        // Production site domain
        if (hostname.endsWith('goldstandardmarket.site')) {
            return OAUTH_REDIRECT_URI.replace(/\/+$/, '');
        }

        // Match for Vercel deployment domain
        if (hostname.includes('vercel.app')) {
            return VERCEL_OAUTH_REDIRECT_URI.replace(/\/+$/, '');
        }

        // For any active Vercel deployment (e.g. goldstandardmarket-ai.vercel.app) or custom domain,
        // use the actual active origin so it exactly matches whatever domain is registered on Deriv
        return origin;
    }
    return OAUTH_REDIRECT_URI.replace(/\/+$/, '');
};

/**
 * Configures custom Deriv App ID / Client ID in local storage
 */
export const setCustomOAuthCredentials = (clientId?: string, appId?: number | string, redirectUri?: string) => {
    if (clientId !== undefined) {
        if (clientId) localStorage.setItem('deriv_oauth_client_id', clientId.trim());
        else localStorage.removeItem('deriv_oauth_client_id');
    }
    if (appId !== undefined) {
        if (appId) localStorage.setItem('deriv_app_id', String(appId).trim());
        else localStorage.removeItem('deriv_app_id');
    }
    if (redirectUri !== undefined) {
        if (redirectUri) localStorage.setItem('deriv_redirect_uri', redirectUri.trim());
        else localStorage.removeItem('deriv_redirect_uri');
    }
};

/**
 * Resets OAuth credentials to official defaults
 */
export const resetOAuthCredentials = () => {
    localStorage.removeItem('deriv_oauth_client_id');
    localStorage.removeItem('deriv_app_id');
    localStorage.removeItem('deriv_redirect_uri');
};



// =============================================================================
// Helper Functions
// =============================================================================

// Helper to check if we're on production domains
export const isProduction = () => {
    const hostname = window.location.hostname;
    const productionDomains = Object.values(PRODUCTION_DOMAINS) as string[];
    return productionDomains.includes(hostname);
};

export const isLocal = () => /localhost(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => {
    const isProductionEnv = isProduction();

    try {
        return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
    } catch (error) {
        console.error('Error in getDefaultServerURL:', error);
    }

    // Production defaults to demov2, staging/preview defaults to qa194 (demo)
    return isProductionEnv ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;
};

/**
 * Gets the WebSocket URL for Deriv API connection.
 *
 * Uses old Deriv OAuth flow which returns token1 (short a1-xxx token) directly.
 * Token is stored in localStorage as 'authToken' and used via WebSocket 'authorize' command.
 *
 * @returns WebSocket URL
 */
export const getSocketURL = async (): Promise<string> => {
    const defaultUrl = isProduction() ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING;

    // Wait briefly for OAuth callback to complete (old flow stores token1 in localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('token1')) {
        console.log('[WS] Old OAuth callback detected (token1), waiting for localStorage...');
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            if (localStorage.getItem('authToken')) {
                console.log('[WS] authToken found in localStorage');
                break;
            }
        }
    }

    return defaultUrl;
};

export const getDebugServiceWorker = () => {
    const debug_service_worker_flag = window.localStorage.getItem('debug_service_worker');
    if (debug_service_worker_flag) return !!parseInt(debug_service_worker_flag);

    return false;
};

/**
 * Generates a cryptographically secure CSRF token
 * @returns A random base64url-encoded string
 */
const generateCSRFToken = (): string => {
    // Generate 32 random bytes (256 bits) for strong security
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates a PKCE code verifier (random string)
 * @returns A cryptographically random base64url-encoded string (43-128 characters)
 */
const generateCodeVerifier = (): string => {
    // Generate 32 random bytes (will result in 43 characters after base64url encoding)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe, no padding)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates a PKCE code challenge from a code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns Promise that resolves to the base64url-encoded SHA-256 hash
 */
const generateCodeChallenge = async (verifier: string): Promise<string> => {
    // Encode the verifier as UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    // Hash with SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url encoding
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Stores PKCE code verifier in sessionStorage for token exchange
 * @param verifier The code verifier to store
 */
const storeCodeVerifier = (verifier: string): void => {
    sessionStorage.setItem('oauth_code_verifier', verifier);
    // Also store timestamp for verifier expiration (e.g., 10 minutes)
    sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());
};

/**
 * Retrieves and validates the stored PKCE code verifier
 * @returns The code verifier if valid and not expired, null otherwise
 */
export const getCodeVerifier = (): string | null => {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    const timestamp = sessionStorage.getItem('oauth_code_verifier_timestamp');

    if (!verifier || !timestamp) {
        return null;
    }

    // Check if verifier is expired (10 minutes = 600000ms)
    const verifierAge = Date.now() - parseInt(timestamp, 10);
    if (verifierAge > 600000) {
        // Clean up expired verifier
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_code_verifier_timestamp');
        return null;
    }

    return verifier;
};

/**
 * Clears PKCE code verifier from sessionStorage after successful token exchange
 */
export const clearCodeVerifier = (): void => {
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_code_verifier_timestamp');
};

/**
 * Stores CSRF token in sessionStorage for validation after OAuth callback
 * @param token The CSRF token to store
 */
const storeCSRFToken = (token: string): void => {
    sessionStorage.setItem('oauth_csrf_token', token);
    // Also store timestamp for token expiration (e.g., 10 minutes)
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
};

/**
 * Validates CSRF token from OAuth callback
 * @param token The token to validate
 * @returns true if token is valid and not expired
 */
export const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = sessionStorage.getItem('oauth_csrf_token_timestamp');

    if (!storedToken || !timestamp) {
        return false;
    }

    // Check if token matches
    if (storedToken !== token) {
        return false;
    }

    // Check if token is expired (10 minutes = 600000ms)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 600000) {
        // Clean up expired token
        sessionStorage.removeItem('oauth_csrf_token');
        sessionStorage.removeItem('oauth_csrf_token_timestamp');
        return false;
    }

    return true;
};

/**
 * Clears CSRF token from sessionStorage after successful validation
 */
export const clearCSRFToken = (): void => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};

export const generateOAuthURL = async (prompt?: string) => {
    try {
        // PKCE OAuth2 flow via auth.deriv.com
        const clientId = getOAuthClientId();
        const appId = getOAuthAppId();
        const redirectUri = getOAuthRedirectURI();

        // Generate PKCE code verifier (random string)
        const codeVerifier = generateCodeVerifier();
        storeCodeVerifier(codeVerifier);

        // Generate PKCE code challenge (SHA-256 hash of verifier)
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Generate CSRF token for state parameter
        const csrfToken = generateCSRFToken();
        storeCSRFToken(csrfToken);

        // Persist active redirect URI and client ID for PKCE exchange
        sessionStorage.setItem('oauth_redirect_uri', redirectUri);
        sessionStorage.setItem('oauth_client_id', clientId);

        // Build OAuth2 PKCE URL using shared constants
        let oauthUrl = `https://auth.deriv.com/oauth2/auth?` +
            `scope=trade` +
            `&response_type=code` +
            `&client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&state=${encodeURIComponent(csrfToken)}` +
            `&code_challenge=${encodeURIComponent(codeChallenge)}` +
            `&code_challenge_method=S256`;

        if (prompt) {
            oauthUrl += `&prompt=${encodeURIComponent(prompt)}`;
        }

        if (appId) {
            oauthUrl += `&app_id=${encodeURIComponent(appId)}`;
        }

        return oauthUrl;
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
    }

    // Fallback to empty URL if generation fails
    return ``;
};
