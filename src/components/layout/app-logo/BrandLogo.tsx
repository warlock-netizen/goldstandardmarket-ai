import React from 'react';

type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
};

export const BrandLogo = ({
    width = 180,
    height = 48,
    className = '',
}: TBrandLogoProps) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 190 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Gold Standard Market"
        >
            <g transform="translate(2, 3)">
                <path
                    d="M12 1L20 4V14C20 18 16 21 12 22C8 21 4 18 4 14V4L12 1Z"
                    stroke="url(#gsm-gradient)"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 5L17 7V13C17 15.5 14 18 12 19C10 18 7 15.5 7 13V7L12 5Z"
                    fill="url(#gsm-gradient)"
                    opacity="0.5"
                />
                <circle cx="12" cy="11" r="1.5" fill="url(#gsm-gradient)" />
                <circle cx="12" cy="1" r="0.8" fill="url(#gsm-gradient)" opacity="0.6" />
            </g>
            <text
                x="34"
                y="23"
                fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                fontSize="12"
                fontWeight="700"
                letterSpacing="-0.2"
            >
                <tspan fill="url(#gsm-gradient)" fontWeight="800">
                    GSM
                </tspan>
                <tspan fill="var(--text-general)" fontWeight="500" dx="4" fontSize="10">
                    MARKET
                </tspan>
            </text>
            <defs>
                <linearGradient id="gsm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" />
                    <stop offset="50%" stopColor="#f0e68c" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default BrandLogo;
