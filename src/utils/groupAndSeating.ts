import { GroupTeam, SeatingPreset, DeskPosition, StudentGender } from '../types';

export interface StudentInfo {
  name: string;
  gender: StudentGender;
  isFrontPreferred?: boolean;
}

export interface SeparatePair {
  student1: string;
  student2: string;
}

export const THEME_NAMES: Record<string, string[]> = {
  numbers: ['1모둠', '2모둠', '3모둠', '4모둠', '5모둠', '6모둠', '7모둠', '8모둠', '9모둠', '10모둠'],
  fruits: ['사과🍎 모둠', '딸기🍓 모둠', '바나나🍌 모둠', '포도🍇 모둠', '오렌지🍊 모둠', '수박🍉 모둠', '복숭아🍑 모둠', '체리🍒 모둠'],
  animals: ['호랑이🐯 모둠', '사자🦁 모둠', '판다🐼 모둠', '토끼🐰 모둠', '돌고래🐬 모둠', '독수리🦅 모둠', '북극곰🐻 모둠', '여우🦊 모둠'],
  planets: ['수성☿ 모둠', '금성♀ 모둠', '지구♁ 모둠', '화성♂ 모둠', '목성♃ 모둠', '토성♄ 모둠', '천왕성♅ 모둠', '해왕성♆ 모둠'],
  colors: ['빨강 빨강❤️ 모둠', '주황 주황🧡 모둠', '노랑 노랑💛 모둠', '초록 초록💚 모둠', '파랑 파랑💙 모둠', '보라 보라💜 모둠'],
};

export const GROUP_COLORS = [
  'bg-rose-50 border-rose-200 text-rose-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-sky-50 border-sky-200 text-sky-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-orange-50 border-orange-200 text-orange-800',
];

// Shuffle helper
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate Groups Algorithm with Constraints
export function formGroups({
  students,
  mode,
  targetCount,
  balanceGender,
  genderMap,
  separatePairs,
  pickLeader,
  theme,
}: {
  students: string[];
  mode: 'byGroupSize' | 'byGroupCount';
  targetCount: number; // size per group or total groups
  balanceGender: boolean;
  genderMap: Record<string, StudentGender>;
  separatePairs: SeparatePair[];
  pickLeader: boolean;
  theme: string;
}): GroupTeam[] {
  if (students.length === 0) return [];

  // Determine number of groups
  let numGroups = 1;
  if (mode === 'byGroupSize') {
    const size = Math.max(1, targetCount);
    numGroups = Math.max(1, Math.ceil(students.length / size));
  } else {
    numGroups = Math.max(1, Math.min(targetCount, students.length));
  }

  const themeList = THEME_NAMES[theme] || THEME_NAMES.numbers;

  // Run multiple shuffle attempts to satisfy separate pairs constraint
  const MAX_ATTEMPTS = 50;
  let bestGroups: string[][] = [];
  let minConflicts = Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidateGroups: string[][] = Array.from({ length: numGroups }, () => []);

    if (balanceGender) {
      const males = shuffleArray(students.filter((s) => genderMap[s] === 'M'));
      const females = shuffleArray(students.filter((s) => genderMap[s] === 'F'));
      const others = shuffleArray(students.filter((s) => !genderMap[s] || genderMap[s] === 'none'));

      // Distribute males
      males.forEach((m, idx) => {
        candidateGroups[idx % numGroups].push(m);
      });
      // Distribute females (reverse order for even mixing)
      females.forEach((f, idx) => {
        candidateGroups[(numGroups - 1 - (idx % numGroups))]?.push(f);
      });
      // Distribute others to smallest groups
      others.forEach((o) => {
        let minIdx = 0;
        for (let i = 1; i < numGroups; i++) {
          if (candidateGroups[i].length < candidateGroups[minIdx].length) {
            minIdx = i;
          }
        }
        candidateGroups[minIdx].push(o);
      });
    } else {
      const shuffled = shuffleArray(students);
      shuffled.forEach((s, idx) => {
        candidateGroups[idx % numGroups].push(s);
      });
    }

    // Count conflicts with separate pairs
    let conflicts = 0;
    for (const pair of separatePairs) {
      if (!pair.student1 || !pair.student2) continue;
      for (const group of candidateGroups) {
        if (group.includes(pair.student1) && group.includes(pair.student2)) {
          conflicts++;
        }
      }
    }

    if (conflicts === 0) {
      bestGroups = candidateGroups;
      break;
    } else if (conflicts < minConflicts) {
      minConflicts = conflicts;
      bestGroups = candidateGroups;
    }
  }

  // Build GroupTeam objects
  return bestGroups.map((members, idx) => {
    const color = GROUP_COLORS[idx % GROUP_COLORS.length];
    const defaultName = themeList[idx] || `${idx + 1}모둠`;
    let leader: string | undefined = undefined;
    if (pickLeader && members.length > 0) {
      const randomLeaderIdx = Math.floor(Math.random() * members.length);
      leader = members[randomLeaderIdx];
    }
    return {
      id: `group_${idx + 1}`,
      name: defaultName,
      color,
      leader,
      members,
    };
  });
}

