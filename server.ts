import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  Card,
  CharacterId,
  GameMode,
  OnlineRoomSummary,
  OnlineSyncedState,
  PowerSelectionMode,
  Suit,
} from './src/types/bisca';
import {
  SUIT_INFO,
  calculateImpetoCharge,
  canSwapTwoOfTrump,
  computeRoundSummary,
  createDeck,
  evaluateTrick,
  getCardDisplayName,
  getCharacterProfile,
  isCardPlayable,
  sortHand,
} from './src/utils/biscaEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MATCH_TARGET_TENTOS = 4;

interface SeatState {
  seat: 0 | 1;
  clientId: string;
  ws: WebSocket | null;
  connected: boolean;
  username: string;
  characterId: CharacterId;
  hand: Card[];
  captured: Card[];
  bonusPoints: number;
  tentos: number;
  impeto: number;
  powerUsedThisTurn: boolean;
  powerSelectionMode: PowerSelectionMode;
}

interface RoomTrickEntry {
  card: Card;
  seat: 0 | 1;
}

interface RoomHistoryEntry {
  trickNumber: number;
  leadSeat: 0 | 1;
  winnerSeat: 0 | 1;
  seat0Card: Card;
  seat1Card: Card;
  points: number;
  reason: string;
  impetoAwarded?: string;
}

