import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';

interface IAiLiveHudProps {
    onClick?: () => void;
}

export const AiLiveHud: React.FC<IAiLiveHudProps> = observer(({ onClick }) => {
    const { run_panel, dashboard } = useStore();
    const { is_running } = run_panel;
    const { active_tab } = dashboard ?? {};

    // Hide HUD if user is already looking at Pegasus AI tab
    if (active_tab === DBOT_TABS.PEGASUS_AI) return null;

    return (
        <div
            className="pegasus-hud"
            onClick={onClick}
            title="GSM Live Scanner - Click to open Pegasus AI"
            role="button"
            tabIndex={0}
        >
            <div className="pegasus-hud__pill">
                <span className="pegasus-hud__icon">⚡</span>
                <span className="pegasus-hud__label">
                    {is_running ? 'AI LIVE · GSM SCANNER (RUNNING)' : 'GSM LIVE SCANNER'}
                </span>
                <span className="pegasus-hud__live-dot" />
            </div>
        </div>
    );
});

export default AiLiveHud;
