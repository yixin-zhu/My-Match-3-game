import { SLOT_CAPACITY, type GameState, type Status, type Tile } from "./types";

export function createState(tiles: readonly Tile[]): GameState {
  return { tiles, slot: [], cleared: new Set() };
}

export function overlaps(a: Tile, b: Tile): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function tileById(state: GameState, id: number): Tile {
  const tile = state.tiles[id];
  if (!tile || tile.id !== id) throw new Error("牌的编号不连续");
  return tile;
}

function isGone(state: GameState, id: number): boolean {
  return state.cleared.has(id) || state.slot.includes(id);
}

/** present 是还留在牌桌上的牌。只有更高层压住它时才算被挡住，同层互不遮挡。 */
export function isFreeAmong(tiles: readonly Tile[], id: number, present: ReadonlySet<number>): boolean {
  const tile = tiles[id];
  if (!tile || tile.id !== id) throw new Error("牌的编号不连续");
  if (!present.has(id)) return false;
  for (const other of tiles) {
    if (other.id === id || !present.has(other.id)) continue;
    if (other.z > tile.z && overlaps(tile, other)) return false;
  }
  return true;
}

/** 没有更高层的牌压住它，就可以点。同层互不遮挡。 */
export function isExposed(state: GameState, id: number): boolean {
  const present = new Set<number>();
  for (const tile of state.tiles) {
    if (!isGone(state, tile.id)) present.add(tile.id);
  }
  return isFreeAmong(state.tiles, id, present);
}

export function canTake(state: GameState, id: number): boolean {
  if (isGone(state, id)) return false;
  if (statusOf(state) !== "playing") return false;
  return isExposed(state, id);
}

export function clearingIds(state: GameState): number[] {
  const grouped = new Map<number, number[]>();
  for (const id of state.slot) {
    const type = tileById(state, id).type;
    const list = grouped.get(type);
    if (list) list.push(id);
    else grouped.set(type, [id]);
  }
  for (const ids of grouped.values()) {
    if (ids.length >= 3) return ids.slice(0, 3);
  }
  return [];
}

export function statusOf(state: GameState): Status {
  if (state.cleared.size === state.tiles.length) return "won";
  if (clearingIds(state).length > 0) return "playing";
  if (state.slot.length >= SLOT_CAPACITY) return "lost";
  return "playing";
}

/** 把一张牌放进卡槽，先不消除。卡槽里已有待消除的三张时不能再放。 */
export function placeTile(state: GameState, id: number): GameState {
  if (!canTake(state, id)) throw new Error("现在不能拿这张牌");
  return {
    tiles: state.tiles,
    slot: [...state.slot, id],
    cleared: state.cleared,
  };
}

export function clearIds(state: GameState, ids: readonly number[]): GameState {
  const remove = new Set(ids);
  const cleared = new Set(state.cleared);
  for (const id of ids) cleared.add(id);
  return {
    tiles: state.tiles,
    slot: state.slot.filter((id) => !remove.has(id)),
    cleared,
  };
}

/** 放入卡槽并立刻消掉刚凑成的三张。 */
export function applyMove(state: GameState, id: number): GameState {
  const placed = placeTile(state, id);
  const matched = clearingIds(placed);
  return matched.length > 0 ? clearIds(placed, matched) : placed;
}
