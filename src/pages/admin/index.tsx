import React, { useState, useEffect } from 'react';
import './admin.scss';

const ADMIN_SECRET_KEY = 'gsm_admin_secret';
const getStoredSecret = () => sessionStorage.getItem(ADMIN_SECRET_KEY) ?? '';

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString();
    } catch {
        return dateStr;
    }
};

const adminApi = {
    headers(secret: string) {
        return {
            'Content-Type': 'application/json',
            'x-admin-secret': secret,
        };
    },
    async listEntitlements(secret: string) {
        const res = await fetch('/api/admin/entitlements', { headers: this.headers(secret) });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? [];
    },
    async upsertEntitlement(secret: string, payload: any) {
        const res = await fetch('/api/admin/entitlements', {
            method: 'PUT',
            headers: this.headers(secret),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return (await res.json()).data;
    },
    async deleteEntitlement(secret: string, userId: string) {
        const res = await fetch(`/api/admin/entitlements?user_id=${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: this.headers(secret),
        });
        if (!res.ok && res.status !== 204) throw new Error(`Failed: ${res.status}`);
    },
    async runMigration(secret: string) {
        const res = await fetch('/api/admin/migrate', {
            method: 'POST',
            headers: this.headers(secret),
        });
        if (!res.ok) throw new Error(`Migration failed: ${res.status}`);
        return res.json();
    },
    async discoverSymbols(secret: string) {
        const res = await fetch('/api/data/discover', {
            method: 'POST',
            headers: this.headers(secret),
        });
        if (!res.ok) throw new Error(`Discover failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? [];
    },
    async collectTicks(secret: string, payload: any) {
        const res = await fetch('/api/data/collect', {
            method: 'POST',
            headers: this.headers(secret),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Collect failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? {};
    },
    async getDataReport(secret: string) {
        const res = await fetch('/api/data/report', { headers: this.headers(secret) });
        if (!res.ok) throw new Error(`Report failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? {};
    },
    async generateSplits(secret: string, payload: any) {
        const res = await fetch('/api/data/splits', {
            method: 'POST',
            headers: this.headers(secret),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Splits failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? {};
    },
    async evaluateModel(secret: string, payload: any) {
        const res = await fetch('/api/ml/evaluate', {
            method: 'POST',
            headers: this.headers(secret),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Evaluation failed: ${res.status}`);
        const data = await res.json();
        return data?.data ?? {};
    },
};

export const AdminDashboard = () => {
    const [secret, setSecret] = useState(getStoredSecret());
    const [isUnlocked, setIsUnlocked] = useState(Boolean(getStoredSecret()));
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'entitlements' | 'data' | 'ml'>('entitlements');
    const [entitlements, setEntitlements] = useState<any[]>([]);
    const [dataReport, setDataReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userIdInput, setUserIdInput] = useState('');
    const [statusInput, setStatusInput] = useState('active');
    const [outputText, setOutputText] = useState('');
    const [symbolInput, setSymbolInput] = useState('R_100');

    const cleanUserId = userIdInput.trim().toUpperCase();
    const isValidUserId = /^(ROT|DOT|CR|VRTC)\d+$/.test(cleanUserId);

    const handleUnlock = async () => {
        if (!secret.trim()) {
            setError('Admin secret is required.');
            return;
        }
        setError('');
        sessionStorage.setItem(ADMIN_SECRET_KEY, secret.trim());
        try {
            const list = await adminApi.listEntitlements(secret.trim());
            setEntitlements(list);
            setIsUnlocked(true);
        } catch {
            setError('Invalid admin secret or server error.');
            sessionStorage.removeItem(ADMIN_SECRET_KEY);
            setIsUnlocked(false);
        }
    };

    const fetchEntitlements = async () => {
        if (!secret) return;
        try {
            const list = await adminApi.listEntitlements(secret);
            setEntitlements(list);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpsert = async () => {
        if (!secret) return;
        if (!isValidUserId) {
            setError('Enter a valid ROT, DOT, CR, or VRTC account ID.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await adminApi.upsertEntitlement(secret, {
                user_id: cleanUserId,
                status: statusInput,
                starts_at: new Date().toISOString(),
            });
            setUserIdInput('');
            await fetchEntitlements();
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!secret) return;
        if (!confirm(`Delete entitlement for ${id}?`)) return;
        setIsLoading(true);
        try {
            await adminApi.deleteEntitlement(secret, id);
            await fetchEntitlements();
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const fetchReport = async () => {
        if (!secret) return;
        setIsLoading(true);
        try {
            const rep = await adminApi.getDataReport(secret);
            setDataReport(rep);
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const handleDiscover = async () => {
        if (!secret) return;
        setIsLoading(true);
        setError('');
        try {
            const syms = await adminApi.discoverSymbols(secret);
            const lines = syms.map((s: any) => `${s.symbol} — ${s.display_name} (pip_size=${s.pip_size})`);
            setOutputText(`Discovered ${syms.length} eligible synthetic indices:\n\n${lines.join('\n')}`);
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const handleCollect = async () => {
        if (!secret) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await adminApi.collectTicks(secret, { symbol: symbolInput });
            setOutputText(JSON.stringify(res, null, 2));
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const handleEvaluate = async () => {
        if (!secret) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await adminApi.evaluateModel(secret, { symbol: symbolInput });
            const lines = (res.summary ?? []).map(
                (s: any) => `  ${s.profile} / ${s.model}: acc=${s.accuracy} cov70=${s.coverage_70} brier=${s.brier} edge=${s.edge_detected}`
            );
            setOutputText(`Symbol: ${res.symbol}\nTicks: ${res.tick_count}\n\n${lines.join('\n')}\n\n${res.go_no_go}`);
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    const handleMigration = async () => {
        if (!secret) return;
        if (!confirm('Run database migrations? This will create tables if they do not exist.')) return;
        setIsLoading(true);
        try {
            const res = await adminApi.runMigration(secret);
            setOutputText(`Migration: ${res.status}`);
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isUnlocked && activeTab === 'entitlements') {
            fetchEntitlements();
        }
        if (isUnlocked && activeTab === 'data' && !dataReport) {
            fetchReport();
        }
    }, [activeTab, isUnlocked]);

    if (!isUnlocked) {
        return (
            <main className='admin-dashboard admin-dashboard--locked'>
                <section className='admin-dashboard__login-card'>
                    <h1>Admin Dashboard</h1>
                    <p>Enter the admin secret to manage entitlements, data, and ML evaluation.</p>
                    <input
                        type='password'
                        className='admin-dashboard__secret-input'
                        placeholder='Admin secret'
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                    />
                    {error && <p className='admin-dashboard__error'>{error}</p>}
                    <button type='button' onClick={handleUnlock} className='admin-dashboard__unlock-btn'>
                        Unlock
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className='admin-dashboard'>
            <header className='admin-dashboard__header'>
                <h1>Admin Dashboard</h1>
                <div className='admin-dashboard__tabs'>
                    <button
                        type='button'
                        className={activeTab === 'entitlements' ? 'is-active' : ''}
                        onClick={() => setActiveTab('entitlements')}
                    >
                        Entitlements
                    </button>
                    <button
                        type='button'
                        className={activeTab === 'data' ? 'is-active' : ''}
                        onClick={() => setActiveTab('data')}
                    >
                        Data Pipeline
                    </button>
                    <button
                        type='button'
                        className={activeTab === 'ml' ? 'is-active' : ''}
                        onClick={() => setActiveTab('ml')}
                    >
                        ML Evaluation
                    </button>
                </div>
            </header>

            {error && <div className='admin-dashboard__error'>{error}</div>}

            {activeTab === 'entitlements' && (
                <section className='admin-dashboard__panel'>
                    <div className='admin-dashboard__activate-row'>
                        <input
                            type='text'
                            placeholder='ROT, DOT, CR, or VRTC account ID'
                            value={userIdInput}
                            onChange={e => setUserIdInput(e.target.value)}
                        />
                        <select value={statusInput} onChange={e => setStatusInput(e.target.value)}>
                            <option value='active'>active</option>
                            <option value='inactive'>inactive</option>
                            <option value='expired'>expired</option>
                            <option value='suspended'>suspended</option>
                        </select>
                        <button type='button' onClick={handleUpsert} disabled={isLoading || !isValidUserId}>
                            Activate / Update
                        </button>
                    </div>
                    <p className='admin-dashboard__expiry-notice'>
                        Access expires automatically six calendar months after the activation date.
                    </p>
                    <table className='admin-dashboard__table'>
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Status</th>
                                <th>Starts At</th>
                                <th>Expires At</th>
                                <th>Source</th>
                                <th>Updated</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {entitlements.length === 0 && (
                                <tr>
                                    <td colSpan={7}>No entitlements found.</td>
                                </tr>
                            )}
                            {entitlements.map(e => (
                                <tr key={e.id || e.user_id}>
                                    <td>{e.user_id}</td>
                                    <td>{e.status}</td>
                                    <td>{formatDate(e.starts_at)}</td>
                                    <td>{formatDate(e.expires_at)}</td>
                                    <td>{e.source || 'manual'}</td>
                                    <td>{formatDate(e.updated_at)}</td>
                                    <td>
                                        <button type='button' onClick={() => handleDelete(e.user_id)} disabled={isLoading}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {activeTab === 'data' && (
                <section className='admin-dashboard__panel'>
                    <div className='admin-dashboard__action-row'>
                        <button type='button' onClick={handleMigration} disabled={isLoading}>
                            Run Migration
                        </button>
                        <button type='button' onClick={fetchReport} disabled={isLoading}>
                            Refresh Report
                        </button>
                        <button type='button' onClick={handleDiscover} disabled={isLoading}>
                            Discover Symbols
                        </button>
                        <button type='button' onClick={handleCollect} disabled={isLoading}>
                            Collect Ticks ({symbolInput})
                        </button>
                        <button
                            type='button'
                            onClick={() => adminApi.generateSplits(secret, {})}
                            disabled={isLoading}
                        >
                            Generate Splits
                        </button>
                    </div>
                    {dataReport && (
                        <div className='admin-dashboard__report'>
                            <h3>Data Report</h3>
                            <p>
                                <strong>Total ticks:</strong> {dataReport.total_ticks?.toLocaleString() ?? 0}
                            </p>
                            <table className='admin-dashboard__table'>
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Version</th>
                                        <th>Total Ticks</th>
                                        <th>Unique Epochs</th>
                                        <th>Min Epoch</th>
                                        <th>Max Epoch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(dataReport.symbols ?? []).map((s: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>{s.symbol}</td>
                                            <td>{s.dataset_version}</td>
                                            <td>{Number(s.total_ticks).toLocaleString()}</td>
                                            <td>{Number(s.unique_epochs).toLocaleString()}</td>
                                            <td>{s.min_epoch}</td>
                                            <td>{s.max_epoch}</td>
                                        </tr>
                                    ))}
                                    {(!dataReport.symbols || dataReport.symbols.length === 0) && (
                                        <tr>
                                            <td colSpan={6}>No tick data collected yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'ml' && (
                <section className='admin-dashboard__panel'>
                    <div className='admin-dashboard__action-row'>
                        <input
                            type='text'
                            placeholder='Symbol (e.g. R_100)'
                            value={symbolInput}
                            onChange={e => setSymbolInput(e.target.value)}
                        />
                        <button type='button' onClick={handleEvaluate} disabled={isLoading}>
                            Run Evaluation
                        </button>
                    </div>
                    {outputText && <pre className='admin-dashboard__output'>{outputText}</pre>}
                </section>
            )}
        </main>
    );
};

export default AdminDashboard;

