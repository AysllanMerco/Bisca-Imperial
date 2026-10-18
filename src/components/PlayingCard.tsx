import React from 'react';
import { Card, Suit } from '../types/bisca';
import { SUIT_INFO, getCardDisplayName } from '../utils/biscaEngine';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  isTrumpSuit?: boolean;
  isPlayable?: boolean;
  isWinningTrickCard?: boolean;
  hotkeyLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
}

export function SuitSvg({
  suit,
  className = 'w-5 h-5',
}: {
  suit: Suit;
  className?: string;
}) {
  const isRed = SUIT_INFO[suit].isRed;
  const fill = isRed ? '#B91C1C' : '#18181B';

  if (suit === 'ouros') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill={fill} aria-hidden="true">
        <path d="M12 2L20.5 12L12 22L3.5 12L12 2Z" />
      </svg>
    );
  }
  if (suit === 'copas') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill={fill} aria-hidden="true">
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
      </svg>
    );
  }
  if (suit === 'espadas') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill={fill} aria-hidden="true">
        <path d="M12 2C7 8 3 11.5 3 15C3 17.8 5.2 20 8 20C9.5 20 10.8 19.3 11.5 18.2L10 22H14L12.5 18.2C13.2 19.3 14.5 20 16 20C18.8 20 21 17.8 21 15C21 11.5 17 8 12 2Z" />
      </svg>
    );
  }
  // paus
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill} aria-hidden="true">
      <path d="M12 3C9.8 3 8 4.8 8 7C8 8.5 8.8 9.8 10 10.5C7.2 10.8 5 13.1 5 16C5 18.5 7 20.5 9.5 20.5C10.6 20.5 11.6 20 12.3 19.3L10.5 22.5H13.5L11.7 19.3C12.4 20 13.4 20.5 14.5 20.5C17 20.5 19 18.5 19 16C19 13.1 16.8 10.8 14 10.5C15.2 9.8 16 8.5 16 7C16 4.8 14.2 3 12 3Z" />
    </svg>
  );
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  isTrumpSuit = false,
  isPlayable = false,
  isWinningTrickCard = false,
  hotkeyLabel,
  size = 'md',
  onClick,
  onMouseEnter,
  className = '',
}) => {
  const dimensions = {
    sm: 'w-[72px] h-[104px] rounded-lg',
    md: 'w-[76px] h-[110px] sm:w-[112px] sm:h-[162px] rounded-xl',
    lg: 'w-[118px] h-[170px] sm:w-[130px] sm:h-[188px] rounded-xl',
  }[size];

  // Face-down Imperial Brazil Coat of Arms Card Back (Verde-Ouro Imperial)
  if (faceDown || !card) {
    return (
      <div
        className={`relative select-none ${dimensions} bg-[#FAF5E8] p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-[#D6C7B2] ${className}`}
        aria-label="Carta virada para baixo"
      >
        <div className="w-full h-full rounded-lg bg-[#064E3B] border border-[#FBBF24]/60 overflow-hidden relative flex items-center justify-center">
          <svg
            viewBox="0 0 100 144"
            className="w-full h-full opacity-95"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="imperialPattern"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <rect width="20" height="20" fill="#064E3B" />
                <path
                  d="M10 0 L20 10 L10 20 L0 10 Z"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="0.6"
                  strokeOpacity="0.35"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="2.2"
                  fill="#FBBF24"
                  fillOpacity="0.22"
                />
              </pattern>
            </defs>
            <rect width="100" height="144" fill="url(#imperialPattern)" />
            <rect
              x="6"
              y="6"
              width="88"
              height="132"
              rx="5"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="1.3"
              strokeOpacity="0.75"
            />
            {/* Imperial Diamond & Armillary Sphere Emblem */}
            <g transform="translate(50, 72)">
              <polygon
                points="0,-32 30,0 0,32 -30,0"
                fill="#042F2E"
                stroke="#FBBF24"
                strokeWidth="1.6"
              />
              {/* Armillary Sphere Circle */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#1E3A8A"
                stroke="#FBBF24"
                strokeWidth="1.5"
              />
              {/* Equator & Ecliptic Bands */}
              <line x1="-13" y1="0" x2="13" y2="0" stroke="#FBBF24" strokeWidth="1" />
              <line x1="0" y1="-13" x2="0" y2="13" stroke="#FBBF24" strokeWidth="1" />
              <line x1="-9" y1="-9" x2="9" y2="9" stroke="#FBBF24" strokeWidth="1" />
              {/* Imperial Crown Top */}
              <path d="M-8,-16 L-5,-23 L0,-19 L5,-23 L8,-16 Z" fill="#FBBF24" />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  const suitMeta = SUIT_INFO[card.suit];
  const textColor = suitMeta.isRed ? 'text-[#B91C1C]' : 'text-[#18181B]';
  const isBiscaOrAce = card.rank === '7' || card.rank === 'A';
  const isCourt = card.rank === 'K' || card.rank === 'J' || card.rank === 'Q';

  const interactiveClasses = onClick
    ? isPlayable
      ? 'cursor-pointer hover:-translate-y-4 hover:shadow-[0_20px_34px_rgba(0,0,0,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24] active:translate-y-0'
      : 'cursor-not-allowed opacity-55 saturate-50'
    : '';

  const borderClasses = isWinningTrickCard
    ? 'ring-3 ring-[#FBBF24] border-[#F59E0B] shadow-[0_0_28px_rgba(251,191,36,0.75)] scale-105'
    : isTrumpSuit
    ? 'border-[#D97706]/85'
    : 'border-[#D6C7B2]';

  const highValueGlowClass =
    isBiscaOrAce && isPlayable ? 'card-high-value-glow' : '';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick && isPlayable ? onClick : undefined}
      onMouseEnter={
        onMouseEnter && isPlayable && !faceDown ? onMouseEnter : undefined
      }
      disabled={onClick ? !isPlayable : undefined}
      aria-label={`${getCardDisplayName(card)}${card.points > 0 ? `, vale ${card.points} pontos` : ''}${isTrumpSuit ? ', carta de Trunfo' : ''}`}
      className={`group relative select-none text-left transition-all duration-150 ease-out ${dimensions} bg-[#FBF7EE] shadow-[0_10px_24px_rgba(0,0,0,0.55)] border ${borderClasses} ${highValueGlowClass} ${interactiveClasses} ${className}`}
    >
      {/* Subtle Inner Ornamental Frame */}
      <div
        className={`absolute inset-1.5 rounded-lg border pointer-events-none ${
          isTrumpSuit
            ? 'border-[#D97706]/40 bg-gradient-to-b from-[#FEF3C7]/40 via-transparent to-[#FEF3C7]/40'
            : 'border-[#E5DEC9]'
        }`}
      />

      {/* Top-Left Rank & Suit Index */}
      <div
        className={`absolute top-2 left-2.5 flex flex-col items-center leading-none ${textColor}`}
      >
        <span
          className={`font-display font-bold tracking-tight ${
            size === 'sm' ? 'text-sm' : 'text-base sm:text-xl'
          }`}
        >
          {card.rank}
        </span>
        <SuitSvg
          suit={card.suit}
          className={
            size === 'sm'
              ? 'w-3 h-3 mt-0.5'
              : 'w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5'
          }
        />
      </div>

      {/* Top-Right Trump Crown or Point Value Indicator */}
      {size !== 'sm' && (
        <div className="hidden sm:flex absolute top-2 right-2.5 flex-col items-end gap-0.5 pointer-events-none">
          {isTrumpSuit && (
            <span
              title="Naipe de Trunfo"
              className="text-[9px] font-mono-num font-bold tracking-tight text-[#065F46] bg-[#D1FAE5] border border-[#10B981]/50 px-1 py-0.2 rounded"
            >
              TRUNFO
            </span>
          )}
          {card.points > 0 && (
            <span
              className={`text-[10px] font-mono-num font-semibold ${
                isBiscaOrAce ? 'text-[#B45309] font-bold' : 'text-[#57534E]'
              }`}
            >
              +{card.points}p
            </span>
          )}
        </div>
      )}

      {/* Centerpiece Illustration */}
      <div className="w-full h-full flex flex-col items-center justify-center px-2.5 pointer-events-none">
        {card.rank === 'A' ? (
          <div className="relative flex flex-col items-center justify-center">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-[#D97706]/55 bg-[#FEF3C7]/55 flex items-center justify-center shadow-inner">
              <SuitSvg
                suit={card.suit}
                className={
                  size === 'sm' ? 'w-6 h-6' : 'w-8 h-8 sm:w-9 sm:h-9'
                }
              />
            </div>
            {size !== 'sm' && (
              <span className="mt-1 text-[9px] font-display font-bold tracking-widest uppercase text-[#92400E] text-center">
                ÁS
              </span>
            )}
          </div>
        ) : card.rank === '7' ? (
          <div className="relative flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <SuitSvg
                suit={card.suit}
                className={
                  size === 'sm' ? 'w-6 h-6' : 'w-8 h-8 sm:w-9 sm:h-9'
                }
              />
            </div>
            {size !== 'sm' && (
              <span className="mt-1 text-[9px] font-display font-bold tracking-widest uppercase text-[#065F46] bg-[#D1FAE5]/70 border-y border-[#10B981]/40 px-1.5">
                BISCA
              </span>
            )}
          </div>
        ) : isCourt ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-11 h-14 sm:w-12 sm:h-16 rounded-md border border-[#D97706]/45 bg-[#F5EFE0] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              <svg
                viewBox="0 0 36 28"
                className="w-7 h-5 mb-0.5"
                fill={suitMeta.isRed ? '#B91C1C' : '#18181B'}
                aria-hidden="true"
              >
                {card.rank === 'K' && (
                  <path d="M4 22L6 8L13 14L18 5L23 14L30 8L32 22H4ZM4 24H32V26H4V24Z" />
                )}
                {card.rank === 'Q' && (
                  <path d="M5 22L8 9L14 15L18 6L22 15L28 9L31 22H5ZM6 24H30V26H6V24Z" />
                )}
                {card.rank === 'J' && (
                  <path d="M18 4L27 12L23 23H13L9 12L18 4ZM11 25H25V27H11V25Z" />
                )}
              </svg>
              <SuitSvg suit={card.suit} className="w-3.5 h-3.5" />
            </div>
            {size !== 'sm' && (
              <span className="mt-0.5 text-[9px] font-sans font-semibold text-[#57534E]">
                {card.rank === 'K' ? 'Rei' : card.rank === 'J' ? 'Valete' : 'Dama'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center opacity-85">
            <SuitSvg
              suit={card.suit}
              className={
                size === 'sm' ? 'w-5 h-5' : 'w-7 h-7 sm:w-8 sm:h-8'
              }
            />
          </div>
        )}
      </div>

      {/* Bottom-Right Inverted Rank & Suit */}
      <div
        className={`absolute bottom-2 right-2.5 flex flex-col items-center leading-none rotate-180 ${textColor}`}
      >
        <span
          className={`font-display font-bold tracking-tight ${
            size === 'sm' ? 'text-sm' : 'text-base sm:text-xl'
          }`}
        >
          {card.rank}
        </span>
        <SuitSvg
          suit={card.suit}
          className={
            size === 'sm'
              ? 'w-3 h-3 mt-0.5'
              : 'w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5'
          }
        />
      </div>

      {/* Keyboard Hotkey Indicator on Player Hand */}
      {hotkeyLabel && isPlayable && (
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#072617] border border-[#FBBF24]/50 text-[#FBF7EE] font-mono-num text-[10px] shadow-md opacity-80 group-hover:opacity-100 group-hover:bg-[#D97706] group-hover:text-white transition-colors">
          {hotkeyLabel}
        </span>
      )}
    </Wrapper>
  );
};
