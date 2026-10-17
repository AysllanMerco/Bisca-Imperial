import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Plus,
  LogIn,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Users,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  CharacterId,
  GameMode,
  OnlineRoomSummary,
} from '../types/bisca';
import { getCharacterProfile } from '../utils/biscaEngine';
import { OpponentAvatar } from './OpponentAvatar';
import { soundFx } from '../utils/soundFx';

interface OnlineLobbyProps {
  username: string;
  playerCharacterId: CharacterId;
  gameMode: GameMode;
  mustFollowSuitInEndgame: boolean;
  wsConnected: boolean;
  openRooms: OnlineRoomSummary[];
  waitingRoomCode: string | null;
  isSearchingQueue: boolean;
  onlineError: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
  onLeaveWaitingRoom: () => void;
  onRefreshRooms: () => void;
  onBackToMenu: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  username,
  playerCharacterId,
  gameMode,
  mustFollowSuitInEndgame,
  wsConnected,
  openRooms,
  waitingRoomCode,
  isSearchingQueue,
  onlineError,
  onCreateRoom,
  onJoinRoom,
  onJoinQueue,
  onLeaveQueue,
  onLeaveWaitingRoom,
  onRefreshRooms,
  onBackToMenu,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const playerChar = getCharacterProfile(playerCharacterId);
  const displayUsername = username.trim() || 'Dom Viajante';

  const handleCopyCode = () => {
    if (!waitingRoomCode) return;
    soundFx.playButtonTap();
    navigator.clipboard?.writeText(waitingRoomCode).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCodeInput.trim().toUpperCase();
    if (cleaned.length < 3) return;
    soundFx.playButtonTap();
    onJoinRoom(cleaned);
  };

