export type AppTab = 'roulette' | 'relay' | 'photo' | 'ladder' | 'group' | 'timer' | 'stopwatch';

export interface Student {
  id: string;
  name: string;
  photoUrl?: string;
  isExcluded?: boolean;
}

export interface LapRecord {
  id: number;
  lapTime: string;
  timestamp: number;
}

export interface PhotoCardItem {
  id: string;
  name: string;
  photoUrl: string;
  isExcluded?: boolean;
  pickedCount?: number;
}

export type StudentGender = 'M' | 'F' | 'none';

export interface GroupTeam {
  id: string;
  name: string;
  color: string;
  leader?: string;
  members: string[];
}

export type SeatingPreset = 'pairs' | 'rows' | 'horseshoe' | 'groups' | 'custom';

export interface DeskPosition {
  id: string;
  label?: string;
  studentName?: string;
  row: number;
  col: number;
  section?: string;
  isAisle?: boolean;
  x?: number;
  y?: number;
}
