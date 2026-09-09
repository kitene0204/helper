export type AppTab = 'roulette' | 'relay' | 'photo' | 'timer' | 'stopwatch';

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
