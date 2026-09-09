export type BridgeType =
  | 'horizontal'
  | 'diagonal_down_right'
  | 'diagonal_down_left';

export interface LadderBridge {
  id: string;
  col: number; // starts between col and col + 1
  level: number; // start level (0 to levels - 1)
  type?: BridgeType; // default 'horizontal'
}

export interface LadderPathPoint {
  x: number; // pixel or ratio
  y: number;
  col: number;
  level: number;
}

export interface LadderTheme {
  id: string;
  name: string;
  icon: string;
  items: string[];
}

export const LADDER_PRESET_THEMES: LadderTheme[] = [
  {
    id: 'cleaning',
    name: '청소 구역 정하기',
    icon: '🧹',
    items: [
      '칠판 & 분필 닦기',
      '바닥 빗자루 쓸기',
      '바닥 대걸레 밀기',
      '쓰레기통 비우기',
      '창문 & 창틀 닦기',
      '교탁 & 교실 앞 정리',
      '분리수거함 정리',
      '우유갑 정리하기',
      '사물함 위 닦기',
      '🎉 1분 청소 면제권!',
      '복도 쓸기',
      '청소 검사 반장',
    ],
  },
  {
    id: 'snack',
    name: '간식 & 행운 뽑기',
    icon: '🎁',
    items: [
      '달콤한 초콜릿 🍫',
      '상큼한 사탕 🍬',
      '과일맛 젤리 🍇',
      '바삭한 쿠키 🍪',
      '과자 선물 🥨',
      '✨ 특급 대박 간식 세트!',
      '비타민 캔디 🍋',
      '꽝 (다음 기회에 😢)',
      '꽝 (친구에게 양보 👏)',
      '비밀 깜짝 선물 🎀',
      '선생님의 하이파이브 ✋',
      '꽝 (행운 충전 중 🔋)',
    ],
  },
  {
    id: 'mission',
    name: '발표 & 재미 미션',
    icon: '🎯',
    items: [
      '교과서 한 문단 읽기',
      '교재 다음 문제 풀기',
      '옆 짝꿍 멋진 점 칭찬하기',
      '선생님께 퀴즈 하나 내기',
      '오늘의 기분 세 글자로 말하기',
      '귀여운 하트 포즈 취하기',
      '좋아하는 노래 한 소절 흥얼거리기',
      '🌟 행운의 미션 프리패스!',
      '친구와 가위바위보 이기기',
      '오늘 가장 감사한 일 말하기',
      '칠판에 내 이름 멋지게 쓰기',
      '선생님과 신나는 가위바위보',
    ],
  },
  {
    id: 'role',
    name: '학급 1일 역할 분담',
    icon: '👑',
    items: [
      '오늘의 줄서기 대장',
      '급식 지도 도우미',
      '우유 나누기 도우미',
      '칠판 지우개 털기 도우미',
      '소등 & 에너지 지킴이',
      '교실 환기 담당',
      '체육 시간 공 챙기기',
      '도서 코너 정리 도우미',
      '선생님 심부름 특공대',
      '👑 1일 자유 이용권',
      '시간 알리미 (종치면 알려주기)',
      '출석부 챙기기',
    ],
  },
  {
    id: 'win_lose',
    name: '당첨과 꽝 (심플)',
    icon: '⚡',
    items: [
      '🎉 당 첨 !',
      '꽝 !',
      '꽝 !',
      '🎉 당 첨 !',
      '꽝 !',
      '꽝 !',
      '🎉 당 첨 !',
      '꽝 !',
      '꽝 !',
      '🎉 당 첨 !',
      '꽝 !',
      '꽝 !',
    ],
  },
  {
    id: 'ranks',
    name: '순위 & 등수 매기기',
    icon: '🏆',
    items: [
      '🥇 1등 (최우수)',
      '🥈 2등 (우수)',
      '🥉 3등 (장려)',
      '4등',
      '5등',
      '6등',
      '7등',
      '8등',
      '9등',
      '10등',
      '11등',
      '12등',
    ],
  },
];

/**
 * Generates random bridges for an Amidakuji ladder.
 * Ensures:
 * 1. Two adjacent bridges do not share the exact same level.
 * 2. Every column has at least some crossings.
 */
