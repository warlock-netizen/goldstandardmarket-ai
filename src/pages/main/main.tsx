import React, { lazy, Suspense, useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import { generateOAuthURL } from '@/components/shared';
import DesktopWrapper from '@/components/shared_ui/desktop-wrapper';
import Dialog from '@/components/shared_ui/dialog';
import MobileWrapper from '@/components/shared_ui/mobile-wrapper';
import Tabs from '@/components/shared_ui/tabs/tabs';
import TradeTypeConfirmationModal from '@/components/trade-type-confirmation-modal';
import TradingViewModal from '@/components/trading-view-chart/trading-view-modal';
import { DBOT_TABS, TAB_IDS } from '@/constants/bot-contents';
import { api_base, updateWorkspaceName } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { isDbotRTL } from '@/external/bot-skeleton/utils/workspace';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import {
    disableUrlParameterApplication,
    enableUrlParameterApplication,
    setupTradeTypeChangeListener,
} from '@/utils/blockly-url-param-handler';
import {
    checkAndShowTradeTypeModal,
    getModalState,
    handleTradeTypeCancel,
    handleTradeTypeConfirm,
    resetUrlParamProcessing,
    setModalStateChangeCallback,
} from '@/utils/trade-type-modal-handler';
import { LegacyGuide1pxIcon } from '@deriv/quill-icons/Legacy';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import RunPanel from '../../components/run-panel';
import ChartModal from '../chart/chart-modal';
import DashboardV2 from '../dashboard/dashboard-v2';
import FreeBots from '../free-bots';
import PegasusAi from '../pegasus-ai';
import { PegasusActivatedModal } from '../pegasus-ai/pegasus-activated-modal';
import { PegasusVictoryModal } from '../pegasus-ai/pegasus-victory-modal';
import { AiLiveHud } from '../pegasus-ai/ai-live-hud';
import { pegasusAudio } from '../pegasus-ai/pegasus-audio';
import RunStrategy from '../dashboard/run-strategy';
import './custom-live-styles.scss';
import './main.scss';

const ChartWrapper = lazy(() => import('../chart/chart-wrapper'));
const Tutorial = lazy(() => import('../tutorials'));

const AppWrapper = observer(() => {
    const { connectionStatus } = useApiBase();
    const { dashboard, load_modal, run_panel, quick_strategy, summary_card, blockly_store } = useStore();
    const { is_loading } = blockly_store;
    const {
        active_tab,
        active_tour,
        is_chart_modal_visible,
        is_trading_view_modal_visible,
        setActiveTab,
        setWebSocketState,
        setActiveTour,
        setTourDialogVisibility,
    } = dashboard;
    const { dashboard_strategies } = load_modal;
    const {
        is_dialog_open,
        is_drawer_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
        stopBot,
    } = run_panel;
    const { is_open } = quick_strategy;
    const { cancel_button_text, ok_button_text, title, message, dismissable, is_closed_on_cancel } = dialog_options as {
        [key: string]: string;
    };
    const { clear } = summary_card;
    const { DASHBOARD, BOT_BUILDER } = DBOT_TABS;
    const init_render = React.useRef(true);
    const hash = ['dashboard', 'bot_builder', 'free_bot', 'chart', 'tutorial', 'pegasus_ai'];
    const { isDesktop } = useDevice();
    const location = useLocation();
    const navigate = useNavigate();
    const [left_tab_shadow, setLeftTabShadow] = useState<boolean>(false);
    const [right_tab_shadow, setRightTabShadow] = useState<boolean>(false);

    // Pegasus AI Modal States
    const [is_pegasus_activated_open, setIsPegasusActivatedOpen] = useState<boolean>(false);
    const [is_victory_modal_open, setIsVictoryModalOpen] = useState<boolean>(false);
    const [pegasus_victory_amount, setPegasusVictoryAmount] = useState<string | number>('556.32');

    // Trade type modal state
    const [tradeTypeModalState, setTradeTypeModalState] = useState(getModalState());

    const getTradeTypeModalProps = () => {
        const { tradeTypeData } = tradeTypeModalState;

        return {
            is_visible: tradeTypeModalState.isVisible,
            trade_type_display_name: tradeTypeData?.displayName || '',
            current_trade_type: tradeTypeData?.currentTradeType
                ? `${tradeTypeData.currentTradeType.tradeTypeCategory}/${tradeTypeData.currentTradeType.tradeType}`
                : 'N/A',
            current_trade_type_display_name: tradeTypeData?.currentTradeTypeDisplayName || 'N/A',
            onConfirm: handleTradeTypeConfirm,
            onCancel: handleTradeTypeCancel,
        };
    };

    let tab_value: number | string = active_tab;
    const GetHashedValue = (tab: number) => {
        tab_value = location.hash?.split('#')[1];
        if (!tab_value) return tab;
        const index = hash.indexOf(String(tab_value));
        return index >= 0 ? index : tab;
    };
    const active_hash_tab = GetHashedValue(active_tab);

    // Set up modal state change listener
    React.useEffect(() => {
        setModalStateChangeCallback(new_state => {
            setTradeTypeModalState(new_state);
        });
    }, [is_loading]);

    // Reset URL parameter processing when location changes
    React.useEffect(() => {
        resetUrlParamProcessing();
    }, [location.search]);

    // Set up Pegasus AI event listeners & profit/loss target monitoring
    React.useEffect(() => {
        const handleProfitHit = (e: any) => {
            const msg = e?.detail?.message || '';
            const match = msg.match(/hit a profit of\s+([0-9.,]+)/i);
            const amount = match ? match[1] : (e?.detail?.profit || '556.32');
            setPegasusVictoryAmount(amount);
            setIsVictoryModalOpen(true);
            pegasusAudio.playVictoryFanfare();
            if (run_panel.is_running) {
                run_panel.stopBot();
            }
        };

        const handlePegasusHandoff = () => {
            setIsPegasusActivatedOpen(true);
        };

        window.addEventListener('gsm:pegasus-profit-target-hit', handleProfitHit);
        window.addEventListener('gsm:pegasus-activated-modal-open', handlePegasusHandoff);

        return () => {
            window.removeEventListener('gsm:pegasus-profit-target-hit', handleProfitHit);
            window.removeEventListener('gsm:pegasus-activated-modal-open', handlePegasusHandoff);
        };
    }, [run_panel]);

    React.useEffect(() => {
        const isPegasusActive = localStorage.getItem('pegasus_is_active') === 'true';
        const targetTp = parseFloat(localStorage.getItem('pegasus_active_take_profit') || localStorage.getItem('pegasus_input_tp') || '0');
        const stopLoss = parseFloat(localStorage.getItem('pegasus_active_stop_loss') || localStorage.getItem('pegasus_input_sl') || '0');

        if (isPegasusActive && run_panel.is_running) {
            if (targetTp > 0 && summary_card.profit >= targetTp) {
                run_panel.stopBot();
                setPegasusVictoryAmount(summary_card.profit.toFixed(2));
                setIsVictoryModalOpen(true);
                pegasusAudio.playVictoryFanfare();
                localStorage.removeItem('pegasus_is_active');
            } else if (stopLoss > 0 && summary_card.profit <= -stopLoss) {
                run_panel.stopBot();
                pegasusAudio.playStopLossAlert();
                localStorage.removeItem('pegasus_is_active');
            }
        }
    }, [summary_card.profit, run_panel.is_running, run_panel]);

    React.useEffect(() => {
        const el_dashboard = document.getElementById('id-dbot-dashboard');
        const el_tutorial = document.getElementById('id-tutorials');
        const list_header = document.querySelector('.dc-tabs__list--main__tabs');
        if (!el_dashboard || !el_tutorial || !list_header) return;

        const observer_dashboard = new window.IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLeftTabShadow(false);
                    return;
                }
                setLeftTabShadow(true);
            },
            {
                root: list_header,
                threshold: 0.5,
            }
        );

        const observer_tutorial = new window.IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setRightTabShadow(false);
                    return;
                }
                setRightTabShadow(true);
            },
            {
                root: list_header,
                threshold: 0.5,
            }
        );
        observer_dashboard.observe(el_dashboard);
        observer_tutorial.observe(el_tutorial);

        return () => {
            observer_dashboard.disconnect();
            observer_tutorial.disconnect();
        };
    }, []);

    React.useEffect(() => {
        if (connectionStatus !== CONNECTION_STATUS.OPENED) {
            const is_bot_running = document.getElementById('db-animation__stop-button') !== null;
            if (is_bot_running) {
                clear();
                stopBot();
                api_base.setIsRunning(false);
                setWebSocketState(false);
            }
        }
    }, [clear, connectionStatus, setWebSocketState, stopBot]);

    const updateTabShadowsHeight = () => {
        const botBuilderEl = document.getElementById('id-bot-builder');
        const leftShadow = document.querySelector('.tabs-shadow--left') as HTMLElement;
        const rightShadow = document.querySelector('.tabs-shadow--right') as HTMLElement;

        if (botBuilderEl && leftShadow && rightShadow) {
            const height = botBuilderEl.offsetHeight;
            leftShadow.style.height = `${height}px`;
            rightShadow.style.height = `${height}px`;
        }
    };

    React.useEffect(() => {
        let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;

        if (active_tab === BOT_BUILDER) {
            requestAnimationFrame(() => {
                disableUrlParameterApplication();
                setupTradeTypeChangeListener();

                const handleTradeTypeModal = () => {
                    checkAndShowTradeTypeModal(
                        () => {
                            enableUrlParameterApplication();
                        },
                        () => {}
                    );
                };

                if (!blockly_store.is_loading) {
                    setTimeout(() => {
                        handleTradeTypeModal();
                    }, 500);
                } else {
                    let pollAttempts = 0;
                    const maxPollAttempts = 10;

                    const checkBlocklyLoaded = () => {
                        if (!blockly_store.is_loading) {
                            handleTradeTypeModal();
                            return;
                        }

                        if (pollAttempts < maxPollAttempts) {
                            pollAttempts++;
                            pollTimeoutId = setTimeout(checkBlocklyLoaded, 500);
                        }
                    };

                    checkBlocklyLoaded();
                }
            });
        }

        return () => {
            if (pollTimeoutId) {
                clearTimeout(pollTimeoutId);
                pollTimeoutId = null;
            }
        };
    }, [active_tab, is_loading]);

    React.useEffect(() => {
        updateTabShadowsHeight();

        if (is_open) {
            setTourDialogVisibility(false);
        }
        if (init_render.current) {
            setActiveTab(Number(active_hash_tab));
            if (!isDesktop) handleTabChange(Number(active_hash_tab));
            init_render.current = false;
        } else {
            const currentSearch = window.location.search;
            navigate(`${currentSearch}#${hash[active_tab] || hash[0]}`);
        }
        if (active_tour !== '') {
            setActiveTour('');
        }

        const mainElement = document.querySelector('.main__container');
        if (active_tab === DBOT_TABS.TUTORIAL && !isDesktop) {
            document.body.style.overflow = 'hidden';
            if (mainElement instanceof HTMLElement) {
                mainElement.classList.add('no-scroll');
            }
        } else {
            document.body.style.overflow = '';
            if (mainElement instanceof HTMLElement) {
                mainElement.classList.remove('no-scroll');
            }
        }
    }, [active_tab]);

    React.useEffect(() => {
        const trashcan_init_id = setTimeout(() => {
            if (active_tab === BOT_BUILDER && Blockly?.derivWorkspace?.trashcan) {
                const trashcanY = window.innerHeight - 250;
                let trashcanX;
                if (is_drawer_open) {
                    trashcanX = isDbotRTL() ? 380 : window.innerWidth - 460;
                } else {
                    trashcanX = isDbotRTL() ? 20 : window.innerWidth - 100;
                }
                Blockly?.derivWorkspace?.trashcan?.setTrashcanPosition(trashcanX, trashcanY);
            }
        }, 100);

        return () => {
            clearTimeout(trashcan_init_id);
        };
    }, [active_tab, is_drawer_open]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (dashboard_strategies.length > 0) {
            timer = setTimeout(() => {
                updateWorkspaceName();
            });
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [dashboard_strategies, active_tab]);

    const handleTabChange = React.useCallback(
        (tab_index: number) => {
            setActiveTab(tab_index);
            const targetHash = hash[tab_index];
            if (targetHash) {
                window.location.hash = `#${targetHash}`;
            } else {
                try {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                } catch (e) {
                    window.location.hash = '';
                }
            }
            const el_id = TAB_IDS[tab_index];
            if (el_id) {
                const el_tab = document.getElementById(el_id);
                setTimeout(() => {
                    el_tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }, 10);
            }
        },
        [active_tab]
    );

    const handleLoginGeneration = async () => {
        try {
            const url = await generateOAuthURL();
            if (url) {
                window.location.replace(url);
            } else {
                console.error('Failed to generate OAuth URL');
            }
        } catch (e) {
            console.error('Error initiating login:', e);
        }
    };

    const is_pegasus_active = active_tab === DBOT_TABS.PEGASUS_AI;

    return (
        <React.Fragment>
            <div className={classNames('main', { 'main--pegasus': is_pegasus_active })}>
                <div
                    className={classNames('main__container', {
                        'main__container--active': active_tour && active_tab === DASHBOARD && !isDesktop,
                    })}
                >
                    <div>
                        {!isDesktop && left_tab_shadow && <span className='tabs-shadow tabs-shadow--left' />}
                        <Tabs
                            active_index={active_tab}
                            className='main__tabs'
                            onTabItemClick={handleTabChange}
                            top
                        >
                            <div
                                label={
                                    <>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='24px' height='24px' viewBox='0 0 11 18' role='img' fill='var(--text-general)'>
                                            <path d='M1.375 5A.385.385 0 0 0 1 5.375v3.75c0 .21.164.375.375.375h2.25A.385.385 0 0 0 4 9.125v-3.75A.4.4 0 0 0 3.625 5zM.25 5.375c0-.61.492-1.125 1.125-1.125h2.25c.61 0 1.125.516 1.125 1.125v3.75c0 .633-.516 1.125-1.125 1.125h-2.25A1.11 1.11 0 0 1 .25 9.125zM7.375 9.5A.385.385 0 0 0 7 9.875v3.75c0 .21.164.375.375.375h2.25a.385.385 0 0 0 .375-.375v-3.75a.4.4 0 0 0-.375-.375zm-1.125.375c0-.61.492-1.125 1.125-1.125h2.25c.61 0 1.125.516 1.125 1.125v3.75c0 .633-.516 1.125-1.125 1.125h-2.25a1.11 1.11 0 0 1-1.125-1.125zM3.625 11.75h-2.25a.385.385 0 0 0-.375.375v1.5c0 .21.164.375.375.375h2.25A.385.385 0 0 0 4 13.625v-1.5a.4.4 0 0 0-.375-.375M1.375 11h2.25c.61 0 1.125.516 1.125 1.125v1.5c0 .633-.516 1.125-1.125 1.125h-2.25A1.11 1.11 0 0 1 .25 13.625v-1.5C.25 11.515.742 11 1.375 11m6-6A.385.385 0 0 0 7 5.375v1.5c0 .21.164.375.375.375h2.25A.385.385 0 0 0 10 6.875v-1.5A.4.4 0 0 0 9.625 5zm-1.125.375c0-.61.492-1.125 1.125-1.125h2.25c.61 0 1.125.516 1.125 1.125v1.5C10.75 7.508 10.234 8 9.625 8h-2.25A1.11 1.11 0 0 1 6.25 6.875z' />
                                        </svg>
                                        <Localize i18n_default_text='Dashboard' />
                                    </>
                                }
                                id='id-dbot-dashboard'
                            >
                                <DashboardV2 handleTabChange={handleTabChange} />
                            </div>

                            <div
                                label={
                                    <>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='24px' height='24px' viewBox='0 0 12 18' role='img' fill='var(--text-general)'>
                                            <path d='M10.43 11.516c.258.234.422.562.422.96 0 .399-.165.727-.422.961-.258.211-.61.329-.961.376-.047 0-.094 0-.117-.024v.234c0 .329-.188.61-.446.797a1.6 1.6 0 0 1-.914.305h-.984c-.469 0-.703-.562-.399-.89a1.6 1.6 0 0 0-.187-.446.6.6 0 0 0-.445-.164.58.58 0 0 0-.422.164c-.07.117-.14.258-.188.445.305.329.07.891-.398.891h-.985c-.351 0-.68-.117-.914-.305a.99.99 0 0 1-.422-.82v-3c0-.14 0-.234-.023-.328 0-.117 0-.188.023-.399v-.75c0-.07 0-.164-.023-.257-.023 0-.07.023-.117 0-.352-.024-.68-.118-.938-.328-.28-.235-.422-.563-.422-.961 0-.399.165-.727.446-.938.258-.187.586-.258.914-.281h.117c.023-.094.023-.188.023-.258 0-.328.188-.61.422-.797a1.6 1.6 0 0 1 .938-.305h.656v-.117c.024-.351.14-.703.375-.96.234-.258.563-.423.961-.423s.727.164.96.422c.235.258.353.61.376.961 0 .047 0 .07-.024.117h.68c.352 0 .68.118.938.305.234.188.422.469.422.797v4.64h.117c.351.024.703.141.96.376m-6.492 2.882h.726v-.14c.024-.328.14-.68.352-.938.234-.258.562-.422.96-.422.399 0 .727.165.962.422.234.258.351.61.375.961.023.047 0 .07 0 .117h.703c.187 0 .351-.07.468-.14.094-.094.141-.164.141-.235v-.539c0-.468.563-.68.89-.398a.7.7 0 0 0 .422-.188.52.52 0 0 0 .188-.421c0-.211-.07-.329-.187-.422a.7.7 0 0 0-.422-.188c-.328.281-.891.047-.891-.422v-.82H7.008c-.469 0-.703-.562-.399-.89a1.2 1.2 0 0 0-.187-.422.56.56 0 0 0-.445-.188.52.52 0 0 0-.422.188c-.094.093-.14.234-.188.421.305.329.07.891-.398.891H3.352V14c0 .094.023.164.14.258s.258.14.446.14m-.586-4.5h1.312v-.117c.024-.351.14-.703.352-.96.234-.258.562-.423.96-.423.399 0 .727.165.962.422.234.258.351.61.375.961.023.047 0 .07 0 .117h1.335V6.5c0-.07-.046-.14-.164-.234q-.175-.141-.492-.141h-.984c-.469 0-.68-.562-.399-.89a.86.86 0 0 0-.187-.446A.58.58 0 0 0 6 4.625a.58.58 0 0 0-.422.164.86.86 0 0 0-.187.445c.28.329.046.891-.422.891h-.961c-.211 0-.399.047-.516.14-.094.094-.14.165-.14.235v.023c0 .047 0 .211-.024.375 0 .07-.023.165-.047.258-.023.07-.07.211-.187.305a.66.66 0 0 1-.352.094c-.07-.024-.14-.047-.187-.07-.024 0-.024-.024-.024-.024-.258.023-.422.094-.515.164s-.164.164-.164.352.07.304.164.398a.95.95 0 0 0 .515.188c0-.024 0-.024.024-.024.047-.023.117-.047.187-.07.117 0 .235.023.352.094.117.093.164.234.187.304.024.094.047.188.047.258.024.164.024.305.024.375z' />
                                        </svg>
                                        <Localize i18n_default_text='Bot Builder' />
                                    </>
                                }
                                id='id-bot-builder'
                            />

                            <div
                                label={
                                    <>
                                        <span style={{ fontSize: '18px' }}>🤖</span>
                                        <Localize i18n_default_text='Free Bot' />
                                    </>
                                }
                                id='id-free-bot'
                            >
                                <Suspense fallback={<ChunkLoader message={localize('Loading...')} />}>
                                    <FreeBots handleTabChange={handleTabChange} />
                                </Suspense>
                            </div>

                            <div
                                label={
                                    <>
                                        <svg xmlns='http://www.w3.org/2000/svg' width='24px' height='24px' viewBox='0 0 12 18' role='img' fill='var(--text-general)'>
                                            <path d='M.75 4.625v8.25A1.11 1.11 0 0 0 1.875 14h9.75c.188 0 .375.188.375.375 0 .21-.187.375-.375.375h-9.75A1.85 1.85 0 0 1 0 12.875v-8.25c0-.187.164-.375.375-.375.188 0 .375.188.375.375m10.383 2.531-3.375 3.375a.397.397 0 0 1-.54 0L5.25 8.54l-2.367 2.367a.397.397 0 0 1-.54 0 .397.397 0 0 1 0-.539L4.97 7.742c.14-.14.398-.14.539 0L7.5 9.734l3.094-3.117c.14-.14.398-.14.539 0 .14.14.14.399 0 .54' />
                                        </svg>
                                        <Localize i18n_default_text='Charts' />
                                    </>
                                }
                                id={is_chart_modal_visible || is_trading_view_modal_visible ? 'id-charts--disabled' : 'id-charts'}
                            >
                                <Suspense fallback={<ChunkLoader message={localize('Please wait, loading chart...')} />}>
                                    <ChartWrapper show_digits_stats={false} />
                                </Suspense>
                            </div>

                            <div
                                label={
                                    <>
                                        <LegacyGuide1pxIcon height='16px' width='16px' fill='var(--text-general)' className='icon-general-fill-g-path' />
                                        <Localize i18n_default_text='Tutorials' />
                                    </>
                                }
                                id='id-tutorials'
                            >
                                <div className='tutorials-wrapper'>
                                    <Suspense fallback={<ChunkLoader message={localize('Please wait, loading tutorials...')} />}>
                                        <Tutorial handleTabChange={handleTabChange} />
                                    </Suspense>
                                </div>
                            </div>

                            <div
                                label={
                                    <>
                                        <span className='main__tabs-ai-icon' aria-hidden='true'>AI</span>
                                        <Localize i18n_default_text='PEGASUS AI' />
                                    </>
                                }
                                id='id-pegasus-ai'
                                data-keep-mounted={true}
                            >
                                <Suspense fallback={<ChunkLoader message={localize('Loading PEGASUS AI...')} />}>
                                    <PegasusAi handleTabChange={handleTabChange} />
                                </Suspense>
                            </div>
                        </Tabs>
                        {!isDesktop && right_tab_shadow && <span className='tabs-shadow tabs-shadow--right' />}
                    </div>
                </div>
            </div>

            <DesktopWrapper>
                {!is_pegasus_active && (
                    <div className='main__run-strategy-wrapper'>
                        <RunStrategy />
                        <RunPanel />
                    </div>
                )}
                <ChartModal />
                <TradingViewModal />
            </DesktopWrapper>
            <MobileWrapper>{!is_pegasus_active && !is_open && <RunPanel />}</MobileWrapper>

            <Dialog
                cancel_button_text={cancel_button_text || localize('Cancel')}
                className='dc-dialog__wrapper--fixed'
                confirm_button_text={ok_button_text || localize('Ok')}
                has_close_icon
                is_mobile_full_width={false}
                is_visible={is_dialog_open}
                onCancel={onCancelButtonClick}
                onClose={onCloseDialog}
                onConfirm={onOkButtonClick || onCloseDialog}
                portal_element_id='modal_root'
                title={title}
                login={handleLoginGeneration}
                dismissable={dismissable}
                is_closed_on_cancel={is_closed_on_cancel}
            >
                {message}
            </Dialog>

            {/* Trade Type Confirmation Modal */}
            {(() => {
                const modalProps = getTradeTypeModalProps();
                return (
                    <TradeTypeConfirmationModal
                        is_visible={modalProps.is_visible}
                        trade_type_display_name={modalProps.trade_type_display_name}
                        current_trade_type={modalProps.current_trade_type}
                        current_trade_type_display_name={modalProps.current_trade_type_display_name}
                        onConfirm={modalProps.onConfirm}
                        onCancel={modalProps.onCancel}
                    />
                );
            })()}

            {/* Pegasus AI Live HUD & Modals */}
            <AiLiveHud onClick={() => handleTabChange(DBOT_TABS.PEGASUS_AI)} />
            <PegasusActivatedModal
                isOpen={is_pegasus_activated_open}
                onClose={() => setIsPegasusActivatedOpen(false)}
                onActivate={() => {
                    setIsPegasusActivatedOpen(false);
                    setTimeout(() => {
                        run_panel.onRunButtonClick();
                    }, 350);
                }}
            />
            <PegasusVictoryModal
                isOpen={is_victory_modal_open}
                profitAmount={pegasus_victory_amount}
                onContinue={() => setIsVictoryModalOpen(false)}
            />
        </React.Fragment>
    );
});

export default AppWrapper;
