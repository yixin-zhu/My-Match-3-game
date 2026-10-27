export const SLOT_CAPACITY = 7;

export interface Tile {
  id: number;
  type: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
}

export interface GameState {
  tiles: readonly Tile[];
  slot: readonly number[];
  cleared: ReadonlySet<number>;
}

export type Status = "playing" | "won" | "lost";