export function generateLadderBridges(
  numCols: number,
  levels: number = 10
): LadderBridge[] {
  if (numCols < 2) return [];

  const bridges: LadderBridge[] = [];
  // bridgeMap[level][col] indicates if a bridge exists between col and col+1 at this level
  const bridgeMap: boolean[][] = Array.from({ length: levels }, () =>
    Array(numCols - 1).fill(false)
  );

  // For each level, randomly add bridges with constraint
  for (let l = 0; l < levels; l++) {
    for (let c = 0; c < numCols - 1; c++) {
      // Cannot place if adjacent column at same level has a bridge
      const leftAdjacent = c > 0 && bridgeMap[l][c - 1];
      const rightAdjacent = c < numCols - 2 && bridgeMap[l][c + 1];

      if (!leftAdjacent && !rightAdjacent) {
        // Probability of placing a bridge
        const shouldPlace = Math.random() < 0.48;
        if (shouldPlace) {
          bridgeMap[l][c] = true;
          bridges.push({
            id: `b_${l}_${c}`,
            col: c,
            level: l,
          });
        }
      }
    }
  }

  // Ensure each column has at least 1 connection to either left or right
  for (let c = 0; c < numCols; c++) {
    const hasConnection = bridges.some(
      (b) => b.col === c || b.col === c - 1
    );
    if (!hasConnection) {
      // Find a level to insert a bridge
      const targetCol = c < numCols - 1 ? c : c - 1;
      const freeLevel = Array.from({ length: levels }, (_, i) => i).find(
        (l) =>
          !bridgeMap[l][targetCol] &&
          (targetCol === 0 || !bridgeMap[l][targetCol - 1]) &&
          (targetCol >= numCols - 2 || !bridgeMap[l][targetCol + 1])
      );

      if (freeLevel !== undefined) {
        bridgeMap[freeLevel][targetCol] = true;
        bridges.push({
          id: `b_forced_${freeLevel}_${targetCol}`,
          col: targetCol,
          level: freeLevel,
        });
      }
    }
  }

  // Sort bridges by level ascending
  bridges.sort((a, b) => a.level - b.level);
  return bridges;
}

/**
 * Calculates the full trajectory path for a start column in the ladder.
 * Returns array of coordinates (pixel positions) for rendering or animating.
 */
export function traceLadderPath(
  startCol: number,
  numCols: number,
  levels: number,
  bridges: LadderBridge[],
  width: number,
  height: number,
  topPadding: number = 20,
  bottomPadding: number = 20
): { points: { x: number; y: number }[]; endCol: number } {
  if (numCols <= 1) {
    const x = width / 2;
    return {
      points: [
        { x, y: topPadding },
        { x, y: height - bottomPadding },
      ],
      endCol: startCol,
    };
  }

  const colWidth = (width - 60) / (numCols - 1);
  const getColX = (col: number) => 30 + col * colWidth;

  const playableHeight = height - topPadding - bottomPadding;
  const levelHeight = playableHeight / (levels + 1);
  const getLevelY = (level: number) => topPadding + (level + 1) * levelHeight;

  let currentCol = startCol;
  const points: { x: number; y: number }[] = [
    { x: getColX(currentCol), y: topPadding },
  ];

  let l = 0;
  while (l < levels) {
    const y = getLevelY(l);

    // Look for bridges starting at (currentCol, l)
    // 1. Diagonal down-right (↘) starting at (currentCol, l)
    const diagDownRight = bridges.find(
      (b) => b.type === 'diagonal_down_right' && b.level === l && b.col === currentCol
    );
    // 2. Diagonal down-left (↙) starting at (currentCol, l) -> b.col is currentCol - 1
    const diagDownLeft = bridges.find(
      (b) => b.type === 'diagonal_down_left' && b.level === l && b.col === currentCol - 1
    );
    // 3. Horizontal right (-) from currentCol to currentCol + 1
    const rightHoriz = bridges.find(
      (b) => (!b.type || b.type === 'horizontal') && b.level === l && b.col === currentCol
    );
    // 4. Horizontal left (-) from currentCol - 1 to currentCol
    const leftHoriz = bridges.find(
      (b) => (!b.type || b.type === 'horizontal') && b.level === l && b.col === currentCol - 1
    );

    if (diagDownRight && l < levels - 1) {
      const nextY = getLevelY(l + 1);
      const x1 = getColX(currentCol);
      const x2 = getColX(currentCol + 1);
      // Reached start of diagonal slide
      points.push({ x: x1, y });
      // Midpoint for fluid slide animation
      points.push({ x: x1 + (x2 - x1) * 0.5, y: y + (nextY - y) * 0.5 });
      // Arrive at bottom-right of slide
      points.push({ x: x2, y: nextY });
      currentCol = currentCol + 1;
      l++;
    } else if (diagDownLeft && l < levels - 1) {
      const nextY = getLevelY(l + 1);
      const x1 = getColX(currentCol);
      const x2 = getColX(currentCol - 1);
      // Reached start of diagonal slide
      points.push({ x: x1, y });
      // Midpoint for fluid slide animation
      points.push({ x: x1 + (x2 - x1) * 0.5, y: y + (nextY - y) * 0.5 });
      // Arrive at bottom-left of slide
      points.push({ x: x2, y: nextY });
      currentCol = currentCol - 1;
      l++;
    } else if (rightHoriz) {
      points.push({ x: getColX(currentCol), y });
      currentCol = currentCol + 1;
      points.push({ x: getColX(currentCol), y });
      l++;
    } else if (leftHoriz) {
      points.push({ x: getColX(currentCol), y });
      currentCol = currentCol - 1;
      points.push({ x: getColX(currentCol), y });
      l++;
    } else {
      l++;
    }
  }

  // Finally reach bottom
  points.push({ x: getColX(currentCol), y: height - bottomPadding });

  return { points, endCol: currentCol };
}

