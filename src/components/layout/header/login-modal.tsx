import React, { useState, useCallback, useEffect } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import {
    generateOAuthURL,
    getOAuthClientId,
    getOAuthRedirectURI,
    setCustomOAuthCredentials,
    resetOAuthCredentials,
} from '@/components/shared';
import './login-modal.scss';

export interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (account: { loginid: string; balance?: number; currency?: string }) => void;
}

export const GSM_SAVED_TOKEN = 'pat_0553633922c18cced3efb35931185b3a325082e501e968b7842c0e064b4d5b18';

/**
 * Global helper to open login modal from anywhere in the application
 */
export const openLoginModal = (options?: { error?: string; tab?: 'token' | 'oauth' }) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gsm:open-login', { detail: options }));
    }
};

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen: controlledIsOpen, onClose, onSuccess }) => {
    const [isOpenInternal, setIsOpenInternal] = useState<boolean>(false);
    const isOpen = controlledIsOpen || isOpenInternal;

    const [activeTab, setActiveTab] = useState<'token' | 'oauth'>('token');
    const [token, setToken] = useState<string>('');
    const [showToken, setShowToken] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

    // Advanced OAuth Customization state
    const [showAdvancedOAuth, setShowAdvancedOAuth] = useState<boolean>(false);
    const [customClientId, setCustomClientId] = useState<string>('');
    const [customRedirectUri, setCustomRedirectUri] = useState<string>('');

    // Listen to global open event
    useEffect(() => {
        const handleOpenEvent = (e: Event) => {
            const customEvent = e as CustomEvent<{ error?: string; tab?: 'token' | 'oauth' }>;
            setIsOpenInternal(true);
            if (customEvent.detail?.tab) {
                setActiveTab(customEvent.detail.tab);
            }
            if (customEvent.detail?.error) {
                setErrorMessage(customEvent.detail.error);
            }
        };

        window.addEventListener('gsm:open-login', handleOpenEvent);
        return () => window.removeEventListener('gsm:open-login', handleOpenEvent);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Check for existing token or stored error
            const existingToken = localStorage.getItem('authToken');
            if (existingToken) {
                setToken(existingToken);
            } else {
                setToken(GSM_SAVED_TOKEN);
            }

            const storedError = sessionStorage.getItem('gsm_auth_error');
            if (storedError) {
                setErrorMessage(storedError);
                sessionStorage.removeItem('gsm_auth_error');
            } else {
                setErrorMessage(null);
            }

            setSuccessMessage(null);
            setIsLoading(false);
            setCustomClientId(getOAuthClientId());
            setCustomRedirectUri(getOAuthRedirectURI());
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsOpenInternal(false);
        onClose();
    }, [onClose]);

    const handleQuickFill = useCallback(() => {
        setToken(GSM_SAVED_TOKEN);
        setErrorMessage(null);
    }, []);

    const handleTokenSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = token.trim();
        if (!trimmed) {
            setErrorMessage('Please enter your Deriv API Personal Access Token (PAT).');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const result = await api_base.authorizeWithToken(trimmed);
            if (!result.success) {
                setErrorMessage(result.error || 'Failed to authenticate with Deriv. Please check your token permissions.');
                setIsLoading(false);
                return;
            }

            setSuccessMessage(`Connected successfully! Welcome ${result.loginid || 'Trader'}.`);
            setIsLoading(false);

            if (onSuccess) {
                onSuccess({
                    loginid: result.loginid || '',
                    balance: result.balance,
                    currency: result.currency,
                });
            }

            setTimeout(() => {
                handleClose();
            }, 900);
        } catch (err: any) {
            console.error('[LoginModal] Authentication error:', err);
            setErrorMessage(err?.message || 'Unexpected connection error while authenticating.');
            setIsLoading(false);
        }
    }, [token, onSuccess, handleClose]);

    const handleOAuthRedirect = useCallback(async (isSignup = false) => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            // If custom credentials entered, apply them
            if (customClientId.trim() || customRedirectUri.trim()) {
                setCustomOAuthCredentials(
                    customClientId.trim() || undefined,
                    undefined,
                    customRedirectUri.trim() || undefined
                );
            }

            const url = await generateOAuthURL(isSignup ? 'registration' : undefined);
            if (url) {
                window.location.replace(url);
            } else {
                setErrorMessage('Unable to generate Deriv OAuth URL. Please use API Token login.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('[LoginModal] OAuth redirect failed:', err);
            setErrorMessage('Deriv OAuth redirect failed. Please try Token login.');
            setIsLoading(false);
        }
    }, [customClientId, customRedirectUri]);

    const handleSaveCustomCredentials = useCallback(() => {
        setCustomOAuthCredentials(
            customClientId.trim() || undefined,
            undefined,
            customRedirectUri.trim() || undefined
        );
        setSuccessMessage('Deriv OAuth App configuration saved.');
        setTimeout(() => setSuccessMessage(null), 3000);
    }, [customClientId, customRedirectUri]);

    const handleResetCredentials = useCallback(() => {
        resetOAuthCredentials();
        setCustomClientId(getOAuthClientId());
        setCustomRedirectUri(getOAuthRedirectURI());
        setSuccessMessage('Credentials reset to defaults.');
        setTimeout(() => setSuccessMessage(null), 3000);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="gsm-login-overlay" onClick={handleClose}>
            <div className="gsm-login-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="gsm-login-header">
                    <div className="gsm-login-header__brand">
                        <div className="gsm-login-header__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 2L2 7L12 12L22 7L12 2Z"
                                    stroke="#D4AF37"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M2 17L12 22L22 17"
                                    stroke="#D4AF37"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M2 12L12 17L22 12"
                                    stroke="#D4AF37"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="gsm-login-header__title">Deriv Account Connect</h3>
                            <p className="gsm-login-header__subtitle">Gold Standard Market Trading Terminal</p>
                        </div>
                    </div>
                    <button className="gsm-login-close-btn" onClick={handleClose} aria-label="Close modal">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="gsm-login-tabs">
                    <button
                        className={`gsm-login-tab ${activeTab === 'token' ? 'gsm-login-tab--active' : ''}`}
                        onClick={() => setActiveTab('token')}
                        type="button"
                    >
                        <span className="gsm-login-tab__indicator"></span>
                        API Token / PAT
                        <span className="gsm-tab-badge">Fast & Direct</span>
                    </button>
                    <button
                        className={`gsm-login-tab ${activeTab === 'oauth' ? 'gsm-login-tab--active' : ''}`}
                        onClick={() => setActiveTab('oauth')}
                        type="button"
                    >
                        Deriv OAuth Portal
                    </button>
                </div>

                {/* Status Messages */}
                {errorMessage && (
                    <div className="gsm-login-alert gsm-login-alert--error">
                        <span className="gsm-login-alert__icon">⚠</span>
                        <div className="gsm-login-alert__text">{errorMessage}</div>
                    </div>
                )}

                {successMessage && (
                    <div className="gsm-login-alert gsm-login-alert--success">
                        <span className="gsm-login-alert__icon">✓</span>
                        <div className="gsm-login-alert__text">{successMessage}</div>
                    </div>
                )}

                {/* Body Content */}
                {activeTab === 'token' ? (
                    <form className="gsm-login-form" onSubmit={handleTokenSubmit}>
                        <div className="gsm-login-field">
                            <div className="gsm-login-field__label-row">
                                <label className="gsm-login-field__label">Deriv Personal Access Token</label>
                                <button
                                    type="button"
                                    className="gsm-login-field__quickfill"
                                    onClick={handleQuickFill}
                                    title="Pre-fill provided credentials"
                                >
                                    ⚡ Quick-Fill Token
                                </button>
                            </div>
                            <div className="gsm-login-input-wrapper">
                                <input
                                    type={showToken ? 'text' : 'password'}
                                    className="gsm-login-input"
                                    placeholder="e.g. pat_6c4cdc1d5e24c016ac2f202d21..."
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="gsm-login-input__toggle"
                                    onClick={() => setShowToken(!showToken)}
                                    tabIndex={-1}
                                >
                                    {showToken ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <span className="gsm-login-field__hint">
                                Supports Personal Access Tokens (<code className="gsm-code">pat_...</code>) or classic API tokens with <strong>Read</strong> and <strong>Trade</strong> scopes.
                            </span>
                        </div>

                        {/* Collapsible Token Instructions */}
                        <div className="gsm-login-guide">
                            <button
                                type="button"
                                className="gsm-login-guide__toggle"
                                onClick={() => setShowHelpGuide(!showHelpGuide)}
                            >
                                <span>{showHelpGuide ? '▼' : '▶'} How to get your Deriv Token</span>
                                <span className="gsm-login-guide__badge">30 seconds</span>
                            </button>
                            {showHelpGuide && (
                                <div className="gsm-login-guide__content">
                                    <ol>
                                        <li>Log in to your Deriv account at <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noopener noreferrer">app.deriv.com/account/api-token</a></li>
                                        <li>Go to <strong>Account Settings</strong> → <strong>API Token</strong></li>
                                        <li>Select token scopes: check <strong>Read</strong> and <strong>Trade</strong> (and <strong>Payments</strong> for cashier access)</li>
                                        <li>Click <strong>Create</strong> and copy your token</li>
                                        <li>Paste your token in the field above and click Connect</li>
                                    </ol>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="gsm-login-actions">
                            <button
                                type="submit"
                                className="gsm-login-btn gsm-login-btn--primary"
                                disabled={isLoading || !token.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="gsm-spinner"></span>
                                        Connecting to Deriv WebSocket...
                                    </>
                                ) : (
                                    'Connect Account'
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="gsm-login-oauth-section">
                        <div className="gsm-oauth-notice">
                            <div className="gsm-oauth-notice__icon">ℹ</div>
                            <div className="gsm-oauth-notice__text">
                                Deriv OAuth 2.0 requires the redirect URL (<code>{getOAuthRedirectURI()}</code>) to be pre-registered under your Deriv App ID. If Deriv blocks the redirect, register your App ID below or use the <strong>API Token</strong> tab for immediate login.
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gsm-login-btn gsm-login-btn--primary gsm-login-btn--oauth"
                            onClick={() => handleOAuthRedirect(false)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="gsm-spinner"></span>
                                    Redirecting...
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                                    </svg>
                                    Continue with Deriv OAuth
                                </>
                            )}
                        </button>

                        <div className="gsm-login-divider">
                            <span>or register new account</span>
                        </div>

                        <a
                            href="https://deriv.com/signup/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gsm-login-btn gsm-login-btn--secondary"
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            Create a Free Deriv Account ↗
                        </a>

                        {/* Collapsible Advanced App ID Configuration */}
                        <div className="gsm-login-guide" style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                className="gsm-login-guide__toggle"
                                onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                            >
                                <span>{showAdvancedOAuth ? '▼' : '▶'} Deriv App ID & Redirection Settings</span>
                                <span className="gsm-login-guide__badge" style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37' }}>Advanced</span>
                            </button>
                            {showAdvancedOAuth && (
                                <div className="gsm-login-guide__content">
                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem' }}>
                                        To enable 1-click OAuth redirects to <strong>{getOAuthRedirectURI()}</strong>:
                                    </p>
                                    <ol style={{ fontSize: '0.75rem', marginBottom: '12px' }}>
                                        <li>Open <a href="https://api.deriv.com/docs/app-registration/" target="_blank" rel="noopener noreferrer">api.deriv.com/docs/app-registration/</a></li>
                                        <li>Register App: <code>Gold Standard Market</code></li>
                                        <li>Set Redirect URL: <code>{getOAuthRedirectURI()}</code></li>
                                        <li>Check scopes: <code>read</code>, <code>trade</code>, <code>payments</code>, <code>admin</code></li>
                                        <li>Copy your generated <strong>App ID / Client ID</strong> and paste below:</li>
                                    </ol>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>OAuth Client ID / App ID:</label>
                                        <input
                                            type="text"
                                            className="gsm-login-input"
                                            value={customClientId}
                                            onChange={e => setCustomClientId(e.target.value)}
                                            placeholder="e.g. 67890 or 342vx4..."
                                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                        />

                                        <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Redirect URI:</label>
                                        <input
                                            type="text"
                                            className="gsm-login-input"
                                            value={customRedirectUri}
                                            onChange={e => setCustomRedirectUri(e.target.value)}
                                            placeholder="https://goldstandardmarket.vercel.app"
                                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="gsm-login-btn gsm-login-btn--primary"
                                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                            onClick={handleSaveCustomCredentials}
                                        >
                                            Save Settings
                                        </button>
                                        <button
                                            type="button"
                                            className="gsm-login-btn gsm-login-btn--secondary"
                                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                            onClick={handleResetCredentials}
                                        >
                                            Reset Defaults
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="gsm-login-footer">
                    <div className="gsm-login-security">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span>Encrypted 256-bit client-side WebSocket authorization. Tokens remain stored locally in your browser.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