// Generate Desks Layout based on Preset
export function generateDeskLayout({
  preset,
  cols = 6,
  rows = 5,
  totalStudents = 25,
}: {
  preset: SeatingPreset;
  cols?: number;
  rows?: number;
  totalStudents?: number;
}): DeskPosition[] {
  const desks: DeskPosition[] = [];

  if (preset === 'rows') {
    // Standard rows x cols with center aisle if cols >= 4
    let idCounter = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        desks.push({
          id: `desk_${r}_${c}`,
          label: `${r + 1}열-${c + 1}`,
          row: r,
          col: c,
          section: c < Math.ceil(cols / 2) ? '1분단' : '2분단',
        });
        idCounter++;
      }
    }
  } else if (preset === 'pairs') {
    // 2-person paired desks (e.g. 3 pairs = 6 columns, with gap between pairs)
    const pairCount = Math.max(1, Math.floor(cols / 2));
    for (let r = 0; r < rows; r++) {
      for (let p = 0; p < pairCount; p++) {
        // Left desk of pair
        desks.push({
          id: `desk_${r}_${p * 2}`,
          label: `${r + 1}줄 ${p + 1}분단 좌`,
          row: r,
          col: p * 2,
          section: `${p + 1}분단`,
        });
        // Right desk of pair
        desks.push({
          id: `desk_${r}_${p * 2 + 1}`,
          label: `${r + 1}줄 ${p + 1}분단 우`,
          row: r,
          col: p * 2 + 1,
          section: `${p + 1}분단`,
        });
      }
    }
  } else if (preset === 'horseshoe') {
    // U-shaped / Horseshoe layout
    // Top row (back), Left column, Right column
    const depth = Math.max(3, rows);
    const width = Math.max(4, cols);

    // Back row (facing front)
    for (let c = 0; c < width; c++) {
      desks.push({
        id: `desk_back_${c}`,
        label: `뒷줄-${c + 1}`,
        row: depth - 1,
        col: c,
        section: '중앙',
      });
    }

    // Left wing
    for (let r = 0; r < depth - 1; r++) {
      desks.push({
        id: `desk_left_${r}`,
        label: `좌측-${r + 1}`,
        row: r,
        col: 0,
        section: '좌측',
      });
    }

    // Right wing
    for (let r = 0; r < depth - 1; r++) {
      desks.push({
        id: `desk_right_${r}`,
        label: `우측-${r + 1}`,
        row: r,
        col: width - 1,
        section: '우측',
      });
    }
  } else if (preset === 'groups') {
    // Group islands: 4 or 6 desks facing each other
    // e.g. 6 group islands (2 columns x 3 rows of islands)
    const islandRows = 3;
    const islandCols = 2;
    for (let ir = 0; ir < islandRows; ir++) {
      for (let ic = 0; ic < islandCols; ic++) {
        const groupNum = ir * islandCols + ic + 1;
        // 4 desks in island
        const baseRow = ir * 2;
        const baseCol = ic * 3;
        desks.push({ id: `desk_g${groupNum}_1`, label: `${groupNum}모둠 1`, row: baseRow, col: baseCol, section: `${groupNum}모둠` });
        desks.push({ id: `desk_g${groupNum}_2`, label: `${groupNum}모둠 2`, row: baseRow, col: baseCol + 1, section: `${groupNum}모둠` });
        desks.push({ id: `desk_g${groupNum}_3`, label: `${groupNum}모둠 3`, row: baseRow + 1, col: baseCol, section: `${groupNum}모둠` });
        desks.push({ id: `desk_g${groupNum}_4`, label: `${groupNum}모둠 4`, row: baseRow + 1, col: baseCol + 1, section: `${groupNum}모둠` });
      }
    }
  } else if (preset === 'custom') {
    // Default initial arrangement for custom drag mode
    const count = totalStudents > 0 ? totalStudents : 24;
    const colsCount = 6;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / colsCount);
      const c = i % colsCount;
      desks.push({
        id: `desk_custom_${i + 1}`,
        label: `책상 ${i + 1}`,
        row: r,
        col: c,
        x: 30 + c * 135,
        y: 20 + r * 95,
      });
    }
  }

  return desks;
}