interface GameRoom {
  roomCode: string;
  status: 'WAITING' | 'PLAYING' | 'ROUND_SUMMARY' | 'GAME_OVER';
  gameMode: GameMode;
  mustFollowSuitInEndgame: boolean;
  roundNumber: number;
  seats: [SeatState | null, SeatState | null];
  stock: Card[];
  trumpCard: Card | null;
  trumpSuit: Suit;
  turnSeat: 0 | 1;
  isResolvingTrick: boolean;
  trickPointMultiplier: number;
  coercedSeat: 0 | 1 | null;
  handRevealedToSeat: { 0: boolean; 1: boolean };
  currentTrick: RoomTrickEntry[];
  trickFeedback: {
    winnerSeat: 0 | 1;
    points: number;
    reason: string;
    impetoAwarded?: string | null;
  } | null;
  lastEventBanner: OnlineSyncedState['lastEventBanner'];
  trickHistory: RoomHistoryEntry[];
  roundSummaryRaw: ReturnType<typeof computeRoundSummary> | null;
  resolveTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, GameRoom>();
const clientRoomMap = new Map<string, { roomCode: string; seat: 0 | 1 }>();
const matchmakingQueue: {
  clientId: string;
  ws: WebSocket;
  username: string;
  characterId: CharacterId;
  gameMode: GameMode;
  mustFollowSuitInEndgame: boolean;
}[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function sendJson(ws: WebSocket | null, payload: unknown): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getOpenRoomsList(): OnlineRoomSummary[] {
  const list: OnlineRoomSummary[] = [];
  for (const room of rooms.values()) {
    const host = room.seats[0];
    if (host && room.status === 'WAITING') {
      list.push({
        roomCode: room.roomCode,
        hostUsername: host.username,
        hostCharacterId: host.characterId,
        gameMode: room.gameMode,
        mustFollowSuitInEndgame: room.mustFollowSuitInEndgame,
        playerCount: (room.seats[0] ? 1 : 0) + (room.seats[1] ? 1 : 0),
        status: room.status,
      });
    }
  }
  return list;
}

function broadcastOpenRooms(wss: WebSocketServer): void {
  const payload = JSON.stringify({
    type: 'rooms:list',
    rooms: getOpenRoomsList(),
  });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function buildSyncedStateForSeat(
  room: GameRoom,
  mySeat: 0 | 1
): OnlineSyncedState {
  const oppSeat: 0 | 1 = mySeat === 0 ? 1 : 0;
  const me = room.seats[mySeat]!;
  const opp = room.seats[oppSeat];

  const myPoints =
    me.captured.reduce((s, c) => s + c.points, 0) + me.bonusPoints;
  const oppPoints = opp
    ? opp.captured.reduce((s, c) => s + c.points, 0) + opp.bonusPoints
    : 0;

  const isOppHandRevealedToMe = room.handRevealedToSeat[mySeat];
  const sanitizedOpponentHand: Card[] = opp
    ? isOppHandRevealedToMe
      ? opp.hand
      : opp.hand.map((c, idx) => ({
          id: `hidden_${idx}_${c.id.slice(0, 1)}`,
          suit: 'espadas',
          rank: '2',
          points: 0,
          strength: 1,
        }))
    : [];

  let roundSummary: OnlineSyncedState['roundSummary'] = null;
  if (room.roundSummaryRaw && opp) {
    // computeRoundSummary was called with seat0 as "player" and seat1 as "bot"
    const s0Pts = room.roundSummaryRaw.playerPoints;
    const s1Pts = room.roundSummaryRaw.botPoints;
    const myFinalPts = mySeat === 0 ? s0Pts : s1Pts;
    const oppFinalPts = mySeat === 0 ? s1Pts : s0Pts;
    const wonByMe: boolean | 'draw' =
      room.roundSummaryRaw.winner === 'draw'
        ? 'draw'
        : (mySeat === 0 && room.roundSummaryRaw.winner === 'player') ||
          (mySeat === 1 && room.roundSummaryRaw.winner === 'bot');

    roundSummary = {
      myPoints: myFinalPts,
      opponentPoints: oppFinalPts,
      wonByMe,
      tentosAwarded: room.roundSummaryRaw.tentosAwarded,
      outcomeType: room.roundSummaryRaw.outcomeType,
      outcomeTitle:
        wonByMe === 'draw'
          ? `Mão Empatada (${myFinalPts} a ${oppFinalPts})`
          : wonByMe
          ? room.roundSummaryRaw.outcomeType === 'bandeira'
            ? `Bandeira Imperial! (${myFinalPts} pts)`
            : room.roundSummaryRaw.outcomeType === 'capote'
            ? `Capote Imperial Aplicado! (${myFinalPts} pts)`
            : `Vitória na Mão (${myFinalPts} pts)`
          : room.roundSummaryRaw.outcomeType === 'bandeira'
          ? `Bandeira de ${opp.username} (${oppFinalPts} pts)`
          : room.roundSummaryRaw.outcomeType === 'capote'
          ? `Capote de ${opp.username} (${oppFinalPts} pts)`
          : `Mão de ${opp.username} (${oppFinalPts} pts)`,
      outcomeDescription:
        wonByMe === 'draw'
          ? 'Equilíbrio absoluto no Salão Imperial. Nenhum tento concedido.'
          : wonByMe
          ? `Você superou ${opp.username} e conquistou +${room.roundSummaryRaw.tentosAwarded} tento(s)!`
          : `${opp.username} venceu a mão e anotou +${room.roundSummaryRaw.tentosAwarded} tento(s).`,
      myBiscasAndAces:
        mySeat === 0
          ? room.roundSummaryRaw.playerBiscasAndAces
          : room.roundSummaryRaw.botBiscasAndAces,
      opponentBiscasAndAces:
        mySeat === 0
          ? room.roundSummaryRaw.botBiscasAndAces
          : room.roundSummaryRaw.playerBiscasAndAces,
    };
  }

  return {
    roomCode: room.roomCode,
    status: room.status,
    gameMode: room.gameMode,
    mustFollowSuitInEndgame: room.mustFollowSuitInEndgame,
    roundNumber: room.roundNumber,
    mySeat,
    myUsername: me.username,
    myCharacterId: me.characterId,
    myHand: me.hand,
    myPoints,
    myTentos: me.tentos,
    myImpeto: me.impeto,
    myPowerUsedThisTurn: me.powerUsedThisTurn,
    myPowerSelectionMode: me.powerSelectionMode,
    myCoerced: room.coercedSeat === mySeat,

    opponentConnected: Boolean(opp && opp.connected),
    opponentUsername: opp ? opp.username : 'Aguardando Oponente...',
    opponentCharacterId: opp ? opp.characterId : 'leopoldina',
    opponentHand: sanitizedOpponentHand,
    opponentHandCount: opp ? opp.hand.length : 0,
    opponentHandRevealed: isOppHandRevealedToMe,
    opponentPoints: oppPoints,
    opponentTentos: opp ? opp.tentos : 0,
    opponentImpeto: opp ? opp.impeto : 0,
    opponentCoerced: room.coercedSeat === oppSeat,

    stockCount: room.stock.length,
    trumpCard: room.trumpCard,
    trumpSuit: room.trumpSuit,
    isMyTurn: room.turnSeat === mySeat,
    isResolvingTrick: room.isResolvingTrick,
    trickPointMultiplier: room.trickPointMultiplier,
    currentTrick: room.currentTrick.map((t) => ({
      card: t.card,
      playedByMe: t.seat === mySeat,
      playerName:
        t.seat === mySeat ? me.username : opp ? opp.username : 'Oponente',
    })),
    trickFeedback: room.trickFeedback
      ? {
          wonByMe: room.trickFeedback.winnerSeat === mySeat,
          winnerName:
            room.trickFeedback.winnerSeat === mySeat
              ? me.username
              : opp
              ? opp.username
              : 'Oponente',
          points: room.trickFeedback.points,
          reason: room.trickFeedback.reason,
          impetoAwarded: room.trickFeedback.impetoAwarded,
        }
      : null,
    lastEventBanner: room.lastEventBanner,
    trickHistory: room.trickHistory.map((h) => ({
      trickNumber: h.trickNumber,
      wonByMe: h.winnerSeat === mySeat,
      winnerName:
        h.winnerSeat === mySeat
          ? me.username
          : opp
          ? opp.username
          : 'Oponente',
      myCard: mySeat === 0 ? h.seat0Card : h.seat1Card,
      opponentCard: mySeat === 0 ? h.seat1Card : h.seat0Card,
      points: h.points,
      impetoAwarded: h.impetoAwarded,
    })),
    roundSummary,
  };
}

function broadcastRoomState(room: GameRoom): void {
  ([0, 1] as const).forEach((seatIdx) => {
    const seatObj = room.seats[seatIdx];
    if (seatObj && seatObj.ws) {
      sendJson(seatObj.ws, {
        type: 'room:state',
        state: buildSyncedStateForSeat(room, seatIdx),
      });
    }
  });
}

function startRoomRound(
  room: GameRoom,
  firstLeaderSeat: 0 | 1,
  resetMatch: boolean,
  nextRoundNum: number
): void {
  if (room.resolveTimer) {
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }

  const s0 = room.seats[0];
  const s1 = room.seats[1];
  if (!s0 || !s1) return;

  const handSize = room.gameMode === 'bisca_3' ? 3 : 9;
  const fullDeck = createDeck();
  const hand0 = fullDeck.slice(0, handSize);
  const hand1 = fullDeck.slice(handSize, handSize * 2);
  const remainingStock = fullDeck.slice(handSize * 2);
  const revealedTrump = remainingStock[remainingStock.length - 1];
  const tSuit = revealedTrump.suit;

  if (resetMatch) {
    s0.tentos = 0;
    s1.tentos = 0;
    s0.impeto = 0;
    s1.impeto = 0;
    room.roundNumber = 1;
  } else {
    room.roundNumber = nextRoundNum;
  }

  s0.hand = sortHand(hand0, tSuit);
  s1.hand = sortHand(hand1, tSuit);
  s0.captured = [];
  s1.captured = [];
  s0.bonusPoints = 0;
  s1.bonusPoints = 0;
  s0.powerUsedThisTurn = false;
  s1.powerUsedThisTurn = false;
  s0.powerSelectionMode = 'NONE';
  s1.powerSelectionMode = 'NONE';

  room.stock = remainingStock;
  room.trumpCard = revealedTrump;
  room.trumpSuit = tSuit;
  room.turnSeat = firstLeaderSeat;
  room.isResolvingTrick = false;
  room.trickPointMultiplier = 1;
  room.coercedSeat = null;
  room.handRevealedToSeat = { 0: false, 1: false };
  room.currentTrick = [];
  room.trickFeedback = null;
  room.trickHistory = [];
  room.roundSummaryRaw = null;
  room.status = 'PLAYING';
  room.lastEventBanner = {
    id: Date.now(),
    title: `MÃO #${room.roundNumber} INICIADA!`,
    subtitle: `${s0.username} vs ${s1.username} · Trunfo: ${SUIT_INFO[tSuit].name}`,
    badgeText: room.gameMode === 'bisca_3' ? 'BISCA DE 3' : 'BISCA DE 9',
    theme: 'gold',
    iconType: 'sparkles',
  };

  broadcastRoomState(room);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Healthcheck API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', roomsCount: rooms.size });
  });

  // WebSocket Server for Real-Time Multiplayer Bisca
  const wss = new WebSocketServer({ server: httpServer, path: '/ws-bisca' });

  wss.on('connection', (ws: WebSocket) => {
    let currentClientId = '';

    // Immediately send open rooms list
    sendJson(ws, {
      type: 'rooms:list',
      rooms: getOpenRoomsList(),
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const clientId: string = msg.clientId || currentClientId;
        if (clientId) {
          currentClientId = clientId;
        }

        // 1. LIST ROOMS
        if (msg.type === 'rooms:get') {
          sendJson(ws, {
            type: 'rooms:list',
            rooms: getOpenRoomsList(),
          });
          return;
        }

        // 2. CREATE ROOM
        if (msg.type === 'room:create') {
          const username =
            (msg.username || 'Dom Viajante').trim().slice(0, 24) ||
            'Dom Viajante';
          const characterId: CharacterId = msg.characterId || 'pedro_ii';
          const gameMode: GameMode = msg.gameMode || 'bisca_3';
          const mustFollowSuitInEndgame = Boolean(msg.mustFollowSuitInEndgame);

          const roomCode = generateRoomCode();
          const seat0: SeatState = {
            seat: 0,
            clientId,
            ws,
            connected: true,
            username,
            characterId,
            hand: [],
            captured: [],
            bonusPoints: 0,
            tentos: 0,
            impeto: 0,
            powerUsedThisTurn: false,
            powerSelectionMode: 'NONE',
          };

          const newRoom: GameRoom = {
            roomCode,
            status: 'WAITING',
            gameMode,
            mustFollowSuitInEndgame,
            roundNumber: 1,
            seats: [seat0, null],
            stock: [],
            trumpCard: null,
            trumpSuit: 'copas',
            turnSeat: 0,
            isResolvingTrick: false,
            trickPointMultiplier: 1,
            coercedSeat: null,
            handRevealedToSeat: { 0: false, 1: false },
            currentTrick: [],
            trickFeedback: null,
            lastEventBanner: null,
            trickHistory: [],
            roundSummaryRaw: null,
            resolveTimer: null,
          };

          rooms.set(roomCode, newRoom);
          clientRoomMap.set(clientId, { roomCode, seat: 0 });
          broadcastRoomState(newRoom);
          broadcastOpenRooms(wss);
          return;
        }

        // 3. JOIN ROOM BY CODE
        if (msg.type === 'room:join') {
          const code = String(msg.roomCode || '')
            .trim()
            .toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            sendJson(ws, {
              type: 'room:error',
              message: `Sala "${code}" não encontrada no Salão Imperial.`,
            });
            return;
          }

          const username =
            (msg.username || 'Conde Real').trim().slice(0, 24) || 'Conde Real';
          const characterId: CharacterId = msg.characterId || 'leopoldina';

          // Check if reconnecting to existing seat
          for (const sIdx of [0, 1] as const) {
            const existing = room.seats[sIdx];
            if (existing && existing.clientId === clientId) {
              existing.ws = ws;
              existing.connected = true;
              broadcastRoomState(room);
              return;
            }
          }

          if (room.seats[1] !== null) {
            sendJson(ws, {
              type: 'room:error',
              message: `A sala "${code}" já está cheia (2/2 jogadores).`,
            });
            return;
          }

          const seat1: SeatState = {
            seat: 1,
            clientId,
            ws,
            connected: true,
            username,
            characterId,
            hand: [],
            captured: [],
            bonusPoints: 0,
            tentos: 0,
            impeto: 0,
            powerUsedThisTurn: false,
            powerSelectionMode: 'NONE',
          };

          room.seats[1] = seat1;
          clientRoomMap.set(clientId, { roomCode: code, seat: 1 });
          startRoomRound(room, 0, true, 1);
          broadcastOpenRooms(wss);
          return;
        }

        // 4. QUICK MATCHMAKING QUEUE
        if (msg.type === 'queue:join') {
          const username =
            (msg.username || 'Dom Viajante').trim().slice(0, 24) ||
            'Dom Viajante';
          const characterId: CharacterId = msg.characterId || 'pedro_ii';
          const gameMode: GameMode = msg.gameMode || 'bisca_3';
          const mustFollowSuitInEndgame = Boolean(msg.mustFollowSuitInEndgame);

          // Remove if already in queue
          const existingIdx = matchmakingQueue.findIndex(
            (q) => q.clientId === clientId
          );
          if (existingIdx !== -1) {
            matchmakingQueue.splice(existingIdx, 1);
          }

          // Check if another active player is waiting in the queue
          const opponentIdx = matchmakingQueue.findIndex(
            (q) =>
              q.clientId !== clientId && q.ws.readyState === WebSocket.OPEN
          );

          if (opponentIdx !== -1) {
            const firstPlayer = matchmakingQueue.splice(opponentIdx, 1)[0];
            const roomCode = generateRoomCode();

            const seat0: SeatState = {
              seat: 0,
              clientId: firstPlayer.clientId,
              ws: firstPlayer.ws,
              connected: true,
              username: firstPlayer.username,
              characterId: firstPlayer.characterId,
              hand: [],
              captured: [],
              bonusPoints: 0,
              tentos: 0,
              impeto: 0,
              powerUsedThisTurn: false,
              powerSelectionMode: 'NONE',
            };

            const seat1: SeatState = {
              seat: 1,
              clientId,
              ws,
              connected: true,
              username,
              characterId,
              hand: [],
              captured: [],
              bonusPoints: 0,
              tentos: 0,
              impeto: 0,
              powerUsedThisTurn: false,
              powerSelectionMode: 'NONE',
            };

            const newRoom: GameRoom = {
              roomCode,
              status: 'WAITING',
              gameMode: firstPlayer.gameMode,
              mustFollowSuitInEndgame: firstPlayer.mustFollowSuitInEndgame,
              roundNumber: 1,
              seats: [seat0, seat1],
              stock: [],
              trumpCard: null,
              trumpSuit: 'copas',
              turnSeat: 0,
              isResolvingTrick: false,
              trickPointMultiplier: 1,
              coercedSeat: null,
              handRevealedToSeat: { 0: false, 1: false },
              currentTrick: [],
              trickFeedback: null,
              lastEventBanner: null,
              trickHistory: [],
              roundSummaryRaw: null,
              resolveTimer: null,
            };

            rooms.set(roomCode, newRoom);
            clientRoomMap.set(firstPlayer.clientId, { roomCode, seat: 0 });
            clientRoomMap.set(clientId, { roomCode, seat: 1 });
            startRoomRound(newRoom, 0, true, 1);
            broadcastOpenRooms(wss);
          } else {
            matchmakingQueue.push({
              clientId,
              ws,
              username,
              characterId,
              gameMode,
              mustFollowSuitInEndgame,
            });
            sendJson(ws, { type: 'queue:waiting' });
          }
          return;
        }

        if (msg.type === 'queue:leave') {
          const idx = matchmakingQueue.findIndex(
            (q) => q.clientId === clientId
          );
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
          sendJson(ws, { type: 'queue:left' });
          return;
        }

        // 5. LEAVE ROOM
        if (msg.type === 'room:leave') {
          const mapping = clientRoomMap.get(clientId);
          if (mapping) {
            const room = rooms.get(mapping.roomCode);
            if (room) {
              if (room.resolveTimer) clearTimeout(room.resolveTimer);
              rooms.delete(mapping.roomCode);
              const oppSeat: 0 | 1 = mapping.seat === 0 ? 1 : 0;
              const opp = room.seats[oppSeat];
              if (opp && opp.ws) {
                sendJson(opp.ws, {
                  type: 'room:closed',
                  message: `${room.seats[mapping.seat]?.username || 'O oponente'} deixou a mesa.`,
                });
              }
            }
            clientRoomMap.delete(clientId);
            broadcastOpenRooms(wss);
          }
          return;
        }

        // Look up active room & seat for gameplay actions
        const mapping = clientRoomMap.get(clientId);
        if (!mapping) return;
        const room = rooms.get(mapping.roomCode);
        if (!room) return;
        const mySeat = mapping.seat;
        const oppSeat: 0 | 1 = mySeat === 0 ? 1 : 0;
        const me = room.seats[mySeat];
        const opp = room.seats[oppSeat];
        if (!me || !opp) return;

        // 6. SWAP 2 OF TRUMP
        if (msg.type === 'online:swap_trump') {
          if (
            room.status !== 'PLAYING' ||
            room.turnSeat !== mySeat ||
            room.currentTrick.length > 0 ||
            room.isResolvingTrick ||
            me.powerSelectionMode !== 'NONE' ||
            !room.trumpCard
          ) {
            return;
          }

          if (
            !canSwapTwoOfTrump(me.hand, room.trumpCard, room.stock.length, true)
          ) {
            return;
          }

          const twoCard = me.hand.find(
            (c) => c.suit === room.trumpSuit && c.rank === '2'
          );
          if (!twoCard) return;

          const swappedCard = room.trumpCard;
          me.hand = sortHand(
            me.hand.filter((c) => c.id !== twoCard.id).concat(swappedCard),
            room.trumpSuit
          );
          room.trumpCard = twoCard;
          room.stock = [...room.stock.slice(0, room.stock.length - 1), twoCard];

          room.lastEventBanner = {
            id: Date.now(),
            title: 'TROCA DO 2 DE TRUNFO!',
            subtitle: `${me.username} trocou o 2 de ${SUIT_INFO[room.trumpSuit].name} pelo ${getCardDisplayName(swappedCard)}!`,
            badgeText: 'MANOBRA REAL',
            theme: 'gold',
            iconType: 'crown',
          };

          broadcastRoomState(room);
          return;
        }

        // 7. ACTIVATE 100 PI IMPERIAL POWER
        if (msg.type === 'online:activate_power') {
          if (
            room.status !== 'PLAYING' ||
            room.turnSeat !== mySeat ||
            room.isResolvingTrick ||
            me.impeto < 100 ||
            me.powerUsedThisTurn ||
            me.powerSelectionMode !== 'NONE'
          ) {
            return;
          }

          const charProfile = getCharacterProfile(me.characterId);

          if (me.characterId === 'pedro_i') {
            me.impeto = 0;
            me.powerUsedThisTurn = true;
            room.coercedSeat = oppSeat;
            room.lastEventBanner = {
              id: Date.now(),
              title: `${me.username.toUpperCase()}: GRITO DO IPIRANGA!`,
              subtitle: `${opp.username} está coagido a jogar sua carta de maior pontuação!`,
              badgeText: charProfile.power.name.toUpperCase(),
              theme: 'gold',
              iconType: 'zap',
            };
            broadcastRoomState(room);
            return;
          }

          if (me.characterId === 'pedro_ii') {
            room.handRevealedToSeat[mySeat] = true;
            if (room.stock.length > 0 && me.hand.length > 0) {
              me.powerSelectionMode = 'SELECT_HAND_CARD_FOR_CONCILIACAO';
              room.lastEventBanner = {
                id: Date.now(),
                title: `${me.username.toUpperCase()}: GABINETE DE CONCILIAÇÃO!`,
                subtitle: `Mão de ${opp.username} revelada! Escolhendo 1 carta para conciliar com o monte...`,
                badgeText: 'VISÃO TOTAL',
                theme: 'gold',
                iconType: 'zap',
              };
            } else {
              me.impeto = 0;
              me.powerUsedThisTurn = true;
              me.bonusPoints += 8;
              room.lastEventBanner = {
                id: Date.now(),
                title: `${me.username.toUpperCase()}: GABINETE DE CONCILIAÇÃO!`,
                subtitle: `Mão adversária revelada (+8 pts de Bônus Diplomático)!`,
                badgeText: '+8 PTS · VISÃO TOTAL',
                theme: 'gold',
                iconType: 'zap',
              };
            }
            broadcastRoomState(room);
            return;
          }

          if (me.characterId === 'bonifacio') {
            if (me.hand.length > 0) {
              me.powerSelectionMode = 'SELECT_HAND_CARD_FOR_PATRIARCA';
              room.lastEventBanner = {
                id: Date.now(),
                title: `${me.username.toUpperCase()}: ESTRATÉGIA DO PATRIARCA!`,
                subtitle: `${me.username} está escolhendo o novo Trunfo Imperial da mesa...`,
                badgeText: 'DECRETO DE TRUNFO',
                theme: 'gold',
                iconType: 'zap',
              };
              broadcastRoomState(room);
            }
            return;
          }

          if (me.characterId === 'leopoldina') {
            me.impeto = 0;
            me.powerUsedThisTurn = true;
            room.trickPointMultiplier = Math.min(
              4,
              room.trickPointMultiplier * 2
            );
            room.lastEventBanner = {
              id: Date.now(),
              title: `${me.username.toUpperCase()}: DECRETO SOBERANO!`,
              subtitle: `Todos os pontos desta vaza valem ${room.trickPointMultiplier}x!`,
              badgeText: `VAZA ${room.trickPointMultiplier}X`,
              theme: 'gold',
              iconType: 'crown',
            };
            broadcastRoomState(room);
            return;
          }

          if (me.characterId === 'isabel') {
            me.impeto = 0;
            me.powerUsedThisTurn = true;
            const lostWithPoints = [...opp.captured].sort(
              (a, b) => b.points - a.points || b.strength - a.strength
            );
            if (
              lostWithPoints.length > 0 &&
              lostWithPoints[0].points > 0 &&
              me.hand.length > 0
            ) {
              const redeemed = lostWithPoints[0];
              const lowestInHand = [...me.hand].sort((a, b) => {
                if (a.points !== b.points) return a.points - b.points;
                return a.strength - b.strength;
              })[0];

              opp.captured = opp.captured
                .filter((c) => c.id !== redeemed.id)
                .concat(lowestInHand);
              me.hand = sortHand(
                me.hand
                  .filter((c) => c.id !== lowestInHand.id)
                  .concat(redeemed),
                room.trumpSuit
              );

              room.lastEventBanner = {
                id: Date.now(),
                title: `${me.username.toUpperCase()}: REDENÇÃO DOURADA!`,
                subtitle: `${me.username} resgatou o ${getCardDisplayName(redeemed)} (+${redeemed.points} pts) das cartas perdidas!`,
                badgeText: `RESGATE +${redeemed.points} PTS`,
                theme: 'emerald',
                iconType: 'crown',
              };
            } else {
              me.bonusPoints += 12;
              room.lastEventBanner = {
                id: Date.now(),
                title: `${me.username.toUpperCase()}: REDENÇÃO DOURADA!`,
                subtitle: `${me.username} recebeu +12 pts de Indulto Imperial!`,
                badgeText: '+12 PTS BÔNUS',
                theme: 'emerald',
                iconType: 'crown',
              };
            }
            broadcastRoomState(room);
            return;
          }
        }

        // 8. PLAY CARD (OR SELECT POWER CARD)
        if (msg.type === 'online:play_card') {
          if (
            room.status !== 'PLAYING' ||
            room.turnSeat !== mySeat ||
            room.isResolvingTrick ||
            room.currentTrick.length >= 2
          ) {
            return;
          }

          const cardId = String(msg.cardId || '');
          const selectedCard = me.hand.find((c) => c.id === cardId);
          if (!selectedCard) return;

          // Sub-state A: Dom Pedro II Conciliação Card Selection
          if (me.powerSelectionMode === 'SELECT_HAND_CARD_FOR_CONCILIACAO') {
            if (room.stock.length > 0) {
              const topStock = room.stock[0];
              room.stock = [selectedCard, ...room.stock.slice(1)];
              room.trumpCard =
                room.stock.length > 0
                  ? room.stock[room.stock.length - 1]
                  : null;
              me.hand = sortHand(
                me.hand.filter((c) => c.id !== selectedCard.id).concat(topStock),
                room.trumpSuit
              );
            }
            me.powerSelectionMode = 'NONE';
            me.impeto = 0;
            me.powerUsedThisTurn = true;
            broadcastRoomState(room);
            return;
          }

          // Sub-state B: José Bonifácio Patriarca Card Selection
          if (me.powerSelectionMode === 'SELECT_HAND_CARD_FOR_PATRIARCA') {
            const newSuit = selectedCard.suit;
            if (room.trumpCard && room.stock.length > 0) {
              const oldTrump = room.trumpCard;
              me.hand = sortHand(
                me.hand.filter((c) => c.id !== selectedCard.id).concat(oldTrump),
                newSuit
              );
              room.stock = [
                ...room.stock.slice(0, room.stock.length - 1),
                selectedCard,
              ];
              room.trumpCard = selectedCard;
              room.trumpSuit = newSuit;
            } else {
              room.trumpSuit = newSuit;
              me.hand = sortHand(me.hand, newSuit);
              me.bonusPoints += 6;
            }
            me.powerSelectionMode = 'NONE';
            me.impeto = 0;
            me.powerUsedThisTurn = true;
            room.lastEventBanner = {
              id: Date.now(),
              title: 'NOVO TRUNFO DO PATRIARCA!',
              subtitle: `${me.username} decretou ${SUIT_INFO[newSuit].name} como novo Trunfo Imperial!`,
              badgeText: `TRUNFO: ${SUIT_INFO[newSuit].name.toUpperCase()}`,
              theme: 'gold',
              iconType: 'crown',
            };
            broadcastRoomState(room);
            return;
          }

          // Standard Trick Card Play
          const leadCard =
            room.currentTrick.length === 1 ? room.currentTrick[0].card : null;
          const isMeCoerced = room.coercedSeat === mySeat;

          if (
            !isCardPlayable(
              selectedCard,
              me.hand,
              leadCard,
              room.stock.length,
              room.mustFollowSuitInEndgame,
              isMeCoerced
            )
          ) {
            return;
          }

          if (isMeCoerced) {
            room.coercedSeat = null;
          }

          me.hand = me.hand.filter((c) => c.id !== selectedCard.id);
          room.currentTrick.push({ card: selectedCard, seat: mySeat });

          if (room.currentTrick.length === 1) {
            room.turnSeat = oppSeat;
            broadcastRoomState(room);
            return;
          }

          // Both cards played -> Evaluate Trick & Charge Impeto
          const first = room.currentTrick[0];
          const second = room.currentTrick[1];
          const leadOwner = first.seat === 0 ? 'player' : 'bot';

          const evalRes = evaluateTrick(
            first.card,
            second.card,
            leadOwner,
            room.trumpSuit,
            room.trickPointMultiplier
          );
          const winnerSeat: 0 | 1 = evalRes.winner === 'player' ? 0 : 1;

          const impetoRes = calculateImpetoCharge(
            first.card,
            second.card,
            leadOwner,
            evalRes.winner,
            room.trumpSuit
          );

          if (impetoRes.playerDelta > 0 && room.seats[0]) {
            room.seats[0].impeto = Math.min(
              100,
              room.seats[0].impeto + impetoRes.playerDelta
            );
          }
          if (impetoRes.botDelta > 0 && room.seats[1]) {
            room.seats[1].impeto = Math.min(
              100,
              room.seats[1].impeto + impetoRes.botDelta
            );
          }

          room.isResolvingTrick = true;
          room.trickFeedback = {
            winnerSeat,
            points: evalRes.points,
            reason: evalRes.reason,
            impetoAwarded: impetoRes.chargeLabel,
          };

          const winnerPlayer = room.seats[winnerSeat]!;
          if (
            impetoRes.playerDelta === 50 ||
            impetoRes.botDelta === 50
          ) {
            room.lastEventBanner = {
              id: Date.now(),
              title: 'SOBRECORTE IMPERIAL (+50 PI)!',
              subtitle: `${winnerPlayer.username}: ${evalRes.reason}`,
              badgeText: `+${evalRes.points} PTS · +50 PI`,
              theme: 'gold',
              iconType: 'zap',
            };
          } else if (evalRes.points >= 20) {
            room.lastEventBanner = {
              id: Date.now(),
              title: `CARGA REAL DE ${winnerPlayer.username.toUpperCase()}!`,
              subtitle: evalRes.reason,
              badgeText: `+${evalRes.points} PONTOS`,
              theme: 'gold',
              iconType: 'crown',
            };
          }

          broadcastRoomState(room);

          room.resolveTimer = setTimeout(() => {
            const s0 = room.seats[0];
            const s1 = room.seats[1];
            if (!s0 || !s1) return;

            const trickCards = [first.card, second.card];
            if (winnerSeat === 0) {
              s0.captured.push(...trickCards);
              s0.bonusPoints += evalRes.bonusPointsAwarded;
            } else {
              s1.captured.push(...trickCards);
              s1.bonusPoints += evalRes.bonusPointsAwarded;
            }

            const seat0Card = first.seat === 0 ? first.card : second.card;
            const seat1Card = first.seat === 1 ? first.card : second.card;

            room.trickHistory.unshift({
              trickNumber: room.trickHistory.length + 1,
              leadSeat: first.seat,
              winnerSeat,
              seat0Card,
              seat1Card,
              points: evalRes.points,
              reason: evalRes.reason,
              impetoAwarded: impetoRes.chargeLabel || undefined,
            });

            if (room.stock.length >= 2) {
              const d1 = room.stock[0];
              const d2 = room.stock[1];
              room.stock = room.stock.slice(2);
              if (winnerSeat === 0) {
                s0.hand = sortHand([...s0.hand, d1], room.trumpSuit);
                s1.hand = sortHand([...s1.hand, d2], room.trumpSuit);
              } else {
                s1.hand = sortHand([...s1.hand, d1], room.trumpSuit);
                s0.hand = sortHand([...s0.hand, d2], room.trumpSuit);
              }
              if (room.stock.length === 0) {
                room.trumpCard = null;
              }
            }

            room.currentTrick = [];
            room.trickFeedback = null;
            room.isResolvingTrick = false;
            room.trickPointMultiplier = 1;
            room.handRevealedToSeat = { 0: false, 1: false };
            s0.powerUsedThisTurn = false;
            s1.powerUsedThisTurn = false;

            if (s0.hand.length === 0 && s1.hand.length === 0) {
              const summary = computeRoundSummary(
                s0.captured,
                s1.captured,
                s0.bonusPoints,
                s1.bonusPoints
              );
              room.roundSummaryRaw = summary;

              if (summary.winner === 'player') {
                s0.tentos = Math.min(
                  MATCH_TARGET_TENTOS,
                  s0.tentos + summary.tentosAwarded
                );
              } else if (summary.winner === 'bot') {
                s1.tentos = Math.min(
                  MATCH_TARGET_TENTOS,
                  s1.tentos + summary.tentosAwarded
                );
              }

              if (
                s0.tentos >= MATCH_TARGET_TENTOS ||
                s1.tentos >= MATCH_TARGET_TENTOS
              ) {
                room.status = 'GAME_OVER';
              } else {
                room.status = 'ROUND_SUMMARY';
              }
            } else {
              room.turnSeat = winnerSeat;
            }

            broadcastRoomState(room);
          }, 1200);
          return;
        }

        // 9. NEXT ROUND OR REMATCH
        if (msg.type === 'online:next_round') {
          if (room.status === 'ROUND_SUMMARY') {
            const nextLeader: 0 | 1 =
              room.roundSummaryRaw?.winner === 'bot' ? 1 : 0;
            startRoomRound(room, nextLeader, false, room.roundNumber + 1);
          } else if (room.status === 'GAME_OVER') {
            startRoomRound(room, 0, true, 1);
          }
          return;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      // Remove from matchmaking queue if present
      const qIdx = matchmakingQueue.findIndex(
        (q) => q.clientId === currentClientId || q.ws === ws
      );
      if (qIdx !== -1) {
        matchmakingQueue.splice(qIdx, 1);
      }

      if (!currentClientId) return;
      const mapping = clientRoomMap.get(currentClientId);
      if (!mapping) return;
      const room = rooms.get(mapping.roomCode);
      if (!room) return;

      const seatObj = room.seats[mapping.seat];
      if (seatObj) {
        seatObj.connected = false;
        seatObj.ws = null;
      }

      // If room was WAITING and host left, remove room
      if (room.status === 'WAITING') {
        rooms.delete(mapping.roomCode);
        clientRoomMap.delete(currentClientId);
        broadcastOpenRooms(wss);
      } else {
        broadcastRoomState(room);
      }
    });
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Render/Railway/Fly.io inject the port via env; fall back to 3000 locally.
  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Bisca Imperial Server & WebSocket running on port ${PORT}`);
  });
}

startServer();
