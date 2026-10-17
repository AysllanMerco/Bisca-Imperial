import React from 'react';
import { OpponentId } from '../types/bisca';

export const OpponentAvatar: React.FC<{
  opponentId: OpponentId;
  className?: string;
}> = ({ opponentId, className = 'w-11 h-11' }) => {
  // 1. Dom Pedro I
  if (opponentId === 'pedro_i') {
    return (
      <div
        className={`relative rounded-full overflow-hidden border border-[#FBBF24]/60 bg-[#1B0E07] flex items-center justify-center shrink-0 shadow-inner ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <radialGradient id="pedro1Bg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#022C22" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill="url(#pedro1Bg)" />
          {/* Imperial Uniform & Gold Epaulets */}
          <path d="M10 64 C10 45 54 45 54 64 Z" fill="#1E3A8A" />
          <ellipse cx="15" cy="51" rx="6" ry="3.5" fill="#FBBF24" />
          <ellipse cx="49" cy="51" rx="6" ry="3.5" fill="#FBBF24" />
          {/* High Gold-Embroidered Collar & Red Sash */}
          <path d="M24 44 H40 L42 54 H22 Z" fill="#B91C1C" />
          <path d="M20 49 L42 64" stroke="#FBBF24" strokeWidth="4" />
          {/* Head */}
          <circle cx="32" cy="29" r="11.5" fill="#FDBA74" />
          {/* Wavy Dark Hair & Sideburns (Costeletas) */}
          <path
            d="M19 26 Q22 14 32 15 Q42 14 45 26 Q43 20 32 20 Q21 20 19 26 Z"
            fill="#27150B"
          />
          <path d="M20.5 26 V34 H23.5 V27 Z" fill="#27150B" />
          <path d="M43.5 26 V34 H40.5 V27 Z" fill="#27150B" />
          {/* Mustache */}
          <path d="M26 34 Q32 31.5 38 34" stroke="#27150B" strokeWidth="2.2" fill="none" />
          {/* Imperial Bicorne / Crown Crest */}
          <path d="M23 16 L27 10 L32 14 L37 10 L41 16 Z" fill="#FBBF24" />
        </svg>
      </div>
    );
  }

  // 2. Imperatriz Maria Leopoldina
  if (opponentId === 'leopoldina') {
    return (
      <div
        className={`relative rounded-full overflow-hidden border border-[#FBBF24]/60 bg-[#1B0E07] flex items-center justify-center shrink-0 shadow-inner ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <radialGradient id="leopoldinaBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#27150B" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill="url(#leopoldinaBg)" />
          {/* Emerald & Gold Court Gown */}
          <path d="M12 64 C12 46 52 46 52 64 Z" fill="#065F46" />
          <path d="M22 49 Q32 57 42 49" stroke="#FEF08A" strokeWidth="3" fill="none" />
          {/* Pearl Necklace */}
          <circle cx="27" cy="45" r="1.4" fill="#FFFBEB" />
          <circle cx="32" cy="46" r="1.5" fill="#FFFBEB" />
          <circle cx="37" cy="45" r="1.4" fill="#FFFBEB" />
          {/* Head */}
          <circle cx="32" cy="30" r="11" fill="#FED7AA" />
          {/* Auburn Habsburg Curls */}
          <circle cx="20.5" cy="29" r="3.5" fill="#9A3412" />
          <circle cx="43.5" cy="29" r="3.5" fill="#9A3412" />
          <path d="M20 26 Q32 16 44 26" fill="#9A3412" />
          {/* Imperial Diamond & Emerald Tiara */}
          <path d="M22 20 L26 12 L32 17 L38 12 L42 20 Z" fill="#FBBF24" />
          <circle cx="32" cy="15" r="1.8" fill="#10B981" />
        </svg>
      </div>
    );
  }

  // 3. Princesa Isabel
  if (opponentId === 'isabel') {
    return (
      <div
        className={`relative rounded-full overflow-hidden border border-[#FBBF24]/60 bg-[#1B0E07] flex items-center justify-center shrink-0 shadow-inner ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <radialGradient id="isabelBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill="url(#isabelBg)" />
          {/* Royal Dress & Golden Camellia */}
          <path d="M12 64 C12 46 52 46 52 64 Z" fill="#1E40AF" />
          <path d="M25 47 L32 58 L39 47" stroke="#FBBF24" strokeWidth="2.2" fill="none" />
          {/* Golden Camellia Brooch */}
          <circle cx="32" cy="52" r="3" fill="#FBBF24" />
          <circle cx="32" cy="52" r="1.2" fill="#FEF08A" />
          {/* Braided Updo */}
          <circle cx="32" cy="16" r="7.5" fill="#78350F" />
          {/* Head */}
          <circle cx="32" cy="30" r="11" fill="#FED7AA" />
          <path d="M21 27 Q26 18 32 20 Q38 18 43 27" fill="#78350F" />
          {/* Diadem */}
          <path d="M24 19 Q32 14 40 19" stroke="#FEF08A" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  // 4. José Bonifácio (O Patriarca)
  if (opponentId === 'bonifacio') {
    return (
      <div
        className={`relative rounded-full overflow-hidden border border-[#FBBF24]/60 bg-[#1B0E07] flex items-center justify-center shrink-0 shadow-inner ${className}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <radialGradient id="bonifacioBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4C1D95" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bonifacioBg)" />
          {/* Ministerial Coat & High White Cravat */}
          <path d="M10 64 C10 46 54 46 54 64 Z" fill="#18181B" />
          <polygon points="26,45 38,45 34,60 30,60" fill="#FBF7EE" />
          {/* Order of the Southern Cross Medal */}
          <circle cx="40" cy="54" r="2.8" fill="#FBBF24" />
          {/* Iconic Flowing White Hair at Temples */}
          <circle cx="19" cy="29" r="5.5" fill="#E7E5E4" />
          <circle cx="45" cy="29" r="5.5" fill="#E7E5E4" />
          <path d="M18 24 Q32 14 46 24" fill="#D6D3D1" />
          {/* Head */}
          <circle cx="32" cy="30" r="11.5" fill="#FDBA74" />
          {/* Scholarly Forehead & Brow */}
          <path d="M25 27 H30 M34 27 H39" stroke="#57534E" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // 5. Dom Pedro II (O Magnânimo)
  return (
    <div
      className={`relative rounded-full overflow-hidden border border-[#FBBF24]/70 bg-[#1B0E07] flex items-center justify-center shrink-0 shadow-inner ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="pedro2Bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#7F1D1D" />
            <stop offset="100%" stopColor="#1B0E07" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" fill="url(#pedro2Bg)" />
        {/* Formal Imperial Coat & Green/Gold Sash */}
        <path d="M10 64 C10 45 54 45 54 64 Z" fill="#18181B" />
        <path d="M21 48 L43 64" stroke="#10B981" strokeWidth="4.5" />
        <path d="M21 48 L43 64" stroke="#FBBF24" strokeWidth="1.5" />
        {/* Head */}
        <circle cx="32" cy="28" r="11.5" fill="#FDBA74" />
        {/* Iconic Full Silver-White Imperial Beard */}
        <path
          d="M20 29 Q20 49 32 50 Q44 49 44 29 Q39 40 32 40 Q25 40 20 29 Z"
          fill="#F5F5F4"
        />
        <path d="M25 34 Q32 32 39 34" stroke="#D6D3D1" strokeWidth="2" fill="none" />
        {/* Imperial Crown of Brazil */}
        <path d="M19 20 L22 11 L32 15 L42 11 L45 20 Z" fill="#F59E0B" />
        <circle cx="32" cy="10" r="1.8" fill="#FEF08A" />
      </svg>
    </div>
  );
};
