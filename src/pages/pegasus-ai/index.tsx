import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import { IPegasusSignal, loadPegasusStrategyToWorkspace } from './pegasus-strategy-loader';
import {
    scanDerivLiveMarkets,
    subscribeLiveMarketScanner,
    ILiveScannerUpdate,
    getMarketMetadata,
} from './pegasus-scanner-service';
import { pegasusAudio } from './pegasus-audio';
import './pegasus-ai.scss';

interface IPegasusAiProps {
    handleTabChange: (tabIndex: number) => void;
}

export const PegasusAi: React.FC<IPegasusAiProps> = observer(({ handleTabChange }) => {
    const { chart_store } = useStore();

    // Synchronize with active platform chart market
    const activeChartSymbol = chart_store?.symbol || '1HZ100V';
    const activeChartMeta = getMarketMetadata(activeChartSymbol);

    // Capital & risk parameters
    const [stake, setStake] = useState<number>(() => {
        const saved = localStorage.getItem('pegasus_input_stake');
        return saved ? parseFloat(saved) : 42;
    });

    const [takeProfit, setTakeProfit] = useState<number>(() => {
        const saved = localStorage.getItem('pegasus_input_tp');
        return saved ? parseFloat(saved) : 10;
    });

    const [stopLoss, setStopLoss] = useState<number>(() => {
        const saved = localStorage.getItem('pegasus_input_sl');
        return saved ? parseFloat(saved) : 1000;
    });

    const [martingaleMultiplier, setMartingaleMultiplier] = useState<number>(() => {
        const saved = localStorage.getItem('pegasus_input_mart');
        return saved ? parseFloat(saved) : 2.0;
    });

    // Scanner & live synchronization state
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [scanMessage, setScanMessage] = useState<string>('Ready to scan');
    const [signals, setSignals] = useState<IPegasusSignal[]>([]);
    const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => pegasusAudio.isAudioMuted());

    // Live continuous tick streaming for active chart market
    const [liveUpdate, setLiveUpdate] = useState<ILiveScannerUpdate | null>(null);
    const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(true);
    const [pulseDigit, setPulseDigit] = useState<boolean>(false);
    const [priceTrend, setPriceTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
    const prevPriceRef = useRef<number | null>(null);

    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Save inputs to localStorage on change
    useEffect(() => {
        localStorage.setItem('pegasus_input_stake', String(stake));
        localStorage.setItem('pegasus_input_tp', String(takeProfit));
        localStorage.setItem('pegasus_input_sl', String(stopLoss));
        localStorage.setItem('pegasus_input_mart', String(martingaleMultiplier));
    }, [stake, takeProfit, stopLoss, martingaleMultiplier]);

    // Live tick subscription to synchronize with the chart symbol in real time
    useEffect(() => {
        if (!isLiveSyncEnabled || !activeChartSymbol) return;

        const unsubscribe = subscribeLiveMarketScanner(activeChartSymbol, update => {
            if (prevPriceRef.current !== null) {
                if (update.price > prevPriceRef.current) setPriceTrend('up');
                else if (update.price < prevPriceRef.current) setPriceTrend('down');
                else setPriceTrend('neutral');
            }
            prevPriceRef.current = update.price;

            setLiveUpdate(update);
            setPulseDigit(true);
            setTimeout(() => setPulseDigit(false), 350);
        });

        return () => {
            unsubscribe();
        };
    }, [activeChartSymbol, isLiveSyncEnabled]);

    // Handle audio mute toggle
    const handleToggleAudio = () => {
        const nextState = pegasusAudio.toggleMute();
        setIsAudioMuted(nextState);
    };

    // Quick switch active chart market
    const handleSwitchChartMarket = (sym: string) => {
        if (chart_store?.onSymbolChange) {
            chart_store.onSymbolChange(sym);
        }
        toast.info(`Switched Chart & Scanner to ${getMarketMetadata(sym).name}`, {
            autoClose: 2000,
            toastId: 'gsm-chart-switch',
        });
    };

    // Handle radar scan click
    const handleStartScan = async () => {
        if (isScanning) return;
        setIsScanning(true);
        setSignals([]);
        setScanMessage(`Scanning fresh live ticks for ${activeChartMeta.name} and top indices...`);

        // Start periodic sonar sweep ping
        pegasusAudio.playRadarPing();
        pingIntervalRef.current = setInterval(() => {
            pegasusAudio.playRadarPing();
        }, 800);

        try {
            const liveSignals = await scanDerivLiveMarkets({
                chartSymbol: activeChartSymbol,
                onProgress: msg => setScanMessage(msg),
            });

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            setIsScanning(false);
            setScanMessage(`${liveSignals.length} live Deriv signals analyzed & synchronized.`);
            setSignals(liveSignals);
            pegasusAudio.playWinChime();

            setTimeout(() => {
                const el = document.querySelector('.pegasus-view__signals');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } catch (err) {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            setIsScanning(false);
            setScanMessage('Signals updated.');
        }
    };

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, []);

    // Handle selecting a signal: synchronizes chart, loads Blockly strategy, and opens modal
    const handleSelectSignal = (signal: IPegasusSignal) => {
        pegasusAudio.playActivateSound();

        // 1. Synchronize the active chart symbol immediately
        if (chart_store?.onSymbolChange) {
            chart_store.onSymbolChange(signal.symbol);
        }

        // 2. Toast notifications
        toast.info(`${signal.marketName} synchronized with Chart & Workspace. Loading strategy...`, {
            autoClose: 3000,
            toastId: 'gsm-select-signal',
        });

        setTimeout(() => {
            toast.success(`Pegasus ${signal.tradeType} strategy loaded for ${signal.marketName}. Ready to Run!`, {
                autoClose: 4000,
                toastId: 'gsm-strategy-loaded',
            });
        }, 700);

        // 3. Load into active Blockly workspace
        loadPegasusStrategyToWorkspace(
            signal.symbol,
            stake,
            takeProfit,
            signal.barrier !== undefined ? signal.barrier : 2,
            signal.tradeType,
            stopLoss,
            martingaleMultiplier
        );

        // 4. Switch tab to Bot Builder
        handleTabChange(DBOT_TABS.BOT_BUILDER);

        // 5. Open activation modal over Bot Builder
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('gsm:pegasus-activated-modal-open'));
        }, 150);
    };

    // Handle switching chart view directly to a signal's symbol
    const handleViewOnChart = (sym: string) => {
        if (chart_store?.onSymbolChange) {
            chart_store.onSymbolChange(sym);
        }
        handleTabChange(DBOT_TABS.CHART);
    };

    return (
        <div className="pegasus-view">
            <div className="pegasus-view__container">
                {/* Header */}
                <div className="pegasus-view__header">
                    <div className="pegasus-view__eyebrow">
                        <span className="pegasus-view__eyebrow-dot" />
                        POWERED BY PEGASUS AI · LIVE DERIV ENGINE
                    </div>
                    <h1 className="pegasus-view__title">Activate Pegasus</h1>
                    <p className="pegasus-view__subtitle">
                        Real-time tick intelligence synchronized dynamically with your active chart market.
                    </p>
                    <button
                        className={`pegasus-view__sound-toggle ${!isAudioMuted ? 'pegasus-view__sound-toggle--active' : ''}`}
                        onClick={handleToggleAudio}
                        aria-label="Toggle Sound Effects"
                    >
                        <span>{!isAudioMuted ? '🔊 Audio FX: ON' : '🔇 Audio FX: OFF'}</span>
                    </button>
                </div>

                {/* 1. CHART SYNCHRONIZED INTELLIGENCE HERO PANEL */}
                <div className="pegasus-sync-panel">
                    <div className="pegasus-sync-panel__header">
                        <div className="pegasus-sync-panel__title-group">
                            <span className="pegasus-sync-panel__badge">
                                <span className="live-dot" />
                                SYNCHRONIZED WITH CHART
                            </span>
                            <h2 className="pegasus-sync-panel__market-name">
                                {activeChartMeta.name}{' '}
                                <span className="symbol-tag">({activeChartSymbol})</span>
                            </h2>
                        </div>

                        <div className="pegasus-sync-panel__controls">
                            <div className="pegasus-sync-panel__market-selector">
                                <span className="selector-label">Chart Market:</span>
                                {['1HZ100V', 'R_100', '1HZ50V', 'R_50', '1HZ25V', 'R_10'].map(sym => (
                                    <button
                                        key={sym}
                                        className={`market-pill ${sym === activeChartSymbol ? 'market-pill--active' : ''}`}
                                        onClick={() => handleSwitchChartMarket(sym)}
                                        title={`Switch Chart to ${sym}`}
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>

                            <button
                                className={`stream-toggle ${isLiveSyncEnabled ? 'stream-toggle--active' : ''}`}
                                onClick={() => setIsLiveSyncEnabled(!isLiveSyncEnabled)}
                                title="Toggle continuous Deriv live tick stream"
                            >
                                {isLiveSyncEnabled ? '⚡ Live Stream: ON' : '⏸️ Stream: PAUSED'}
                            </button>
                        </div>
                    </div>

                    <div className="pegasus-sync-panel__body">
                        {/* Metrics Row: Price, Last Digit, Parity */}
                        <div className="pegasus-sync-panel__hero-metrics">
                            <div className="metric-box">
                                <span className="metric-label">LIVE QUOTE</span>
                                <div className={`metric-price metric-price--${priceTrend}`}>
                                    {liveUpdate ? liveUpdate.price.toFixed(liveUpdate.pipSize) : 'Connecting...'}
                                    {priceTrend === 'up' && <span className="trend-arrow up">▲</span>}
                                    {priceTrend === 'down' && <span className="trend-arrow down">▼</span>}
                                </div>
                            </div>

                            <div className="metric-box metric-box--digit">
                                <span className="metric-label">LAST DIGIT</span>
                                <div className={`digit-badge ${pulseDigit ? 'digit-badge--pulse' : ''}`}>
                                    {liveUpdate !== null ? liveUpdate.lastDigit : '—'}
                                </div>
                            </div>

                            <div className="metric-box">
                                <span className="metric-label">PARITY BALANCE</span>
                                <div className="parity-summary">
                                    <span className="even">EVEN {liveUpdate?.evenPercentage ?? 50}%</span>
                                    <span className="divider">·</span>
                                    <span className="odd">ODD {liveUpdate?.oddPercentage ?? 50}%</span>
                                </div>
                                <div className="parity-streak">
                                    Streak:{' '}
                                    <strong>
                                        {liveUpdate?.parityStreak ?? 0}{' '}
                                        {liveUpdate?.parityStreakType?.toUpperCase() ?? ''}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Digit Frequency Visualizer (0-9) */}
                        <div className="pegasus-sync-panel__distribution">
                            <div className="distribution-header">
                                <span>DIGIT FREQUENCY DISTRIBUTION (0 – 9)</span>
                                <span className="sample-count">
                                    {liveUpdate
                                        ? `${liveUpdate.totalTicksSampled} live ticks sampled`
                                        : 'Sampling ticks...'}
                                </span>
                            </div>

                            <div className="distribution-bars">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => {
                                    const count = liveUpdate?.digitFrequency?.[d] ?? 0;
                                    const total = liveUpdate?.totalTicksSampled || 80;
                                    const pct = total > 0 ? (count / total) * 100 : 10;
                                    const isCold = liveUpdate?.coldDigit === d;
                                    const isHot = liveUpdate?.hotDigit === d;
                                    const isCurrent = liveUpdate?.lastDigit === d;

                                    const barHeightPct = Math.min(100, Math.max(12, pct * 4.6));

                                    return (
                                        <div
                                            key={d}
                                            className={`digit-column ${isCold ? 'digit-column--cold' : ''} ${
                                                isHot ? 'digit-column--hot' : ''
                                            } ${isCurrent ? 'digit-column--current' : ''}`}
                                        >
                                            <span className="digit-pct">{pct.toFixed(1)}%</span>
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{ height: `${barHeightPct}%` }}
                                                />
                                            </div>
                                            <span className="digit-num">{d}</span>
                                            {isCold && <span className="tag-cold">COLD</span>}
                                            {isHot && <span className="tag-hot">HOT</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Synchronized Strategy Edge for Active Chart Market */}
                        {liveUpdate?.signal && (
                            <div className="pegasus-sync-panel__recommendation">
                                <div className="rec-info">
                                    <div className="rec-badge">
                                        <span>⚡ LIVE CHART EDGE</span>
                                        <span className="rec-conf">
                                            ✓ {liveUpdate.signal.confidence.toFixed(1)}% CONFIDENCE
                                        </span>
                                    </div>
                                    <div className="rec-strategy">
                                        <strong>
                                            {liveUpdate.signal.tradeType}{' '}
                                            {liveUpdate.signal.barrier !== undefined
                                                ? liveUpdate.signal.barrier
                                                : ''}
                                        </strong>{' '}
                                        · {liveUpdate.signal.recoveryRule}
                                    </div>
                                    <p className="rec-desc">{liveUpdate.signal.description}</p>
                                </div>
                                <div className="rec-actions">
                                    <button
                                        className="rec-action-btn"
                                        onClick={() => handleSelectSignal(liveUpdate.signal)}
                                    >
                                        <span>🚀 Load {activeChartSymbol} Strategy to Bot Builder</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. CAPITAL & RISK PARAMETER INPUTS */}
                <div className="pegasus-view__inputs">
                    {/* Stake */}
                    <div className="pegasus-view__input-group">
                        <label htmlFor="pegasus-stake">Stake (USD)</label>
                        <div className="input-wrapper">
                            <input
                                id="pegasus-stake"
                                type="number"
                                min="0.35"
                                step="1"
                                value={stake}
                                onChange={e => setStake(parseFloat(e.target.value) || 0)}
                            />
                            <span className="currency-tag">USD</span>
                        </div>
                    </div>

                    {/* Take Profit */}
                    <div className="pegasus-view__input-group">
                        <label htmlFor="pegasus-tp">Take-profit (USD)</label>
                        <div className="input-wrapper">
                            <input
                                id="pegasus-tp"
                                type="number"
                                min="1"
                                step="5"
                                value={takeProfit}
                                onChange={e => setTakeProfit(parseFloat(e.target.value) || 0)}
                            />
                            <span className="currency-tag">USD</span>
                        </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="pegasus-view__input-group">
                        <label htmlFor="pegasus-sl">Stop-loss (USD)</label>
                        <div className="input-wrapper">
                            <input
                                id="pegasus-sl"
                                type="number"
                                min="1"
                                step="10"
                                value={stopLoss}
                                onChange={e => setStopLoss(parseFloat(e.target.value) || 0)}
                            />
                            <span className="currency-tag">USD</span>
                        </div>
                    </div>

                    {/* Martingale Multiplier */}
                    <div className="pegasus-view__input-group">
                        <label htmlFor="pegasus-mart">Martingale (x)</label>
                        <div className="input-wrapper">
                            <input
                                id="pegasus-mart"
                                type="number"
                                min="1.0"
                                max="4.0"
                                step="0.1"
                                value={martingaleMultiplier}
                                onChange={e => setMartingaleMultiplier(parseFloat(e.target.value) || 2.0)}
                            />
                            <span className="currency-tag">x</span>
                        </div>
                    </div>

                    <p className="pegasus-view__input-hint">
                        Enter a valid stake to calculate the automatic recovery limit.
                    </p>
                </div>

                {/* 3. MULTI-MARKET RADAR SCANNER */}
                <div className="pegasus-view__radar-section">
                    <div className="pegasus-view__radar-stage" onClick={handleStartScan}>
                        <div className="pegasus-view__radar-wave pegasus-view__radar-wave--1" />
                        <div className="pegasus-view__radar-wave pegasus-view__radar-wave--2" />
                        <div className="pegasus-view__radar-wave pegasus-view__radar-wave--3" />

                        <div
                            className={`pegasus-view__radar-sweep ${
                                !isScanning && signals.length === 0 ? 'pegasus-view__radar-sweep--paused' : ''
                            }`}
                        />

                        <div
                            className={`pegasus-view__radar-btn ${
                                isScanning ? 'pegasus-view__radar-btn--scanning' : ''
                            }`}
                        >
                            <span className="pegasus-view__btn-title">Activate Pegasus</span>
                            <span className="pegasus-view__btn-status">
                                {isScanning
                                    ? 'Scanning live markets'
                                    : signals.length > 0
                                    ? 'Rescan All Markets'
                                    : 'Scan Live Markets'}
                            </span>
                        </div>
                    </div>

                    <div className="pegasus-view__radar-badge">
                        {isScanning && <span className="spinner" />}
                        <span>{scanMessage}</span>
                    </div>
                </div>

                {/* 4. MULTI-MARKET TOP SIGNALS SECTION */}
                {signals.length > 0 && (
                    <div className="pegasus-view__signals">
                        <div className="pegasus-view__signals-header-row">
                            <span className="pegasus-view__signals-title">
                                Top Pegasus Signals ({signals.length})
                            </span>
                            <span className="pegasus-view__signals-sync-indicator">
                                🟢 Chart: {activeChartSymbol}
                            </span>
                        </div>

                        <div className="pegasus-view__signals-grid">
                            {signals.map(sig => {
                                const isCurrentChart = sig.symbol === activeChartSymbol || sig.isChartMarket;

                                return (
                                    <div
                                        key={sig.id}
                                        className={`pegasus-view__card ${
                                            isCurrentChart ? 'pegasus-view__card--chart-active' : ''
                                        }`}
                                    >
                                        <div className="pegasus-view__card-header">
                                            <div className="pegasus-view__card-badges">
                                                <span
                                                    className={`pegasus-view__card-rank ${
                                                        sig.rank === 1 ? 'pegasus-view__card-rank--best' : ''
                                                    }`}
                                                >
                                                    {sig.rank === 1 ? 'BEST SIGNAL' : `#${sig.rank} SIGNAL`}
                                                </span>
                                                {isCurrentChart && (
                                                    <span className="pegasus-view__card-chart-badge">
                                                        🟢 CHART MARKET
                                                    </span>
                                                )}
                                            </div>
                                            <span className="pegasus-view__card-score">
                                                ✓ {sig.confidence.toFixed(1)}%
                                            </span>
                                        </div>

                                        <div className="pegasus-view__card-body">
                                            <h3 className="pegasus-view__card-market">
                                                {sig.marketName}{' '}
                                                <span className="card-sym">({sig.symbol})</span>
                                            </h3>

                                            {sig.currentPrice !== undefined && (
                                                <div className="pegasus-view__card-tick-stats">
                                                    <span className="tick-quote">
                                                        Quote: {sig.currentPrice.toFixed(sig.pipSize ?? 2)}
                                                    </span>
                                                    <span className="tick-last">
                                                        Digit: <strong>{sig.lastDigit}</strong>
                                                    </span>
                                                    {sig.coldDigit !== undefined && (
                                                        <span className="tick-cold">
                                                            Cold: <strong>{sig.coldDigit}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <p className="pegasus-view__card-details">
                                                {sig.tradeType}{' '}
                                                {sig.barrier !== undefined ? sig.barrier : ''} ·{' '}
                                                {sig.recoveryRule}
                                            </p>
                                            <p className="pegasus-view__card-desc">{sig.description}</p>
                                        </div>

                                        <div className="pegasus-view__card-actions-row">
                                            <button
                                                className="pegasus-view__card-action"
                                                onClick={() => handleSelectSignal(sig)}
                                            >
                                                <span>🚀 Use this signal</span>
                                            </button>
                                            <button
                                                className="pegasus-view__card-secondary-action"
                                                onClick={() => handleViewOnChart(sig.symbol)}
                                                title="View market chart"
                                            >
                                                <span>📊 View Chart</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default PegasusAi;
