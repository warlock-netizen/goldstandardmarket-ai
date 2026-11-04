import { ComponentProps, ReactNode, useMemo } from 'react';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import RootStore from '@/stores/root-store';
import { DBOT_TABS } from '@/constants/bot-contents';
import { LegacyLogout1pxIcon, LegacyTheme1pxIcon } from '@deriv/quill-icons/Legacy';
import { useTranslations } from '@deriv-com/translations';
import { ToggleSwitch } from '@deriv-com/ui';

export type TSubmenuSection = 'accountSettings' | 'cashier' | 'reports';

// Icon components for platform navigation
const DashboardNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' {...props}>
        <path d='M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' />
    </svg>
);

const BotBuilderNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' {...props}>
        <path d='M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h4V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7.5 4h6a1 1 0 0 0 0-2h-6a1 1 0 0 0 0 2z' />
    </svg>
);

const FreeBotsNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' {...props}>
        <path d='M12 .587l3.668 7.431 8.2 1.192-5.934 5.784 1.399 8.169-7.333-3.856-7.333 3.856 1.4-8.169-5.934-5.784 8.2-1.192zm0 5.701L9.957 10.42l-4.595.668 3.325 3.242-.785 4.577L12 16.75l4.1 2.157-.786-4.577 3.326-3.242-4.595-.668L12 6.288z' />
    </svg>
);

const ChartsNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' {...props}>
        <path d='M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z' />
    </svg>
);

const TutorialsNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor' {...props}>
        <path d='M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z' />
    </svg>
);

const PegasusAiNavIcon = (props: any) => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='#eab308' {...props}>
        <path d='M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C14.73 14.86 12.63 18.23 11 21z' />
    </svg>
);

//IconTypes
type TMenuConfig = {
    LeftComponent: React.ElementType;
    RightComponent?: ReactNode;
    as: 'a' | 'button';
    href?: string;
    label: ReactNode;
    onClick?: () => void;
    removeBorderBottom?: boolean;
    submenu?: TSubmenuSection;
    target?: ComponentProps<'a'>['target'];
    isActive?: boolean;
}[];

const useMobileMenuConfig = (
    client?: RootStore['client'],
    onLogout?: () => void,
    enableThemeToggle: boolean = true,
    onLogin?: () => void,
    onNavigateTab?: (tabIndex: number) => void,
    activeTab: number = 0
) => {
    const { localize } = useTranslations();
    const { is_dark_mode_on, toggleTheme } = useThemeSwitcher();

    const menuConfig = useMemo((): TMenuConfig[] => {
        return [
            // Section 1: Platform Navigation Tabs
            [
                {
                    as: 'button',
                    label: localize('Dashboard'),
                    LeftComponent: DashboardNavIcon,
                    isActive: activeTab === DBOT_TABS.DASHBOARD,
                    onClick: () => onNavigateTab?.(DBOT_TABS.DASHBOARD),
                },
                {
                    as: 'button',
                    label: localize('Bot Builder'),
                    LeftComponent: BotBuilderNavIcon,
                    isActive: activeTab === DBOT_TABS.BOT_BUILDER,
                    onClick: () => onNavigateTab?.(DBOT_TABS.BOT_BUILDER),
                },
                {
                    as: 'button',
                    label: localize('Free Bots'),
                    LeftComponent: FreeBotsNavIcon,
                    isActive: activeTab === DBOT_TABS.FREE_BOT,
                    onClick: () => onNavigateTab?.(DBOT_TABS.FREE_BOT),
                },
                {
                    as: 'button',
                    label: localize('Charts'),
                    LeftComponent: ChartsNavIcon,
                    isActive: activeTab === DBOT_TABS.CHART,
                    onClick: () => onNavigateTab?.(DBOT_TABS.CHART),
                },
                {
                    as: 'button',
                    label: localize('Tutorials'),
                    LeftComponent: TutorialsNavIcon,
                    isActive: activeTab === DBOT_TABS.TUTORIAL,
                    onClick: () => onNavigateTab?.(DBOT_TABS.TUTORIAL),
                },
                {
                    as: 'button',
                    label: (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{localize('Pegasus AI')}</span>
                            <span
                                style={{
                                    background: 'linear-gradient(135deg, #facc15, #eab308)',
                                    color: '#0f172a',
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                AI LIVE
                            </span>
                        </span>
                    ),
                    LeftComponent: PegasusAiNavIcon,
                    isActive: activeTab === DBOT_TABS.PEGASUS_AI,
                    onClick: () => onNavigateTab?.(DBOT_TABS.PEGASUS_AI),
                },
            ] as TMenuConfig,
            // Section 2: Theme Settings
            [
                enableThemeToggle && {
                    as: 'button',
                    label: localize('Dark theme'),
                    LeftComponent: LegacyTheme1pxIcon,
                    RightComponent: <ToggleSwitch value={is_dark_mode_on} onChange={toggleTheme} />,
                },
            ].filter(Boolean) as TMenuConfig,
            // Section 3: Auth & Account
            [
                client?.is_logged_in &&
                    onLogout && {
                        as: 'button',
                        label: localize('Log out'),
                        LeftComponent: LegacyLogout1pxIcon,
                        onClick: onLogout,
                        removeBorderBottom: true,
                    },
                !client?.is_logged_in && {
                    as: 'button',
                    label: localize('Log in'),
                    LeftComponent: LegacyLogout1pxIcon,
                    onClick: () => {
                        if (onLogin) {
                            onLogin();
                        } else if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('gsm:open-login'));
                        }
                    },
                },
                !client?.is_logged_in && {
                    as: 'button',
                    label: localize('Sign up'),
                    LeftComponent: LegacyLogout1pxIcon,
                    onClick: () => {
                        window.open('https://deriv.com/signup/', '_blank');
                    },
                    removeBorderBottom: true,
                },
            ].filter(Boolean) as TMenuConfig,
        ].filter(section => section.length > 0);
    }, [
        client,
        onLogout,
        onLogin,
        is_dark_mode_on,
        toggleTheme,
        localize,
        enableThemeToggle,
        onNavigateTab,
        activeTab,
    ]);

    const hasMenuItems = menuConfig.some(section => section.length > 0);

    return {
        config: menuConfig,
        hasMenuItems,
    };
};

export default useMobileMenuConfig;
