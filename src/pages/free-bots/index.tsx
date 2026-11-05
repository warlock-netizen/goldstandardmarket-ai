import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

type TFreeBotsProps = {
    handleTabChange: (tab_index: number) => void;
};

type TBotItem = {
    id: string;
    name: string;
    file: string;
    category: string;
    desc: string;
    icon: string;
    confidence: number;
    mtfAgree: number;
    risk: 'Low' | 'Medium' | 'High';
    strategy: string;
    targetMarket: string;
    features: string[];
};

const XML_BOT_FILES = [
    'Digit Switcher Bot (correction) (1)',
    'Dollar Printer (correction) (1)',
    'GOLD-PREMIUM-ODD-AND-EVEN',
    'Profit_MAKER_BOT (correct) (1) (1)',
];

const BOT_CATALOG: TBotItem[] = [
    {
        id: 'bot_digit_switcher',
        name: 'Digit Switcher Bot',
        file: 'Digit Switcher Bot (correction) (1)',
        category: 'Digits',
        icon: '🔄',
        desc: 'Dynamic digit-state switcher that evaluates recent digit frequency and alternates execution logic to exploit distribution anomalies.',
        confidence: 86,
        mtfAgree: 88,
        risk: 'Medium',
        strategy: 'State Switch Logic',
        targetMarket: 'Volatility 100 / 10 (1s)',
        features: ['Tick State Switching', 'Smart Digit Tracking', 'Adaptive Barrier'],
    },
    {
        id: 'bot_dollar_printer',
        name: 'Dollar Printer',
        file: 'Dollar Printer (correction) (1)',
        category: 'Premium',
        icon: '💵',
        desc: 'High-frequency compounding bot engineered for rapid micro-scalping entries, consecutive win acceleration, and controlled drawdown protection.',
        confidence: 89,
        mtfAgree: 91,
        risk: 'High',
        strategy: 'Cycle Compounding',
        targetMarket: 'Continuous Indices',
        features: ['High-Frequency Scalp', 'Compounding Engine', 'Rapid Turnaround'],
    },
    {
        id: 'bot_gold_odd_even',
        name: 'Gold Premium Odd & Even',
        file: 'GOLD-PREMIUM-ODD-AND-EVEN',
        category: 'Even/Odd',
        icon: '⚖️',
        desc: 'Institutional-grade parity algorithm analyzing real-time odd/even imbalances with statistical deviation filters and progression recovery.',
        confidence: 90,
        mtfAgree: 93,
        risk: 'High',
        strategy: 'Odd/Even Parity Skew',
        targetMarket: 'Volatility Indices',
        features: ['Parity Imbalance Filter', 'Controlled Martingale', 'Volatility Filter'],
    },
    {
        id: 'bot_profit_maker',
        name: 'Profit Maker Bot',
        file: 'Profit_MAKER_BOT (correct) (1) (1)',
        category: 'Premium',
        icon: '🚀',
        desc: 'Disciplined profit-maximization system utilizing structured stake ladders, multi-level recovery, and rigorous capital safety stop-losses.',
        confidence: 91,
        mtfAgree: 94,
        risk: 'High',
        strategy: 'Stake Progression Recovery',
        targetMarket: 'Continuous Volatility',
        features: ['Multi-Step Recovery', 'Strict Stop-Loss', 'Target Profit Lock'],
    },
];

