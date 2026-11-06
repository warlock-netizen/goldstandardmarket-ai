import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';

interface IAiLiveHudProps {
    onClick?: () => void;
}

export const AiLiveHud: React.FC<IAiLiveHudProps> = observer(({ onClick }) => {
    const { run_panel, dashboard, chart_store } = useStore();
    const { is_running } = run_panel;
    const { active_tab } = dashboard ?? {};
    const symbol = chart_store?.symbol || '1HZ100V';

    // Hide HUD if user is already looking at Pegasus AI tab
    if (active_tab === DBOT_TABS.PEGASUS_AI) return null;

    return (
        <div
            className="pegasus-hud"
            onClick={onClick}
            title={`GSM Live Scanner (${symbol}) - Click to open Pegasus AI`}
            role="button"
            tabIndex={0}
        >
            <div className="pegasus-hud__pill">
                <span className="pegasus-hud__icon">⚡</span>
                <span className="pegasus-hud__label">
                    {is_running ? `AI LIVE · ${symbol} (RUNNING)` : `GSM SCANNER · ${symbol}`}
                </span>
                <span className="pegasus-hud__live-dot" />
            </div>
        </div>
    );
});

export default AiLiveHud;
