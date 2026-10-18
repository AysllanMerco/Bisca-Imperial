export type Suit = 'espadas' | 'copas' | 'ouros' | 'paus';

export type Rank = '2' | '3' | '4' | '5' | '6' | 'Q' | 'J' | 'K' | '7' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  points: number;
  strength: number; // 1 (lowest: '2') to 10 (highest: 'A')
}

export type GameMode = 'bisca_3' | 'bisca_9';

export type MatchMode = 'VS_BOT' | 'VS_LOCAL' | 'VS_ONLINE';

export type CharacterId =
  | 'pedro_i'
  | 'leopoldina'
  | 'isabel'
  | 'bonifacio'
  | 'pedro_ii';

export type OpponentId = CharacterId;

export type PowerSelectionMode =
  | 'NONE'
  | 'SELECT_HAND_CARD_FOR_CONCILIACAO' // Dom Pedro II: pick 1 hand card to swap with top of stock
  | 'SELECT_HAND_CARD_FOR_PATRIARCA';  // José Bonifácio: pick 1 hand card to become the new Trump card

export interface CharacterPowerSpec {
  name: string;
  description: string;
  exceptionHandlingNote: string;
}

// ============================================================================
// PSICOLOGIA DE MESA: PROVOCAÇÕES (EMOTES) & HUMOR DA IA
// ============================================================================
export type TauntId = 'elogio' | 'coroa' | 'trunfo_bluff' | 'pressa';

export interface TauntSpec {
  id: TauntId;
  label: string;
  phrase: string;
  iconName: string;
}

/**
 * Temporary psychological state of the Bot caused by player taunts:
 * - PROVOKED: Dom Pedro I took the bait and plays impulsively that trick.
 * - CAUTIOUS: Leopoldina/Isabel suspect an ambush and hoard their Aces/7s.
 */
export type BotMood = 'NORMAL' | 'PROVOKED' | 'CAUTIOUS';

export interface OpponentProfile {
  id: CharacterId;
  name: string;
  shortName: string;
  title: string;
  era: string;
  description: string;
  styleTag: string;
  difficultyStars: number;
  accentColor: string;
  power: CharacterPowerSpec;
  quoteLead: string;
  quoteRespond: string;
  quoteWinBig: string;
  quoteTrumpCut: string;
  quotePowerActivate: string;
  /** Personality-flavored automatic reply when the player taunts. */
  quoteTauntResponse: string;
}

export interface PlayerEntity {
  id: 'player' | 'bot';
  username: string;
  characterId: CharacterId;
  hand: Card[];
  capturedCards: Card[];
  bonusPoints: number;
  tentos: number;
  impetoGauge: number; // 0 to 100 PI
  powerUsedInCurrentTurn: boolean;
}

export interface ActiveTrickModifiers {
  pointMultiplier: number;
  coercedPlayer: TurnOwner | null;
  opponentHandRevealedToPlayer: boolean;
}

export interface ImpetoChargeResult {
  playerDelta: number;
  botDelta: number;
  chargeLabel: string | null;
  chargedOwner: TurnOwner | null;
}

export type GameState =
  | 'TITLE_MENU'
  | 'ONLINE_LOBBY'
  | 'PLAYING'
  | 'PAUSED'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER';

export type TurnOwner = 'player' | 'bot';

export interface PlayedTrickCard {
  card: Card;
  playedBy: TurnOwner;
}

export interface TrickHistoryItem {
  trickNumber: number;
  leadPlayer: TurnOwner;
  winner: TurnOwner;
  playerCard: Card;
  botCard: Card;
  points: number;
  reason: string;
  impetoAwarded?: string;
}

export interface RoundSummaryData {
  playerPoints: number;
  botPoints: number;
  winner: 'player' | 'bot' | 'draw';
  tentosAwarded: number;
  outcomeType: 'simples' | 'capote' | 'bandeira' | 'empate';
  outcomeTitle: string;
  outcomeDescription: string;
  playerBiscasAndAces: Card[];
  botBiscasAndAces: Card[];
}

// ============================================================================
// ONLINE MULTIPLAYER WEBSOCKET PROTOCOL TYPES
// ============================================================================
export interface OnlineRoomSummary {
  roomCode: string;
  hostUsername: string;
  hostCharacterId: CharacterId;
  gameMode: GameMode;
  mustFollowSuitInEndgame: boolean;
  playerCount: number;
  status: 'WAITING' | 'PLAYING';
}

export interface OnlineSyncedState {
  roomCode: string;
  status: 'WAITING' | 'PLAYING' | 'ROUND_SUMMARY' | 'GAME_OVER';
  gameMode: GameMode;
  mustFollowSuitInEndgame: boolean;
  roundNumber: number;
  mySeat: 0 | 1;
  myUsername: string;
  myCharacterId: CharacterId;
  myHand: Card[];
  myPoints: number;
  myTentos: number;
  myImpeto: number;
  myPowerUsedThisTurn: boolean;
  myPowerSelectionMode: PowerSelectionMode;
  myCoerced: boolean;

  opponentConnected: boolean;
  opponentUsername: string;
  opponentCharacterId: CharacterId;
  opponentHand: Card[]; // Real cards if opponentHandRevealed is true, else dummy cards for count
  opponentHandCount: number;
  opponentHandRevealed: boolean;
  opponentPoints: number;
  opponentTentos: number;
  opponentImpeto: number;
  opponentCoerced: boolean;

  stockCount: number;
  trumpCard: Card | null;
  trumpSuit: Suit;
  isMyTurn: boolean;
  isResolvingTrick: boolean;
  trickPointMultiplier: number;
  currentTrick: {
    card: Card;
    playedByMe: boolean;
    playerName: string;
  }[];
  trickFeedback: {
    wonByMe: boolean;
    winnerName: string;
    points: number;
    reason: string;
    impetoAwarded?: string | null;
  } | null;
  lastEventBanner: {
    id: number;
    title: string;
    subtitle: string;
    badgeText?: string;
    theme: 'gold' | 'emerald' | 'crimson';
    iconType: 'swords' | 'crown' | 'flame' | 'sparkles' | 'zap';
  } | null;
  trickHistory: {
    trickNumber: number;
    wonByMe: boolean;
    winnerName: string;
    myCard: Card;
    opponentCard: Card;
    points: number;
    impetoAwarded?: string;
  }[];
  roundSummary: {
    myPoints: number;
    opponentPoints: number;
    wonByMe: boolean | 'draw';
    tentosAwarded: number;
    outcomeType: 'simples' | 'capote' | 'bandeira' | 'empate';
    outcomeTitle: string;
    outcomeDescription: string;
    myBiscasAndAces: Card[];
    opponentBiscasAndAces: Card[];
  } | null;
}
