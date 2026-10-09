/**
 * ============================================================================
 * ACC GOLDEN AUCTION GAVEL & CRICKET BALL (ULTRA-REALISTIC 3D RENDER)
 * ============================================================================
 */
import React from 'react';

export const AuctionGavelHero: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 480 580"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
      >
        <defs>
          <linearGradient id="deepMahogany" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="25%" stopColor="#7c2d12" />
            <stop offset="55%" stopColor="#451a03" />
            <stop offset="85%" stopColor="#2a0f02" />
            <stop offset="100%" stopColor="#1c0701" />
          </linearGradient>

          <linearGradient id="gavelHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="35%" stopColor="#9a3412" />
            <stop offset="70%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#1c0701" />
          </linearGradient>

          <linearGradient id="mirrorGold" x1="0%" y1="0%" x2="100%" y2="60%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="20%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="90%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          <linearGradient id="blockWood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="30%" stopColor="#78350f" />
            <stop offset="70%" stopColor="#9a3412" />
            <stop offset="85%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#2a0f02" />
          </linearGradient>

          <radialGradient id="leatherRed" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="15%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="80%" stopColor="#7f1d1d" />
            <stop offset="95%" stopColor="#450a0a" />
            <stop offset="100%" stopColor="#2a0404" />
          </radialGradient>

          <filter id="strikeFlare" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGavelGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="200" cy="380" rx="180" ry="120" fill="#f59e0b" opacity="0.25" filter="url(#strikeFlare)" />
        <ellipse cx="200" cy="390" rx="90" ry="40" fill="#fef08a" opacity="0.45" filter="url(#strikeFlare)" />

        <g transform="translate(195, 385)">
          <line x1="-120" y1="-50" x2="120" y2="50" stroke="#fef08a" strokeWidth="2.5" opacity="0.75" />
          <line x1="-90" y1="60" x2="90" y2="-60" stroke="#fde047" strokeWidth="2.5" opacity="0.75" />
          <line x1="0" y1="-100" x2="0" y2="80" stroke="#facc15" strokeWidth="3" opacity="0.85" />
          <line x1="-110" y1="20" x2="110" y2="-20" stroke="#fef08a" strokeWidth="2" opacity="0.6" />
          <line x1="-40" y1="-90" x2="40" y2="90" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />

          <circle cx="-65" cy="-75" r="4" fill="#ffffff" filter="url(#strikeFlare)" />
          <circle cx="75" cy="-85" r="3.5" fill="#fef08a" filter="url(#strikeFlare)" />
          <circle cx="115" cy="-35" r="4.5" fill="#fde047" filter="url(#strikeFlare)" />
          <circle cx="-105" cy="25" r="3" fill="#fbbf24" filter="url(#strikeFlare)" />
          <circle cx="50" cy="65" r="4" fill="#ffffff" filter="url(#strikeFlare)" />
          <circle cx="-35" cy="-115" r="3" fill="#fef08a" filter="url(#strikeFlare)" />
          <circle cx="12" cy="-60" r="5" fill="#ffffff" filter="url(#strikeFlare)" />
        </g>

        <g transform="translate(195, 420)">
          <ellipse cx="0" cy="35" rx="160" ry="50" fill="#020617" opacity="0.85" />
          <path
            d="M -145,0 C -145,28 145,28 145,0 L 145,35 C 145,62 -145,62 -145,35 Z"
            fill="url(#blockWood)"
          />
          <ellipse cx="0" cy="0" rx="145" ry="38" fill="url(#gavelHighlight)" stroke="url(#mirrorGold)" strokeWidth="5" />
          <ellipse cx="0" cy="0" rx="118" ry="30" fill="url(#deepMahogany)" stroke="#451a03" strokeWidth="3" />
          <ellipse cx="0" cy="0" rx="85" ry="20" fill="url(#gavelHighlight)" stroke="url(#mirrorGold)" strokeWidth="2.5" />
        </g>

        <g transform="translate(225, 220) rotate(-26)">
          <path d="M 0,0 L 280,-45" stroke="#020617" strokeWidth="26" strokeLinecap="round" opacity="0.55" />
          <path
            d="M 12,0 L 270,-12"
            stroke="url(#deepMahogany)"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <path
            d="M 12,-4 L 270,-16"
            stroke="url(#gavelHighlight)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.75"
          />

          <line x1="85" y1="-3" x2="85" y2="-3" stroke="url(#mirrorGold)" strokeWidth="25" strokeLinecap="round" />
          <line x1="145" y1="-6" x2="145" y2="-6" stroke="url(#mirrorGold)" strokeWidth="25" strokeLinecap="round" />
          <line x1="205" y1="-9" x2="205" y2="-9" stroke="url(#mirrorGold)" strokeWidth="25" strokeLinecap="round" />
          <ellipse cx="280" cy="-12" rx="16" ry="16" fill="url(#mirrorGold)" stroke="#78350f" strokeWidth="2.5" />

          <g transform="translate(0, 0)">
            <rect x="-42" y="-68" width="84" height="136" rx="14" fill="url(#mirrorGold)" stroke="#78350f" strokeWidth="2.5" />
            <rect x="-35" y="-60" width="70" height="120" rx="10" fill="url(#deepMahogany)" />
            <text x="0" y="8" textAnchor="middle" fill="url(#mirrorGold)" fontFamily="'Rajdhani', sans-serif" fontWeight="900" fontSize="18" letterSpacing="2">ACC</text>

            <path
              d="M -48,-68 L 48,-68 L 56,-130 L -56,-130 Z"
              fill="url(#gavelHighlight)"
              stroke="#2a0f02"
              strokeWidth="2"
            />
            <ellipse cx="0" cy="-130" rx="56" ry="16" fill="url(#mirrorGold)" stroke="#78350f" strokeWidth="3" />
            <ellipse cx="0" cy="-138" rx="48" ry="13" fill="url(#deepMahogany)" />

            <path
              d="M -48,68 L 48,68 L 56,130 L -56,130 Z"
              fill="url(#gavelHighlight)"
              stroke="#2a0f02"
              strokeWidth="2"
            />
            <ellipse cx="0" cy="130" rx="56" ry="16" fill="url(#mirrorGold)" stroke="#78350f" strokeWidth="3" />
            <ellipse cx="0" cy="136" rx="50" ry="14" fill="#ffffff" filter="url(#strikeFlare)" opacity="0.95" />
          </g>
        </g>

        <g transform="translate(380, 440)">
          <ellipse cx="0" cy="40" rx="52" ry="18" fill="#020617" opacity="0.9" />
          <circle cx="0" cy="0" r="48" fill="url(#leatherRed)" stroke="#450a0a" strokeWidth="2.5" />

          <path
            d="M -48,0 C -20,20 20,20 48,0"
            stroke="#7f1d1d"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />

          <path
            d="M -34,-34 C -8,0 8,12 34,34"
            stroke="#ffffff"
            strokeWidth="4"
            strokeDasharray="5,4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M -36,-31 C -10,3 6,15 32,37"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="3,3"
            fill="none"
            opacity="0.85"
          />

          <ellipse cx="-16" cy="-18" rx="16" ry="8" transform="rotate(-30 -16 -18)" fill="#ffffff" opacity="0.5" filter="url(#softGavelGlow)" />
          <circle cx="12" cy="-6" r="10" fill="url(#mirrorGold)" opacity="0.95" />
          <text x="12" y="-3" textAnchor="middle" fontSize="7" fontFamily="'Rajdhani', sans-serif" fontWeight="900" fill="#451a03">ACC</text>
        </g>
      </svg>
    </div>
  );
};
