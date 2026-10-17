import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Pause,
  BookOpen,
  RotateCcw,
  Play,
  ArrowLeftRight,
  Trophy,
  History,
  Sparkles,
  Flame,
  Swords,
  Crown,
  Zap,
  Eye,
  User,
  Globe,
  Bot,
} from 'lucide-react';
import {
  Card,
  CharacterId,
  GameMode,
  GameState,
  MatchMode,
  OnlineRoomSummary,
  OnlineSyncedState,
  OpponentId,
  PlayedTrickCard,
  PowerSelectionMode,
  RoundSummaryData,
  Suit,
  TrickHistoryItem,
  TurnOwner,
} from './types/bisca';
import {
  OPPONENTS,
  SUIT_INFO,
  calculateImpetoCharge,
  canSwapTwoOfTrump,
  chooseBotCard,
  computeRoundSummary,
  createDeck,
  evaluateTrick,
  getCardDisplayName,
  getCharacterProfile,
  isCardPlayable,
  sortHand,
} from './utils/biscaEngine';
import { PlayingCard, SuitSvg } from './components/PlayingCard';
import { OpponentAvatar } from './components/OpponentAvatar';
import { RulesModal } from './components/RulesModal';
import { OnlineLobby } from './components/OnlineLobby';
import {
  ParticleCanvas,
  ParticleCanvasHandle,
} from './components/ParticleCanvas';
import { soundFx } from './utils/soundFx';

const HERO_DEMO_CARDS: Card[] = [
  { id: 'A_espadas', suit: 'espadas', rank: 'A', points: 11, strength: 10 },
  { id: '7_copas', suit: 'copas', rank: '7', points: 10, strength: 9 },
  { id: 'K_ouros', suit: 'ouros', rank: 'K', points: 4, strength: 8 },
  { id: 'Q_copas', suit: 'copas', rank: 'Q', points: 2, strength: 6 },
  { id: 'J_paus', suit: 'paus', rank: 'J', points: 3, strength: 7 },
];

const MATCH_TARGET_TENTOS = 4;

interface BigMomentCallout {
  id: number;
  title: string;
  subtitle: string;
  badgeText?: string;
  theme: 'gold' | 'emerald' | 'crimson';
  iconType: 'swords' | 'crown' | 'flame' | 'sparkles' | 'zap';
}