// Generate default custom free-position desks for N students
export function generateDefaultCustomDesks(
  count: number,
  colsCount: number = 6
): DeskPosition[] {
  const desks: DeskPosition[] = [];
  const targetCount = count > 0 ? count : 20;
  for (let i = 0; i < targetCount; i++) {
    const r = Math.floor(i / colsCount);
    const c = i % colsCount;
    desks.push({
      id: `desk_custom_${Date.now()}_${i}`,
      label: `책상 ${i + 1}`,
      row: r,
      col: c,
      x: 30 + c * 135,
      y: 20 + r * 95,
    });
  }
  return desks;
}

// Convert any preset desks into free-drag (x, y) coordinates
export function convertPresetToCustomDesks(presetDesks: DeskPosition[]): DeskPosition[] {
  return presetDesks.map((d, i) => ({
    ...d,
    id: d.id.startsWith('desk_custom_') ? d.id : `desk_custom_${d.id}`,
    x: d.x !== undefined ? d.x : 30 + d.col * 135,
    y: d.y !== undefined ? d.y : 20 + d.row * 95,
  }));
}

// Arrange students into desks respecting constraints
export function assignStudentsToDesks({
  students,
  desks,
  frontPreferred = [],
  separatePairs = [],
}: {
  students: string[];
  desks: DeskPosition[];
  frontPreferred?: string[];
  separatePairs?: SeparatePair[];
}): Record<string, string> {
  const assignment: Record<string, string> = {};
  if (students.length === 0 || desks.length === 0) return assignment;

  // Front row desks: lower y or lower row index
  const sortedDesks = [...desks].sort((a, b) => {
    if (a.y !== undefined && b.y !== undefined) {
      // In custom free positioning, sort primarily by vertical coordinate Y (closer to blackboard)
      return a.y - b.y || (a.x ?? 0) - (b.x ?? 0);
    }
    return a.row - b.row || a.col - b.col;
  });

  // Separate front students and others
  const frontSet = new Set(frontPreferred);
  const frontStudents = shuffleArray(students.filter((s) => frontSet.has(s)));
  const normalStudents = shuffleArray(students.filter((s) => !frontSet.has(s)));

  const usedDeskIds = new Set<string>();

  // Assign front students to lowest row desks first
  frontStudents.forEach((student, idx) => {
    if (idx < sortedDesks.length) {
      const desk = sortedDesks[idx];
      assignment[desk.id] = student;
      usedDeskIds.add(desk.id);
    }
  });

  // Remaining desks for normal students
  const remainingDesks = sortedDesks.filter((d) => !usedDeskIds.has(d.id));
  const shuffledRemainingDesks = shuffleArray(remainingDesks);

  normalStudents.forEach((student, idx) => {
    if (idx < shuffledRemainingDesks.length) {
      const desk = shuffledRemainingDesks[idx];
      assignment[desk.id] = student;
    }
  });

  return assignment;
}
