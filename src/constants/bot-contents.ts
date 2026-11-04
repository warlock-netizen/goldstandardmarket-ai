type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    FREE_BOT: 2,
    FREE_BOTS: 2,
    CHART: 3,
    TUTORIAL: 4,
    PEGASUS_AI: 5,
    ADMIN: 6,
    COPYCAT: 2,
    DCIRCLES: 2,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-free-bot',
    'id-charts',
    'id-tutorials',
    'id-pegasus-ai',
    'id-admin',
];

export const DBOT_HASHES = [
    'dashboard',
    'bot_builder',
    'free_bot',
    'chart',
    'tutorial',
    'pegasus_ai',
    'admin',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