export default function App() {
  // Persistent per-tab client ID (allows testing 2 tabs side-by-side or reconnecting)
  const [clientId] = useState<string>(() => {
    try {
      const existing = sessionStorage.getItem('bisca_imperial_client_id');
      if (existing) return existing;
      const created = `imp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      sessionStorage.setItem('bisca_imperial_client_id', created);
      return created;
    } catch {
      return `imp_${Math.random().toString(36).slice(2, 10)}`;
    }
  });

  // User Profile State (Username + Player Character Selection)
  const [username, setUsername] = useState<string>(() => {
    try {
      return localStorage.getItem('bisca_imperial_user') || 'Dom Viajante';
    } catch {
      return 'Dom Viajante';
    }
  });
  const [playerCharacterId, setPlayerCharacterId] =
    useState<CharacterId>('pedro_ii');

  // Game Shell State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [matchMode, setMatchMode] = useState<MatchMode>('VS_BOT');
  const [gameMode, setGameMode] = useState<GameMode>('bisca_3');
  const [opponentId, setOpponentId] = useState<OpponentId>('leopoldina');
  const [mustFollowSuitInEndgame, setMustFollowSuitInEndgame] =
    useState<boolean>(false);

  // Online Multiplayer State
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [openRooms, setOpenRooms] = useState<OnlineRoomSummary[]>([]);
  const [waitingRoomCode, setWaitingRoomCode] = useState<string | null>(null);
  const [activeOnlineRoomCode, setActiveOnlineRoomCode] = useState<
    string | null
  >(null);
  const [isSearchingQueue, setIsSearchingQueue] = useState<boolean>(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineOpponentName, setOnlineOpponentName] =
    useState<string>('Adversário Online');
  const [onlineOpponentConnected, setOnlineOpponentConnected] =
    useState<boolean>(true);
  const [onlineMyLivePoints, setOnlineMyLivePoints] = useState<number>(0);
  const [onlineOppLivePoints, setOnlineOppLivePoints] = useState<number>(0);

  // Match & Round Score State
  const [playerTentos, setPlayerTentos] = useState<number>(0);
  const [botTentos, setBotTentos] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);

  // Active Deck & Hands
  const [stock, setStock] = useState<Card[]>([]);
  const [trumpCard, setTrumpCard] = useState<Card | null>(null);
  const [trumpSuit, setTrumpSuit] = useState<Suit>('copas');
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);

  // Captured Cards, Bonus Points & History
  const [playerCaptured, setPlayerCaptured] = useState<Card[]>([]);
  const [botCaptured, setBotCaptured] = useState<Card[]>([]);
  const [playerBonusPoints, setPlayerBonusPoints] = useState<number>(0);
  const [botBonusPoints, setBotBonusPoints] = useState<number>(0);
  const [trickHistory, setTrickHistory] = useState<TrickHistoryItem[]>([]);

  // Barra de Força (Ímpeto: 0 to 100 PI) & Special Power State Machine
  const [playerImpeto, setPlayerImpeto] = useState<number>(0);
  const [botImpeto, setBotImpeto] = useState<number>(0);
  const [powerUsedThisTurn, setPowerUsedThisTurn] = useState<boolean>(false);
  const [powerSelectionMode, setPowerSelectionMode] =
    useState<PowerSelectionMode>('NONE');

  // Active Trick Modifiers from Powers
  const [trickPointMultiplier, setTrickPointMultiplier] = useState<number>(1);
  const [coercedPlayer, setCoercedPlayer] = useState<TurnOwner | null>(null);
  const [opponentHandRevealed, setOpponentHandRevealed] =
    useState<boolean>(false);

  // Turn & Trick Resolution State
  const [turnOwner, setTurnOwner] = useState<TurnOwner>('player');
  const [currentTrick, setCurrentTrick] = useState<PlayedTrickCard[]>([]);
  const [isResolvingTrick, setIsResolvingTrick] = useState<boolean>(false);
  const [trickCollectingTo, setTrickCollectingTo] =
    useState<TurnOwner | null>(null);
  const [trickFeedback, setTrickFeedback] = useState<{
    winner: TurnOwner;
    points: number;
    reason: string;
    impetoAwarded?: string | null;
  } | null>(null);
  const [botStatusText, setBotStatusText] = useState<string | null>(null);
  const [tableShakeMode, setTableShakeMode] = useState<
    'none' | 'light' | 'heavy'
  >('none');
  const [screenFlash, setScreenFlash] = useState<
    'none' | 'gold' | 'emerald' | 'crimson'
  >('none');
  const [bigMoment, setBigMoment] = useState<BigMomentCallout | null>(null);
  const [floatingPointPop, setFloatingPointPop] = useState<{
    id: number;
    points: number;
    winner: TurnOwner;
  } | null>(null);

  // Milestone trackers within a single hand
  const milestonesReachedRef = useRef<{
    player61: boolean;
    player91: boolean;
    bot61: boolean;
    bot91: boolean;
    finalPhaseAnnounced: boolean;
  }>({
    player61: false,
    player91: false,
    bot61: false,
    bot91: false,
    finalPhaseAnnounced: false,
  });

  // UI Overlays
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] =
    useState<boolean>(false);
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(
    null
  );
  const [heroSelectedCardIdx, setHeroSelectedCardIdx] = useState<number>(1);

  // Refs for timers, WebSocket & particles
  const particleRef = useRef<ParticleCanvasHandle | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeenBannerIdRef = useRef<number>(0);
  const prevTrickLenRef = useRef<number>(0);
  const botTimerRef = useRef<number | null>(null);
  const resolveTimerRef = useRef<number | null>(null);
  const sweepTimerRef = useRef<number | null>(null);
  const bigMomentTimerRef = useRef<number | null>(null);

  const playerCharacter = getCharacterProfile(playerCharacterId);
  const activeOpponent = getCharacterProfile(opponentId);
  const displayUsername = username.trim() || 'Dom Viajante';
  const opponentDisplayName =
    matchMode === 'VS_ONLINE' ? onlineOpponentName : activeOpponent.name;
  const opponentShortName =
    matchMode === 'VS_ONLINE' ? onlineOpponentName : activeOpponent.shortName;

  useEffect(() => {
    try {
      localStorage.setItem('bisca_imperial_user', username);
    } catch {
      // Ignore storage errors in sandboxed iframes
    }
  }, [username]);

  const clearTimers = useCallback(() => {
    if (botTimerRef.current) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    if (resolveTimerRef.current) {
      window.clearTimeout(resolveTimerRef.current);
      resolveTimerRef.current = null;
    }
    if (sweepTimerRef.current) {
      window.clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    if (bigMomentTimerRef.current) {
      window.clearTimeout(bigMomentTimerRef.current);
      bigMomentTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const triggerTableShake = useCallback((intensity: 'light' | 'heavy') => {
    setTableShakeMode(intensity);
    window.setTimeout(
      () => setTableShakeMode('none'),
      intensity === 'heavy' ? 430 : 250
    );
  }, []);

  const triggerScreenFlash = useCallback(
    (color: 'gold' | 'emerald' | 'crimson') => {
      setScreenFlash(color);
      window.setTimeout(() => setScreenFlash('none'), 380);
    },
    []
  );

  const showBigMomentCallout = useCallback(
    (callout: Omit<BigMomentCallout, 'id'>, durationMs: number = 1950) => {
      if (bigMomentTimerRef.current) {
        window.clearTimeout(bigMomentTimerRef.current);
      }
      setBigMoment({
        ...callout,
        id: Date.now() + Math.random(),
      });
      bigMomentTimerRef.current = window.setTimeout(() => {
        setBigMoment(null);
      }, durationMs);
    },
    []
  );

  // Trigger card-slam visual feedback
  const triggerCardSlamImpact = useCallback(
    (card: Card) => {
      const isBiscaOrAce = card.rank === '7' || card.rank === 'A';
      const isTrump = card.suit === trumpSuit;
      soundFx.playCardSnap(isTrump, isBiscaOrAce);

      if (isBiscaOrAce) {
        triggerTableShake('light');
        particleRef.current?.emitShockwave({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.46,
          color: isTrump ? '#F59E0B' : '#FEF08A',
          maxRadius: 145,
          rings: 1,
        });
      }
    },
    [triggerTableShake, trumpSuit]
  );

  // =========================================================================
  // REAL-TIME WEBSOCKET CONNECTION & STATE SYNC (VS_ONLINE)
  // =========================================================================
  const sendWsMessage = useCallback(
    (payload: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            ...payload,
            clientId,
          })
        );
      }
    },
    [clientId]
  );

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-bisca`;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setWsConnected(true);
        ws?.send(JSON.stringify({ type: 'rooms:get', clientId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'rooms:list') {
            setOpenRooms(msg.rooms || []);
            return;
          }

          if (msg.type === 'queue:waiting') {
            setIsSearchingQueue(true);
            setOnlineError(null);
            return;
          }

          if (msg.type === 'queue:left') {
            setIsSearchingQueue(false);
            return;
          }

          if (msg.type === 'room:error') {
            setOnlineError(msg.message || 'Erro ao entrar na sala.');
            return;
          }

          if (msg.type === 'room:closed') {
            setWaitingRoomCode(null);
            setActiveOnlineRoomCode(null);
            setIsSearchingQueue(false);
            setOnlineError(msg.message || 'A sala foi encerrada.');
            setGameState('ONLINE_LOBBY');
            return;
          }

          if (msg.type === 'room:state') {
            const s: OnlineSyncedState = msg.state;
            setOnlineError(null);
            setMatchMode('VS_ONLINE');

            if (s.status === 'WAITING') {
              setWaitingRoomCode(s.roomCode);
              setActiveOnlineRoomCode(s.roomCode);
              setIsSearchingQueue(false);
              setGameState('ONLINE_LOBBY');
              return;
            }

            // Room is active (PLAYING, ROUND_SUMMARY, or GAME_OVER)
            setWaitingRoomCode(null);
            setIsSearchingQueue(false);
            setActiveOnlineRoomCode(s.roomCode);
            setGameMode(s.gameMode);
            setMustFollowSuitInEndgame(s.mustFollowSuitInEndgame);
            setRoundNumber(s.roundNumber);
            setOpponentId(s.opponentCharacterId);
            setOnlineOpponentName(s.opponentUsername);
            setOnlineOpponentConnected(s.opponentConnected);

            setPlayerHand(s.myHand);
            setBotHand(s.opponentHand);
            setOnlineMyLivePoints(s.myPoints);
            setOnlineOppLivePoints(s.opponentPoints);
            setPlayerTentos(s.myTentos);
            setBotTentos(s.opponentTentos);
            setPlayerImpeto(s.myImpeto);
            setBotImpeto(s.opponentImpeto);
            setPowerUsedThisTurn(s.myPowerUsedThisTurn);
            setPowerSelectionMode(s.myPowerSelectionMode);
            setCoercedPlayer(
              s.myCoerced ? 'player' : s.opponentCoerced ? 'bot' : null
            );
            setOpponentHandRevealed(s.opponentHandRevealed);

            // Represent remaining stock count for visual stack rendering
            const dummyStock: Card[] = Array.from(
              { length: s.stockCount },
              (_, idx) => ({
                id: `stock_${idx}`,
                suit: s.trumpSuit,
                rank: '2',
                points: 0,
                strength: 1,
              })
            );
            setStock(dummyStock);
            setTrumpCard(s.trumpCard);
            setTrumpSuit(s.trumpSuit);

            setTurnOwner(s.isMyTurn ? 'player' : 'bot');
            setIsResolvingTrick(s.isResolvingTrick);
            setTrickPointMultiplier(s.trickPointMultiplier);

            const mappedTrick: PlayedTrickCard[] = s.currentTrick.map((t) => ({
              card: t.card,
              playedBy: t.playedByMe ? 'player' : 'bot',
            }));
            setCurrentTrick(mappedTrick);

            // Trigger card snap effect when trick size increases
            if (mappedTrick.length > prevTrickLenRef.current) {
              const newest = mappedTrick[mappedTrick.length - 1];
              if (newest) {
                soundFx.playCardSnap(
                  newest.card.suit === s.trumpSuit,
                  newest.card.points >= 10
                );
              }
            }
            prevTrickLenRef.current = mappedTrick.length;

            if (s.trickFeedback) {
              const wonByPlayer = s.trickFeedback.wonByMe;
              setTrickFeedback({
                winner: wonByPlayer ? 'player' : 'bot',
                points: s.trickFeedback.points,
                reason: s.trickFeedback.reason,
                impetoAwarded: s.trickFeedback.impetoAwarded,
              });
            } else {
              setTrickFeedback(null);
            }

            // Trigger BigMomentBanner & particles if a new banner ID arrived from server
            if (
              s.lastEventBanner &&
              s.lastEventBanner.id !== lastSeenBannerIdRef.current
            ) {
              lastSeenBannerIdRef.current = s.lastEventBanner.id;
              showBigMomentCallout({
                title: s.lastEventBanner.title,
                subtitle: s.lastEventBanner.subtitle,
                badgeText: s.lastEventBanner.badgeText,
                theme: s.lastEventBanner.theme,
                iconType: s.lastEventBanner.iconType,
              });
              particleRef.current?.emitBurst({
                x: window.innerWidth * 0.5,
                y: window.innerHeight * 0.46,
                count: 45,
                palette:
                  s.lastEventBanner.theme === 'emerald'
                    ? 'emerald'
                    : s.lastEventBanner.theme === 'crimson'
                    ? 'crimson'
                    : 'gold',
                includeSuits: true,
              });
            }

            setTrickHistory(
              s.trickHistory.map((h) => ({
                trickNumber: h.trickNumber,
                leadPlayer: 'player',
                winner: h.wonByMe ? 'player' : 'bot',
                playerCard: h.myCard,
                botCard: h.opponentCard,
                points: h.points,
                reason: '',
                impetoAwarded: h.impetoAwarded,
              }))
            );

            if (s.roundSummary) {
              setRoundSummary({
                playerPoints: s.roundSummary.myPoints,
                botPoints: s.roundSummary.opponentPoints,
                winner:
                  s.roundSummary.wonByMe === 'draw'
                    ? 'draw'
                    : s.roundSummary.wonByMe
                    ? 'player'
                    : 'bot',
                tentosAwarded: s.roundSummary.tentosAwarded,
                outcomeType: s.roundSummary.outcomeType,
                outcomeTitle: s.roundSummary.outcomeTitle,
                outcomeDescription: s.roundSummary.outcomeDescription,
                playerBiscasAndAces: s.roundSummary.myBiscasAndAces,
                botBiscasAndAces: s.roundSummary.opponentBiscasAndAces,
              });
            } else {
              setRoundSummary(null);
            }

            setGameState(s.status);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setWsConnected(false);
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [clientId, showBigMomentCallout]);

  // Start a new Local Bot Hand (Round)
  const startNewRound = useCallback(
    (
      mode: GameMode,
      firstLeader: TurnOwner = 'player',
      resetMatchTentos: boolean = false,
      nextRoundNum: number = 1
    ) => {
      clearTimers();
      const handSize = mode === 'bisca_3' ? 3 : 9;
      const fullDeck = createDeck();

      const pHandRaw = fullDeck.slice(0, handSize);
      const bHandRaw = fullDeck.slice(handSize, handSize * 2);
      const remainingStock = fullDeck.slice(handSize * 2);

      const revealedTrump = remainingStock[remainingStock.length - 1];
      const tSuit = revealedTrump.suit;

      if (resetMatchTentos) {
        setPlayerTentos(0);
        setBotTentos(0);
        setRoundNumber(1);
        setPlayerImpeto(0);
        setBotImpeto(0);
      } else {
        setRoundNumber(nextRoundNum);
      }

      milestonesReachedRef.current = {
        player61: false,
        player91: false,
        bot61: false,
        bot91: false,
        finalPhaseAnnounced: false,
      };

      setTrumpCard(revealedTrump);
      setTrumpSuit(tSuit);
      setStock(remainingStock);
      setPlayerHand(sortHand(pHandRaw, tSuit));
      setBotHand(bHandRaw);
      setPlayerCaptured([]);
      setBotCaptured([]);
      setPlayerBonusPoints(0);
      setBotBonusPoints(0);
      setTrickHistory([]);
      setCurrentTrick([]);
      setIsResolvingTrick(false);
      setTrickCollectingTo(null);
      setTrickFeedback(null);
      setBotStatusText(null);
      setBigMoment(null);
      setFloatingPointPop(null);
      setRoundSummary(null);
      setIsHistoryDrawerOpen(false);
      setPowerUsedThisTurn(false);
      setPowerSelectionMode('NONE');
      setTrickPointMultiplier(1);
      setCoercedPlayer(null);
      setOpponentHandRevealed(false);
      setTurnOwner(firstLeader);
      setGameState('PLAYING');

      soundFx.playCardDeal();
    },
    [clearTimers]
  );

  const handleStartNewMatch = useCallback(() => {
    soundFx.playButtonTap();
    if (matchMode === 'VS_ONLINE') {
      if (
        activeOnlineRoomCode &&
        (gameState === 'GAME_OVER' || gameState === 'ROUND_SUMMARY')
      ) {
        sendWsMessage({ type: 'online:next_round' });
      } else {
        setOnlineError(null);
        setGameState('ONLINE_LOBBY');
        sendWsMessage({ type: 'rooms:get' });
      }
      return;
    }
    startNewRound(gameMode, 'player', true, 1);
  }, [
    activeOnlineRoomCode,
    gameMode,
    gameState,
    matchMode,
    sendWsMessage,
    startNewRound,
  ]);

  // Swap 2 of Trump for face-up Trump card
  const handleSwapTrump = useCallback(() => {
    if (
      gameState !== 'PLAYING' ||
      turnOwner !== 'player' ||
      currentTrick.length > 0 ||
      isResolvingTrick ||
      powerSelectionMode !== 'NONE' ||
      !trumpCard
    ) {
      return;
    }

    if (!canSwapTwoOfTrump(playerHand, trumpCard, stock.length, true)) {
      return;
    }

    if (matchMode === 'VS_ONLINE') {
      soundFx.playTrumpSwap();
      sendWsMessage({ type: 'online:swap_trump' });
      return;
    }

    const twoCard = playerHand.find(
      (c) => c.suit === trumpSuit && c.rank === '2'
    );
    if (!twoCard) return;

    const swappedCard = trumpCard;
    const newHand = playerHand
      .filter((c) => c.id !== twoCard.id)
      .concat(swappedCard);
    const newStock = [...stock.slice(0, stock.length - 1), twoCard];

    setPlayerHand(sortHand(newHand, trumpSuit));
    setTrumpCard(twoCard);
    setStock(newStock);
    soundFx.playTrumpSwap();
    triggerTableShake('light');
    triggerScreenFlash('gold');

    particleRef.current?.emitShockwave({
      x: window.innerWidth * 0.2,
      y: window.innerHeight * 0.5,
      color: '#FBBF24',
      maxRadius: 190,
      rings: 2,
    });
    particleRef.current?.emitBurst({
      x: window.innerWidth * 0.2,
      y: window.innerHeight * 0.5,
      count: 45,
      palette: 'gold',
      includeSuits: true,
    });

    showBigMomentCallout({
      title: 'DECRETO DO 2 DE TRUNFO!',
      subtitle: `Você recolheu o ${getCardDisplayName(swappedCard)} para a sua mão!`,
      badgeText:
        swappedCard.points > 0
          ? `+${swappedCard.points} PTS NA MÃO`
          : 'TROCA IMPERIAL',
      theme: 'gold',
      iconType: 'crown',
    });
  }, [
    currentTrick.length,
    gameState,
    isResolvingTrick,
    matchMode,
    playerHand,
    powerSelectionMode,
    sendWsMessage,
    showBigMomentCallout,
    stock,
    triggerScreenFlash,
    triggerTableShake,
    trumpCard,
    trumpSuit,
    turnOwner,
  ]);

  // =========================================================================
  // MÁQUINA DE ESTADOS EXECUTORA DAS 5 HABILIDADES ESPECIAIS (100 PI)
  // =========================================================================
  const handleActivatePlayerPower = useCallback(() => {
    if (
      gameState !== 'PLAYING' ||
      turnOwner !== 'player' ||
      isResolvingTrick ||
      playerImpeto < 100 ||
      powerUsedThisTurn ||
      powerSelectionMode !== 'NONE'
    ) {
      return;
    }

    soundFx.playPowerActivation();
    triggerTableShake('heavy');
    triggerScreenFlash('gold');

    if (matchMode === 'VS_ONLINE') {
      sendWsMessage({ type: 'online:activate_power' });
      return;
    }

    particleRef.current?.emitShockwave({
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      color: '#FBBF24',
      maxRadius: 280,
      rings: 3,
    });
    particleRef.current?.emitBurst({
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      count: 65,
      palette: 'royal',
      includeSuits: true,
    });

    // 1. Dom Pedro I — "Grito do Ipiranga"
    if (playerCharacterId === 'pedro_i') {
      setPlayerImpeto(0);
      setPowerUsedThisTurn(true);
      setCoercedPlayer('bot');
      showBigMomentCallout({
        title: 'GRITO DO IPIRANGA ATIVADO!',
        subtitle:
          currentTrick.length === 0
            ? `${activeOpponent.shortName} está coagido a responder com sua carta de maior pontuação!`
            : `${activeOpponent.shortName} será obrigado a jogar sua carta mais valiosa no próximo lance!`,
        badgeText: 'PODER DE D. PEDRO I',
        theme: 'gold',
        iconType: 'zap',
      });
      return;
    }

    // 2. Dom Pedro II — "Gabinete de Conciliação"
    if (playerCharacterId === 'pedro_ii') {
      setOpponentHandRevealed(true);
      if (stock.length > 0 && playerHand.length > 0) {
        setPowerSelectionMode('SELECT_HAND_CARD_FOR_CONCILIACAO');
        showBigMomentCallout({
          title: 'GABINETE DE CONCILIAÇÃO!',
          subtitle:
            'Mão adversária revelada! Clique em 1 carta da sua mão para trocá-la pelo topo do monte.',
          badgeText: 'ESCOLHA 1 CARTA',
          theme: 'gold',
          iconType: 'zap',
        });
      } else {
        setPlayerImpeto(0);
        setPowerUsedThisTurn(true);
        setPlayerBonusPoints((prev) => prev + 8);
        showBigMomentCallout({
          title: 'GABINETE DE CONCILIAÇÃO!',
          subtitle:
            'Mão adversária revelada! Como o monte está vazio, você recebe +8 pts de Bônus Diplomático.',
          badgeText: '+8 PTS · VISÃO TOTAL',
          theme: 'gold',
          iconType: 'zap',
        });
      }
      return;
    }

    // 3. José Bonifácio — "Estratégia do Patriarca"
    if (playerCharacterId === 'bonifacio') {
      if (playerHand.length > 0) {
        setPowerSelectionMode('SELECT_HAND_CARD_FOR_PATRIARCA');
        showBigMomentCallout({
          title: 'ESTRATÉGIA DO PATRIARCA!',
          subtitle: trumpCard
            ? `Clique em 1 carta da sua mão para colocá-la como Novo Trunfo e tomar o ${getCardDisplayName(trumpCard)}!`
            : 'Monte esgotado: clique em 1 carta da sua mão para decretar seu naipe como o Novo Trunfo Imperial (+6 pts)!',
          badgeText: 'ESCOLHA O NOVO TRUNFO',
          theme: 'gold',
          iconType: 'zap',
        });
      }
      return;
    }

    // 4. Imperatriz Leopoldina — "Decreto Soberano"
    if (playerCharacterId === 'leopoldina') {
      setPlayerImpeto(0);
      setPowerUsedThisTurn(true);
      setTrickPointMultiplier((prev) => Math.min(4, prev * 2));
      showBigMomentCallout({
        title: 'DECRETO SOBERANO (2X PONTOS)!',
        subtitle:
          'Todos os pontos acumulados nesta vaza foram dobrados por Decreto Imperial!',
        badgeText: 'MULTIPLICADOR 2X',
        theme: 'gold',
        iconType: 'crown',
      });
      return;
    }

    // 5. Princesa Isabel — "Redenção Dourada"
    if (playerCharacterId === 'isabel') {
      setPlayerImpeto(0);
      setPowerUsedThisTurn(true);

      const lostWithPoints = [...botCaptured].sort(
        (a, b) => b.points - a.points || b.strength - a.strength
      );

      if (
        lostWithPoints.length > 0 &&
        lostWithPoints[0].points > 0 &&
        playerHand.length > 0
      ) {
        const redeemedCard = lostWithPoints[0];
        const sortedByLowest = [...playerHand].sort((a, b) => {
          if (a.points !== b.points) return a.points - b.points;
          const aTrump = a.suit === trumpSuit ? 1 : 0;
          const bTrump = b.suit === trumpSuit ? 1 : 0;
          if (aTrump !== bTrump) return aTrump - bTrump;
          return a.strength - b.strength;
        });
        const cardToReplace = sortedByLowest[0];

        const nextBotCaptured = botCaptured
          .filter((c) => c.id !== redeemedCard.id)
          .concat(cardToReplace);
        const nextPlayerHand = playerHand
          .filter((c) => c.id !== cardToReplace.id)
          .concat(redeemedCard);

        setBotCaptured(nextBotCaptured);
        setPlayerHand(sortHand(nextPlayerHand, trumpSuit));

        showBigMomentCallout({
          title: 'REDENÇÃO DOURADA!',
          subtitle: `Você resgatou o ${getCardDisplayName(redeemedCard)} (+${redeemedCard.points} pts) das cartas perdidas!`,
          badgeText: `RESGATE +${redeemedCard.points} PTS`,
          theme: 'emerald',
          iconType: 'crown',
        });
      } else {
        setPlayerBonusPoints((prev) => prev + 12);
        showBigMomentCallout({
          title: 'REDENÇÃO DOURADA!',
          subtitle:
            'Nenhuma carta de pontos foi perdida ainda: você recebe +12 pts de Indulto Imperial!',
          badgeText: '+12 PONTOS BÔNUS',
          theme: 'emerald',
          iconType: 'crown',
        });
      }
    }
  }, [
    activeOpponent.shortName,
    botCaptured,
    currentTrick.length,
    gameState,
    isResolvingTrick,
    matchMode,
    playerCharacterId,
    playerHand,
    playerImpeto,
    powerSelectionMode,
    powerUsedThisTurn,
    sendWsMessage,
    showBigMomentCallout,
    stock.length,
    triggerScreenFlash,
    triggerTableShake,
    trumpCard,
    trumpSuit,
    turnOwner,
  ]);

  // Handle completing card selection when Dom Pedro II or José Bonifácio power is awaiting a card click (Local Mode)
  const handlePowerCardSelection = useCallback(
    (selectedCard: Card) => {
      if (powerSelectionMode === 'SELECT_HAND_CARD_FOR_CONCILIACAO') {
        if (stock.length === 0) {
          setPowerSelectionMode('NONE');
          setPlayerImpeto(0);
          setPowerUsedThisTurn(true);
          return;
        }
        const topStockCard = stock[0];
        const nextStock = [selectedCard, ...stock.slice(1)];
        const nextTrumpCard =
          nextStock.length > 0 ? nextStock[nextStock.length - 1] : null;
        const nextHand = playerHand
          .filter((c) => c.id !== selectedCard.id)
          .concat(topStockCard);

        setStock(nextStock);
        setTrumpCard(nextTrumpCard);
        setPlayerHand(sortHand(nextHand, trumpSuit));
        setPowerSelectionMode('NONE');
        setPlayerImpeto(0);
        setPowerUsedThisTurn(true);
        soundFx.playTrumpSwap();

        showBigMomentCallout({
          title: 'CONCILIAÇÃO CONCLUÍDA!',
          subtitle: `Trocou ${getCardDisplayName(selectedCard)} por ${getCardDisplayName(topStockCard)} do topo do monte!`,
          badgeText: 'MÃO REVELADA',
          theme: 'emerald',
          iconType: 'sparkles',
        });
        return;
      }

      if (powerSelectionMode === 'SELECT_HAND_CARD_FOR_PATRIARCA') {
        const newTrumpSuit = selectedCard.suit;
        if (trumpCard && stock.length > 0) {
          const oldTrump = trumpCard;
          const nextHand = playerHand
            .filter((c) => c.id !== selectedCard.id)
            .concat(oldTrump);
          const nextStock = [
            ...stock.slice(0, stock.length - 1),
            selectedCard,
          ];

          setTrumpCard(selectedCard);
          setTrumpSuit(newTrumpSuit);
          setStock(nextStock);
          setPlayerHand(sortHand(nextHand, newTrumpSuit));
          setPowerSelectionMode('NONE');
          setPlayerImpeto(0);
          setPowerUsedThisTurn(true);
          soundFx.playTrumpSwap();

          showBigMomentCallout({
            title: 'NOVO TRUNFO DO PATRIARCA!',
            subtitle: `Recolheu ${getCardDisplayName(oldTrump)} e decretou ${SUIT_INFO[newTrumpSuit].name} como novo Trunfo!`,
            badgeText: `TRUNFO: ${SUIT_INFO[newTrumpSuit].name.toUpperCase()}`,
            theme: 'gold',
            iconType: 'crown',
          });
        } else {
          setTrumpSuit(newTrumpSuit);
          setPlayerHand(sortHand(playerHand, newTrumpSuit));
          setPlayerBonusPoints((prev) => prev + 6);
          setPowerSelectionMode('NONE');
          setPlayerImpeto(0);
          setPowerUsedThisTurn(true);
          soundFx.playTrumpSwap();

          showBigMomentCallout({
            title: 'DECRETO DO PATRIARCA!',
            subtitle: `Naipe de Trunfo alterado para ${SUIT_INFO[newTrumpSuit].name} (+6 pts táticos)!`,
            badgeText: `TRUNFO: ${SUIT_INFO[newTrumpSuit].name.toUpperCase()}`,
            theme: 'gold',
            iconType: 'crown',
          });
        }
      }
    },
    [
      playerHand,
      powerSelectionMode,
      showBigMomentCallout,
      stock,
      trumpCard,
      trumpSuit,
    ]
  );

  // Resolve a completed 2-card trick with Impeto charging and power modifiers (Local VS_BOT Mode)
  const finalizeTrick = useCallback(
    (
      firstPlay: PlayedTrickCard,
      secondPlay: PlayedTrickCard,
      currentStock: Card[],
      currentPHand: Card[],
      currentBHand: Card[],
      currentPCaptured: Card[],
      currentBCaptured: Card[],
      currentHistory: TrickHistoryItem[],
      activeMultiplier: number,
      currentPBonus: number,
      currentBBonus: number
    ) => {
      const evalResult = evaluateTrick(
        firstPlay.card,
        secondPlay.card,
        firstPlay.playedBy,
        trumpSuit,
        activeMultiplier
      );

      const impetoResult = calculateImpetoCharge(
        firstPlay.card,
        secondPlay.card,
        firstPlay.playedBy,
        evalResult.winner,
        trumpSuit
      );

      if (impetoResult.playerDelta > 0) {
        setPlayerImpeto((prev) => Math.min(100, prev + impetoResult.playerDelta));
        soundFx.playImpetoCharge(impetoResult.playerDelta);
      }
      if (impetoResult.botDelta > 0) {
        setBotImpeto((prev) => Math.min(100, prev + impetoResult.botDelta));
        soundFx.playImpetoCharge(impetoResult.botDelta);
      }

      setIsResolvingTrick(true);
      setTrickFeedback({
        winner: evalResult.winner,
        points: evalResult.points,
        reason: evalResult.reason,
        impetoAwarded: impetoResult.chargeLabel,
      });

      const isTrumpCut =
        secondPlay.card.suit === trumpSuit &&
        firstPlay.card.suit !== trumpSuit;
      const isOvertrump =
        firstPlay.card.suit === trumpSuit &&
        secondPlay.card.suit === trumpSuit &&
        secondPlay.card.strength > firstPlay.card.strength;
      const loserCard =
        evalResult.winner === firstPlay.playedBy
          ? secondPlay.card
          : firstPlay.card;
      const capturedEnemyBiscaOrAce =
        loserCard.rank === '7' || loserCard.rank === 'A';

      if (isTrumpCut || isOvertrump) {
        soundFx.playTrumpSlash();
        particleRef.current?.emitTrumpSlash(
          window.innerWidth * 0.5,
          window.innerHeight * 0.46
        );
      }

      if (impetoResult.playerDelta === 50 || impetoResult.botDelta === 50) {
        triggerTableShake('heavy');
        triggerScreenFlash('gold');
        showBigMomentCallout({
          title: 'SOBRECORTE IMPERIAL (+50 PI)!',
          subtitle: `${evalResult.reason} · Barra de Ímpeto carregada em +50 PI!`,
          badgeText: `+${evalResult.points} PTS · +50 PI`,
          theme: evalResult.winner === 'player' ? 'gold' : 'crimson',
          iconType: 'zap',
        });
      } else if (evalResult.points >= 20) {
        triggerTableShake('heavy');
        triggerScreenFlash(
          evalResult.winner === 'player' ? 'gold' : 'crimson'
        );
        particleRef.current?.emitShockwave({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.46,
          color: evalResult.winner === 'player' ? '#FBBF24' : '#EF4444',
          maxRadius: 270,
          rings: 3,
        });
        particleRef.current?.emitBurst({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.46,
          count: 75,
          palette: evalResult.winner === 'player' ? 'gold' : 'crimson',
          includeSuits: true,
        });

        showBigMomentCallout({
          title:
            evalResult.winner === 'player'
              ? 'CARGA IMPERIAL CAPTURADA!'
              : `${activeOpponent.shortName.toUpperCase()} LEVA A CARGA!`,
          subtitle:
            evalResult.winner === 'bot'
              ? activeOpponent.quoteWinBig
              : evalResult.reason,
          badgeText: `+${evalResult.points} PONTOS`,
          theme: evalResult.winner === 'player' ? 'gold' : 'crimson',
          iconType: 'crown',
        });
      } else if (capturedEnemyBiscaOrAce) {
        triggerTableShake('heavy');
        triggerScreenFlash(
          evalResult.winner === 'player' ? 'emerald' : 'crimson'
        );
        particleRef.current?.emitShockwave({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.46,
          color: evalResult.winner === 'player' ? '#34D399' : '#EF4444',
          maxRadius: 230,
          rings: 2,
        });
        particleRef.current?.emitBurst({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.46,
          count: 55,
          palette: evalResult.winner === 'player' ? 'emerald' : 'crimson',
          includeSuits: true,
        });

        const huntedName =
          loserCard.rank === 'A'
            ? 'ÁS IMPERIAL EMBOSCADO!'
            : 'BISCA DA CORTE CAÇADA!';
        showBigMomentCallout({
          title:
            evalResult.winner === 'player'
              ? huntedName
              : `${activeOpponent.shortName.toUpperCase()} CONFISCOU ${
                  loserCard.rank === 'A' ? 'SEU ÁS!' : 'SUA BISCA!'
                }`,
          subtitle:
            impetoResult.chargeLabel ||
            (evalResult.winner === 'bot'
              ? activeOpponent.quoteWinBig
              : evalResult.reason),
          badgeText: `+${evalResult.points} PONTOS`,
          theme: evalResult.winner === 'player' ? 'emerald' : 'crimson',
          iconType: 'swords',
        });
      } else if (isTrumpCut && evalResult.points >= 2) {
        triggerTableShake('light');
        showBigMomentCallout(
          {
            title: 'CORTE DE TRUNFO!',
            subtitle:
              impetoResult.chargeLabel ||
              (evalResult.winner === 'bot'
                ? activeOpponent.quoteTrumpCut
                : evalResult.reason),
            badgeText: `+${evalResult.points} PONTOS`,
            theme: evalResult.winner === 'player' ? 'gold' : 'crimson',
            iconType: 'swords',
          },
          1550
        );
      }

      sweepTimerRef.current = window.setTimeout(() => {
        setTrickCollectingTo(evalResult.winner);
        if (evalResult.points > 0) {
          setFloatingPointPop({
            id: Date.now(),
            points: evalResult.points,
            winner: evalResult.winner,
          });
        }
      }, 860);

      resolveTimerRef.current = window.setTimeout(() => {
        const trickCards = [firstPlay.card, secondPlay.card];
        const nextPCaptured =
          evalResult.winner === 'player'
            ? [...currentPCaptured, ...trickCards]
            : currentPCaptured;
        const nextBCaptured =
          evalResult.winner === 'bot'
            ? [...currentBCaptured, ...trickCards]
            : currentBCaptured;

        const nextPBonus =
          evalResult.winner === 'player'
            ? currentPBonus + evalResult.bonusPointsAwarded
            : currentPBonus;
        const nextBBonus =
          evalResult.winner === 'bot'
            ? currentBBonus + evalResult.bonusPointsAwarded
            : currentBBonus;

        const newPPoints =
          nextPCaptured.reduce((s, c) => s + c.points, 0) + nextPBonus;

        const playerCard =
          firstPlay.playedBy === 'player' ? firstPlay.card : secondPlay.card;
        const botCard =
          firstPlay.playedBy === 'bot' ? firstPlay.card : secondPlay.card;

        const nextHistory: TrickHistoryItem[] = [
          {
            trickNumber: currentHistory.length + 1,
            leadPlayer: firstPlay.playedBy,
            winner: evalResult.winner,
            playerCard,
            botCard,
            points: evalResult.points,
            reason: evalResult.reason,
            impetoAwarded: impetoResult.chargeLabel || undefined,
          },
          ...currentHistory,
        ];

        let nextStock = [...currentStock];
        let nextPHand = [...currentPHand];
        let nextBHand = [...currentBHand];
        let nextTrumpCard = trumpCard;
        const hadStockBefore = nextStock.length > 0;

        if (nextStock.length >= 2) {
          const firstDrawn = nextStock[0];
          const secondDrawn = nextStock[1];
          nextStock = nextStock.slice(2);

          if (evalResult.winner === 'player') {
            nextPHand.push(firstDrawn);
            nextBHand.push(secondDrawn);
          } else {
            nextBHand.push(firstDrawn);
            nextPHand.push(secondDrawn);
          }

          if (nextStock.length === 0) {
            nextTrumpCard = null;
          }
          soundFx.playCardDeal();
        }

        soundFx.playTrickWon(
          evalResult.winner === 'player',
          evalResult.points
        );

        setPlayerCaptured(nextPCaptured);
        setBotCaptured(nextBCaptured);
        setPlayerBonusPoints(nextPBonus);
        setBotBonusPoints(nextBBonus);
        setTrickHistory(nextHistory);
        setStock(nextStock);
        setTrumpCard(nextTrumpCard);
        setPlayerHand(sortHand(nextPHand, trumpSuit));
        setBotHand(nextBHand);
        setCurrentTrick([]);
        setTrickCollectingTo(null);
        setTrickFeedback(null);
        setIsResolvingTrick(false);
        setPowerUsedThisTurn(false);
        setTrickPointMultiplier(1);
        setOpponentHandRevealed(false);

        window.setTimeout(() => setFloatingPointPop(null), 650);

        const isRoundOver = nextPHand.length === 0 && nextBHand.length === 0;

        if (!isRoundOver) {
          if (
            newPPoints >= 91 &&
            !milestonesReachedRef.current.player91
          ) {
            milestonesReachedRef.current.player91 = true;
            milestonesReachedRef.current.player61 = true;
            particleRef.current?.triggerCelebration('normal');
            showBigMomentCallout({
              title: 'CAPOTE IMPERIAL GARANTIDO!',
              subtitle: `Com ${newPPoints} pontos, você já assegurou 2 tentos na mesa!`,
              badgeText: '91+ PONTOS',
              theme: 'gold',
              iconType: 'flame',
            });
          } else if (
            newPPoints >= 61 &&
            !milestonesReachedRef.current.player61
          ) {
            milestonesReachedRef.current.player61 = true;
            showBigMomentCallout({
              title: 'MÃO ASSEGURADA NO PAÇO!',
              subtitle: `Você superou a maioria de 60 pontos (${newPPoints} pts)!`,
              badgeText: '61+ PONTOS',
              theme: 'emerald',
              iconType: 'crown',
            });
          } else if (
            hadStockBefore &&
            nextStock.length === 0 &&
            !milestonesReachedRef.current.finalPhaseAnnounced
          ) {
            milestonesReachedRef.current.finalPhaseAnnounced = true;
            showBigMomentCallout(
              {
                title: 'MONTE ESGOTADO NO SALÃO!',
                subtitle: mustFollowSuitInEndgame
                  ? 'Reta final: obrigatório assistir ao naipe puxado!'
                  : 'Reta final: duelo direto com as últimas cartas na mão!',
                badgeText: 'FASE FINAL',
                theme: 'gold',
                iconType: 'sparkles',
              },
              1700
            );
          }
        }

        if (isRoundOver) {
          const summary = computeRoundSummary(
            nextPCaptured,
            nextBCaptured,
            nextPBonus,
            nextBBonus
          );
          setRoundSummary(summary);

          const nextPTentos =
            summary.winner === 'player'
              ? Math.min(
                  MATCH_TARGET_TENTOS,
                  playerTentos + summary.tentosAwarded
                )
              : playerTentos;
          const nextBTentos =
            summary.winner === 'bot'
              ? Math.min(MATCH_TARGET_TENTOS, botTentos + summary.tentosAwarded)
              : botTentos;

          setPlayerTentos(nextPTentos);
          setBotTentos(nextBTentos);

          const isSpecialWin =
            summary.outcomeType === 'capote' ||
            summary.outcomeType === 'bandeira' ||
            nextPTentos >= MATCH_TARGET_TENTOS;

          soundFx.playRoundEnd(summary.winner === 'player', isSpecialWin);

          if (summary.winner === 'player') {
            particleRef.current?.triggerCelebration(
              isSpecialWin ? 'grand' : 'normal'
            );
          }

          if (
            nextPTentos >= MATCH_TARGET_TENTOS ||
            nextBTentos >= MATCH_TARGET_TENTOS
          ) {
            setGameState('GAME_OVER');
          } else {
            setGameState('ROUND_SUMMARY');
          }
        } else {
          setTurnOwner(evalResult.winner);
        }
      }, 1220);
    },
    [
      activeOpponent.quoteTrumpCut,
      activeOpponent.quoteWinBig,
      activeOpponent.shortName,
      botTentos,
      mustFollowSuitInEndgame,
      playerTentos,
      showBigMomentCallout,
      triggerScreenFlash,
      triggerTableShake,
      trumpCard,
      trumpSuit,
    ]
  );

  // Player plays a card from hand (or selects a card for an active Power)
  const handlePlayPlayerCard = useCallback(
    (card: Card) => {
      if (
        gameState !== 'PLAYING' ||
        turnOwner !== 'player' ||
        isResolvingTrick ||
        currentTrick.length >= 2
      ) {
        return;
      }

      // Online Mode: route card play or power selection to authoritative server
      if (matchMode === 'VS_ONLINE') {
        triggerCardSlamImpact(card);
        sendWsMessage({
          type: 'online:play_card',
          cardId: card.id,
        });
        return;
      }

      // If awaiting card selection for Dom Pedro II or José Bonifácio power:
      if (powerSelectionMode !== 'NONE') {
        handlePowerCardSelection(card);
        return;
      }

      const leadCard = currentTrick.length === 1 ? currentTrick[0].card : null;
      const isPlayerCoerced = coercedPlayer === 'player';

      if (
        !isCardPlayable(
          card,
          playerHand,
          leadCard,
          stock.length,
          mustFollowSuitInEndgame,
          isPlayerCoerced
        )
      ) {
        return;
      }

      if (isPlayerCoerced) {
        setCoercedPlayer(null);
      }

      const nextPHand = playerHand.filter((c) => c.id !== card.id);
      const playedEntry: PlayedTrickCard = { card, playedBy: 'player' };
      const nextTrick = [...currentTrick, playedEntry];

      setPlayerHand(nextPHand);
      setCurrentTrick(nextTrick);
      triggerCardSlamImpact(card);

      if (nextTrick.length === 1) {
        setTurnOwner('bot');
      } else {
        finalizeTrick(
          nextTrick[0],
          nextTrick[1],
          stock,
          nextPHand,
          botHand,
          playerCaptured,
          botCaptured,
          trickHistory,
          trickPointMultiplier,
          playerBonusPoints,
          botBonusPoints
        );
      }
    },
    [
      botBonusPoints,
      botCaptured,
      botHand,
      coercedPlayer,
      currentTrick,
      finalizeTrick,
      gameState,
      handlePowerCardSelection,
      isResolvingTrick,
      matchMode,
      mustFollowSuitInEndgame,
      playerBonusPoints,
      playerCaptured,
      playerHand,
      powerSelectionMode,
      sendWsMessage,
      stock,
      trickHistory,
      trickPointMultiplier,
      triggerCardSlamImpact,
      turnOwner,
    ]
  );

  // Bot Turn Effect (Active only in VS_BOT mode)
  useEffect(() => {
    if (
      matchMode !== 'VS_BOT' ||
      gameState !== 'PLAYING' ||
      turnOwner !== 'bot' ||
      isResolvingTrick ||
      currentTrick.length >= 2 ||
      botHand.length === 0
    ) {
      return;
    }

    const isLeading = currentTrick.length === 0;
    setBotStatusText(
      isLeading ? activeOpponent.quoteLead : activeOpponent.quoteRespond
    );

    botTimerRef.current = window.setTimeout(() => {
      let workingBotHand = [...botHand];
      let workingStock = [...stock];
      let workingTrumpCard = trumpCard;
      let workingTrumpSuit = trumpSuit;
      let workingPlayerCaptured = [...playerCaptured];
      let workingMultiplier = trickPointMultiplier;
      let workingBBonus = botBonusPoints;
      let workingCoercedPlayer = coercedPlayer;

      // 1. Check if Bot has 100 PI to activate its Imperial Power!
      if (botImpeto >= 100) {
        setBotImpeto(0);
        soundFx.playPowerActivation();
        triggerTableShake('heavy');
        triggerScreenFlash('crimson');

        if (opponentId === 'pedro_i') {
          workingCoercedPlayer = 'player';
          setCoercedPlayer('player');
          showBigMomentCallout({
            title: `${activeOpponent.shortName.toUpperCase()}: GRITO DO IPIRANGA!`,
            subtitle:
              'Você foi coagido a jogar sua carta de maior pontuação na sua vez!',
            badgeText: 'COERÇÃO IMPERIAL',
            theme: 'crimson',
            iconType: 'zap',
          });
        } else if (opponentId === 'leopoldina') {
          workingMultiplier = Math.min(4, workingMultiplier * 2);
          setTrickPointMultiplier(workingMultiplier);
          showBigMomentCallout({
            title: `${activeOpponent.shortName.toUpperCase()}: DECRETO SOBERANO!`,
            subtitle: activeOpponent.quotePowerActivate,
            badgeText: 'VAZA 2X PONTOS',
            theme: 'crimson',
            iconType: 'crown',
          });
        } else if (opponentId === 'pedro_ii') {
          if (workingStock.length > 0 && workingBotHand.length > 0) {
            const lowestBotCard = [...workingBotHand].sort(
              (a, b) => a.points - b.points || a.strength - b.strength
            )[0];
            const topStock = workingStock[0];
            workingStock = [lowestBotCard, ...workingStock.slice(1)];
            workingBotHand = workingBotHand
              .filter((c) => c.id !== lowestBotCard.id)
              .concat(topStock);
            setStock(workingStock);
          } else {
            workingBBonus += 8;
            setBotBonusPoints(workingBBonus);
          }
          showBigMomentCallout({
            title: `${activeOpponent.shortName.toUpperCase()}: GABINETE DE CONCILIAÇÃO!`,
            subtitle: activeOpponent.quotePowerActivate,
            badgeText: 'PODER IMPERIAL',
            theme: 'crimson',
            iconType: 'zap',
          });
        } else if (opponentId === 'bonifacio') {
          if (workingTrumpCard && workingStock.length > 0) {
            const lowestBotCard = [...workingBotHand].sort(
              (a, b) => a.points - b.points || a.strength - b.strength
            )[0];
            const oldTrump = workingTrumpCard;
            workingBotHand = workingBotHand
              .filter((c) => c.id !== lowestBotCard.id)
              .concat(oldTrump);
            workingStock = [
              ...workingStock.slice(0, workingStock.length - 1),
              lowestBotCard,
            ];
            workingTrumpCard = lowestBotCard;
            workingTrumpSuit = lowestBotCard.suit;
            setTrumpCard(workingTrumpCard);
            setTrumpSuit(workingTrumpSuit);
            setStock(workingStock);
          }
          showBigMomentCallout({
            title: `${activeOpponent.shortName.toUpperCase()}: ESTRATÉGIA DO PATRIARCA!`,
            subtitle: activeOpponent.quotePowerActivate,
            badgeText: `TRUNFO: ${SUIT_INFO[workingTrumpSuit].name.toUpperCase()}`,
            theme: 'crimson',
            iconType: 'zap',
          });
        } else if (opponentId === 'isabel') {
          const lostFromBot = [...workingPlayerCaptured].sort(
            (a, b) => b.points - a.points || b.strength - a.strength
          );
          if (lostFromBot.length > 0 && lostFromBot[0].points > 0) {
            const redeemed = lostFromBot[0];
            const lowestBot = [...workingBotHand].sort(
              (a, b) => a.points - b.points || a.strength - b.strength
            )[0];
            workingPlayerCaptured = workingPlayerCaptured
              .filter((c) => c.id !== redeemed.id)
              .concat(lowestBot);
            workingBotHand = workingBotHand
              .filter((c) => c.id !== lowestBot.id)
              .concat(redeemed);
            setPlayerCaptured(workingPlayerCaptured);
          } else {
            workingBBonus += 12;
            setBotBonusPoints(workingBBonus);
          }
          showBigMomentCallout({
            title: `${activeOpponent.shortName.toUpperCase()}: REDENÇÃO DOURADA!`,
            subtitle: activeOpponent.quotePowerActivate,
            badgeText: 'RESGATE REAL',
            theme: 'crimson',
            iconType: 'crown',
          });
        }
      }

      // 2. Check if Bot holds 2 of Trump to swap before leading
      if (
        isLeading &&
        workingTrumpCard &&
        canSwapTwoOfTrump(
          workingBotHand,
          workingTrumpCard,
          workingStock.length,
          true
        ) &&
        workingTrumpCard.points >= 2
      ) {
        const twoCard = workingBotHand.find(
          (c) => c.suit === workingTrumpSuit && c.rank === '2'
        );
        if (twoCard) {
          const stolenCard = workingTrumpCard;
          workingBotHand = workingBotHand
            .filter((c) => c.id !== twoCard.id)
            .concat(stolenCard);
          workingStock = [
            ...workingStock.slice(0, workingStock.length - 1),
            twoCard,
          ];
          setTrumpCard(twoCard);
          setStock(workingStock);
          soundFx.playTrumpSwap();
          triggerTableShake('light');
        }
      }

      const leadCard = currentTrick.length === 1 ? currentTrick[0].card : null;
      const isBotCoerced = workingCoercedPlayer === 'bot';
      const playedCardsHistory = [...workingPlayerCaptured, ...botCaptured];

      const chosenCard = chooseBotCard(
        workingBotHand,
        leadCard,
        workingTrumpSuit,
        workingStock.length,
        mustFollowSuitInEndgame,
        opponentId,
        playedCardsHistory,
        isBotCoerced
      );

      if (isBotCoerced) {
        setCoercedPlayer(null);
      }

      const nextBHand = workingBotHand.filter((c) => c.id !== chosenCard.id);
      const playedEntry: PlayedTrickCard = { card: chosenCard, playedBy: 'bot' };
      const nextTrick = [...currentTrick, playedEntry];

      setBotStatusText(null);
      setBotHand(nextBHand);
      setCurrentTrick(nextTrick);
      triggerCardSlamImpact(chosenCard);

      if (nextTrick.length === 1) {
        setTurnOwner('player');
      } else {
        finalizeTrick(
          nextTrick[0],
          nextTrick[1],
          workingStock,
          playerHand,
          nextBHand,
          workingPlayerCaptured,
          botCaptured,
          trickHistory,
          workingMultiplier,
          playerBonusPoints,
          workingBBonus
        );
      }
    }, 680);

    return () => {
      if (botTimerRef.current) {
        window.clearTimeout(botTimerRef.current);
      }
    };
  }, [
    activeOpponent.name,
    activeOpponent.quoteLead,
    activeOpponent.quotePowerActivate,
    activeOpponent.quoteRespond,
    activeOpponent.shortName,
    botBonusPoints,
    botCaptured,
    botHand,
    botImpeto,
    coercedPlayer,
    currentTrick,
    finalizeTrick,
    gameState,
    isResolvingTrick,
    matchMode,
    mustFollowSuitInEndgame,
    opponentId,
    playerBonusPoints,
    playerCaptured,
    playerHand,
    showBigMomentCallout,
    stock,
    trickHistory,
    trickPointMultiplier,
    triggerCardSlamImpact,
    triggerScreenFlash,
    triggerTableShake,
    trumpCard,
    trumpSuit,
    turnOwner,
  ]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT'
      ) {
        return;
      }
      if (e.repeat) return;

      if (e.key === 'm' || e.key === 'M') {
        const muted = soundFx.toggleMute();
        setIsMuted(muted);
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        soundFx.playButtonTap();
        setIsRulesOpen((prev) => !prev);
        return;
      }

      if (isRulesOpen) {
        if (e.key === 'Escape') {
          setIsRulesOpen(false);
        }
        return;
      }

      if (gameState === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartNewMatch();
        }
        return;
      }

      if (gameState === 'PLAYING') {
        if (e.key === 'Escape') {
          if (powerSelectionMode !== 'NONE' && matchMode === 'VS_BOT') {
            setPowerSelectionMode('NONE');
            return;
          }
          soundFx.playButtonTap();
          setGameState('PAUSED');
          return;
        }
        if (e.key === 'p' || e.key === 'P') {
          handleActivatePlayerPower();
          return;
        }
        if (e.key === 't' || e.key === 'T') {
          handleSwapTrump();
          return;
        }
        if (e.key === 'h' || e.key === 'H') {
          setIsHistoryDrawerOpen((prev) => !prev);
          return;
        }
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9 && num <= playerHand.length) {
          handlePlayPlayerCard(playerHand[num - 1]);
        }
        return;
      }

      if (gameState === 'PAUSED') {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          soundFx.playButtonTap();
          setGameState('PLAYING');
        }
        return;
      }

      if (gameState === 'ROUND_SUMMARY') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          soundFx.playButtonTap();
          if (matchMode === 'VS_ONLINE') {
            sendWsMessage({ type: 'online:next_round' });
          } else {
            const nextLeader: TurnOwner =
              roundSummary?.winner === 'bot' ? 'bot' : 'player';
            startNewRound(gameMode, nextLeader, false, roundNumber + 1);
          }
        }
        return;
      }

      if (gameState === 'GAME_OVER') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartNewMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameMode,
    gameState,
    handleActivatePlayerPower,
    handlePlayPlayerCard,
    handleStartNewMatch,
    handleSwapTrump,
    isRulesOpen,
    matchMode,
    playerHand,
    powerSelectionMode,
    roundNumber,
    roundSummary?.winner,
    sendWsMessage,
    startNewRound,
  ]);

  // Computed live telemetry values
  const playerCurrentPoints =
    matchMode === 'VS_ONLINE'
      ? onlineMyLivePoints
      : playerCaptured.reduce((sum, c) => sum + c.points, 0) +
        playerBonusPoints;
  const botCurrentPoints =
    matchMode === 'VS_ONLINE'
      ? onlineOppLivePoints
      : botCaptured.reduce((sum, c) => sum + c.points, 0) + botBonusPoints;
  const leadCardOnTable =
    currentTrick.length > 0 ? currentTrick[0].card : null;
  const currentTrickPoints =
    currentTrick.reduce((sum, item) => sum + item.card.points, 0) *
    trickPointMultiplier;
  const playerCanSwapTrump =
    turnOwner === 'player' &&
    currentTrick.length === 0 &&
    !isResolvingTrick &&
    powerSelectionMode === 'NONE' &&
    canSwapTwoOfTrump(playerHand, trumpCard, stock.length, true);
  const playerCanActivatePower =
    turnOwner === 'player' &&
    !isResolvingTrick &&
    playerImpeto >= 100 &&
    !powerUsedThisTurn &&
    powerSelectionMode === 'NONE';

  const shakeClass =
    tableShakeMode === 'heavy'
      ? 'animate-table-shake-heavy'
      : tableShakeMode === 'light'
      ? 'animate-table-shake'
      : '';

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden baize-surface select-none flex flex-col justify-between ${shakeClass}`}
    >
      {/* 60fps Isolated Particle, Shockwave & Trump Slash Canvas */}
      <ParticleCanvas ref={particleRef} />

      {/* Screen Impact Radial Edge Flash */}
      <AnimatePresence>
        {screenFlash !== 'none' && (
          <motion.div
            key={screenFlash}
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            className={`pointer-events-none fixed inset-0 z-30 ${
              screenFlash === 'gold'
                ? 'bg-[radial-gradient(circle_at_center,transparent_35%,rgba(251,191,36,0.35)_100%)]'
                : screenFlash === 'emerald'
                ? 'bg-[radial-gradient(circle_at_center,transparent_35%,rgba(16,185,129,0.35)_100%)]'
                : 'bg-[radial-gradient(circle_at_center,transparent_35%,rgba(239,68,68,0.38)_100%)]'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Ornate Jacarandá & Imperial Brass Perimeter Frame Trim */}
      <div className="pointer-events-none fixed inset-0 border-[10px] sm:border-[14px] border-[#27150B] shadow-[inset_0_0_60px_rgba(0,0,0,0.85)] z-20" />
      <div className="pointer-events-none fixed inset-[10px] sm:inset-[14px] border border-[#FBBF24]/25 z-20" />

      {/* =====================================================================
          DRAMATIC BIG MOMENT CALLOUT OVERLAY (Non-Occluding, Pointer-Events-None)
      ===================================================================== */}
      <AnimatePresence>
        {bigMoment && (
          <motion.div
            key={bigMoment.id}
            initial={{ opacity: 0, scale: 0.65, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -18 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 22,
            }}
            className="pointer-events-none fixed inset-x-0 top-[18%] sm:top-[20%] z-40 flex justify-center px-4"
          >
            <div
              className={`relative px-6 py-3.5 rounded-2xl walnut-rail border-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center gap-4 max-w-xl ${
                bigMoment.theme === 'gold'
                  ? 'border-[#FBBF24] shadow-[0_0_40px_rgba(251,191,36,0.45)]'
                  : bigMoment.theme === 'emerald'
                  ? 'border-[#34D399] shadow-[0_0_40px_rgba(52,211,153,0.45)]'
                  : 'border-[#F87171] shadow-[0_0_40px_rgba(248,113,113,0.45)]'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  bigMoment.theme === 'gold'
                    ? 'bg-[#F59E0B]/25 text-[#FBBF24]'
                    : bigMoment.theme === 'emerald'
                    ? 'bg-[#10B981]/25 text-[#34D399]'
                    : 'bg-[#EF4444]/25 text-[#F87171]'
                }`}
              >
                {bigMoment.iconType === 'swords' && (
                  <Swords className="w-6 h-6" />
                )}
                {bigMoment.iconType === 'crown' && (
                  <Crown className="w-6 h-6" />
                )}
                {bigMoment.iconType === 'flame' && (
                  <Flame className="w-6 h-6" />
                )}
                {bigMoment.iconType === 'sparkles' && (
                  <Sparkles className="w-6 h-6" />
                )}
                {bigMoment.iconType === 'zap' && <Zap className="w-6 h-6" />}
              </div>

              <div className="text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-display font-bold text-base sm:text-xl tracking-wide ${
                      bigMoment.theme === 'gold'
                        ? 'text-[#FEF08A]'
                        : bigMoment.theme === 'emerald'
                        ? 'text-[#6EE7B7]'
                        : 'text-[#FCA5A5]'
                    }`}
                  >
                    {bigMoment.title}
                  </span>
                  {bigMoment.badgeText && (
                    <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded bg-black/50 border border-white/15 text-[#FBBF24]">
                      {bigMoment.badgeText}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#E7DEC8] mt-0.5">
                  {bigMoment.subtitle}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          STATE 1: TITLE MENU (Full-Viewport Imperial Salon Shell)
      ===================================================================== */}
      {gameState === 'TITLE_MENU' && (
        <main className="relative z-30 w-full h-full flex flex-col justify-between px-5 py-4 sm:px-10 sm:py-6 overflow-y-auto">
          {/* Top Perimeter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#D6C7B2]">
              <span>Império do Brasil (1822–1889)</span>
              <span aria-hidden="true">·</span>
              <span>Sistema de Ímpeto (100 PI)</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-[#FBBF24]">
                Modo IA & Online
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  setIsRulesOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg walnut-rail border border-[#FBBF24]/30 text-xs font-medium text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>Regras e Poderes [R]</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const muted = soundFx.toggleMute();
                  setIsMuted(muted);
                }}
                className="p-2 rounded-lg walnut-rail border border-[#FBBF24]/30 text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer"
                aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
                title="Alternar Áudio [M]"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-[#F87171]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#FBBF24]" />
                )}
              </button>
            </div>
          </div>

          {/* Center Interactive Hero Lockup & Imperial Court Table Setup */}
          <div className="my-auto max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-2">
            {/* Left Column: Bespoke SVG Imperial Lockup + Interactive Fan of Court Cards */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="mb-1">
                <svg
                  viewBox="0 0 440 115"
                  className="w-[280px] sm:w-[360px] h-auto"
                  role="img"
                  aria-label="Bisca Imperial — Corte do Brasil"
                >
                  <defs>
                    <linearGradient
                      id="imperialGoldGrad"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="55%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="20"
                    y1="18"
                    x2="175"
                    y2="18"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                    strokeOpacity="0.6"
                  />
                  <path
                    d="M206 22 L210 10 L220 16 L230 10 L234 22 Z"
                    fill="#FBBF24"
                  />
                  <circle cx="220" cy="7" r="2" fill="#FEF08A" />
                  <line
                    x1="265"
                    y1="18"
                    x2="420"
                    y2="18"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                    strokeOpacity="0.6"
                  />
                  <text
                    x="220"
                    y="70"
                    textAnchor="middle"
                    fill="url(#imperialGoldGrad)"
                    fontFamily="Fraunces, Georgia, serif"
                    fontWeight="700"
                    fontSize="48"
                    letterSpacing="2"
                  >
                    BISCA IMPERIAL
                  </text>
                  <text
                    x="220"
                    y="98"
                    textAnchor="middle"
                    fill="#E7DEC8"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                    fontSize="11.5"
                    letterSpacing="4.5"
                  >
                    CORTE DO RIO DE JANEIRO · 1822–1889
                  </text>
                </svg>
              </div>

              <p className="text-xs sm:text-sm text-[#D6C7B2] max-w-md leading-relaxed">
                Escolha seu personagem imperial, acumule{' '}
                <strong className="text-[#FBBF24]">
                  100 Pontos de Ímpeto (PI)
                </strong>{' '}
                com cortes e sobrecortes e desafie a Corte ou outros jogadores{' '}
                <strong className="text-[#34D399]">Online em Tempo Real</strong>.
              </p>

              {/* Interactive Hero Card Fan Showcase */}
              <div className="mt-5 relative h-[175px] sm:h-[190px] w-full flex items-center justify-center lg:justify-start pl-0 lg:pl-16">
                {HERO_DEMO_CARDS.map((card, idx) => {
                  const angles = [-18, -9, 0, 9, 18];
                  const offsetsX = [-84, -42, 0, 42, 84];
                  const offsetsY = [14, 4, 0, 4, 14];
                  const isSelected = heroSelectedCardIdx === idx;
                  return (
                    <motion.div
                      key={card.id}
                      initial={false}
                      animate={{
                        x: offsetsX[idx],
                        y: isSelected ? offsetsY[idx] - 16 : offsetsY[idx],
                        rotate: angles[idx],
                        scale: isSelected ? 1.06 : 1,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 340,
                        damping: 22,
                      }}
                      style={{
                        zIndex: isSelected ? 30 : 10 + idx,
                      }}
                      className="absolute"
                    >
                      <PlayingCard
                        card={card}
                        size="md"
                        isPlayable={true}
                        isTrumpSuit={idx === 1}
                        isWinningTrickCard={isSelected}
                        onClick={() => {
                          soundFx.playCardSnap(idx === 1, card.points >= 10);
                          setHeroSelectedCardIdx(idx);
                          particleRef.current?.emitBurst({
                            x: window.innerWidth * 0.28,
                            y: window.innerHeight * 0.55,
                            count: 24,
                            palette: 'gold',
                          });
                        }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: User Profile, Mode Selector (VS_BOT / VS_ONLINE), Character Power & Opponent Setup */}
            <div className="lg:col-span-7 walnut-rail rounded-2xl border border-[#FBBF24]/35 p-5 sm:p-6 space-y-4 shadow-2xl">
              {/* Mode Switcher: Contra a Corte (IA) vs Salão Online (Multiplayer) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/45 rounded-xl border border-[#FBBF24]/30">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playButtonTap();
                    setMatchMode('VS_BOT');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    matchMode === 'VS_BOT'
                      ? 'bg-[#D97706] text-white shadow'
                      : 'text-[#D6C7B2] hover:text-white'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>Contra a Corte (IA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playButtonTap();
                    setMatchMode('VS_ONLINE');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    matchMode === 'VS_ONLINE'
                      ? 'bg-[#059669] text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                      : 'text-[#D6C7B2] hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Modo Online (Multiplayer)</span>
                  {openRooms.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FBBF24] text-[#1B0E07] font-mono-num text-[10px] font-bold">
                      {openRooms.length}
                    </span>
                  )}
                </button>
              </div>

              {/* 1. User Identification (Nome do Jogador + Modo de Jogo) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label
                    htmlFor="player-username-input"
                    className="block text-xs font-semibold text-[#E7DEC8] mb-1"
                  >
                    Seu Nome no Salão Imperial
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-[#FBBF24] absolute left-3 pointer-events-none" />
                    <input
                      id="player-username-input"
                      type="text"
                      maxLength={24}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Digite seu nome ou título..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/45 border border-[#FBBF24]/35 text-sm text-[#FBF7EE] placeholder:text-[#D6C7B2]/50 focus:outline-none focus:border-[#FBBF24]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-[#E7DEC8] mb-1">
                    Modalidade & Regra Final
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-xl border border-white/10 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playButtonTap();
                          setGameMode('bisca_3');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          gameMode === 'bisca_3'
                            ? 'bg-[#D97706] text-white'
                            : 'text-[#D6C7B2] hover:text-white'
                        }`}
                      >
                        Bisca 3
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playButtonTap();
                          setGameMode('bisca_9');
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          gameMode === 'bisca_9'
                            ? 'bg-[#D97706] text-white'
                            : 'text-[#D6C7B2] hover:text-white'
                        }`}
                      >
                        Bisca 9
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playButtonTap();
                        setMustFollowSuitInEndgame((prev) => !prev);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        mustFollowSuitInEndgame
                          ? 'bg-[#064E3B] border-[#34D399] text-[#6EE7B7]'
                          : 'bg-black/40 border-white/15 text-[#D6C7B2]'
                      }`}
                      title="Alternar obrigatoriedade de assistir ao naipe quando o monte acaba"
                    >
                      {mustFollowSuitInEndgame ? 'Assistir Naipe' : 'Naipe Livre'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Escolha do SEU Personagem Imperial (e Poder de 100 PI) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#E7DEC8]">
                    Seu Personagem e Poder Imperial (100 PI)
                  </label>
                  <span className="text-[11px] font-mono-num text-[#34D399] font-semibold">
                    Poder: {playerCharacter.power.name}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {OPPONENTS.map((char) => {
                    const selected = char.id === playerCharacterId;
                    return (
                      <button
                        key={`player-char-${char.id}`}
                        type="button"
                        onClick={() => {
                          soundFx.playButtonTap();
                          setPlayerCharacterId(char.id);
                          if (char.id === opponentId) {
                            const alt = OPPONENTS.find((o) => o.id !== char.id);
                            if (alt) setOpponentId(alt.id);
                          }
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#064E3B]/80 border-[#34D399] shadow-[0_0_16px_rgba(52,211,153,0.25)]'
                            : 'bg-black/25 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <OpponentAvatar
                          opponentId={char.id}
                          className="w-9 h-9"
                        />
                        <span className="font-display font-bold text-[11px] text-[#FBF7EE] mt-1 truncate w-full">
                          {char.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Player Character Power Description Box */}
                <div className="mt-2 rounded-xl bg-black/35 border border-[#34D399]/30 px-3.5 py-2 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-[#FEF08A]">
                      {playerCharacter.name} · {playerCharacter.power.name}:
                    </span>{' '}
                    <span className="text-[#E7DEC8]">
                      {playerCharacter.power.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Escolha do Adversário da Corte Imperial (Only when VS_BOT) */}
              {matchMode === 'VS_BOT' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#E7DEC8]">
                      Adversário na Mesa (IA Imperial)
                    </label>
                    <span className="text-[11px] font-mono-num text-[#FBBF24]">
                      Poder Adversário: {activeOpponent.power.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {OPPONENTS.map((opp) => {
                      const selected = opp.id === opponentId;
                      return (
                        <button
                          key={`opp-char-${opp.id}`}
                          type="button"
                          onClick={() => {
                            soundFx.playButtonTap();
                            setOpponentId(opp.id);
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                            selected
                              ? 'bg-[#78350F]/65 border-[#FBBF24] shadow-[0_0_16px_rgba(251,191,36,0.25)]'
                              : 'bg-black/25 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <OpponentAvatar
                            opponentId={opp.id}
                            className="w-9 h-9"
                          />
                          <span className="font-display font-bold text-[11px] text-[#FBF7EE] mt-1 truncate w-full">
                            {opp.shortName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#064E3B]/45 border border-[#34D399]/40 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 border border-[#34D399]/50 flex items-center justify-center text-[#34D399] shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <div className="font-display font-bold text-sm text-[#FBF7EE]">
                        Salão Multiplayer em Tempo Real
                      </div>
                      <div className="text-[#D6C7B2]">
                        Crie uma sala com código de 4 letras, entre em mesas
                        abertas ou use a Fila Rápida.
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-num text-xs px-2.5 py-1 rounded-lg bg-black/40 border border-[#34D399]/40 text-[#6EE7B7] shrink-0">
                    {openRooms.length} sala(s)
                  </span>
                </div>
              )}

              {/* Primary Start CTA */}
              <button
                type="button"
                onClick={handleStartNewMatch}
                className={`w-full py-3.5 px-6 rounded-xl font-display font-bold text-base sm:text-lg tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  matchMode === 'VS_ONLINE'
                    ? 'bg-gradient-to-b from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#047857] text-[#052E16] shadow-[0_10px_25px_rgba(16,185,129,0.35)]'
                    : 'bg-gradient-to-b from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#B45309] text-[#1B0E07] shadow-[0_10px_25px_rgba(217,119,6,0.4)]'
                }`}
              >
                {matchMode === 'VS_ONLINE' ? (
                  <>
                    <Globe className="w-5 h-5" />
                    <span>Entrar no Salão Online como {displayUsername}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>
                      Iniciar Duelo: {displayUsername} vs{' '}
                      {activeOpponent.shortName}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Flat Single-Line Control Hint Footer */}
          <div className="text-center text-xs text-[#D6C7B2]/85 tracking-wide">
            <span>Enter Iniciar</span>
            <span className="mx-2">·</span>
            <span>1–9 Jogar Carta</span>
            <span className="mx-2">·</span>
            <span>P Ativar Poder (100 PI)</span>
            <span className="mx-2">·</span>
            <span>T Trocar 2 de Trunfo</span>
            <span className="mx-2">·</span>
            <span>R Regras e Poderes</span>
            <span className="mx-2">·</span>
            <span>Esc Pausa</span>
          </div>
        </main>
      )}

      {/* =====================================================================
          STATE 1B: ONLINE MULTIPLAYER LOBBY
      ===================================================================== */}
      {gameState === 'ONLINE_LOBBY' && (
        <OnlineLobby
          username={displayUsername}
          playerCharacterId={playerCharacterId}
          gameMode={gameMode}
          mustFollowSuitInEndgame={mustFollowSuitInEndgame}
          wsConnected={wsConnected}
          openRooms={openRooms}
          waitingRoomCode={waitingRoomCode}
          isSearchingQueue={isSearchingQueue}
          onlineError={onlineError}
          onCreateRoom={() => {
            setOnlineError(null);
            sendWsMessage({
              type: 'room:create',
              username: displayUsername,
              characterId: playerCharacterId,
              gameMode,
              mustFollowSuitInEndgame,
            });
          }}
          onJoinRoom={(code) => {
            setOnlineError(null);
            sendWsMessage({
              type: 'room:join',
              roomCode: code,
              username: displayUsername,
              characterId: playerCharacterId,
            });
          }}
          onJoinQueue={() => {
            setOnlineError(null);
            sendWsMessage({
              type: 'queue:join',
              username: displayUsername,
              characterId: playerCharacterId,
              gameMode,
              mustFollowSuitInEndgame,
            });
          }}
          onLeaveQueue={() => {
            sendWsMessage({ type: 'queue:leave' });
          }}
          onLeaveWaitingRoom={() => {
            sendWsMessage({ type: 'room:leave' });
            setWaitingRoomCode(null);
            setActiveOnlineRoomCode(null);
          }}
          onRefreshRooms={() => {
            sendWsMessage({ type: 'rooms:get' });
          }}
          onBackToMenu={() => {
            if (waitingRoomCode) {
              sendWsMessage({ type: 'room:leave' });
              setWaitingRoomCode(null);
            }
            if (isSearchingQueue) {
              sendWsMessage({ type: 'queue:leave' });
              setIsSearchingQueue(false);
            }
            setGameState('TITLE_MENU');
          }}
        />
      )}

      {/* =====================================================================
          STATE 2: ACTIVE PLAYFIELD (Low-Occlusion Imperial Table View)
      ===================================================================== */}
      {gameState !== 'TITLE_MENU' && gameState !== 'ONLINE_LOBBY' && (
        <div className="relative z-30 w-full h-full flex flex-col justify-between p-4 sm:p-6">
          {/* TOP PERIMETER HUD BAR */}
          <div className="flex items-start justify-between gap-4 pointer-events-none">
            {/* Left Cluster: Match Tentos & Hand Points */}
            <div className="pointer-events-auto walnut-rail rounded-xl border border-[#FBBF24]/30 px-4 py-2.5 flex items-center gap-5 shadow-lg">
              <div>
                <div className="text-[11px] text-[#D6C7B2] flex items-center gap-2">
                  <span>
                    Mão #{roundNumber} · Tentos (Meta {MATCH_TARGET_TENTOS})
                  </span>
                  {matchMode === 'VS_ONLINE' && activeOnlineRoomCode && (
                    <span className="px-1.5 py-0.5 rounded bg-[#064E3B] border border-[#34D399]/50 font-mono-num text-[10px] text-[#6EE7B7] font-bold">
                      ONLINE #{activeOnlineRoomCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 font-mono-num text-sm font-bold">
                  <span className="text-[#34D399]">
                    {displayUsername}: {playerTentos}/{MATCH_TARGET_TENTOS}
                  </span>
                  <span className="text-white/30">·</span>
                  <span className="text-[#FBBF24]">
                    {opponentShortName}: {botTentos}/{MATCH_TARGET_TENTOS}
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-white/15 hidden sm:block" />

              <div className="hidden sm:block">
                <div className="text-[11px] text-[#D6C7B2]">
                  Pontos na Mão Atual
                </div>
                <div className="flex items-center gap-3 mt-0.5 font-mono-num text-sm font-bold">
                  <motion.span
                    key={`p-pts-${playerCurrentPoints}`}
                    initial={{ scale: 1.35, color: '#FEF08A' }}
                    animate={{ scale: 1, color: '#FBF7EE' }}
                    transition={{ duration: 0.35 }}
                  >
                    Você: {playerCurrentPoints} pts
                  </motion.span>
                  <span className="text-white/30">/</span>
                  <motion.span
                    key={`b-pts-${botCurrentPoints}`}
                    initial={{ scale: 1.35, color: '#F87171' }}
                    animate={{ scale: 1, color: '#E7DEC8' }}
                    transition={{ duration: 0.35 }}
                  >
                    {opponentShortName}: {botCurrentPoints} pts
                  </motion.span>
                </div>
              </div>
            </div>

            {/* Center Opponent Zone (Avatar + Opponent Impeto Bar + Fanned Hand) */}
            <div className="pointer-events-auto flex flex-col items-center">
              <div className="walnut-rail rounded-xl border border-[#FBBF24]/35 px-3.5 py-2 flex items-center gap-3 shadow-md max-w-md">
                <OpponentAvatar opponentId={opponentId} className="w-9 h-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display font-bold text-xs sm:text-sm text-[#FBF7EE] truncate flex items-center gap-1.5">
                      {matchMode === 'VS_ONLINE' && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            onlineOpponentConnected
                              ? 'bg-[#34D399]'
                              : 'bg-[#F87171]'
                          }`}
                        />
                      )}
                      <span>
                        {opponentDisplayName}
                        {matchMode === 'VS_ONLINE'
                          ? ` (${activeOpponent.shortName})`
                          : ''}
                      </span>
                    </span>
                    <span className="font-mono-num text-xs text-[#FBBF24] shrink-0">
                      {botCurrentPoints} pts
                    </span>
                  </div>

                  {/* Opponent Barra de Ímpeto (0-100 PI) */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-28 sm:w-36 h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/10">
                      <div
                        style={{ width: `${botImpeto}%` }}
                        className="h-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] transition-all duration-300"
                      />
                    </div>
                    <span className="font-mono-num text-[10px] text-[#FBBF24]">
                      Ímpeto: {botImpeto}/100 PI
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponent Fanned Cards (Face-Up if Revealed by Dom Pedro II's Gabinete de Conciliação!) */}
              <div
                className="mt-2 flex items-center justify-center"
                aria-label={`Mão de ${opponentDisplayName} com ${botHand.length} cartas`}
              >
                <AnimatePresence initial={false}>
                  {botHand.map((c, idx) => {
                    const mid = (botHand.length - 1) / 2;
                    const rot = (idx - mid) * 4;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: -24, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotate: rot }}
                        exit={{ opacity: 0, y: 20, scale: 0.85 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          marginLeft:
                            idx === 0
                              ? '0px'
                              : opponentHandRevealed
                              ? '4px'
                              : '-28px',
                        }}
                      >
                        <PlayingCard
                          card={c}
                          faceDown={!opponentHandRevealed}
                          isTrumpSuit={c.suit === trumpSuit}
                          size="sm"
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Cluster: Utility Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  setIsHistoryDrawerOpen((prev) => !prev);
                }}
                className={`px-3 py-2 rounded-lg walnut-rail border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isHistoryDrawerOpen
                    ? 'border-[#FBBF24] text-[#FBBF24]'
                    : 'border-[#FBBF24]/25 text-[#FBF7EE] hover:border-[#FBBF24]'
                }`}
                title="Histórico de Vazas [H]"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  Vazas ({trickHistory.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  setIsRulesOpen(true);
                }}
                className="p-2 rounded-lg walnut-rail border border-[#FBBF24]/25 text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer"
                title="Regras e Poderes [R]"
                aria-label="Abrir regras"
              >
                <BookOpen className="w-4 h-4 text-[#FBBF24]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const muted = soundFx.toggleMute();
                  setIsMuted(muted);
                }}
                className="p-2 rounded-lg walnut-rail border border-[#FBBF24]/25 text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer"
                title="Alternar Áudio [M]"
                aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-[#F87171]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#FBBF24]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  setGameState('PAUSED');
                }}
                className="p-2 rounded-lg walnut-rail border border-[#FBBF24]/25 text-[#FBF7EE] hover:border-[#FBBF24] transition-colors cursor-pointer"
                title="Pausar Partida [Esc]"
                aria-label="Pausar partida"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* =================================================================
              MIDDLE ARENA: LEFT TRUMP & STOCK DECK + CENTER BATTLE ZONE
          ================================================================= */}
          <div className="relative flex-1 flex items-center justify-center my-1">
            {/* Left Side: Trump Card & Stock Pile (Monte de Compra) */}
            <div className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex flex-col items-start gap-3 z-20">
              {/* Trump Suit Persistent Indicator */}
              <div className="walnut-rail rounded-xl border border-[#FBBF24]/35 px-3.5 py-2 flex items-center gap-2.5 shadow-lg">
                <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                  <SuitSvg suit={trumpSuit} className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-[#D6C7B2] uppercase tracking-wider">
                    Trunfo Imperial
                  </div>
                  <div className="font-display font-bold text-sm text-[#FBBF24]">
                    {SUIT_INFO[trumpSuit].name}
                  </div>
                </div>
              </div>

              {/* Stock Deck + Perpendicular Face-Up Trump Card */}
              {stock.length > 0 ? (
                <div className="relative flex items-center h-[130px] w-[165px] sm:w-[190px]">
                  {trumpCard && (
                    <motion.div
                      key={trumpCard.id}
                      initial={{ scale: 0.8, rotate: 75, opacity: 0 }}
                      animate={{ scale: 1, rotate: 90, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="absolute left-12 sm:left-14 top-1/2 -translate-y-1/2"
                      title={`Carta de Trunfo na mesa: ${getCardDisplayName(trumpCard)}`}
                    >
                      <PlayingCard
                        card={trumpCard}
                        size="sm"
                        isTrumpSuit={true}
                      />
                    </motion.div>
                  )}

                  {stock.length > 1 && (
                    <div className="relative z-10">
                      <PlayingCard faceDown size="sm" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="px-2 py-0.5 rounded bg-[#072617]/90 border border-[#FBBF24]/50 font-mono-num font-bold text-xs text-[#FBBF24] shadow">
                          {stock.length}
                        </span>
                        <span className="text-[10px] font-semibold text-white bg-black/60 px-1 rounded mt-0.5">
                          Monte
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-xl border border-[#FBBF24]/30 bg-black/40 px-3.5 py-2.5 text-xs text-[#D6C7B2]"
                >
                  <div className="font-semibold text-[#FBBF24]">
                    Monte Esgotado
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {mustFollowSuitInEndgame
                      ? 'Obrigatório assistir ao naipe'
                      : 'Fase final com naipe livre'}
                  </div>
                </motion.div>
              )}

              {/* Interactive Button to Swap 2 of Trump when eligible */}
              {playerCanSwapTrump && trumpCard && (
                <motion.button
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleSwapTrump}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#1B0E07] text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.5)] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Trocar pelo 2 de Trunfo [T]</span>
                </motion.button>
              )}
            </div>

            {/* Center Trick Battle Arena (Vaza Atual) */}
            <div className="relative flex flex-col items-center justify-center">
              {/* Active Power Status Badges above Center Ring */}
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                {trickPointMultiplier > 1 && (
                  <span className="px-3 py-1 rounded-lg bg-[#D97706]/30 border border-[#FBBF24] text-xs font-mono-num font-bold text-[#FEF08A] flex items-center gap-1.5 shadow">
                    <Crown className="w-3.5 h-3.5" />
                    <span>DECRETO SOBERANO · {trickPointMultiplier}X PONTOS</span>
                  </span>
                )}
                {coercedPlayer && (
                  <span className="px-3 py-1 rounded-lg bg-[#7F1D1D]/60 border border-[#F87171] text-xs font-mono-num font-bold text-[#FCA5A5] flex items-center gap-1.5 shadow">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      GRITO DO IPIRANGA ·{' '}
                      {coercedPlayer === 'bot'
                        ? `${opponentShortName.toUpperCase()} COAGIDO`
                        : 'VOCÊ ESTÁ COAGIDO'}
                    </span>
                  </span>
                )}
                {opponentHandRevealed && (
                  <span className="px-3 py-1 rounded-lg bg-[#064E3B]/80 border border-[#34D399] text-xs font-mono-num font-bold text-[#6EE7B7] flex items-center gap-1.5 shadow">
                    <Eye className="w-3.5 h-3.5" />
                    <span>MÃO ADVERSÁRIA REVELADA</span>
                  </span>
                )}
              </div>

              {/* Floating +XX PTS Popup when Trick is Collected */}
              <AnimatePresence>
                {floatingPointPop && (
                  <motion.div
                    key={floatingPointPop.id}
                    initial={{ opacity: 0, y: 10, scale: 0.7 }}
                    animate={{
                      opacity: 1,
                      y: floatingPointPop.winner === 'player' ? 65 : -65,
                      scale: 1.15,
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 18,
                    }}
                    className={`pointer-events-none absolute z-40 px-4 py-1.5 rounded-full font-mono-num font-bold text-base sm:text-lg shadow-2xl border ${
                      floatingPointPop.winner === 'player'
                        ? 'bg-[#064E3B] border-[#34D399] text-[#6EE7B7]'
                        : 'bg-[#7F1D1D] border-[#F87171] text-[#FCA5A5]'
                    }`}
                  >
                    +{floatingPointPop.points} PTS{' '}
                    {floatingPointPop.winner === 'player'
                      ? 'PARA VOCÊ!'
                      : opponentShortName.toUpperCase()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Baize Inscribed Imperial Ring */}
              <div
                className={`relative w-[290px] h-[205px] sm:w-[380px] sm:h-[235px] rounded-3xl border transition-colors duration-300 flex items-center justify-center gap-5 sm:gap-8 px-4 shadow-inner ${
                  currentTrickPoints >= 10 || trickPointMultiplier > 1
                    ? 'border-[#FBBF24]/65 bg-[#D97706]/10 shadow-[inset_0_0_35px_rgba(251,191,36,0.2)]'
                    : 'border-[#FBBF24]/20 bg-black/15'
                }`}
              >
                {powerSelectionMode !== 'NONE' ? (
                  <div className="text-center px-4">
                    <div className="font-display font-bold text-base sm:text-lg text-[#FEF08A]">
                      {powerSelectionMode ===
                      'SELECT_HAND_CARD_FOR_CONCILIACAO'
                        ? 'Gabinete de Conciliação: Escolha 1 carta da sua mão'
                        : 'Estratégia do Patriarca: Escolha 1 carta da sua mão'}
                    </div>
                    <p className="text-xs text-[#E7DEC8] mt-1">
                      {powerSelectionMode ===
                      'SELECT_HAND_CARD_FOR_CONCILIACAO'
                        ? 'Clique em uma carta abaixo para trocá-la pelo topo do monte.'
                        : 'Clique em uma carta abaixo para torná-la o Novo Trunfo Imperial.'}
                    </p>
                  </div>
                ) : currentTrick.length === 0 ? (
                  <div className="text-center pointer-events-none px-4">
                    <div className="font-display text-sm sm:text-base text-[#E7DEC8]/85 font-semibold">
                      {turnOwner === 'player'
                        ? `Sua vez de puxar a vaza, ${displayUsername}`
                        : matchMode === 'VS_ONLINE'
                        ? `Aguardando jogada de ${opponentShortName}...`
                        : botStatusText ||
                          `${opponentShortName} inicia a vaza...`}
                    </div>
                    <div className="text-xs text-[#D6C7B2]/65 mt-1">
                      {turnOwner === 'player'
                        ? coercedPlayer === 'player'
                          ? 'Grito do Ipiranga ativo: você deve jogar sua carta de maior pontuação!'
                          : 'Clique em uma carta ou pressione 1–9 (ou P para Poder em 100 PI)'
                        : 'Aguarde o lance na mesa'}
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {currentTrick.map((played, idx) => {
                      const isWinning =
                        trickFeedback &&
                        trickFeedback.winner === played.playedBy;
                      const sweepTargetY =
                        trickCollectingTo === 'player'
                          ? 185
                          : trickCollectingTo === 'bot'
                          ? -185
                          : 0;
                      const entryFromY =
                        played.playedBy === 'player' ? 120 : -120;

                      return (
                        <motion.div
                          key={`${played.card.id}_${idx}`}
                          initial={{
                            opacity: 0,
                            y: entryFromY,
                            scale: 1.28,
                            rotate: played.playedBy === 'player' ? -8 : 8,
                          }}
                          animate={{
                            opacity: trickCollectingTo ? 0.15 : 1,
                            y: sweepTargetY,
                            scale: trickCollectingTo
                              ? 0.65
                              : isWinning
                              ? 1.07
                              : 1,
                            rotate: idx === 0 ? -3 : 4,
                          }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{
                            type: 'spring',
                            stiffness: 390,
                            damping: 24,
                          }}
                          className="flex flex-col items-center"
                        >
                          <span className="mb-1.5 text-[11px] font-semibold text-[#E7DEC8]">
                            {played.playedBy === 'player'
                              ? displayUsername
                              : opponentShortName}
                            {idx === 0 ? ' · Puxou' : ' · Respondeu'}
                          </span>
                          <PlayingCard
                            card={played.card}
                            size="md"
                            isTrumpSuit={played.card.suit === trumpSuit}
                            isWinningTrickCard={Boolean(isWinning)}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Live Trick Points & Impeto Resolution Telemetry Below Center Ring */}
              <div className="mt-2.5 h-8 flex items-center justify-center">
                {trickFeedback ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="px-4 py-1.5 rounded-lg walnut-rail border border-[#FBBF24]/50 text-xs sm:text-sm font-medium text-[#FBF7EE] shadow-md flex items-center gap-2"
                  >
                    <span
                      className={
                        trickFeedback.winner === 'player'
                          ? 'text-[#34D399] font-bold'
                          : 'text-[#F87171] font-bold'
                      }
                    >
                      {trickFeedback.winner === 'player'
                        ? 'Você leva a vaza!'
                        : `${opponentShortName} leva a vaza`}
                    </span>
                    <span>·</span>
                    <span className="font-mono-num text-[#FBBF24] font-bold">
                      +{trickFeedback.points} pts
                    </span>
                    {trickFeedback.impetoAwarded && (
                      <>
                        <span>·</span>
                        <span className="font-mono-num text-[#38BDF8] font-bold">
                          {trickFeedback.impetoAwarded}
                        </span>
                      </>
                    )}
                  </motion.div>
                ) : currentTrick.length > 0 ? (
                  <div className="text-xs text-[#E7DEC8] flex items-center gap-2">
                    <span>
                      Naipe puxado:{' '}
                      <strong className="text-[#FBBF24]">
                        {SUIT_INFO[currentTrick[0].card.suit].name}
                      </strong>
                    </span>
                    <span>·</span>
                    <span className="font-mono-num">
                      Na mesa:{' '}
                      <strong
                        className={
                          currentTrickPoints >= 10 ? 'text-[#FBBF24]' : ''
                        }
                      >
                        {currentTrickPoints} pts
                        {trickPointMultiplier > 1
                          ? ` (${trickPointMultiplier}x)`
                          : ''}
                      </strong>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Side Collapsible Trick History Drawer */}
            {isHistoryDrawerOpen && (
              <aside
                className="
                  absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30
                  w-72 max-h-[340px] overflow-y-auto rounded-2xl walnut-rail
                  border border-[#FBBF24]/35 p-4 shadow-2xl
                "
                aria-label="Histórico de vazas da mão"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="font-display font-bold text-sm text-[#FBF7EE]">
                    Últimas Vazas no Salão
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsHistoryDrawerOpen(false)}
                    className="text-xs text-[#D6C7B2] hover:text-white cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
                {trickHistory.length === 0 ? (
                  <p className="text-xs text-[#D6C7B2]">
                    Nenhuma vaza concluída nesta mão ainda.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {trickHistory.map((item) => (
                      <div
                        key={item.trickNumber}
                        className="rounded-lg bg-black/30 border border-white/10 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono-num">
                          <span className="text-[#D6C7B2]">
                            Vaza #{item.trickNumber}
                          </span>
                          <span
                            className={
                              item.winner === 'player'
                                ? 'text-[#34D399] font-bold'
                                : 'text-[#F87171] font-bold'
                            }
                          >
                            {item.winner === 'player'
                              ? 'Você'
                              : opponentShortName}{' '}
                            (+{item.points}p)
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-[#FBF7EE]">
                          <span>
                            Você: {item.playerCard.rank}
                            {SUIT_INFO[item.playerCard.suit].symbol}
                          </span>
                          <span>
                            {opponentShortName}: {item.botCard.rank}
                            {SUIT_INFO[item.botCard.suit].symbol}
                          </span>
                        </div>
                        {item.impetoAwarded && (
                          <div className="mt-1 text-[10px] font-mono-num text-[#38BDF8]">
                            {item.impetoAwarded}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </div>

          {/* =================================================================
              BOTTOM ZONE: PLAYER PROFILE, BARRA DE ÍMPETO (0-100 PI) & HAND
          ================================================================= */}
          <div className="flex flex-col items-center justify-end pb-1">
            {/* Player Character + Barra de Força (Ímpeto 0-100 PI) + Power Button */}
            <div className="mb-2.5 walnut-rail rounded-xl border border-[#FBBF24]/35 px-4 py-2 flex flex-wrap items-center justify-center gap-4 shadow-lg">
              {/* Player Identity */}
              <div className="flex items-center gap-2.5">
                <OpponentAvatar
                  opponentId={playerCharacterId}
                  className="w-8 h-8"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-xs sm:text-sm text-[#FBF7EE]">
                      {displayUsername}
                    </span>
                    <span className="text-[11px] text-[#D6C7B2]">
                      ({playerCharacter.shortName})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#34D399] font-mono-num">
                    Poder: {playerCharacter.power.name}
                  </div>
                </div>
              </div>

              {/* Barra de Força (Ímpeto 0 a 100 PI) */}
              <div className="flex items-center gap-2.5">
                <div className="w-32 sm:w-44 h-2.5 rounded-full bg-black/65 border border-[#FBBF24]/30 overflow-hidden p-0.5">
                  <motion.div
                    initial={false}
                    animate={{ width: `${playerImpeto}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    className={`h-full rounded-full ${
                      playerImpeto >= 100
                        ? 'bg-gradient-to-r from-[#34D399] via-[#FBBF24] to-[#FEF08A]'
                        : 'bg-gradient-to-r from-[#D97706] to-[#FBBF24]'
                    }`}
                  />
                </div>
                <span className="font-mono-num text-xs font-bold text-[#FBBF24]">
                  {playerImpeto}/100 PI
                </span>
              </div>

              {/* Activate Power CTA Button (Active when 100 PI on Player's Turn) */}
              <button
                type="button"
                disabled={!playerCanActivatePower}
                onClick={handleActivatePlayerPower}
                className={`px-3.5 py-1.5 rounded-lg font-display font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  playerCanActivatePower
                    ? 'bg-gradient-to-r from-[#F59E0B] to-[#10B981] text-[#1B0E07] shadow-[0_0_20px_rgba(251,191,36,0.65)] hover:scale-105 cursor-pointer'
                    : 'bg-black/40 border border-white/10 text-[#D6C7B2]/45 cursor-not-allowed'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>
                  {playerImpeto >= 100
                    ? `Ativar ${playerCharacter.power.name} [P]`
                    : `Carregando Poder (${playerImpeto}%)`}
                </span>
              </button>
            </div>

            {/* Player Fanned Interactive Cards */}
            <div
              className="flex items-center justify-center pb-1 max-w-full overflow-x-visible"
              role="region"
              aria-label="Sua mão de cartas"
            >
              <AnimatePresence initial={false}>
                {playerHand.map((card, idx) => {
                  const isPlayerCoerced = coercedPlayer === 'player';
                  const canPlay =
                    turnOwner === 'player' &&
                    !isResolvingTrick &&
                    currentTrick.length < 2 &&
                    (powerSelectionMode !== 'NONE' ||
                      isCardPlayable(
                        card,
                        playerHand,
                        leadCardOnTable,
                        stock.length,
                        mustFollowSuitInEndgame,
                        isPlayerCoerced
                      ));

                  const isManyCards = playerHand.length > 5;
                  const mid = (playerHand.length - 1) / 2;
                  const rot = (idx - mid) * (isManyCards ? 2.2 : 3.5);
                  const yOffset =
                    Math.abs(idx - mid) * (isManyCards ? 2.5 : 3.5);

                  return (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, y: 40, scale: 0.85 }}
                      animate={{
                        opacity: 1,
                        y: yOffset,
                        rotate: rot,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, y: -50, scale: 0.9 }}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 25,
                      }}
                      style={{
                        marginLeft:
                          idx === 0
                            ? '0px'
                            : isManyCards
                            ? '-22px'
                            : '10px',
                        zIndex: 10 + idx,
                      }}
                    >
                      <PlayingCard
                        card={card}
                        size="md"
                        isTrumpSuit={card.suit === trumpSuit}
                        isPlayable={canPlay}
                        hotkeyLabel={String(idx + 1)}
                        onClick={() => handlePlayPlayerCard(card)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PAUSED
      ===================================================================== */}
      {gameState === 'PAUSED' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl walnut-rail border border-[#FBBF24]/40 p-6 sm:p-7 text-center shadow-2xl space-y-5"
          >
            <div>
              <p className="text-xs text-[#FBBF24] uppercase tracking-widest">
                Salão Imperial em Pausa
              </p>
              <h2
                id="pause-title"
                className="font-display text-2xl font-bold text-[#FBF7EE] mt-1"
              >
                Audiência Suspensa
              </h2>
              <p className="text-xs text-[#D6C7B2] mt-1">
                Placar de Tentos: {displayUsername} {playerTentos} × {botTentos}{' '}
                {opponentDisplayName}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  setGameState('PLAYING');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Retomar Partida [Esc / Enter]
              </button>

              {matchMode === 'VS_BOT' && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playButtonTap();
                    startNewRound(gameMode, 'player', false, roundNumber);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 text-[#FBF7EE] font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Esta Mão</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundFx.playButtonTap();
                  clearTimers();
                  if (matchMode === 'VS_ONLINE') {
                    sendWsMessage({ type: 'room:leave' });
                    setActiveOnlineRoomCode(null);
                    setWaitingRoomCode(null);
                    setGameState('ONLINE_LOBBY');
                  } else {
                    setGameState('TITLE_MENU');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-[#D6C7B2] hover:text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {matchMode === 'VS_ONLINE'
                  ? 'Sair da Mesa e Voltar ao Salão Online'
                  : 'Voltar à Corte (Menu Principal)'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ROUND SUMMARY (End of 40-Card Hand) & GAME OVER (4 Tentos)
      ===================================================================== */}
      {(gameState === 'ROUND_SUMMARY' || gameState === 'GAME_OVER') &&
        roundSummary && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 22,
              }}
              className="w-full max-w-lg rounded-2xl walnut-rail border-2 border-[#FBBF24]/60 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#F59E0B]/20 border border-[#FBBF24]/50 flex items-center justify-center text-[#FBBF24] shadow-[0_0_30px_rgba(251,191,36,0.35)]"
                >
                  {roundSummary.outcomeType === 'bandeira' ||
                  roundSummary.outcomeType === 'capote' ? (
                    <Crown className="w-8 h-8" />
                  ) : (
                    <Trophy className="w-7 h-7" />
                  )}
                </motion.div>

                <div className="inline-flex items-center gap-2 text-xs font-mono-num text-[#FBBF24] mb-1">
                  <span>
                    {gameState === 'GAME_OVER'
                      ? 'FIM DA PARTIDA · PAÇO IMPERIAL'
                      : `RESUMO DA MÃO #${roundNumber} · +${roundSummary.tentosAwarded} TENTO(S)`}
                  </span>
                </div>
                <h2
                  id="summary-title"
                  className="font-display text-2xl sm:text-3xl font-bold text-[#FBF7EE]"
                >
                  {gameState === 'GAME_OVER'
                    ? playerTentos >= MATCH_TARGET_TENTOS
                      ? `Vitória Soberana de ${displayUsername}!`
                      : `${opponentDisplayName} Venceu a Partida`
                    : roundSummary.outcomeTitle}
                </h2>
                <p className="text-xs sm:text-sm text-[#D6C7B2] mt-1.5">
                  {roundSummary.outcomeDescription}
                </p>
              </div>

              {/* Score Breakdown Grid */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-xl bg-black/35 border border-[#34D399]/35 p-4 text-center"
                >
                  <div className="text-xs text-[#D6C7B2] truncate">
                    {displayUsername} ({playerCharacter.shortName})
                  </div>
                  <div className="font-mono-num text-3xl font-bold text-[#34D399] mt-1">
                    {roundSummary.playerPoints}{' '}
                    <span className="text-sm font-normal">pts</span>
                  </div>
                  <div className="text-xs font-mono-num text-[#E7DEC8] mt-1">
                    Tentos: {playerTentos} / {MATCH_TARGET_TENTOS}
                  </div>
                  <div className="mt-2.5 text-[11px] text-[#D6C7B2]">
                    Ases e Biscas ({roundSummary.playerBiscasAndAces.length}):{' '}
                    {roundSummary.playerBiscasAndAces.length > 0
                      ? roundSummary.playerBiscasAndAces
                          .map((c) => `${c.rank}${SUIT_INFO[c.suit].symbol}`)
                          .join(' ')
                      : 'Nenhum'}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl bg-black/35 border border-[#FBBF24]/35 p-4 text-center"
                >
                  <div className="text-xs text-[#D6C7B2] truncate">
                    {opponentShortName}
                  </div>
                  <div className="font-mono-num text-3xl font-bold text-[#FBBF24] mt-1">
                    {roundSummary.botPoints}{' '}
                    <span className="text-sm font-normal">pts</span>
                  </div>
                  <div className="text-xs font-mono-num text-[#E7DEC8] mt-1">
                    Tentos: {botTentos} / {MATCH_TARGET_TENTOS}
                  </div>
                  <div className="mt-2.5 text-[11px] text-[#D6C7B2]">
                    Ases e Biscas ({roundSummary.botBiscasAndAces.length}):{' '}
                    {roundSummary.botBiscasAndAces.length > 0
                      ? roundSummary.botBiscasAndAces
                          .map((c) => `${c.rank}${SUIT_INFO[c.suit].symbol}`)
                          .join(' ')
                      : 'Nenhum'}
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {gameState === 'ROUND_SUMMARY' ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playButtonTap();
                      if (matchMode === 'VS_ONLINE') {
                        sendWsMessage({ type: 'online:next_round' });
                      } else {
                        const nextLeader: TurnOwner =
                          roundSummary.winner === 'bot' ? 'bot' : 'player';
                        startNewRound(
                          gameMode,
                          nextLeader,
                          false,
                          roundNumber + 1
                        );
                      }
                    }}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Próxima Mão [Enter / Espaço]
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartNewMatch}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {matchMode === 'VS_ONLINE'
                      ? 'Revanche na Mesa [Enter]'
                      : 'Nova Partida [Enter]'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playButtonTap();
                    clearTimers();
                    if (matchMode === 'VS_ONLINE') {
                      sendWsMessage({ type: 'room:leave' });
                      setActiveOnlineRoomCode(null);
                      setWaitingRoomCode(null);
                      setGameState('ONLINE_LOBBY');
                    } else {
                      setGameState('TITLE_MENU');
                    }
                  }}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/15 text-[#E7DEC8] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {matchMode === 'VS_ONLINE'
                    ? 'Voltar ao Salão'
                    : 'Trocar Personagem'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

      {/* Rules, Impeto & Imperial Powers Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
