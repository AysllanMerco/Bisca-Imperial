import React, { useEffect, useRef } from 'react';
import { X, Zap, ShieldCheck } from 'lucide-react';
import { OPPONENTS, RANK_CONFIG } from '../utils/biscaEngine';
import { OpponentAvatar } from './OpponentAvatar';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Leva o foco para o diálogo ao abrir, para que leitores de tela e
  // navegação por teclado comecem dentro do modal em vez do jogo atrás dele.
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const scoringRanks = [...RANK_CONFIG].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl walnut-rail border border-[#FBBF24]/45 p-6 sm:p-8 text-[#FBF7EE] shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-sans text-[#FBBF24] tracking-wide">
              Código do Paço Imperial · Rio de Janeiro (1822–1889)
            </p>
            <h2
              id="rules-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#FBF7EE] mt-0.5"
            >
              Regras, Barra de Ímpeto e Poderes Imperiais
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#D6C7B2] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
            aria-label="Fechar manual de regras"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-7 text-sm leading-relaxed text-[#E7DEC8]">
          {/* Section 1: Barra de Força (Ímpeto 0-100 PI) */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#FBBF24]" />
              <h3 className="font-display text-lg font-semibold text-[#FBF7EE]">
                01. Regras da Barra de Força (Ímpeto · 0 a 100 PI)
              </h3>
            </div>
            <p>
              Cada jogador possui um medidor de <strong className="font-mono-num text-[#FBBF24]">0 a 100 Pontos de Ímpeto (PI)</strong>. Ao atingir <strong className="font-mono-num text-[#34D399]">100 PI</strong>, o botão de habilidade acende e você pode ativar o poder do seu personagem no seu turno antes de jogar uma carta (Tecla <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/20 font-mono-num text-xs">P</kbd>):
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-black/35 border border-[#FBBF24]/40 p-3">
                <div className="font-mono-num font-bold text-[#FBBF24]">
                  +50 PI · Sobrecorte com Pontuação
                </div>
                <p className="text-xs text-[#D6C7B2] mt-1">
                  Jogar um trunfo mais alto sobre outro trunfo em uma rodada que contenha Bisca (Ás/7) ou Figura (K/J/Q).
                </p>
              </div>
              <div className="rounded-xl bg-black/35 border border-[#34D399]/40 p-3">
                <div className="font-mono-num font-bold text-[#34D399]">
                  +30 PI · Corte Simples em Bisca
                </div>
                <p className="text-xs text-[#D6C7B2] mt-1">
                  Usar trunfo para capturar Ás (11 pts) ou Sete (10 pts) adversário.
                </p>
              </div>
              <div className="rounded-xl bg-black/35 border border-white/15 p-3">
                <div className="font-mono-num font-bold text-[#38BDF8]">
                  +15 PI · Vazada de Valor Elevado
                </div>
                <p className="text-xs text-[#D6C7B2] mt-1">
                  Vencer uma rodada com soma ≥ 14 pontos sem utilizar carta de trunfo.
                </p>
              </div>
              <div className="rounded-xl bg-black/35 border border-white/15 p-3">
                <div className="font-mono-num font-bold text-[#E7DEC8]">
                  +10 PI · Corte Comum
                </div>
                <p className="text-xs text-[#D6C7B2] mt-1">
                  Qualquer outro corte realizado com carta de trunfo.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Ficha Técnica dos 5 Personagens e Poderes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-[#34D399]" />
              <h3 className="font-display text-lg font-semibold text-[#FBF7EE]">
                02. Ficha Técnica dos Personagens, Poderes e Balanceamento
              </h3>
            </div>
            <div className="space-y-2.5">
              {OPPONENTS.map((char) => (
                <div
                  key={char.id}
                  className="rounded-xl bg-black/30 border border-white/10 p-3.5 flex items-start gap-3.5"
                >
                  <OpponentAvatar opponentId={char.id} className="w-11 h-11 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display font-bold text-base text-[#FBF7EE]">
                        {char.name}
                      </span>
                      <span className="font-mono-num text-xs font-bold text-[#FBBF24]">
                        Poder: {char.power.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#E7DEC8] mt-1">
                      <strong>Efeito:</strong> {char.power.description}
                    </p>
                    <p className="text-[11px] text-[#D6C7B2]/80 mt-1">
                      <strong>Salvaguarda Anti-Travamento:</strong>{' '}
                      {char.power.exceptionHandlingNote}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Card Hierarchy & Values */}
          <section>
            <h3 className="font-display text-lg font-semibold text-[#FBF7EE] mb-2">
              03. Força das Cartas e Valor em Pontos (120 pts)
            </h3>
            <p className="mb-3 text-xs text-[#D6C7B2]">
              Abaixo está a ordem da carta mais forte (Ás) para a mais fraca (2). O{' '}
              <strong className="text-[#FBBF24]">7 (Bisca)</strong> é a segunda carta mais forte do jogo, superando o Rei!
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {scoringRanks.map((item) => (
                <div
                  key={item.rank}
                  className={`rounded-lg p-2.5 border ${
                    item.points >= 10
                      ? 'bg-[#D97706]/15 border-[#FBBF24]/45'
                      : item.points > 0
                      ? 'bg-black/35 border-white/15'
                      : 'bg-black/20 border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-base text-[#FBF7EE]">
                      {item.rank}
                    </span>
                    <span className="font-mono-num text-xs font-semibold text-[#FBBF24]">
                      {item.points} pts
                    </span>
                  </div>
                  <div className="text-xs text-[#D6C7B2] mt-0.5">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-sans font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Retornar ao Salão Imperial
          </button>
        </div>
      </div>
    </div>
  );
};
