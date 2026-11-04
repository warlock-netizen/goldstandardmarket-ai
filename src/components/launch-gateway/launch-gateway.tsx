import React, { useState, useEffect } from 'react';
import './launch-gateway.scss';

export const LaunchGateway: React.FC = () => {
    const [isVisible, setIsVisible] = useState(() => {
        return !sessionStorage.getItem('gsm_launch_gateway_shown');
    });

    const dismiss = () => {
        setIsVisible(false);
        try {
            sessionStorage.setItem('gsm_launch_gateway_shown', 'true');
        } catch (e) {}
    };

    useEffect(() => {
        if (isVisible) {
            const timer = window.setTimeout(dismiss, 3800);
            return () => window.clearTimeout(timer);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <section
            className="launch-gateway"
            aria-label="Gold Standard Market and Pegasus AI are launching"
            aria-live="polite"
            role="status"
            onClick={dismiss}
        >
            <button
                type="button"
                className="launch-gateway__skip-btn"
                onClick={e => {
                    e.stopPropagation();
                    dismiss();
                }}
                style={{
                    position: 'absolute',
                    top: 'max(1.6rem, env(safe-area-inset-top))',
                    right: 'max(1.6rem, env(safe-area-inset-right))',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(250, 204, 21, 0.5)',
                    color: '#facc15',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '999px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 2147483001,
                }}
            >
                Skip ?
            </button>
            <div className="launch-gateway__grid" aria-hidden="true" />
            <div className="launch-gateway__glow launch-gateway__glow--top" aria-hidden="true" />
            <div className="launch-gateway__glow launch-gateway__glow--bottom" aria-hidden="true" />
            <div className="launch-gateway__frame" aria-hidden="true">
                <span className="launch-gateway__corner launch-gateway__corner--top-left" />
                <span className="launch-gateway__corner launch-gateway__corner--top-right" />
                <span className="launch-gateway__corner launch-gateway__corner--bottom-left" />
                <span className="launch-gateway__corner launch-gateway__corner--bottom-right" />
            </div>
            <div className="launch-gateway__content">
                <p className="launch-gateway__edition">THE FUTURE OF DATA-DRIVEN TRADING</p>
                <div className="launch-gateway__emblem" aria-hidden="true">
                    <span className="launch-gateway__orbit launch-gateway__orbit--outer" />
                    <span className="launch-gateway__orbit launch-gateway__orbit--inner" />
                    <span className="launch-gateway__sweep" />
                    <svg viewBox="0 0 120 136" focusable="false">
                        <path
                            className="launch-gateway__shield"
                            d="M60 4 108 21v42c0 31-19 55-48 69C31 118 12 94 12 63V21L60 4Z"
                        />
                        <path
                            className="launch-gateway__shield-inner"
                            d="M60 17 96 30v32c0 23-14 42-36 55-22-13-36-32-36-55V30l36-13Z"
                        />
                    </svg>
                    <span className="launch-gateway__monogram">G·P</span>
                    <span className="launch-gateway__spark launch-gateway__spark--one" />
                    <span className="launch-gateway__spark launch-gateway__spark--two" />
                    <span className="launch-gateway__spark launch-gateway__spark--three" />
                </div>
                <div className="launch-gateway__brand-lockup">
                    <div className="launch-gateway__brand launch-gateway__brand--gsm">
                        <span>GOLD STANDARD</span>
                        <small>MARKET</small>
                    </div>
                    <span className="launch-gateway__cross" aria-hidden="true">
                        ×
                    </span>
                    <div className="launch-gateway__brand launch-gateway__brand--pegasus">
                        <span>PEGASUS</span>
                        <small>AI</small>
                    </div>
                </div>
                <p className="launch-gateway__statement">INTELLIGENCE · PRECISION · DISCIPLINE</p>
                <div className="launch-gateway__progress" aria-hidden="true">
                    <span className="launch-gateway__progress-track">
                        <span className="launch-gateway__progress-fill" />
                    </span>
                    <span className="launch-gateway__progress-copy launch-gateway__progress-copy--initializing">
                        INITIALIZING PREMIUM INTELLIGENCE
                    </span>
                    <span className="launch-gateway__progress-copy launch-gateway__progress-copy--ready">
                        SYSTEM READY
                    </span>
                </div>
            </div>
        </section>
    );
};

export default LaunchGateway;

