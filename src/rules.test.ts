import { describe, expect, it } from "vitest";
import { applyMove, canTake, clearingIds, createState, placeTile, statusOf } from "./rules";
import type { Tile } from "./types";

function tile(id: number, type: number, x: number, y: number, z: number): Tile {
  return { id, type, x, y, z, w: 10, h: 10 };
}

describe("叠牌规则", () => {
  it("高层压住的牌不能点，露出的牌可以点", () => {
    const tiles = [tile(0, 1, 0, 0, 0), tile(1, 2, 4, 4, 1)];
    const state = createState(tiles);
    expect(canTake(state, 0)).toBe(false);
    expect(canTake(state, 1)).toBe(true);
  });

  it("只挨着边、没有重叠的牌互不遮挡", () => {
    const tiles = [tile(0, 1, 0, 0, 1), tile(1, 2, 10, 0, 0)];
    const state = createState(tiles);
    expect(canTake(state, 0)).toBe(true);
    expect(canTake(state, 1)).toBe(true);
  });

  it("三张相同的牌会从卡槽消掉，即使它们不相邻", () => {
    const tiles = [tile(0, 1, 0, 0, 0), tile(1, 2, 20, 0, 0), tile(2, 1, 40, 0, 0), tile(3, 1, 60, 0, 0)];
    let state = createState(tiles);
    state = applyMove(state, 0);
    state = applyMove(state, 1);
    state = applyMove(state, 2);
    expect(clearingIds(state)).toEqual([]);
    state = applyMove(state, 3);
    expect([...state.slot]).toEqual([1]);
    expect(state.cleared.has(0)).toBe(true);
    expect(state.cleared.has(2)).toBe(true);
    expect(state.cleared.has(3)).toBe(true);
  });

  it("第七张牌如果凑不成三消，这一局就输了", () => {
    const tiles = Array.from({ length: 8 }, (_, id) => tile(id, id + 1, id * 20, 0, 0));
    let state = createState(tiles);
    for (const item of tiles.slice(0, 7)) state = applyMove(state, item.id);
    expect(state.slot).toHaveLength(7);
    expect(statusOf(state)).toBe("lost");
    expect(canTake(state, 7)).toBe(false);
    expect(() => placeTile(state, 7)).toThrow();
  });

  it("第七张牌刚好凑成三消时不会输", () => {
    const tiles = [
      tile(0, 1, 0, 0, 0),
      tile(1, 2, 20, 0, 0),
      tile(2, 3, 40, 0, 0),
      tile(3, 4, 60, 0, 0),
      tile(4, 5, 80, 0, 0),
      tile(5, 1, 100, 0, 0),
      tile(6, 1, 120, 0, 0),
    ];
    let state = createState(tiles);
    for (const tile of tiles) state = applyMove(state, tile.id);
    expect([...state.slot]).toEqual([1, 2, 3, 4]);
    expect(statusOf(state)).toBe("playing");
  });

  it("牌全部消除后获胜", () => {
    const tiles = [tile(0, 1, 0, 0, 0), tile(1, 1, 20, 0, 0), tile(2, 1, 40, 0, 0)];
    let state = createState(tiles);
    for (const tile of tiles) state = applyMove(state, tile.id);
    expect(statusOf(state)).toBe("won");
  });

  it("被压住的牌在上层拿走之后才能点", () => {
    const tiles = [tile(0, 1, 0, 0, 0), tile(1, 1, 4, 4, 1), tile(2, 1, 30, 0, 0)];
    let state = createState(tiles);
    expect(canTake(state, 0)).toBe(false);
    state = applyMove(state, 1);
    expect(canTake(state, 0)).toBe(true);
    state = applyMove(state, 0);
    state = applyMove(state, 2);
    expect(statusOf(state)).toBe("won");
  });
});