/**
 * Returns all vertices (column & level) that a bridge connects to.
 */
export function getBridgeEndpoints(
  col: number,
  level: number,
  type: BridgeType = 'horizontal'
): { col: number; level: number }[] {
  if (type === 'diagonal_down_right') {
    return [
      { col, level },
      { col: col + 1, level: level + 1 },
    ];
  }
  if (type === 'diagonal_down_left') {
    return [
      { col: col + 1, level },
      { col, level: level + 1 },
    ];
  }
  // horizontal
  return [
    { col, level },
    { col: col + 1, level },
  ];
}

/**
 * Checks if a bridge can be placed at the given column and level.
 */
export function canPlaceBridge(
  bridges: LadderBridge[],
  col: number,
  level: number,
  type: BridgeType = 'horizontal',
  levelsCount: number = 10
): { allowed: boolean; reason?: string } {
  // If exact same bridge exists at this position, it can be removed/toggled
  const exact = bridges.find(
    (b) => b.col === col && b.level === level && (b.type || 'horizontal') === type
  );
  if (exact) {
    return { allowed: true };
  }

  // Bounds check for diagonal bridges
  if (type !== 'horizontal' && level >= levelsCount - 1) {
    return {
      allowed: false,
      reason: '사다리 맨 아래 층에는 대각선 미끄럼틀을 놓을 수 없어요.',
    };
  }

  // Proposed endpoints
  const proposedEndpoints = getBridgeEndpoints(col, level, type);

  // Check collision against all other bridges (except replacing one at exact col and level)
  const otherBridges = bridges.filter((b) => !(b.col === col && b.level === level));

  for (const b of otherBridges) {
    const bType = b.type || 'horizontal';
    const endpoints = getBridgeEndpoints(b.col, b.level, bType);
    for (const p of proposedEndpoints) {
      if (endpoints.some((ep) => ep.col === p.col && ep.level === p.level)) {
        return {
          allowed: false,
          reason: '다른 다리와 시작/끝점이 겹치는 위치에는 다리를 놓을 수 없어요.',
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Toggles a bridge at a specific column and level (adds if absent, removes if present).
 */
export function toggleBridgeAt(
  bridges: LadderBridge[],
  col: number,
  level: number,
  type: BridgeType = 'horizontal',
  levelsCount: number = 10
): {
  bridges: LadderBridge[];
  action: 'added' | 'removed' | 'replaced' | 'blocked';
  reason?: string;
} {
  const existingIndex = bridges.findIndex(
    (b) => b.col === col && b.level === level
  );

  if (existingIndex !== -1) {
    const existing = bridges[existingIndex];
    const existingType = existing.type || 'horizontal';
    if (existingType === type) {
      // Remove existing bridge
      const newBridges = bridges.filter((_, idx) => idx !== existingIndex);
      return { bridges: newBridges, action: 'removed' };
    }
  }

  // Check if placement is allowed
  const check = canPlaceBridge(bridges, col, level, type, levelsCount);
  if (!check.allowed) {
    return { bridges, action: 'blocked', reason: check.reason };
  }

  // Create new bridge
  const newBridge: LadderBridge = {
    id: `b_custom_${Date.now()}_${col}_${level}_${type}`,
    col,
    level,
    type,
  };

  let newBridges: LadderBridge[];
  let action: 'added' | 'replaced' = 'added';

  if (existingIndex !== -1) {
    newBridges = bridges.map((b, idx) => (idx === existingIndex ? newBridge : b));
    action = 'replaced';
  } else {
    newBridges = [...bridges, newBridge];
  }

  newBridges.sort((a, b) => a.level - b.level);
  return { bridges: newBridges, action };
}

/**
 * Solve results for all participants given current ladder bridges.
 */
export function solveAllLadderMatches(
  participants: string[],
  levels: number,
  bridges: LadderBridge[],
  results: string[]
): {
  student: string;
  startCol: number;
  endCol: number;
  result: string;
}[] {
  return participants.map((student, i) => {
    const { endCol } = traceLadderPath(
      i,
      participants.length,
      levels,
      bridges,
      1000,
      1000
    );
    const safeEndCol = Math.max(0, Math.min(endCol, results.length - 1));
    return {
      student,
      startCol: i,
      endCol: safeEndCol,
      result: results[safeEndCol] || `항목 ${safeEndCol + 1}`,
    };
  });
}
