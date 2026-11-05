import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import {
    LabelPairedArrowRotateLeftMdRegularIcon,
    LabelPairedArrowRotateRightMdRegularIcon,
    LabelPairedArrowsRotateMdRegularIcon,
    LabelPairedChartLineMdRegularIcon,
    LabelPairedChartTradingviewMdRegularIcon,
    LabelPairedFloppyDiskMdRegularIcon,
    LabelPairedFolderOpenMdRegularIcon,
    LabelPairedMagnifyingGlassMinusMdRegularIcon,
    LabelPairedMagnifyingGlassPlusMdRegularIcon,
    LabelPairedObjectsAlignLeftMdRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';

export const WorkspaceGroup = observer(() => {
    const { dashboard, toolbar, load_modal, save_modal } = useStore();
    const { setPreviewOnPopup, setChartModalVisibility, setTradingViewModalVisibility } = dashboard;
    const { has_redo_stack, has_undo_stack, onResetClick, onSortClick, onUndoClick, onZoomInOutClick } = toolbar;
    const { toggleSaveModal } = save_modal;
    const { toggleLoadModal } = load_modal;
    const { isDesktop } = useDevice();

    // Tools dropdown
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);

    // % Stake dropdown
    const [isStakeOpen, setIsStakeOpen] = useState(false);
    const stakeRef = useRef<HTMLDivElement>(null);
    const [isStakeEnabled, setIsStakeEnabled] = useState(() => localStorage.getItem('toolbar_percent_stake_enabled') === 'true');
    const [stakeMode, setStakeMode] = useState(() => localStorage.getItem('toolbar_percent_stake_mode') || 'COMPOUND');
    const [stakeValue, setStakeValue] = useState(() => parseFloat(localStorage.getItem('toolbar_percent_stake_value') || '5'));
    const [stakeBase, setStakeBase] = useState(() => parseFloat(localStorage.getItem('toolbar_percent_stake_base') || '1'));
    const [stakeReset, setStakeReset] = useState(() => parseFloat(localStorage.getItem('toolbar_percent_stake_reset') || '3'));
    const [martingaleMultiplier, setMartingaleMultiplier] = useState(() => parseFloat(localStorage.getItem('toolbar_martingale_multiplier') || '2'));
    const [martingaleMax, setMartingaleMax] = useState(() => parseFloat(localStorage.getItem('toolbar_martingale_max') || '0'));

    // ChartLord AI dropdown
    const [isChartLordOpen, setIsChartLordOpen] = useState(false);
    const chartLordRef = useRef<HTMLDivElement>(null);
    const [isChartLordEnabled, setIsChartLordEnabled] = useState(() => localStorage.getItem('toolbar_chartlord_enabled') === 'true');
    const [chartLordCondition, setChartLordCondition] = useState(() => localStorage.getItem('toolbar_chartlord_condition') || 'ABOVE');
    const [chartLordTicks, setChartLordTicks] = useState(() => parseInt(localStorage.getItem('toolbar_chartlord_ticks') || '50', 10));
    const [chartLordThreshold, setChartLordThreshold] = useState(() => parseInt(localStorage.getItem('toolbar_chartlord_threshold') || '60', 10));
    const [chartLordBarrier, setChartLordBarrier] = useState(() => localStorage.getItem('toolbar_chartlord_barrier') || '5');
    const [chartLordMultiMarket, setChartLordMultiMarket] = useState(() => localStorage.getItem('toolbar_chartlord_multi_market') === 'true');

    // Athena Pattern Filter
    const [isAthenaEnabled, setIsAthenaEnabled] = useState(() => !!localStorage.getItem('toolbar_entry_strategy'));
    const [athenaStrategy, setAthenaStrategy] = useState(() => localStorage.getItem('toolbar_entry_strategy') || 'OSAMOVER1');
    const [athenaBarrier, setAthenaBarrier] = useState(() => parseInt(localStorage.getItem('toolbar_entry_barrier') || '1', 10));
    const [athenaLookback, setAthenaLookback] = useState(() => parseInt(localStorage.getItem('toolbar_entry_lookback') || '1000', 10));

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
                setIsToolsOpen(false);
            }
            if (stakeRef.current && !stakeRef.current.contains(e.target as Node)) {
                setIsStakeOpen(false);
            }
            if (chartLordRef.current && !chartLordRef.current.contains(e.target as Node)) {
                setIsChartLordOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saveStakeSettings = (enabled: boolean, mode: string, val: number, base: number, reset: number, mult: number, max: number) => {
        if (enabled) {
            localStorage.setItem('toolbar_percent_stake_enabled', 'true');
            localStorage.setItem('toolbar_percent_stake_mode', mode);
            localStorage.setItem('toolbar_percent_stake_value', String(val));
            localStorage.setItem('toolbar_percent_stake_base', String(base));
            localStorage.setItem('toolbar_percent_stake_reset', String(reset));
            localStorage.setItem('toolbar_martingale_multiplier', String(mult));
            localStorage.setItem('toolbar_martingale_max', String(max));
        } else {
            [
                'toolbar_percent_stake_enabled',
                'toolbar_percent_stake_mode',
                'toolbar_percent_stake_value',
                'toolbar_percent_stake_base',
                'toolbar_percent_stake_reset',
                'toolbar_martingale_multiplier',
                'toolbar_martingale_max',
            ].forEach(k => localStorage.removeItem(k));
        }
    };

    const saveChartLordSettings = (enabled: boolean, cond: string, ticks: number, thresh: number, barr: string, multi: boolean) => {
        if (enabled) {
            localStorage.setItem('toolbar_chartlord_enabled', 'true');
            localStorage.setItem('toolbar_chartlord_condition', cond);
            localStorage.setItem('toolbar_chartlord_ticks', String(ticks));
            localStorage.setItem('toolbar_chartlord_threshold', String(thresh));
            localStorage.setItem('toolbar_chartlord_barrier', barr);
            localStorage.setItem('toolbar_chartlord_multi_market', String(multi));
        } else {
            [
                'toolbar_chartlord_enabled',
                'toolbar_chartlord_condition',
                'toolbar_chartlord_ticks',
                'toolbar_chartlord_threshold',
                'toolbar_chartlord_barrier',
                'toolbar_chartlord_multi_market',
            ].forEach(k => localStorage.removeItem(k));
        }
    };

    const saveAthenaSettings = (enabled: boolean, strat: string, barr: number, lookback: number) => {
        if (enabled && strat !== 'NONE') {
            localStorage.setItem('toolbar_entry_strategy', strat);
            localStorage.setItem('toolbar_entry_barrier', String(barr));
            localStorage.setItem('toolbar_entry_lookback', String(lookback));
        } else {
            localStorage.removeItem('toolbar_entry_strategy');
            localStorage.removeItem('toolbar_entry_barrier');
            localStorage.removeItem('toolbar_entry_lookback');
        }
    };

    return (
        <div className='toolbar__wrapper'>
            <div className='toolbar__group toolbar__group-btn' data-testid='dt_toolbar_group_btn'>
                {/* 1. Tools Dropdown */}
                <div className='toolbar__tools-dropdown' ref={toolsRef}>
                    <button
                        className={classNames('toolbar__tools-btn', { 'toolbar__tools-btn--open': isToolsOpen })}
                        onClick={() => setIsToolsOpen(prev => !prev)}
                        title='Workspace tools'
                    >
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
                            <rect x='3' y='3' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
                            <rect x='14' y='3' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
                            <rect x='3' y='14' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
                            <rect x='14' y='14' width='7' height='7' rx='1.5' stroke='currentColor' strokeWidth='1.8' />
                        </svg>
                        <span className='toolbar__tools-label'>Tools</span>
                        <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            fill='none'
                            style={{ transform: isToolsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                            <path d='M6 9l6 6 6-6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                    </button>

                    {isToolsOpen && (
                        <div className='toolbar__tools-panel'>
                            <div className='toolbar__tools-row'>
                                <button className='toolbar__tools-item' onClick={() => { onResetClick(); setIsToolsOpen(false); }} title='Reset'>
                                    <LabelPairedArrowsRotateMdRegularIcon />
                                    <span>Reset</span>
                                </button>
                                <button className='toolbar__tools-item' onClick={() => { setPreviewOnPopup(true); toggleLoadModal(); setIsToolsOpen(false); }} title='Import'>
                                    <LabelPairedFolderOpenMdRegularIcon />
                                    <span>Import</span>
                                </button>
                                <button className='toolbar__tools-item' onClick={() => { toggleSaveModal(); setIsToolsOpen(false); }} title='Save'>
                                    <LabelPairedFloppyDiskMdRegularIcon />
                                    <span>Save</span>
                                </button>
                                <button className='toolbar__tools-item' onClick={() => { onSortClick(); setIsToolsOpen(false); }} title='Sort blocks'>
                                    <LabelPairedObjectsAlignLeftMdRegularIcon />
                                    <span>Sort</span>
                                </button>
                            </div>
                            <div className='toolbar__tools-divider' />
                            <div className='toolbar__tools-row'>
                                {isDesktop && (
                                    <>
                                        <button className='toolbar__tools-item' onClick={() => { setChartModalVisibility(); setIsToolsOpen(false); }} title='Charts'>
                                            <LabelPairedChartLineMdRegularIcon />
                                            <span>Charts</span>
                                        </button>
                                        <button className='toolbar__tools-item' onClick={() => { setTradingViewModalVisibility(); setIsToolsOpen(false); }} title='TradingView'>
                                            <LabelPairedChartTradingviewMdRegularIcon />
                                            <span>TV Chart</span>
                                        </button>
                                    </>
                                )}
                                <button
                                    className={classNames('toolbar__tools-item', { 'toolbar__tools-item--disabled': !has_undo_stack })}
                                    onClick={() => { if (has_undo_stack) { onUndoClick(false); setIsToolsOpen(false); } }}
                                    title='Undo'
                                >
                                    <LabelPairedArrowRotateLeftMdRegularIcon />
                                    <span>Undo</span>
                                </button>
                                <button
                                    className={classNames('toolbar__tools-item', { 'toolbar__tools-item--disabled': !has_redo_stack })}
                                    onClick={() => { if (has_redo_stack) { onUndoClick(true); setIsToolsOpen(false); } }}
                                    title='Redo'
                                >
                                    <LabelPairedArrowRotateRightMdRegularIcon />
                                    <span>Redo</span>
                                </button>
                                <button className='toolbar__tools-item' onClick={() => { onZoomInOutClick(true); setIsToolsOpen(false); }} title='Zoom in'>
                                    <LabelPairedMagnifyingGlassPlusMdRegularIcon />
                                    <span>Zoom +</span>
                                </button>
                                <button className='toolbar__tools-item' onClick={() => { onZoomInOutClick(false); setIsToolsOpen(false); }} title='Zoom out'>
                                    <LabelPairedMagnifyingGlassMinusMdRegularIcon />
                                    <span>Zoom -</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className='vertical-divider' />

                {/* 2. % Stake Dropdown */}
                <div className='toolbar__tools-dropdown' ref={stakeRef}>
                    <button
                        className={classNames('toolbar__tools-btn', {
                            'toolbar__tools-btn--open': isStakeOpen,
                            'toolbar__bot-switcher-btn--active': isStakeEnabled,
                        })}
                        onClick={() => setIsStakeOpen(prev => !prev)}
                        title='% Stake — dynamic stake sizing'
                    >
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
                            <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='1.8' />
                            <path d='M8 12h8M12 8v8' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
                        </svg>
                        <span className='toolbar__tools-label' style={{ color: isStakeEnabled ? 'var(--brand-red-coral, #e11d48)' : undefined }}>
                            % Stake{isStakeEnabled ? ` (${stakeValue}%)` : ''}
                        </span>
                        <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            fill='none'
                            style={{ transform: isStakeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                            <path d='M6 9l6 6 6-6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                    </button>

                    {isStakeOpen && (
                        <div className='toolbar__tools-panel' style={{ minWidth: 260 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>Dynamic % Stake</span>
                                <button
                                    className={classNames('toolbar__bot-switcher-btn', { 'toolbar__bot-switcher-btn--active': isStakeEnabled })}
                                    style={{ padding: '3px 10px' }}
                                    onClick={() => {
                                        const next = !isStakeEnabled;
                                        setIsStakeEnabled(next);
                                        saveStakeSettings(next, stakeMode, stakeValue, stakeBase, stakeReset, martingaleMultiplier, martingaleMax);
                                    }}
                                >
                                    {isStakeEnabled ? 'ON' : 'OFF'}
                                    <span className={classNames('toolbar__bot-switcher-toggle', { 'toolbar__bot-switcher-toggle--on': isStakeEnabled })} />
                                </button>
                            </div>
                            <div className='toolbar__tools-divider' />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Mode</label>
                                <select
                                    className='toolbar__speed-select'
                                    value={stakeMode}
                                    onChange={e => {
                                        setStakeMode(e.target.value);
                                        saveStakeSettings(isStakeEnabled, e.target.value, stakeValue, stakeBase, stakeReset, martingaleMultiplier, martingaleMax);
                                    }}
                                >
                                    <option value='COMPOUND'>Compounding (% of balance)</option>
                                    <option value='FIXED'>Fixed percentage</option>
                                    <option value='MARTINGALE'>Martingale recovery</option>
                                </select>

                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Stake %</label>
                                <input
                                    type='number'
                                    min='0.1'
                                    max='100'
                                    step='0.5'
                                    className='toolbar__speed-select'
                                    value={stakeValue}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 1;
                                        setStakeValue(val);
                                        saveStakeSettings(isStakeEnabled, stakeMode, val, stakeBase, stakeReset, martingaleMultiplier, martingaleMax);
                                    }}
                                />

                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Base stake</label>
                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.5'
                                    className='toolbar__speed-select'
                                    value={stakeBase}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 0.35;
                                        setStakeBase(val);
                                        saveStakeSettings(isStakeEnabled, stakeMode, stakeValue, val, stakeReset, martingaleMultiplier, martingaleMax);
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className='vertical-divider' />

                {/* 3. ChartLord AI Dropdown */}
                <div className='toolbar__tools-dropdown' ref={chartLordRef}>
                    <button
                        className={classNames('toolbar__tools-btn', {
                            'toolbar__tools-btn--open': isChartLordOpen,
                            'toolbar__bot-switcher-btn--active': isChartLordEnabled,
                        })}
                        onClick={() => setIsChartLordOpen(prev => !prev)}
                        title='ChartLord AI — market analysis filter'
                    >
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
                            <circle cx='12' cy='12' r='3' fill='currentColor' opacity='0.8' />
                            <path d='M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                        </svg>
                        <span className='toolbar__tools-label' style={{ color: isChartLordEnabled ? 'var(--brand-red-coral, #e11d48)' : undefined }}>
                            ChartLord{isChartLordEnabled ? ' ●' : ''}
                        </span>
                        <svg
                            width='10'
                            height='10'
                            viewBox='0 0 24 24'
                            fill='none'
                            style={{ transform: isChartLordOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                            <path d='M6 9l6 6 6-6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                    </button>

                    {isChartLordOpen && (
                        <div className='toolbar__tools-panel' style={{ minWidth: 280 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>ChartLord AI</span>
                                <button
                                    className={classNames('toolbar__bot-switcher-btn', { 'toolbar__bot-switcher-btn--active': isChartLordEnabled })}
                                    style={{ padding: '3px 10px' }}
                                    onClick={() => {
                                        const next = !isChartLordEnabled;
                                        setIsChartLordEnabled(next);
                                        saveChartLordSettings(next, chartLordCondition, chartLordTicks, chartLordThreshold, chartLordBarrier, chartLordMultiMarket);
                                    }}
                                >
                                    {isChartLordEnabled ? 'ON' : 'OFF'}
                                    <span className={classNames('toolbar__bot-switcher-toggle', { 'toolbar__bot-switcher-toggle--on': isChartLordEnabled })} />
                                </button>
                            </div>
                            <div className='toolbar__tools-divider' />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Condition</label>
                                <select
                                    className='toolbar__speed-select'
                                    value={chartLordCondition}
                                    onChange={e => {
                                        setChartLordCondition(e.target.value);
                                        saveChartLordSettings(isChartLordEnabled, e.target.value, chartLordTicks, chartLordThreshold, chartLordBarrier, chartLordMultiMarket);
                                    }}
                                >
                                    <option value='ABOVE'>Score ABOVE threshold</option>
                                    <option value='BELOW'>Score BELOW threshold</option>
                                </select>

                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Threshold %</label>
                                <input
                                    type='number'
                                    min='1'
                                    max='100'
                                    step='1'
                                    className='toolbar__speed-select'
                                    value={chartLordThreshold}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10) || 60;
                                        setChartLordThreshold(val);
                                        saveChartLordSettings(isChartLordEnabled, chartLordCondition, chartLordTicks, val, chartLordBarrier, chartLordMultiMarket);
                                    }}
                                />

                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Ticks to analyse</label>
                                <select
                                    className='toolbar__speed-select toolbar__speed-select--small'
                                    value={chartLordTicks}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        setChartLordTicks(val);
                                        saveChartLordSettings(isChartLordEnabled, chartLordCondition, val, chartLordThreshold, chartLordBarrier, chartLordMultiMarket);
                                    }}
                                >
                                    {[10, 20, 30, 50, 100, 200, 500].map(n => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>

                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Barrier / Target</label>
                                <select
                                    className='toolbar__speed-select'
                                    value={chartLordBarrier}
                                    onChange={e => {
                                        setChartLordBarrier(e.target.value);
                                        saveChartLordSettings(isChartLordEnabled, chartLordCondition, chartLordTicks, chartLordThreshold, e.target.value, chartLordMultiMarket);
                                    }}
                                >
                                    {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                                        <option key={d} value={d}>
                                            Digit {d}
                                        </option>
                                    ))}
                                    <option value='EVEN'>Even</option>
                                    <option value='ODD'>Odd</option>
                                    <option value='BOTH'>Both (auto-pick)</option>
                                    <option value='DIFF'>Differ (auto-digit)</option>
                                    <option value='RISE'>Rise</option>
                                    <option value='FALL'>Fall</option>
                                </select>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-less-prominent, #6b7280)' }}>Scan all markets</label>
                                    <button
                                        className={classNames('toolbar__bot-switcher-btn', { 'toolbar__bot-switcher-btn--active': chartLordMultiMarket })}
                                        style={{ padding: '3px 10px' }}
                                        onClick={() => {
                                            const next = !chartLordMultiMarket;
                                            setChartLordMultiMarket(next);
                                            saveChartLordSettings(isChartLordEnabled, chartLordCondition, chartLordTicks, chartLordThreshold, chartLordBarrier, next);
                                        }}
                                    >
                                        {chartLordMultiMarket ? 'ON' : 'OFF'}
                                        <span className={classNames('toolbar__bot-switcher-toggle', { 'toolbar__bot-switcher-toggle--on': chartLordMultiMarket })} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='vertical-divider' />

                {/* 4. Strategy Button */}
                <div className='toolbar__group toolbar__bot-switcher-group'>
                    <button
                        className='toolbar__bot-switcher-btn'
                        onClick={() => {
                            dashboard.setActiveTab(DBOT_TABS.FREE_BOT);
                        }}
                        title='Open Strategy / Free Bots Library'
                    >
                        <span className='toolbar__bot-switcher-icon'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
                                <path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                        </span>
                        <span className='toolbar__bot-switcher-label'>Strategy</span>
                    </button>
                </div>

                <div className='vertical-divider' />

                {/* 5. Athena Pattern Filter */}
                <div className='toolbar__group toolbar__bot-switcher-group'>
                    <button
                        className={classNames('toolbar__bot-switcher-btn', { 'toolbar__bot-switcher-btn--active': isAthenaEnabled })}
                        onClick={() => {
                            const next = !isAthenaEnabled;
                            setIsAthenaEnabled(next);
                            saveAthenaSettings(next, athenaStrategy, athenaBarrier, athenaLookback);
                        }}
                        title='Filter trade entries using Athena pattern analysis'
                    >
                        <span className='toolbar__bot-switcher-icon'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none'>
                                <path d='M3 4h18M7 8h10M11 12h2M9 16h6M5 20h14' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                            </svg>
                        </span>
                        <span className='toolbar__bot-switcher-label'>Athena</span>
                        <span className={classNames('toolbar__bot-switcher-toggle', { 'toolbar__bot-switcher-toggle--on': isAthenaEnabled })} />
                    </button>
                </div>

                {isAthenaEnabled && (
                    <React.Fragment>
                        <div className='vertical-divider' />
                        <div className='toolbar__group toolbar__speed-inline-group'>
                            <select
                                className='toolbar__speed-select'
                                value={athenaStrategy}
                                onChange={e => {
                                    setAthenaStrategy(e.target.value);
                                    saveAthenaSettings(true, e.target.value, athenaBarrier, athenaLookback);
                                }}
                            >
                                <option value='OSAMOVER1'>Osam Over 1</option>
                                <option value='OSAMUNDER8'>Osam Under 8</option>
                                <option value='OSAMHNREVEN'>Osam HNR Even</option>
                                <option value='OSAMHNRODD'>Osam HNR Odd</option>
                                <option value='OSAMASTROEO'>Osam Astro E/O</option>
                                <option value='OSAMOVER2PRO'>Osam Over 2 Pro</option>
                                <option value='OSAMUNDER7PRO'>Osam Under 7 Pro</option>
                            </select>
                        </div>

                        <div className='toolbar__group toolbar__speed-inline-group'>
                            <label className='toolbar__speed-label'>Barrier:</label>
                            <select
                                className='toolbar__speed-select toolbar__speed-select--small'
                                value={athenaBarrier}
                                onChange={e => {
                                    const val = parseInt(e.target.value, 10);
                                    setAthenaBarrier(val);
                                    saveAthenaSettings(true, athenaStrategy, val, athenaLookback);
                                }}
                            >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
});

export default WorkspaceGroup;
