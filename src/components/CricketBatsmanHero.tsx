/**
 * ============================================================================
 * ACC CRICKET BATSMAN HERO (ULTRA-REALISTIC 3D RENDER)
 * ============================================================================
 */
import React from 'react';

export const CricketBatsmanHero: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 460 580"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)]"
      >
        <defs>
          <radialGradient id="playerAura" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#1d4ed8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="jerseyBase" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#172554" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="rimLightLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="rimLightRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.75" />
            <stop offset="25%" stopColor="#eab308" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="muscleShadow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#090d16" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </linearGradient>

          <radialGradient id="helmetShell" cx="45%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="35%" stopColor="#1e293b" />
            <stop offset="75%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <linearGradient id="trimGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="85%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="25%" stopColor="#fde68a" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="90%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          <linearGradient id="batGrip" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <ellipse cx="230" cy="280" rx="190" ry="240" fill="url(#playerAura)" filter="url(#softGlow)" />

        <g transform="translate(350, 240) rotate(14)">
          <rect x="-10" y="0" width="20" height="90" rx="6" fill="url(#batGrip)" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="-10" y1="18" x2="10" y2="18" stroke="#60a5fa" strokeWidth="2" />
          <line x1="-10" y1="36" x2="10" y2="36" stroke="#60a5fa" strokeWidth="2" />
          <line x1="-10" y1="54" x2="10" y2="54" stroke="#60a5fa" strokeWidth="2" />
          <line x1="-10" y1="72" x2="10" y2="72" stroke="#60a5fa" strokeWidth="2" />
          <ellipse cx="0" cy="2" rx="10" ry="4" fill="#facc15" />

          <path
            d="M -12,90 L 12,90 L 22,120 L 24,310 C 24,325 0,335 -24,310 L -22,120 Z"
            fill="url(#batWood)"
            stroke="#78350f"
            strokeWidth="2"
          />
          <line x1="0" y1="120" x2="0" y2="310" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
          <rect x="-16" y="135" width="32" height="75" rx="4" fill="#0f172a" stroke="url(#trimGold)" strokeWidth="1.5" />
          <text x="0" y="162" textAnchor="middle" fill="#facc15" fontFamily="'Rajdhani', sans-serif" fontWeight="900" fontSize="16" letterSpacing="2">ACC</text>
          <text x="0" y="180" textAnchor="middle" fill="#ffffff" fontFamily="'Inter', sans-serif" fontWeight="bold" fontSize="8" letterSpacing="1">AVANTHI</text>
          <text x="0" y="198" textAnchor="middle" fill="#38bdf8" fontFamily="'Chakra Petch', sans-serif" fontWeight="bold" fontSize="9">PRO 18</text>
        </g>

        <path
          d="M 120,230 C 130,195 170,185 230,185 C 290,185 330,195 340,230 C 365,300 355,445 345,550 C 280,560 180,560 115,550 C 105,445 95,300 120,230 Z"
          fill="url(#jerseyBase)"
          stroke="#1e3a8a"
          strokeWidth="2.5"
        />

        <path
          d="M 120,235 C 150,215 185,210 230,210 C 275,210 310,215 340,235 C 335,270 330,320 315,355 C 280,340 250,330 230,330 C 210,330 180,340 145,355 C 130,320 125,270 120,235 Z"
          fill="url(#muscleShadow)"
          opacity="0.6"
        />

        <path
          d="M 120,230 C 95,260 75,325 65,395 C 80,410 108,415 125,400 C 132,340 138,285 142,240 Z"
          fill="#0a1020"
          stroke="#1e3a8a"
          strokeWidth="1.5"
        />
        <path d="M 66,392 C 82,408 108,412 125,398" stroke="url(#trimGold)" strokeWidth="6" strokeLinecap="round" />

        <path
          d="M 340,230 C 365,260 385,325 395,395 C 380,410 352,415 335,400 C 328,340 322,285 318,240 Z"
          fill="#0a1020"
          stroke="#1e3a8a"
          strokeWidth="1.5"
        />
        <path d="M 394,392 C 378,408 352,412 335,398" stroke="url(#trimGold)" strokeWidth="6" strokeLinecap="round" />

        <ellipse cx="388" cy="425" rx="22" ry="18" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
        <rect x="375" y="415" width="26" height="8" rx="4" fill="#3b82f6" />
        <ellipse cx="395" cy="435" rx="8" ry="12" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />

        <path
          d="M 188,185 C 200,205 260,205 272,185 C 265,168 258,155 230,155 C 202,155 195,168 188,185 Z"
          fill="#090d16"
        />
        <path d="M 188,185 C 200,205 260,205 272,185" stroke="url(#trimGold)" strokeWidth="4.5" fill="none" />

        <ellipse cx="230" cy="120" rx="74" ry="78" fill="url(#helmetShell)" stroke="#334155" strokeWidth="2.5" />
        <path d="M 230,44 C 230,85 230,140 230,180" stroke="#475569" strokeWidth="4" strokeLinecap="round" />

        <ellipse cx="198" cy="88" rx="7" ry="20" transform="rotate(-20 198 88)" fill="#020617" stroke="#334155" strokeWidth="1" />
        <ellipse cx="262" cy="88" rx="7" ry="20" transform="rotate(20 262 88)" fill="#020617" stroke="#334155" strokeWidth="1" />

        <path
          d="M 172,98 C 168,62 200,50 230,50 C 260,50 292,62 288,98"
          stroke="#7dd3fc"
          strokeWidth="4.5"
          fill="none"
          opacity="0.85"
          filter="url(#softGlow)"
        />

        <path d="M 166,130 C 160,165 170,180 185,185" stroke="#64748b" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M 294,130 C 300,165 290,180 275,185" stroke="#64748b" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="168" cy="140" r="5" fill="#facc15" />
        <circle cx="292" cy="140" r="5" fill="#facc15" />

        <text
          x="230"
          y="255"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="'Rajdhani', sans-serif"
          fontWeight="900"
          fontSize="32"
          letterSpacing="6"
          filter="drop-shadow(0 4px 10px rgba(0,0,0,0.9))"
        >
          AVANTHI
        </text>

        <text
          x="230"
          y="390"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="900"
          fontSize="125"
          filter="drop-shadow(0 4px 0 #1e293b) drop-shadow(0 8px 0 #0f172a) drop-shadow(0 16px 25px rgba(0,0,0,0.95))"
        >
          18
        </text>

        <path
          d="M 120,230 C 105,300 95,445 115,550"
          stroke="url(#rimLightLeft)"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M 340,230 C 355,300 365,445 345,550"
          stroke="url(#rimLightRight)"
          strokeWidth="5"
          fill="none"
        />
      </svg>
    </div>
  );
};
