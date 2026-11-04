import React from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';

type TDashboardV2Props = {
    handleTabChange: (tab_index: number) => void;
};

const SOCIAL_LINKS = [
    {
        id: 'whatsapp',
        href: 'https://wa.me/2349122821110',
        title: 'WhatsApp',
        color: '#25D366',
        icon: (
            <svg className='dashboard-v2__social-icon' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'>
                <path
                    d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'
                    fill='#25D366'
                />
            </svg>
        ),
    },
    {
        id: 'telegram',
        href: 'https://t.me/+FGWiQP-5Opw0MDc0',
        title: 'Telegram',
        color: '#0088cc',
        icon: (
            <svg className='dashboard-v2__social-icon' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'>
                <path
                    d='M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'
                    fill='#0088cc'
                />
            </svg>
        ),
    },
];

export const DashboardV2 = observer(({ handleTabChange }: TDashboardV2Props) => {
    const { client, load_modal } = useStore();
    const is_logged_in = client?.is_logged_in;

    const handleCardClick = (cardId: string, tab: number) => {
        if (cardId === 'my_computer') {
            handleTabChange(DBOT_TABS.BOT_BUILDER);
            load_modal?.toggleLoadModal();
        } else if (cardId === 'google_drive') {
            handleTabChange(DBOT_TABS.BOT_BUILDER);
            load_modal?.setActiveTabIndex(1);
            load_modal?.toggleLoadModal();
        } else {
            handleTabChange(tab);
        }
    };

    const cards = [
        {
            id: 'my_computer',
            label: 'My computer',
            desc: 'Import from your device',
            tab: DBOT_TABS.BOT_BUILDER,
            color: '#3b82f6',
            Icon: () => (
                <svg width='44' height='44' viewBox='0 0 44 44' fill='none' aria-hidden='true'>
                    <rect x='4' y='6' width='36' height='24' rx='3' stroke='#3b82f6' strokeWidth='1.8' fill='rgba(59,130,246,0.08)' />
                    <rect x='7' y='9' width='30' height='18' rx='1.5' fill='rgba(59,130,246,0.15)' />
                    <rect className='dash-icon-scan' x='7' y='9' width='30' height='2' rx='1' fill='rgba(59,130,246,0.4)' />
                    <path d='M17 30 L16 37 M27 30 L28 37' stroke='#3b82f6' strokeWidth='1.8' strokeLinecap='round' />
                    <path d='M13 37 L31 37' stroke='#3b82f6' strokeWidth='1.8' strokeLinecap='round' />
                    <g className='dash-icon-upload'>
                        <path d='M22 24 L22 17' stroke='#3b82f6' strokeWidth='1.5' strokeLinecap='round' />
                        <path d='M19 20 L22 17 L25 20' stroke='#3b82f6' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                    </g>
                </svg>
            ),
        },
        {
            id: 'google_drive',
            label: 'Google Drive',
            desc: 'Load from Google Drive',
            tab: DBOT_TABS.BOT_BUILDER,
            color: '#10b981',
            Icon: () => (
                <svg width='44' height='44' viewBox='0 0 44 44' fill='none' aria-hidden='true'>
                    <path d='M12 28 C8 28 5 25 5 21 C5 17.5 7.5 14.5 11 14 C11.5 10 15 7 19.5 7 C23 7 26 9 27.5 12 C28 12 28.5 12 29 12 C33 12 36 15 36 19 C36 23.5 32.5 27 28 27 L12 28Z' stroke='#10b981' strokeWidth='1.8' fill='rgba(16,185,129,0.08)' />
                    <g className='dash-icon-plus'>
                        <path d='M22 19 L22 27' stroke='#10b981' strokeWidth='2' strokeLinecap='round' />
                        <path d='M18 23 L26 23' stroke='#10b981' strokeWidth='2' strokeLinecap='round' />
                    </g>
                    <ellipse className='dash-icon-orbit' cx='22' cy='23' rx='10' ry='4' stroke='rgba(16,185,129,0.3)' strokeWidth='1' fill='none' strokeDasharray='3 2' />
                </svg>
            ),
        },
        {
            id: 'bot_builder',
            label: 'Bot Builder',
            desc: 'Build blocks visually',
            tab: DBOT_TABS.BOT_BUILDER,
            color: '#8b5cf6',
            Icon: () => (
                <svg width='44' height='44' viewBox='0 0 44 44' fill='none' aria-hidden='true'>
                    <g className='dash-icon-gear-cw'>
                        <circle cx='22' cy='22' r='10' stroke='#8b5cf6' strokeWidth='1.8' />
                        <line x1='32' y1='22' x2='35' y2='22' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='29.1' y1='29.1' x2='31.2' y2='31.2' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='22' y1='32' x2='22' y2='35' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='14.9' y1='29.1' x2='12.8' y2='31.2' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='12' y1='22' x2='9' y2='22' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='14.9' y1='14.9' x2='12.8' y2='12.8' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='22' y1='12' x2='22' y2='9' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                        <line x1='29.1' y1='14.9' x2='31.2' y2='12.8' stroke='#8b5cf6' strokeWidth='2' strokeLinecap='round' />
                    </g>
                    <g className='dash-icon-gear-ccw'>
                        <circle cx='22' cy='22' r='5' stroke='#8b5cf6' strokeWidth='1.5' fill='rgba(139,92,246,0.15)' />
                    </g>
                    <circle cx='22' cy='22' r='2' fill='#8b5cf6' />
                    <rect x='5' y='5' width='7' height='7' rx='1.5' stroke='#8b5cf6' strokeWidth='1.2' fill='rgba(139,92,246,0.1)' />
                    <rect x='32' y='5' width='7' height='7' rx='1.5' stroke='#8b5cf6' strokeWidth='1.2' fill='rgba(139,92,246,0.1)' />
                    <rect x='5' y='32' width='7' height='7' rx='1.5' stroke='#8b5cf6' strokeWidth='1.2' fill='rgba(139,92,246,0.1)' />
                    <rect x='32' y='32' width='7' height='7' rx='1.5' stroke='#8b5cf6' strokeWidth='1.2' fill='rgba(139,92,246,0.1)' />
                </svg>
            ),
        },
        {
            id: 'quick_strategy',
            label: 'Quick strategy',
            desc: 'Start with a template',
            tab: DBOT_TABS.FREE_BOT,
            color: '#f59e0b',
            Icon: () => (
                <svg width='44' height='44' viewBox='0 0 44 44' fill='none' aria-hidden='true'>
                    <g className='dash-icon-bars'>
                        <rect x='6' y='28' width='6' height='10' rx='1.5' fill='rgba(245,158,11,0.3)' stroke='#f59e0b' strokeWidth='1.2' />
                        <rect x='14' y='22' width='6' height='16' rx='1.5' fill='rgba(245,158,11,0.4)' stroke='#f59e0b' strokeWidth='1.2' />
                        <rect x='22' y='16' width='6' height='22' rx='1.5' fill='rgba(245,158,11,0.5)' stroke='#f59e0b' strokeWidth='1.2' />
                        <rect x='30' y='10' width='6' height='28' rx='1.5' fill='rgba(245,158,11,0.6)' stroke='#f59e0b' strokeWidth='1.2' />
                    </g>
                    <path className='dash-icon-trend' d='M6 32 L14 26 L22 20 L30 14 L38 8' stroke='#f59e0b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' strokeDasharray='60' />
                    <path d='M34 6 L38 8 L36 12' stroke='#f59e0b' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
            ),
        },
        {
            id: 'speed_bot',
            label: 'Speed Bot',
            desc: 'High-speed trading engine',
            tab: DBOT_TABS.BOT_BUILDER,
            color: '#ec4899',
            Icon: () => (
                <svg width='44' height='44' viewBox='0 0 44 44' fill='none' aria-hidden='true'>
                    <rect x='10' y='12' width='24' height='20' rx='4' stroke='#ec4899' strokeWidth='1.8' fill='rgba(236,72,153,0.08)' />
                    <g className='dash-icon-eyes'>
                        <circle cx='17' cy='20' r='3' fill='rgba(236,72,153,0.2)' stroke='#ec4899' strokeWidth='1.2' />
                        <circle cx='27' cy='20' r='3' fill='rgba(236,72,153,0.2)' stroke='#ec4899' strokeWidth='1.2' />
                        <circle cx='17' cy='20' r='1.2' fill='#ec4899' />
                        <circle cx='27' cy='20' r='1.2' fill='#ec4899' />
                    </g>
                    <path d='M16 27 Q22 30 28 27' stroke='#ec4899' strokeWidth='1.5' strokeLinecap='round' />
                    <g className='dash-icon-antenna'>
                        <line x1='22' y1='12' x2='22' y2='7' stroke='#ec4899' strokeWidth='1.5' strokeLinecap='round' />
                        <circle cx='22' cy='6' r='2' fill='#ec4899' />
                    </g>
                    <rect x='6' y='18' width='4' height='8' rx='2' stroke='#ec4899' strokeWidth='1.2' fill='rgba(236,72,153,0.1)' />
                    <rect x='34' y='18' width='4' height='8' rx='2' stroke='#ec4899' strokeWidth='1.2' fill='rgba(236,72,153,0.1)' />
                    <g className='dash-icon-speed'>
                        <line x1='4' y1='10' x2='9' y2='10' stroke='#ec4899' strokeWidth='1.2' strokeLinecap='round' opacity='0.5' />
                        <line x1='3' y1='14' x2='8' y2='14' stroke='#ec4899' strokeWidth='1.2' strokeLinecap='round' opacity='0.3' />
                    </g>
                </svg>
            ),
        },
    ];

    return (
        <section className='dashboard-v2'>
            <div className='dashboard-v2__container'>
                <header className='dashboard-v2__header'>
                    <div className='dashboard-v2__social-links' aria-label='Gold Standard Market social links'>
                        {SOCIAL_LINKS.map(link => (
                            <a
                                key={link.id}
                                className={`dashboard-v2__social-link dashboard-v2__social-link--${link.id}`}
                                href={link.href}
                                target='_blank'
                                rel='noopener noreferrer'
                                aria-label={link.title}
                            >
                                {link.icon}
                            </a>
                        ))}
                    </div>
                    <h1 className='dashboard-v2__title'>Load or build your bot</h1>
                    <p className='dashboard-v2__subtitle'>
                        Import a bot from your computer or Google Drive, build it from scratch, or start with a quick strategy.
                    </p>
                </header>

                <div className='dashboard-v2__cards'>
                    {cards.map(card => (
                        <article
                            key={card.id}
                            className='dashboard-v2__card'
                            style={{ ['--dashboard-card-accent' as any]: card.color }}
                            onClick={() => handleCardClick(card.id, card.tab)}
                        >
                            <span className='dashboard-v2__card-border' style={{ backgroundColor: card.color }} />
                            <div className='dashboard-v2__card-icon'>
                                <card.Icon />
                            </div>
                            <div className='dashboard-v2__card-content'>
                                <h2 className='dashboard-v2__card-title'>{card.label}</h2>
                                <p className='dashboard-v2__card-desc'>{card.desc}</p>
                            </div>
                            <button type='button' className='dashboard-v2__card-action'>
                                <span>OPEN</span>
                                <span className='dashboard-v2__card-arrow' aria-hidden='true'>→</span>
                            </button>
                        </article>
                    ))}
                </div>

                {!is_logged_in && (
                    <div className='dashboard-v2__notice'>
                        <strong>Not logged in.</strong> Log in to start trading and access all features.
                    </div>
                )}
            </div>
        </section>
    );
});

export default DashboardV2;