  return (
    <main className="relative z-30 w-full h-full flex flex-col justify-between px-5 py-4 sm:px-10 sm:py-6 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            soundFx.playButtonTap();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl walnut-rail border border-[#FBBF24]/35 text-xs sm:text-sm font-medium text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-[#FBBF24]" />
          <span>Voltar à Corte</span>
        </button>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl walnut-rail border border-white/15 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              wsConnected
                ? 'bg-[#34D399] shadow-[0_0_8px_#34D399]'
                : 'bg-[#F87171] animate-pulse'
            }`}
          />
          <span className="text-[#E7DEC8] font-medium">
            {wsConnected
              ? 'Salão Imperial Online Ativo'
              : 'Conectando ao Servidor Imperial...'}
          </span>
        </div>
      </div>

      {/* Center Content Container */}
      <div className="my-auto max-w-5xl w-full mx-auto py-4 space-y-5">
        {/* Header Card with Player Identity */}
        <div className="walnut-rail rounded-2xl border border-[#FBBF24]/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <OpponentAvatar
              opponentId={playerCharacterId}
              className="w-12 h-12"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-[#FBBF24] font-semibold">
                  Salão Multiplayer em Tempo Real
                </span>
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-[#FBF7EE]">
                {displayUsername}{' '}
                <span className="text-sm font-normal text-[#D6C7B2]">
                  como {playerChar.name}
                </span>
              </h1>
              <p className="text-xs text-[#34D399] flex items-center gap-1.5 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
                <span>
                  Habilidade (100 PI): <strong>{playerChar.power.name}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
            <span className="px-3 py-1.5 rounded-lg bg-black/40 border border-[#FBBF24]/30 text-[#FBBF24] font-semibold">
              {gameMode === 'bisca_3' ? 'Bisca de 3 Cartas' : 'Bisca de 9 Cartas'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-[#E7DEC8]">
              {mustFollowSuitInEndgame ? 'Assistir Naipe' : 'Naipe Livre'}
            </span>
          </div>
        </div>

        {/* Error Alert Banner if any */}
        {onlineError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-[#7F1D1D]/80 border border-[#F87171] px-4 py-3 text-xs sm:text-sm text-[#FECACA] flex items-center gap-2.5 shadow-lg"
          >
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            <span>{onlineError}</span>
          </motion.div>
        )}

        {/* STATE A: WAITING IN CREATED ROOM */}
        {waitingRoomCode ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="walnut-rail rounded-2xl border-2 border-[#FBBF24] p-6 sm:p-8 text-center space-y-5 shadow-2xl max-w-xl mx-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/20 border border-[#FBBF24]/50 flex items-center justify-center text-[#FBBF24] mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-[#FBBF24] font-semibold">
                Mesa Imperial Criada · Aguardando Desafiante
              </p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#FBF7EE] mt-1">
                Compartilhe o Código da Sala
              </h2>
              <p className="text-xs sm:text-sm text-[#D6C7B2] mt-1">
                Outro jogador pode digitar este código ou clicar na sua mesa na
                lista de Salas Abertas para iniciar imediatamente.
              </p>
            </div>

            {/* Room Code Display + Copy Button */}
            <div className="flex items-center justify-center gap-3">
              <div className="px-6 py-3 rounded-xl bg-black/60 border-2 border-[#FBBF24]/70 font-mono-num text-3xl sm:text-4xl font-bold tracking-[0.25em] text-[#FEF08A] shadow-inner">
                {waitingRoomCode}
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-3.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  onLeaveWaitingRoom();
                }}
                className="px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 text-xs sm:text-sm text-[#D6C7B2] hover:text-white transition-colors cursor-pointer"
              >
                Cancelar e Fechar Sala
              </button>
            </div>
          </motion.div>
        ) : isSearchingQueue ? (
          /* STATE B: SEARCHING IN QUICK MATCHMAKING QUEUE */
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="walnut-rail rounded-2xl border-2 border-[#34D399] p-6 sm:p-8 text-center space-y-5 shadow-2xl max-w-xl mx-auto"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#34D399]/50 flex items-center justify-center text-[#34D399] mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-[#34D399] font-semibold">
                Fila de Matchmaking Imperial
              </p>
              <h2 className="font-display font-bold text-2xl text-[#FBF7EE] mt-1">
                Procurando Oponente no Salão...
              </h2>
              <p className="text-xs sm:text-sm text-[#D6C7B2] mt-1">
                Assim que outro jogador entrar na Fila Rápida, a partida
                começará automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.playButtonTap();
                onLeaveQueue();
              }}
              className="px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 text-xs sm:text-sm text-[#D6C7B2] hover:text-white transition-colors cursor-pointer"
            >
              Sair da Fila
            </button>
          </motion.div>
        ) : (
          /* STATE C: MAIN LOBBY GRID (CREATE / JOIN / QUEUE + OPEN ROOMS LIST) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Actions (Quick Match, Create Room, Join by Code) */}
            <div className="lg:col-span-5 walnut-rail rounded-2xl border border-[#FBBF24]/35 p-5 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#FBF7EE] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#FBBF24]" />
                    <span>Iniciar Duelo Online</span>
                  </h2>
                  <p className="text-xs text-[#D6C7B2] mt-0.5">
                    Jogue contra outro jogador em tempo real com sincronização
                    de cartas, trunfo e poderes de 100 PI.
                  </p>
                </div>

                {/* 1. Quick Matchmaking Button */}
                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={() => {
                    soundFx.playButtonTap();
                    onJoinQueue();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#10B981] hover:to-[#34D399] disabled:opacity-50 text-[#052E16] font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Fila Rápida (Matchmaking)</span>
                </button>

                {/* 2. Create Room Button */}
                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={() => {
                    soundFx.playButtonTap();
                    onCreateRoom();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#B45309] disabled:opacity-50 text-[#1B0E07] font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Criar Nova Sala (Gerar Código)</span>
                </button>

                <div className="border-t border-white/10 pt-3">
                  <form onSubmit={handleJoinByCodeSubmit} className="space-y-2">
                    <label
                      htmlFor="room-code-input"
                      className="block text-xs font-semibold text-[#E7DEC8]"
                    >
                      Entrar com Código da Sala
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="room-code-input"
                        type="text"
                        maxLength={6}
                        value={joinCodeInput}
                        onChange={(e) =>
                          setJoinCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="EX: K7R2"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-[#FBBF24]/35 font-mono-num text-sm uppercase tracking-widest text-[#FBF7EE] placeholder:text-[#D6C7B2]/40 focus:outline-none focus:border-[#FBBF24]"
                      />
                      <button
                        type="submit"
                        disabled={!wsConnected || joinCodeInput.trim().length < 3}
                        className="px-4 py-2.5 rounded-xl bg-[#78350F] hover:bg-[#92400E] disabled:opacity-40 border border-[#FBBF24]/40 text-xs sm:text-sm font-semibold text-[#FEF08A] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Entrar</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="text-[11px] text-[#D6C7B2]/80 pt-2 border-t border-white/10">
                Dica: Você também pode abrir o jogo em outra aba ou dispositivo
                para testar uma partida multiplayer imediatamente.
              </div>
            </div>

            {/* Right Column: Live Open Rooms List */}
            <div className="lg:col-span-7 walnut-rail rounded-2xl border border-[#FBBF24]/35 p-5 flex flex-col justify-between shadow-xl min-h-[290px]">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FBBF24]" />
                    <h2 className="font-display font-bold text-lg text-[#FBF7EE]">
                      Mesas Abertas no Salão ({openRooms.length})
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playButtonTap();
                      onRefreshRooms();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-black/35 hover:bg-black/55 border border-white/15 text-xs text-[#E7DEC8] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span>Atualizar</span>
                  </button>
                </div>

                {openRooms.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm font-medium text-[#E7DEC8]">
                      Nenhuma sala aguardando jogadores no momento.
                    </p>
                    <p className="text-xs text-[#D6C7B2]">
                      Clique em <strong>Criar Nova Sala</strong> ao lado ou
                      entre na <strong>Fila Rápida</strong> para desafiar
                      alguém!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                    {openRooms.map((room) => {
                      const hostChar = getCharacterProfile(
                        room.hostCharacterId
                      );
                      return (
                        <div
                          key={room.roomCode}
                          className="rounded-xl bg-black/40 border border-[#FBBF24]/30 p-3 flex items-center justify-between gap-3 hover:border-[#FBBF24] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <OpponentAvatar
                              opponentId={room.hostCharacterId}
                              className="w-10 h-10 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-display font-bold text-sm text-[#FBF7EE] truncate">
                                  {room.hostUsername}
                                </span>
                                <span className="font-mono-num text-xs px-2 py-0.5 rounded bg-[#F59E0B]/20 border border-[#FBBF24]/40 text-[#FEF08A] font-bold">
                                  #{room.roomCode}
                                </span>
                              </div>
                              <div className="text-xs text-[#D6C7B2] flex flex-wrap items-center gap-2 mt-0.5">
                                <span>{hostChar.shortName}</span>
                                <span>·</span>
                                <span className="text-[#34D399]">
                                  {room.gameMode === 'bisca_3'
                                    ? 'Bisca de 3'
                                    : 'Bisca de 9'}
                                </span>
                                <span>·</span>
                                <span>
                                  {room.mustFollowSuitInEndgame
                                    ? 'Assistir Naipe'
                                    : 'Naipe Livre'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playButtonTap();
                              onJoinRoom(room.roomCode);
                            }}
                            className="px-4 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-display font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Entrar na Mesa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-xs text-[#D6C7B2] pt-3 border-t border-white/10 flex items-center justify-between">
                <span>Servidor WebSocket Autoritativo</span>
                <span className="font-mono-num text-[#FBBF24]">
                  Meta: 4 Tentos
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Hint */}
      <div className="text-center text-xs text-[#D6C7B2]/80">
        <span>Modo Online Sincronizado em Tempo Real</span>
        <span className="mx-2">·</span>
        <span>Cartas Ocultas Protegidas no Servidor</span>
        <span className="mx-2">·</span>
        <span>Habilidades Imperiais (100 PI) Ativas</span>
      </div>
    </main>
  );
};
