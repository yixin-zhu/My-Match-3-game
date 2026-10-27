import { ICONS } from "./icons";
import { createLayout } from "./layout";
import { applyMove, createState, isFreeAmong, statusOf } from "./rules";
import { mulberry32, normalizeSeed, shuffle } from "./rng";
import type { Tile } from "./types";

export interface Level {
  tiles: Tile[];
  seed: number;
  typeCount: number;
  /** 一条一定能清空牌桌的点击顺序，只用于自检，不展示给玩家。 */
  solution: number[];
}

export function maxTypeCount(tileCount = createLayout().length): number {
  return Math.min(ICONS.length, Math.floor(tileCount / 3));
}

export function clampTypeCount(typeCount: number, tileCount = createLayout().length): number {
  const max = maxTypeCount(tileCount);
  if (!Number.isFinite(typeCount)) return Math.min(8, max);
  return Math.min(max, Math.max(2, Math.floor(typeCount)));
}

/**
 * 沿一条始终合法的点击顺序发牌。
 * 卡槽里同一花色满 3 张就消掉，所以生成过程中卡槽永远不会走到失败状态。
 * 花色越多，解法就越要把不同花色交错着拿，玩家也就越容易点满卡槽。
 */
export function generateLevel(seedInput: number, typeCountInput: number): Level {
  const seed = normalizeSeed(seedInput);
  const layout = createLayout();
  const typeCount = clampTypeCount(typeCountInput, layout.length);
  const rng = mulberry32(seed);
  const quotas = distributeQuotas(layout.length, typeCount, rng);
  const { types, solution, slot } = assignTypes(layout, quotas, rng);

  if (slot.length !== 0 || quotas.some((left) => left !== 0)) {
    throw new Error("发牌没有把花色分配完");
  }

  const tiles = layout.map((tile) => ({ ...tile, type: types[tile.id] ?? 0 }));
  replaySolution(tiles, solution);
  return { tiles, seed, typeCount, solution };
}

function distributeQuotas(tileCount: number, typeCount: number, rng: () => number): number[] {
  const groups = tileCount / 3;
  if (groups !== Math.floor(groups) || typeCount > groups) {
    throw new Error("花色数量和牌数对不上");
  }
  const quotas = Array<number>(typeCount).fill(3);
  let extra = groups - typeCount;
  while (extra > 0) {
    const index = Math.floor(rng() * typeCount);
    quotas[index] = (quotas[index] ?? 0) + 3;
    extra--;
  }
  return quotas;
}

function assignTypes(
  layout: readonly Tile[],
  quotas: number[],
  rng: () => number,
): { types: number[]; solution: number[]; slot: number[] } {
  const remaining = new Set(layout.map((tile) => tile.id));
  const types = Array<number>(layout.length).fill(-1);
  const solution: number[] = [];
  const slot: number[] = [];

  while (remaining.size > 0) {
    const exposed = [...remaining].filter((id) => isFreeAmong(layout, id, remaining));
    if (exposed.length === 0) throw new Error("牌堆布局有环，没有可以点的牌");

    const type = chooseType(slot, quotas, rng);
    if (type === null) throw new Error("发牌进行不下去了");

    const id = shuffle(exposed, rng)[0];
    if (id === undefined) throw new Error("没有可以点的牌");
    types[id] = type;
    quotas[type] = (quotas[type] ?? 0) - 1;
    remaining.delete(id);
    solution.push(id);
    slot.push(type);
    if (slot.filter((item) => item === type).length === 3) {
      for (let i = slot.length - 1; i >= 0; i--) {
        if (slot[i] === type) slot.splice(i, 1);
      }
    }
  }

  if (types.some((type) => type < 0)) throw new Error("还有牌没有分到花色");
  return { types, solution, slot };
}

function chooseType(slot: readonly number[], quotas: readonly number[], rng: () => number): number | null {
  const length = slot.length;
  if (length >= 4) {
    const completing = typesWith(quotas, slot, 2, rng);
    if (completing.length > 0) return completing[0] ?? null;
  }
  if (length <= 4) {
    const fresh = typesWith(quotas, slot, 0, rng);
    if (fresh.length > 0) return fresh[0] ?? null;
  }
  if (length <= 5) {
    const pairing = typesWith(quotas, slot, 1, rng);
    if (pairing.length > 0) return pairing[0] ?? null;
  }
  const completing = typesWith(quotas, slot, 2, rng);
  return completing[0] ?? null;
}

function typesWith(quotas: readonly number[], slot: readonly number[], count: number, rng: () => number): number[] {
  const have = new Map<number, number>();
  for (const type of slot) have.set(type, (have.get(type) ?? 0) + 1);
  const found: number[] = [];
  for (let type = 0; type < quotas.length; type++) {
    if ((quotas[type] ?? 0) > 0 && (have.get(type) ?? 0) === count) found.push(type);
  }
  return shuffle(found, rng);
}

function replaySolution(tiles: readonly Tile[], solution: readonly number[]): void {
  let state = createState(tiles);
  for (const id of solution) {
    state = applyMove(state, id);
    if (statusOf(state) === "lost") throw new Error("自检发现这条解法会把卡槽撑满");
  }
  if (statusOf(state) !== "won") throw new Error("自检发现这条解法没有清空牌桌");
}
