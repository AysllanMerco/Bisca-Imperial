import {
  ActiveTrickModifiers,
  BotMood,
  Card,
  CharacterId,
  ImpetoChargeResult,
  OpponentId,
  OpponentProfile,
  Rank,
  RoundSummaryData,
  Suit,
  TauntSpec,
  TurnOwner,
} from '../types/bisca';

export const SUITS: Suit[] = ['espadas', 'copas', 'ouros', 'paus'];

export const SUIT_INFO: Record<
  Suit,
  { name: string; symbol: string; isRed: boolean; colorHex: string }
> = {
  espadas: {
    name: 'Espadas',
    symbol: '♠',
    isRed: false,
    colorHex: '#18181B',
  },
  copas: {
    name: 'Copas',
    symbol: '♥',
    isRed: true,
    colorHex: '#B91C1C',
  },
  ouros: {
    name: 'Ouros',
    symbol: '♦',
    isRed: true,
    colorHex: '#B91C1C',
  },
  paus: {
    name: 'Paus',
    symbol: '♣',
    isRed: false,
    colorHex: '#18181B',
  },
};

export const RANK_CONFIG: {
  rank: Rank;
  name: string;
  points: number;
  strength: number;
}[] = [
  { rank: '2', name: 'Dois', points: 0, strength: 1 },
  { rank: '3', name: 'Três', points: 0, strength: 2 },
  { rank: '4', name: 'Quatro', points: 0, strength: 3 },
  { rank: '5', name: 'Cinco', points: 0, strength: 4 },
  { rank: '6', name: 'Seis', points: 0, strength: 5 },
  { rank: 'Q', name: 'Dama', points: 2, strength: 6 },
  { rank: 'J', name: 'Valete', points: 3, strength: 7 },
  { rank: 'K', name: 'Rei', points: 4, strength: 8 },
  { rank: '7', name: 'Bisca', points: 10, strength: 9 },
  { rank: 'A', name: 'Ás', points: 11, strength: 10 },
];