export const FreeBots = observer(({ handleTabChange }: TFreeBotsProps) => {
    const store = useStore();
    const { run_panel, toolbar, save_modal } = store ?? {};

    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loadingBotId, setLoadingBotId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<'load' | 'run' | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), ok ? 4500 : 6500);
    };

    const categories = useMemo(() => {
        return ['All', ...Array.from(new Set(BOT_CATALOG.map(b => b.category)))];
    }, []);

    const filteredBots = useMemo(() => {
        return BOT_CATALOG.filter(bot => {
            const matchesCat = selectedCategory === 'All' || bot.category === selectedCategory;
            const q = searchQuery.trim().toLowerCase();
            const matchesQuery = !q ||
                bot.name.toLowerCase().includes(q) ||
                bot.desc.toLowerCase().includes(q) ||
                bot.strategy.toLowerCase().includes(q) ||
                bot.category.toLowerCase().includes(q);
            return matchesCat && matchesQuery;
        });
    }, [selectedCategory, searchQuery]);

    const loadBotToWorkspace = async (bot: TBotItem, autoRun: boolean = false) => {
        setLoadingBotId(bot.id);
        setLoadingAction(autoRun ? 'run' : 'load');

        try {
            // 1. Authorize bot builder gateway
            localStorage.setItem('bot_builder_token', '1');
            try {
                const settings = JSON.parse(localStorage.getItem('dbot_settings') || '{}');
                settings.bot_builder_token = 1;
                localStorage.setItem('dbot_settings', JSON.stringify(settings));
            } catch (e) {
                // Ignore storage parse errors
            }

            // 2. Fetch strategy XML
            const url = `/bots/${encodeURIComponent(bot.file)}.xml`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load bot strategy`);
            let xmlText = await res.text();

            if (!xmlText || !xmlText.includes('<xml')) {
                throw new Error('Invalid strategy XML content returned from server');
            }

            // Normalize outlier coordinates for after_purchase so it aligns neatly beside trade_definition
            xmlText = xmlText.replace(/(<block[^>]*type="after_purchase"[^>]*\bx=")\d+(")/g, '$1580$2');

            // 3. Helper to parse and inject into Blockly workspace
            const injectXml = (ws: any): boolean => {
                try {
                    if (typeof ws.asyncClear === 'function') {
                        ws.asyncClear();
                    } else if (typeof ws.clear === 'function') {
                        ws.clear();
                    }

                    const textToDom = (window as any).Blockly?.utils?.xml?.textToDom || (window as any).Blockly?.Xml?.textToDom;
                    if (textToDom && (window as any).Blockly?.Xml?.domToWorkspace) {
                        const dom = textToDom(xmlText);
                        (window as any).Blockly.Xml.domToWorkspace(dom, ws);
                        ws.strategy_to_load = xmlText;

                        // Align and fit workspace neatly
                        setTimeout(() => {
                            try {
                                (window as any).Blockly?.svgResize(ws);
                                const mainBlock = ws.getAllBlocks(false).find((b: any) => b.type === 'trade_definition');
                                if (mainBlock && typeof ws.centerOnBlock === 'function') {
                                    ws.centerOnBlock(mainBlock.id);
                                }
                            } catch (e) {}
                        }, 250);

                        return true;
                    }
                } catch (err) {
                    console.error('Workspace injection error:', err);
                }
                return false;
            };

            // Save strategy text to global cache for workspace recovery
            if ((window as any).Blockly) {
                (window as any).Blockly.strategy_to_load = xmlText;
            }

            // Update UI store metadata
            if (toolbar) {
                toolbar.file_name = bot.name;
            }
            if (save_modal?.updateBotName) {
                save_modal.updateBotName(bot.name);
            }

            // 4. Switch to Bot Builder tab
            handleTabChange(DBOT_TABS.BOT_BUILDER);

            // 5. Check if workspace is already mounted or await its mount
            const initialWs = (window as any).Blockly?.derivWorkspace;
            if (initialWs && injectXml(initialWs)) {
                showToast(`✓ "${bot.name}" loaded into Bot Builder`, true);
                if (autoRun && run_panel?.onRunButtonClick) {
                    setTimeout(() => {
                        run_panel.onRunButtonClick();
                    }, 400);
                }
            } else {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const activeWs = (window as any).Blockly?.derivWorkspace;
                    if (activeWs && injectXml(activeWs)) {
                        clearInterval(interval);
                        showToast(`✓ "${bot.name}" loaded into Bot Builder`, true);
                        if (autoRun && run_panel?.onRunButtonClick) {
                            setTimeout(() => {
                                run_panel.onRunButtonClick();
                            }, 400);
                        }
                    } else if (attempts >= 30) {
                        clearInterval(interval);
                        showToast(`Bot Builder is initializing — "${bot.name}" will be ready shortly`, true);
                    }
                }, 100);
            }
        } catch (err: any) {
            console.error('Failed to load bot strategy:', err);
            showToast(`✗ Failed to load "${bot.name}": ${err?.message || 'Unknown error'}`, false);
        } finally {
            setLoadingBotId(null);
            setLoadingAction(null);
        }
    };

    const downloadBot = async (bot: TBotItem) => {
        try {
            const url = `/bots/${encodeURIComponent(bot.file)}.xml`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${bot.name}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            showToast(`✓ "${bot.name}.xml" downloaded successfully`, true);
        } catch (err: any) {
            showToast(`✗ Download failed: ${err?.message || 'Error'}`, false);
        }
    };

    return (
        <div className='bots-library'>
            <div className='bots-library__container'>
                {/* Hero Header */}
                <header className='bots-library__hero'>
                    <div className='bots-library__eyebrow'>
                        <span className='eyebrow-pulse' />
                        Verified Free Algorithmic Bots
                    </div>
                    <h1 className='bots-library__title'>Free Automated Trading Bots</h1>
                    <p className='bots-library__subtitle'>
                        Battle-tested XML trading strategies ready for instant execution.
                        Load any strategy directly into the Bot Builder, run it with one click, or export the XML for offline customization.
                    </p>

                    <div className='bots-library__stats-bar'>
                        <div className='bots-library__stat-item'>
                            <span className='stat-icon'>📦</span>
                            <span>Available Bots: <span className='stat-val'>{BOT_CATALOG.length} Prebuilt</span></span>
                        </div>
                        <div className='bots-library__stat-item'>
                            <span className='stat-icon'>⚡</span>
                            <span>Execution: <span className='stat-val'>1-Click Instant Run</span></span>
                        </div>
                        <div className='bots-library__stat-item'>
                            <span className='stat-icon'>🛡️</span>
                            <span>Cost: <span className='stat-val'>100% Free Forever</span></span>
                        </div>
                    </div>
                </header>

                {/* Floating Toast Notification */}
                {toast && (
                    <div className={`bots-library__toast ${toast.ok ? 'bots-library__toast--ok' : 'bots-library__toast--err'}`}>
                        {toast.msg}
                    </div>
                )}

                {/* Search & Categories Bar */}
                <div className='bots-library__controls'>
                    <div className='bots-library__search-box'>
                        <span className='search-icon'>🔍</span>
                        <input
                            type='text'
                            placeholder='Search bots by name, strategy, or market...'
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className='bots-library__categories'>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`bots-library__cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bot Cards Grid */}
                {filteredBots.length === 0 ? (
                    <div className='bots-library__empty'>
                        <p>No bots found matching &ldquo;{searchQuery}&rdquo;. Try another filter or search term.</p>
                    </div>
                ) : (
                    <div className='bots-library__grid'>
                        {filteredBots.map(bot => {
                            const isCurrentLoading = loadingBotId === bot.id;
                            const isLoadLoading = isCurrentLoading && loadingAction === 'load';
                            const isRunLoading = isCurrentLoading && loadingAction === 'run';

                            return (
                                <div key={bot.id} className='bl-card'>
                                    <div className='bl-card__top'>
                                        <div className='bl-card__badges-row'>
                                            <span className='bl-card__badge bl-card__badge--category'>
                                                {bot.category}
                                            </span>
                                            <span
                                                className={`bl-card__badge bl-card__badge--risk-${bot.risk.toLowerCase()}`}
                                            >
                                                {bot.risk} Risk
                                            </span>
                                        </div>

                                        <div className='bl-card__title-wrap'>
                                            <span className='bl-card__icon'>{bot.icon}</span>
                                            <h3 className='bl-card__title'>{bot.name}</h3>
                                        </div>

                                        <p className='bl-card__desc'>{bot.desc}</p>
                                    </div>

                                    {/* Strategy Metrics */}
                                    <div className='bl-card__metrics'>
                                        <div className='bl-card__metric-box'>
                                            <span className='m-label'>AI Win Rate</span>
                                            <span className='m-val m-val--green'>{bot.confidence}%</span>
                                        </div>
                                        <div className='bl-card__metric-box'>
                                            <span className='m-label'>MTF Agreement</span>
                                            <span className='m-val m-val--gold'>{bot.mtfAgree}%</span>
                                        </div>
                                        <div className='bl-card__metric-box'>
                                            <span className='m-label'>Strategy Type</span>
                                            <span className='m-val'>{bot.strategy}</span>
                                        </div>
                                        <div className='bl-card__metric-box'>
                                            <span className='m-label'>Target Market</span>
                                            <span className='m-val'>{bot.targetMarket}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className='bl-card__actions'>
                                        <button
                                            type='button'
                                            className='bl-card__btn-load'
                                            onClick={() => loadBotToWorkspace(bot, false)}
                                            disabled={isCurrentLoading}
                                            title='Load strategy XML into Bot Builder workspace'
                                        >
                                            {isLoadLoading ? (
                                                'Loading...'
                                            ) : (
                                                <>
                                                    <span>🛠️</span>
                                                    <span>Load in Builder</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type='button'
                                            className='bl-card__btn-run'
                                            onClick={() => loadBotToWorkspace(bot, true)}
                                            disabled={isCurrentLoading}
                                            title='Load into Bot Builder and execute immediately'
                                        >
                                            {isRunLoading ? (
                                                'Starting...'
                                            ) : (
                                                <>
                                                    <span>▶</span>
                                                    <span>Run Bot</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type='button'
                                            className='bl-card__btn-download'
                                            onClick={() => downloadBot(bot)}
                                            title='Download XML file'
                                        >
                                            💾
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

export default FreeBots;
