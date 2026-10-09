/**
 * ============================================================================
 * AVANTHI INSTITUTE OF ENGINEERING & TECHNOLOGY — OFFICIAL EMBLEM LOGO
 * ============================================================================
 */

import React from 'react';

interface AvanthiLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const AvanthiLogo: React.FC<AvanthiLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
}) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative ${dimensions} shrink-0 drop-shadow-[0_0_12px_rgba(220,38,38,0.4)]`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill="#b91c1c" stroke="#991b1b" strokeWidth="0.5">
            <path d="M42,162 C26,144 18,122 18,98 C18,74 26,52 42,34 C44,36 43,40 40,43 C28,58 22,77 22,98 C22,119 28,138 40,153 Z" />
            <path d="M22,96 C10,92 6,80 12,70 C16,74 22,78 24,84 Z" />
            <path d="M26,76 C16,68 14,56 22,48 C25,52 28,58 29,66 Z" />
            <path d="M36,54 C28,44 30,32 40,26 C42,30 43,38 42,46 Z" />
            <path d="M52,36 C46,24 52,14 64,12 C64,17 62,25 58,32 Z" />
            <path d="M72,24 C70,12 80,4 92,6 C90,11 86,18 80,24 Z" />

            <path d="M22,104 C10,108 6,120 12,130 C16,126 22,122 24,116 Z" />
            <path d="M26,124 C16,132 14,144 22,152 C25,148 28,142 29,134 Z" />
            <path d="M36,146 C28,156 30,168 40,174 C42,170 43,162 42,154 Z" />
            <path d="M52,164 C46,176 52,186 64,188 C64,183 62,175 58,168 Z" />
            <path d="M72,176 C70,188 80,196 92,194 C90,189 86,182 80,176 Z" />

            <path d="M158,162 C174,144 182,122 182,98 C182,74 174,52 158,34 C156,36 157,40 160,43 C172,58 178,77 178,98 C178,119 172,138 160,153 Z" />
            <path d="M178,96 C190,92 194,80 188,70 C184,74 178,78 176,84 Z" />
            <path d="M174,76 C184,68 186,56 178,48 C175,52 172,58 171,66 Z" />
            <path d="M164,54 C172,44 170,32 160,26 C158,30 157,38 158,46 Z" />
            <path d="M148,36 C154,24 148,14 136,12 C136,17 138,25 142,32 Z" />
            <path d="M128,24 C130,12 120,4 108,6 C110,11 114,18 120,24 Z" />

            <path d="M178,104 C190,108 194,120 188,130 C184,126 178,122 176,116 Z" />
            <path d="M174,124 C184,132 186,144 178,152 C175,148 172,142 171,134 Z" />
            <path d="M164,146 C172,156 170,168 160,174 C158,170 157,162 158,154 Z" />
            <path d="M148,164 C154,176 148,186 136,188 C136,183 138,175 142,168 Z" />
            <path d="M128,176 C130,188 120,196 108,194 C110,189 114,182 120,176 Z" />

            <path d="M88,184 Q100,174 112,184 L126,198 L114,194 L100,186 L86,194 L74,198 Z" />
          </g>

          <circle cx="100" cy="100" r="70" fill="#facc15" stroke="#ca8a04" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="54" fill="#ffffff" stroke="#ca8a04" strokeWidth="1.5" />

          <defs>
            <path
              id="aiet-arc-upper"
              d="M 38,100 A 62,62 0 1,1 162,100"
              fill="none"
            />
            <path
              id="aiet-arc-lower"
              d="M 162,100 A 62,62 0 0,1 38,100"
              fill="none"
            />
            <path
              id="aiet-inner-upper"
              d="M 52,100 A 48,48 0 1,1 148,100"
              fill="none"
            />
          </defs>

          <text fontSize="7.2" fontWeight="800" fill="#7f1d1d" letterSpacing="0.4">
            <textPath href="#aiet-arc-upper" startOffset="50%" textAnchor="middle">
              AVANTHI INSTITUTE OF ENGINEERING & TECHNOLOGY
            </textPath>
          </text>

          <text fontSize="7.8" fontWeight="800" fill="#7f1d1d" letterSpacing="0.6">
            <textPath href="#aiet-arc-lower" startOffset="50%" textAnchor="middle">
              ★ HYDERABAD ★ VISAKHAPATNAM ★
            </textPath>
          </text>

          <text fontSize="5.2" fontWeight="700" fill="#1e293b" letterSpacing="0.3">
            <textPath href="#aiet-inner-upper" startOffset="50%" textAnchor="middle">
              AVANTHI EDUCATIONAL SOCIETY
            </textPath>
          </text>

          <polygon points="92,138 108,138 105,145 95,145" fill="#334155" />
          <rect x="88" y="145" width="24" height="2.5" rx="1" fill="#475569" />

          <rect x="74" y="98" width="52" height="38" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <rect x="76" y="100" width="48" height="32" rx="1.5" fill="#1e1b4b" />

          <text
            x="100"
            y="122"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="#e0e7ff"
            style={{ filter: 'drop-shadow(0 0 3px #818cf8)' }}
          >
            ॐ
          </text>

          <polygon points="76,148 124,148 128,154 72,154" fill="#64748b" opacity="0.7" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="text-sm md:text-base font-extrabold tracking-wider text-amber-400 uppercase leading-none font-['Rajdhani']">
            Avanthi
          </div>
          <div className="text-[10px] md:text-xs text-slate-300 font-semibold tracking-wide uppercase leading-tight">
            Institute of Engineering & Technology
          </div>
          <div className="text-[9px] text-blue-400 font-medium tracking-widest uppercase">
            Makavarapalem • Tamaram
          </div>
        </div>
      )}
    </div>
  );
};
