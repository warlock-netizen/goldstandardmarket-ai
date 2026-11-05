import React, { useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { contract_stages } from '@/constants/contract-stage';
import { getSymbolDisplayNameSync } from '@/utils/symbol-display-name';
import { Localize } from '@deriv-com/translations';

export const RunPanelController = observer(() => {
    const { run_panel, summary_card } = useStore();
    const {
        is_running,
        has_open_contract,
        contract_stage,
        is_stop_button_disabled,
        onRunButtonClick,
        onStopBotClick,
        onClickSell,
        stopBot,
    } = run_panel;
    const { contract_info } = summary_card;
    const [isExitingTrade, setIsExitingTrade] = useState(false);

    const is_active = is_running || has_open_contract || contract_stage > 0;

    const handleStopTradeBeforeTarget = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExitingTrade(true);
        try {
            // 1. If contract is open and eligible, sell immediately at market
            if (onClickSell) {
                onClickSell();
            }
        } catch (err) {
            console.warn('[RunPanelController] Could not sell contract at market:', err);
        }

        // 2. Halt bot execution immediately so no further cycles run
        try {
            if (onStopBotClick) {
                onStopBotClick();
            } else if (stopBot) {
                stopBot();
            }
        } catch (err) {
            console.warn('[RunPanelController] Could not stop bot:', err);
        }

        setTimeout(() => setIsExitingTrade(false), 2000);
    };

    const getStageText = () => {
        switch (contract_stage) {
            case contract_stages.STARTING:
                return 'Starting Bot...';
            case contract_stages.PURCHASE_SENT:
                return 'Sending order...';
            case contract_stages.PURCHASE_RECEIVED:
                return 'Trade active';
            case contract_stages.IS_STOPPING:
                return 'Stopping trading...';
            case contract_stages.CONTRACT_CLOSED:
                return 'Trade closed';
            case contract_stages.RUNNING:
                return 'Monitoring market';
            default:
                return is_active ? 'Bot active' : 'Bot is not running';
        }
    };

    const underlying_symbol = (contract_info as any)?.underlying_symbol || '';
    const symbol_display = underlying_symbol ? getSymbolDisplayNameSync(underlying_symbol) : '';
    const current_profit = contract_info?.profit;
    const currency = contract_info?.currency || 'USD';

    return (
        <div className='rpc-card' data-testid='dt_run_panel_controller'>
            {/* Header: Live Status Badge */}
            <div className='rpc-header'>
                <div className='rpc-status-wrapper'>
                    <span
                        className={classNames('rpc-dot', {
                            'rpc-dot--active': is_active,
                            'rpc-dot--idle': !is_active,
                        })}
                    />
                    <span className='rpc-title'>
                        {is_active ? (
                            <Localize i18n_default_text='BOT IS RUNNING' />
                        ) : (
                            <Localize i18n_default_text='BOT IS NOT RUNNING' />
                        )}
                    </span>
                </div>
                <span className='rpc-stage-badge'>{getStageText()}</span>
            </div>

            {/* Body Controls */}
            {!is_active ? (
                // Not Running State
                <div className='rpc-body'>
                    <button
                        type='button'
                        className='rpc-btn rpc-btn--run'
                        onClick={onRunButtonClick}
                        id='db-run-panel__controller-run-button'
                    >
                        <svg
                            className='rpc-btn__icon'
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                        >
                            <path d='M8 5v14l11-7z' />
                        </svg>
                        <span>
                            <Localize i18n_default_text='RUN BOT' />
                        </span>
                    </button>
                    <p className='rpc-note'>
                        <Localize i18n_default_text='Ready to trade. Press Run to execute automated trading conditions.' />
                    </p>
                </div>
            ) : (
                // Running State
                <div className='rpc-body rpc-body--running'>
                    {/* Active Contract Quick Display (if trade in progress) */}
                    {(has_open_contract || contract_info) && (
                        <div className='rpc-contract-hud'>
                            <div className='rpc-contract-hud__top'>
                                <span className='rpc-contract-hud__symbol'>
                                    {symbol_display || 'Active Contract'}
                                </span>
                                {current_profit !== undefined && (
                                    <span
                                        className={classNames('rpc-contract-hud__profit', {
                                            'rpc-contract-hud__profit--win': current_profit > 0,
                                            'rpc-contract-hud__profit--loss': current_profit < 0,
                                        })}
                                    >
                                        {current_profit > 0 ? '+' : ''}
                                        {current_profit} {currency}
                                    </span>
                                )}
                            </div>
                            <div className='rpc-contract-hud__bar'>
                                <div className='rpc-contract-hud__bar-inner' />
                            </div>
                        </div>
                    )}

                    {/* Dual Action Controls */}
                    <div className='rpc-actions'>
                        {/* Stop Bot Button */}
                        <button
                            type='button'
                            className='rpc-btn rpc-btn--stop'
                            onClick={onStopBotClick}
                            disabled={is_stop_button_disabled}
                            title='Stop the bot loop safely'
                        >
                            <svg
                                className='rpc-btn__icon'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='currentColor'
                            >
                                <rect x='6' y='6' width='12' height='12' rx='2' />
                            </svg>
                            <span>
                                <Localize i18n_default_text='Stop Bot' />
                            </span>
                        </button>

                        {/* Stop Trade / Early Exit Button */}
                        <button
                            type='button'
                            className={classNames('rpc-btn rpc-btn--exit-trade', {
                                'rpc-btn--loading': isExitingTrade,
                            })}
                            onClick={handleStopTradeBeforeTarget}
                            disabled={isExitingTrade}
                            title='Sell open contract at market & stop bot immediately before target'
                        >
                            <svg
                                className='rpc-btn__icon'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <circle cx='12' cy='12' r='10' />
                                <line x1='15' y1='9' x2='9' y2='15' />
                                <line x1='9' y1='9' x2='15' y2='15' />
                            </svg>
                            <span>
                                {isExitingTrade ? (
                                    <Localize i18n_default_text='Exiting...' />
                                ) : (
                                    <Localize i18n_default_text='Stop Trade (Exit)' />
                                )}
                            </span>
                        </button>
                    </div>

                    <p className='rpc-hint-trade'>
                        <Localize i18n_default_text='Tap "Stop Trade (Exit)" to close open contract at market before target is reached.' />
                    </p>
                </div>
            )}
        </div>
    );
});

export default RunPanelController;