export const OPPONENTS: OpponentProfile[] = [
  {
    id: 'pedro_i',
    name: 'Dom Pedro I',
    shortName: 'D. Pedro I',
    title: 'O Aclamado · Paço de São Cristóvão',
    era: 'Primeiro Reinado (1822–1831)',
    description:
      'Impetuoso e audaz. Gosta de puxar cartas de efeito, cortar vazas sem hesitar e buscar o Capote no ataque.',
    styleTag: 'Ímpeto & Ataque',
    difficultyStars: 2,
    accentColor: '#10B981',
    power: {
      name: 'Grito do Ipiranga',
      description:
        'Coage o oponente a jogar sua carta de maior pontuação da mão na rodada atual.',
      exceptionHandlingNote:
        'Se o oponente já jogou na vaza atual, o efeito fica engatilhado para a próxima jogada dele. Respeita obrigatoriedade de naipe na fase final.',
    },
    quoteLead: 'D. Pedro I puxa carta com ímpeto: "Vamos decidir esta mesa!"',
    quoteRespond: 'D. Pedro I avalia um golpe rápido na vaza...',
    quoteWinBig: '"Independência ou Capote! Esta carga pertence à Coroa!"',
    quoteTrumpCut: '"Pelo meu sangue e pelo Trunfo, corto esta vaza!"',
    quotePowerActivate:
      '"Às margens desta mesa: ordeno que jogue sua maior carta agora!"',
    quoteTauntResponse:
      '"Sangue imperial não treme com vento de salão! Prossiga!"',
  },
  {
    id: 'leopoldina',
    name: 'Imperatriz Maria Leopoldina',
    shortName: 'M. Leopoldina',
    title: 'A Estrategista · Chancelaria Real',
    era: 'Articuladora da Independência',
    description:
      'Diplomata brilhante de Habsburgo. Preserva os trunfos com cautela e lê o jogo antes de arriscar suas Biscas.',
    styleTag: 'Diplomacia & Trunfo',
    difficultyStars: 3,
    accentColor: '#F59E0B',
    power: {
      name: 'Decreto Soberano',
      description:
        'Aplica multiplicador 2x a todos os pontos acumulados na vazada atual.',
      exceptionHandlingNote:
        'Pontos extras são creditados como bônus soberano ao vencedor da vaza. Caso a vaza termine em 0 pts base, garante piso mínimo de +6 pts.',
    },
    quoteLead: 'Maria Leopoldina examina a mesa com serenidade diplomática...',
    quoteRespond: 'A Imperatriz pondera a melhor resposta estratégica...',
    quoteWinBig: '"A prudência de gabinete sempre colhe os maiores frutos."',
    quoteTrumpCut: '"Assino o decreto com este corte de Trunfo!"',
    quotePowerActivate:
      '"Por Decreto Soberano da Regência, os pontos desta vaza valem em dobro!"',
    quoteTauntResponse:
      '"Palavras altas raramente mascaram boas jogadas, viajante."',
  },
  {
    id: 'isabel',
    name: 'Princesa Isabel',
    shortName: 'Princesa Isabel',
    title: 'A Redentora · Palácio de Petrópolis',
    era: 'Terceira Regência Imperial',
    description:
      'Firme nos momentos decisivos. Especialista em recuperar cartas valiosas e virar partidas disputadas na reta final.',
    styleTag: 'Virada & Decisão',
    difficultyStars: 3,
    accentColor: '#38BDF8',
    power: {
      name: 'Redenção Dourada',
      description:
        'Recupera a carta de maior valor de pontos do monte de cartas perdidas para a sua mão.',
      exceptionHandlingNote:
        'Para manter a paridade exata de cartas nas mãos e evitar travamento, permuta pela carta de menor valor da própria mão. Se não houver cartas de pontos perdidas, concede +12 pts de bônus.',
    },
    quoteLead: 'Princesa Isabel abre a vaza do Salão das Camélias...',
    quoteRespond: 'Princesa Isabel busca o lance mais justo e certeiro...',
    quoteWinBig: '"Com firmeza e oportunidade, conquistamos esta grande vaza!"',
    quoteTrumpCut: '"Pela Lei Áurea da mesa, este Trunfo decide a rodada!"',
    quotePowerActivate:
      '"Pela Redenção Dourada, resgato a joia mais valiosa que havia sido perdida!"',
    quoteTauntResponse:
      '"A serenidade da corte responde melhor do que o alarido, senhor."',
  },
  {
    id: 'bonifacio',
    name: 'José Bonifácio',
    shortName: 'José Bonifácio',
    title: 'O Patriarca · Gabinete Imperial',
    era: 'Ministro do Reino e Cientista',
    description:
      'Naturalista e estadista calculista. Domina o trunfo da mesa e prepara emboscadas cirúrgicas para caçar seu 7 e Ás.',
    styleTag: 'Emboscada Científica',
    difficultyStars: 4,
    accentColor: '#A855F7',
    power: {
      name: 'Estratégia do Patriarca',
      description:
        'Toma para a mão a carta de trunfo exposta na mesa e descarta uma carta própria para se tornar o novo trunfo.',
      exceptionHandlingNote:
        'Atualiza o naipe de trunfo caso a carta escolhida seja de outro naipe. Se o monte já tiver se esgotado, permite decretar o naipe de uma carta da mão como novo Trunfo Imperial (+6 pts).',
    },
    quoteLead: 'José Bonifácio calcula as probabilidades do baralho...',
    quoteRespond: 'O Patriarca analisa friamente os pontos em jogo...',
    quoteWinBig: '"A ciência política e a matemática das cartas jamais falham!"',
    quoteTrumpCut: '"Intervenção cirúrgica do Gabinete com carta de Trunfo!"',
    quotePowerActivate:
      '"Reorganizo o Estado: tomo o Trunfo da mesa e instituo uma nova ordem!"',
    quoteTauntResponse:
      '"Conheço a matemática do baralho, moço. Blefe não altera probabilidade."',
  },
  {
    id: 'pedro_ii',
    name: 'Dom Pedro II',
    shortName: 'D. Pedro II',
    title: 'O Magnânimo · Quinta da Boa Vista',
    era: 'Segundo Reinado (1840–1889)',
    description:
      'Erudito e mestre absoluto do salão. Enxerga as cartas adversárias, concilia o monte e domina o fim de jogo.',
    styleTag: 'Grão-Mestre Imperial',
    difficultyStars: 5,
    accentColor: '#EF4444',
    power: {
      name: 'Gabinete de Conciliação',
      description:
        'Concede visão total da mão do oponente na rodada e troca 1 carta da mão por uma do topo do monte.',
      exceptionHandlingNote:
        'Revela todas as cartas da mão adversária. Se o monte já estiver vazio na fase final, mantém a revelação total e concede +8 pts de bônus diplomático sem acessar índice nulo.',
    },
    quoteLead: 'D. Pedro II observa pacientemente e lança sua carta...',
    quoteRespond: 'O Imperador consulta sua memória infalível das vazas...',
    quoteWinBig:
      '"A paciência e o estudo atento governam tanto o Império quanto a Bisca."',
    quoteTrumpCut:
      '"Sob o selo do Segundo Reinado, aplico o Trunfo no momento exato."',
    quotePowerActivate:
      '"Convoco o Gabinete de Conciliação: nenhuma carta permanece oculta aos olhos do Império!"',
    quoteTauntResponse:
      '"A aritmética das vazas me é conhecida por inteiro, honrado oponente."',
  },
];

export function getCharacterProfile(id: CharacterId): OpponentProfile {
  return OPPONENTS.find((c) => c.id === id) || OPPONENTS[0];
}

/** As 4 provocações rápidas do jogador (atalhos F1–F4, cooldown de 8s). */
export const TAUNTS: TauntSpec[] = [
  {
    id: 'elogio',
    label: 'Elogio Irônico',
    phrase: 'Bela cartada, Vossa Graça!',
    iconName: 'sparkles',
  },
  {
    id: 'coroa',
    label: 'Intimidação Real',
    phrase: 'Esta carga pertence à Coroa!',
    iconName: 'crown',
  },
  {
    id: 'trunfo_bluff',
    label: 'Blefe de Trunfo',
    phrase: 'Tremei diante do meu Trunfo!',
    iconName: 'swords',
  },
  {
    id: 'pressa',
    label: 'Pressão de Tempo',
    phrase: 'O Império não espera por indecisos!',
    iconName: 'hourglass',
  },
];

/** Cooldown compartilhado entre provocações, em segundos. */
export const TAUNT_COOLDOWN_SECONDS = 8;

export function getRankName(rank: Rank): string {
  const found = RANK_CONFIG.find((r) => r.rank === rank);
  return found ? found.name : rank;
}

export function getCardDisplayName(card: Card): string {
  return `${getRankName(card.rank)} de ${SUIT_INFO[card.suit].name}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const cfg of RANK_CONFIG) {
      deck.push({
        id: `${cfg.rank}_${suit}`,
        suit,
        rank: cfg.rank,
        points: cfg.points,
        strength: cfg.strength,
      });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sortHand(hand: Card[], trumpSuit: Suit): Card[] {
  const suitOrder: Record<Suit, number> = {
    espadas: 1,
    copas: 2,
    paus: 3,
    ouros: 4,
  };
  return [...hand].sort((a, b) => {
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.strength - b.strength;
  });
}

/**
 * Checks if a card is legally playable, accounting for:
 * 1. Phase 2 mandatory suit-following (if enabled)
 * 2. Dom Pedro I's "Grito do Ipiranga" coercion (forces playing the highest-point valid card)
 */
export function isCardPlayable(
  card: Card,
  hand: Card[],
  leadCard: Card | null,
  stockCount: number,
  mustFollowSuitInEndgame: boolean,
  isCoercedByGrito: boolean = false
): boolean {
  // Step 1: Determine base suit-eligible cards
  let eligibleCards = hand;
  if (leadCard && stockCount === 0 && mustFollowSuitInEndgame) {
    const sameSuitCards = hand.filter((c) => c.suit === leadCard.suit);
    if (sameSuitCards.length > 0) {
      eligibleCards = sameSuitCards;
    }
  }

  if (!eligibleCards.some((c) => c.id === card.id)) {
    return false;
  }

  // Step 2: If coerced by Dom Pedro I's "Grito do Ipiranga", must play highest point card (tie-break by strength)
  if (isCoercedByGrito && eligibleCards.length > 1) {
    const maxPoints = Math.max(...eligibleCards.map((c) => c.points));
    const highestPointCards = eligibleCards.filter(
      (c) => c.points === maxPoints
    );
    const maxStrength = Math.max(...highestPointCards.map((c) => c.strength));
    return card.points === maxPoints && card.strength === maxStrength;
  }

  return true;
}

export function canSwapTwoOfTrump(
  hand: Card[],
  trumpCard: Card | null,
  stockCount: number,
  isLeadingTurn: boolean
): boolean {
  if (!isLeadingTurn || !trumpCard || stockCount <= 1) return false;
  if (trumpCard.rank === '2') return false;
  return hand.some((c) => c.suit === trumpCard.suit && c.rank === '2');
}

export function evaluateTrick(
  leadCard: Card,
  responseCard: Card,
  leadPlayer: TurnOwner,
  trumpSuit: Suit,
  pointMultiplier: number = 1
): {
  winner: TurnOwner;
  basePoints: number;
  points: number;
  bonusPointsAwarded: number;
  reason: string;
} {
  const responsePlayer: TurnOwner = leadPlayer === 'player' ? 'bot' : 'player';
  const basePoints = leadCard.points + responseCard.points;

  // When Imperatriz Leopoldina's Decreto Soberano (2x) is active:
  // If basePoints > 0, double them; if basePoints === 0, grant a sovereign floor of +6 bonus pts so the power is never wasted
  const totalPoints =
    pointMultiplier > 1
      ? basePoints > 0
        ? basePoints * pointMultiplier
        : 6
      : basePoints;
  const bonusPointsAwarded = totalPoints - basePoints;

  const leadIsTrump = leadCard.suit === trumpSuit;
  const respIsTrump = responseCard.suit === trumpSuit;

  if (leadCard.suit === responseCard.suit) {
    if (responseCard.strength > leadCard.strength) {
      return {
        winner: responsePlayer,
        basePoints,
        points: totalPoints,
        bonusPointsAwarded,
        reason: leadIsTrump
          ? `Sobrecorte! ${getRankName(responseCard.rank)} supera ${getRankName(leadCard.rank)} no Trunfo`
          : `${getRankName(responseCard.rank)} supera ${getRankName(leadCard.rank)} em ${SUIT_INFO[leadCard.suit].name}`,
      };
    } else {
      return {
        winner: leadPlayer,
        basePoints,
        points: totalPoints,
        bonusPointsAwarded,
        reason: leadIsTrump
          ? `${getRankName(leadCard.rank)} mantém a força no Trunfo`
          : `${getRankName(leadCard.rank)} domina em ${SUIT_INFO[leadCard.suit].name}`,
      };
    }
  }

  if (respIsTrump && !leadIsTrump) {
    return {
      winner: responsePlayer,
      basePoints,
      points: totalPoints,
      bonusPointsAwarded,
      reason: `Cortou com Trunfo (${getRankName(responseCard.rank)} de ${SUIT_INFO[responseCard.suit].name})`,
    };
  }

  return {
    winner: leadPlayer,
    basePoints,
    points: totalPoints,
    bonusPointsAwarded,
    reason: `${SUIT_INFO[responseCard.suit].name} não acompanha ${SUIT_INFO[leadCard.suit].name}`,
  };
}

/**
 * 1. REGRAS DA BARRA DE FORÇA (ÍMPETO - 0 a 100 PI)
 * - Sobrecorte com pontuação (+50 PI): Jogar um trunfo mais alto sobre outro trunfo em uma rodada que contenha bisca (Ás/7) ou figura (K/J/Q).
 * - Corte simples em bisca (+30 PI): Usar trunfo para capturar Ás ou Sete adversário.
 * - Vazada de valor elevado (+15 PI): Vencer rodada com soma >= 14 pts sem usar trunfo.
 * - Corte comum (+10 PI): Qualquer outro corte com trunfo.
 */
export function calculateImpetoCharge(
  leadCard: Card,
  responseCard: Card,
  leadPlayer: TurnOwner,
  winner: TurnOwner,
  trumpSuit: Suit
): ImpetoChargeResult {
  const responsePlayer: TurnOwner = leadPlayer === 'player' ? 'bot' : 'player';
  const leadIsTrump = leadCard.suit === trumpSuit;
  const respIsTrump = responseCard.suit === trumpSuit;
  const basePoints = leadCard.points + responseCard.points;
  const hasBiscaOrFigure =
    leadCard.points >= 2 || responseCard.points >= 2; // Q(2), J(3), K(4), 7(10), A(11)

  let delta = 0;
  let chargeLabel: string | null = null;
  let chargedOwner: TurnOwner | null = null;

  // Condition 1: Sobrecorte com pontuação (+50 PI)
  // Both cards are Trump, response card is higher Trump, and trick contains Bisca (A/7) or Figure (K/J/Q)
  if (
    leadIsTrump &&
    respIsTrump &&
    responseCard.strength > leadCard.strength &&
    hasBiscaOrFigure
  ) {
    delta = 50;
    chargedOwner = responsePlayer;
    chargeLabel = '+50 PI · Sobrecorte Imperial!';
  }
  // Condition 2: Corte simples em bisca (+30 PI)
  // Using a Trump to cut and capture an opponent's Ace (11) or Seven (10)
  else if (
    !leadIsTrump &&
    respIsTrump &&
    (leadCard.rank === 'A' || leadCard.rank === '7')
  ) {
    delta = 30;
    chargedOwner = responsePlayer;
    chargeLabel = '+30 PI · Corte em Bisca/Ás!';
  }
  // Also check if lead player led a Trump and captured opponent's discarded Ace or 7
  else if (
    leadIsTrump &&
    !respIsTrump &&
    winner === leadPlayer &&
    (responseCard.rank === 'A' || responseCard.rank === '7')
  ) {
    delta = 30;
    chargedOwner = leadPlayer;
    chargeLabel = '+30 PI · Captura de Bisca no Trunfo!';
  }
  // Condition 3: Vazada de valor elevado (+15 PI)
  // Winning a trick with sum >= 14 pts WITHOUT using Trump
  else if (!leadIsTrump && !respIsTrump && basePoints >= 14) {
    delta = 15;
    chargedOwner = winner;
    chargeLabel = '+15 PI · Vazada de Valor Elevado!';
  }
  // Condition 4: Corte comum (+10 PI)
  // Any other cut with Trump (or overtrump without figures)
  else if (
    (!leadIsTrump && respIsTrump) ||
    (leadIsTrump && respIsTrump && responseCard.strength > leadCard.strength)
  ) {
    delta = 10;
    chargedOwner = responsePlayer;
    chargeLabel = '+10 PI · Corte de Trunfo!';
  }

  return {
    playerDelta: chargedOwner === 'player' ? delta : 0,
    botDelta: chargedOwner === 'bot' ? delta : 0,
    chargeLabel,
    chargedOwner,
  };
}

/**
 * Tactical AI Decision Engine for Imperial Brazil Personalities
 *
 * `botMood` reflects the psychological effect of a player taunt on the current
 * trick ("vaza"):
 * - PROVOKED (Dom Pedro I, 45% on 'coroa'/'trunfo_bluff'): impulsive — burns a
 *   trump or a high card even when the trick is worth nothing.
 * - CAUTIOUS (Leopoldina/Isabel, 35% on 'trunfo_bluff'): hoards Aces/7s and
 *   refuses to play 10/11-point cards, suspecting an ambush.
 * - Bonifácio & Dom Pedro II are immune to bluffs (never receive a mood).
 */
export function chooseBotCard(
  botHand: Card[],
  leadCard: Card | null,
  trumpSuit: Suit,
  stockCount: number,
  mustFollowSuitInEndgame: boolean,
  opponentId: OpponentId,
  playedCardsHistory: Card[],
  isCoercedByGrito: boolean = false,
  botMood: BotMood = 'NORMAL'
): Card {
  let validCards = botHand.filter((c) =>
    isCardPlayable(
      c,
      botHand,
      leadCard,
      stockCount,
      mustFollowSuitInEndgame,
      isCoercedByGrito
    )
  );

  if (validCards.length === 0) {
    return botHand[0];
  }

  if (validCards.length === 1) {
    return validCards[0];
  }

  // CAUTIOUS: never spend an Ace (11) or Bisca (10) while suspicious — keep
  // every other legal card in play until the ambush reveals itself.
  if (
    botMood === 'CAUTIOUS' &&
    (opponentId === 'leopoldina' || opponentId === 'isabel')
  ) {
    const carefulCards = validCards.filter((c) => c.points < 10);
    if (carefulCards.length > 0) {
      validCards = carefulCards;
    }
  }

  // 1. Dom Pedro I: Impetuous, aggressive
  if (opponentId === 'pedro_i') {
    // PROVOKED: the taunt worked — he cuts with trump or slams a high card
    // even when the lead is worth zero points.
    if (botMood === 'PROVOKED') {
      if (!leadCard) {
        const bosses = validCards.filter(
          (c) => c.rank === 'A' || c.rank === '7'
        );
        if (bosses.length > 0) {
          return bosses.sort((a, b) => b.points - a.points)[0];
        }
        return [...validCards].sort(
          (a, b) => b.points - a.points || b.strength - a.strength
        )[0];
      }
      const furiousCuts = validCards.filter(
        (c) =>
          c.suit === trumpSuit &&
          leadCard.suit !== trumpSuit &&
          evaluateTrick(leadCard, c, 'player', trumpSuit).winner === 'bot'
      );
      if (furiousCuts.length > 0) {
        return furiousCuts.sort((a, b) => b.strength - a.strength)[0];
      }
      return [...validCards].sort(
        (a, b) => b.points - a.points || b.strength - a.strength
      )[0];
    }

    if (!leadCard) {
      const nonTrumps = validCards.filter((c) => c.suit !== trumpSuit);
      const courtOrLow = nonTrumps.filter((c) => c.points <= 4);
      const pool =
        courtOrLow.length > 0
          ? courtOrLow
          : nonTrumps.length > 0
          ? nonTrumps
          : validCards;
      return pool[Math.floor(Math.random() * pool.length)];
    } else {
      const winningMoves = validCards.filter(
        (c) => evaluateTrick(leadCard, c, 'player', trumpSuit).winner === 'bot'
      );
      if (winningMoves.length > 0 && leadCard.points >= 2) {
        return winningMoves.sort(
          (a, b) => b.points - a.points || a.strength - b.strength
        )[0];
      }
      return [...validCards].sort(
        (a, b) => a.points - b.points || a.strength - b.strength
      )[0];
    }
  }

  // Strategic & Master Imperial AIs (Leopoldina, Isabel, Bonifácio, Dom Pedro II)
  const isFinalPhase = stockCount === 0;
  const isMasterTier = opponentId === 'bonifacio' || opponentId === 'pedro_ii';

  if (!leadCard) {
    const nonTrumps = validCards.filter((c) => c.suit !== trumpSuit);
    const lowNonTrumps = nonTrumps.filter((c) => c.points === 0);

    if (!isFinalPhase) {
      if (lowNonTrumps.length > 0) {
        return lowNonTrumps.sort((a, b) => a.strength - b.strength)[0];
      }
      const figuresNonTrump = nonTrumps.filter(
        (c) => c.points > 0 && c.points <= 4
      );
      if (figuresNonTrump.length > 0) {
        return figuresNonTrump.sort((a, b) => a.points - b.points)[0];
      }
      const lowTrumps = validCards.filter(
        (c) => c.suit === trumpSuit && c.points === 0
      );
      if (lowTrumps.length > 0) {
        return lowTrumps.sort((a, b) => a.strength - b.strength)[0];
      }
    } else {
      if (isMasterTier) {
        const highNonTrumps = nonTrumps.filter(
          (c) => c.rank === 'A' || c.rank === '7'
        );
        for (const boss of highNonTrumps) {
          if (boss.rank === 'A') {
            return boss;
          }
          if (
            boss.rank === '7' &&
            playedCardsHistory.some(
              (p) => p.suit === boss.suit && p.rank === 'A'
            )
          ) {
            return boss;
          }
        }
      }
      if (lowNonTrumps.length > 0) {
        return lowNonTrumps.sort((a, b) => a.strength - b.strength)[0];
      }
    }

    return [...validCards].sort((a, b) => {
      const aTrump = a.suit === trumpSuit ? 1 : 0;
      const bTrump = b.suit === trumpSuit ? 1 : 0;
      if (a.points !== b.points) return a.points - b.points;
      if (aTrump !== bTrump) return aTrump - bTrump;
      return a.strength - b.strength;
    })[0];
  } else {
    const winningCards = validCards.filter(
      (c) => evaluateTrick(leadCard, c, 'player', trumpSuit).winner === 'bot'
    );
    const losingCards = validCards.filter(
      (c) => evaluateTrick(leadCard, c, 'player', trumpSuit).winner === 'player'
    );

    const sameSuitWinners = winningCards.filter(
      (c) => c.suit === leadCard.suit
    );
    const trumpCutWinners = winningCards.filter(
      (c) => c.suit === trumpSuit && leadCard.suit !== trumpSuit
    );

    if (sameSuitWinners.length > 0) {
      if (leadCard.suit !== trumpSuit) {
        return sameSuitWinners.sort(
          (a, b) => b.points - a.points || a.strength - b.strength
        )[0];
      } else {
        if (leadCard.points >= 3 || isFinalPhase) {
          return sameSuitWinners.sort((a, b) => a.strength - b.strength)[0];
        }
      }
    }

    if (trumpCutWinners.length > 0) {
      const minPointsToCut =
        opponentId === 'pedro_ii' ? 4 : opponentId === 'bonifacio' ? 3 : 3;

      if (leadCard.points >= 10) {
        return trumpCutWinners.sort(
          (a, b) => a.points - b.points || a.strength - b.strength
        )[0];
      }
      if (leadCard.points >= minPointsToCut) {
        const cheapTrumps = trumpCutWinners.filter((c) => c.points <= 4);
        if (cheapTrumps.length > 0) {
          return cheapTrumps.sort((a, b) => a.strength - b.strength)[0];
        }
        if (isFinalPhase) {
          return trumpCutWinners.sort((a, b) => a.strength - b.strength)[0];
        }
      }
    }

    const pool = losingCards.length > 0 ? losingCards : validCards;
    return [...pool].sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points;
      const aTrump = a.suit === trumpSuit ? 1 : 0;
      const bTrump = b.suit === trumpSuit ? 1 : 0;
      if (aTrump !== bTrump) return aTrump - bTrump;
      return a.strength - b.strength;
    })[0];
  }
}

export function computeRoundSummary(
  playerCaptured: Card[],
  botCaptured: Card[],
  playerBonusPoints: number = 0,
  botBonusPoints: number = 0
): RoundSummaryData {
  const playerPoints =
    playerCaptured.reduce((sum, c) => sum + c.points, 0) + playerBonusPoints;
  const botPoints =
    botCaptured.reduce((sum, c) => sum + c.points, 0) + botBonusPoints;

  const playerBiscasAndAces = playerCaptured.filter(
    (c) => c.rank === 'A' || c.rank === '7'
  );
  const botBiscasAndAces = botCaptured.filter(
    (c) => c.rank === 'A' || c.rank === '7'
  );

  if (playerPoints === botPoints) {
    return {
      playerPoints,
      botPoints,
      winner: 'draw',
      tentosAwarded: 0,
      outcomeType: 'empate',
      outcomeTitle: `Mão Empatada no Paço (${playerPoints} a ${botPoints})`,
      outcomeDescription:
        'Equilíbrio diplomático absoluto no Salão Imperial. Nenhum tento concedido nesta mão.',
      playerBiscasAndAces,
      botBiscasAndAces,
    };
  }

  const isPlayerWinner = playerPoints > botPoints;
  const winnerPoints = isPlayerWinner ? playerPoints : botPoints;
  const loserPoints = isPlayerWinner ? botPoints : playerPoints;
  const winner: 'player' | 'bot' = isPlayerWinner ? 'player' : 'bot';

  if (winnerPoints >= 120 && loserPoints === 0) {
    return {
      playerPoints,
      botPoints,
      winner,
      tentosAwarded: 4,
      outcomeType: 'bandeira',
      outcomeTitle: isPlayerWinner
        ? `Bandeira Imperial! (${playerPoints} Pontos)`
        : `Bandeira da Corte (${botPoints} Pontos)`,
      outcomeDescription: isPlayerWinner
        ? 'Triunfo histórico! Você confiscou todos os pontos da mesa e venceu a partida imediatamente!'
        : 'A Corte Imperial capturou todos os pontos da mão.',
      playerBiscasAndAces,
      botBiscasAndAces,
    };
  }

  if (winnerPoints >= 91) {
    return {
      playerPoints,
      botPoints,
      winner,
      tentosAwarded: 2,
      outcomeTitle: isPlayerWinner
        ? `Capote Imperial Aplicado! (${playerPoints} pts)`
        : `Capote Sofrido na Corte (${botPoints} pts)`,
      outcomeType: 'capote',
      outcomeDescription: isPlayerWinner
        ? 'Mais de 90 pontos acumulados! Vitória soberana que vale 2 tentos de uma só vez.'
        : 'O adversário superou 90 pontos e conquistou 2 tentos imperiais.',
      playerBiscasAndAces,
      botBiscasAndAces,
    };
  }

  return {
    playerPoints,
    botPoints,
    winner,
    tentosAwarded: 1,
    outcomeType: 'simples',
    outcomeTitle: isPlayerWinner
      ? `Vitória no Salão (${playerPoints} pts)`
      : `Mão da Corte (${botPoints} pts)`,
    outcomeDescription: isPlayerWinner
      ? 'Você superou a pontuação adversária e cravou 1 tento imperial na partida.'
      : 'O adversário superou sua pontuação e anotou 1 tento na partida.',
    playerBiscasAndAces,
    botBiscasAndAces,
  };
}
