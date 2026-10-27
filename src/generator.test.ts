import { describe, expect, it } from "vitest";
import { generateLevel } from "./generator";
import { createLayout } from "./layout";
import { applyMove, canTake, createState, overlaps, statusOf } from "./rules";
import { mulberry32, shuffle } from "./rng";

describe("关卡生成", () => {
  it("牌桌有 105 张牌，同层不互相压住", () => {
    const layout = createLayout();
    expect(layout).toHaveLength(105);
    expect(layout.every((tile, index) => tile.id === index)).toBe(true);
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const a = layout[i];
        const b = layout[j];
        if (a && b && a.z === b.z) expect(overlaps(a, b)).toBe(false);
      }
    }
  });

  it("开局有一圈能点的牌，左右牌堆只有最上面一张能点", () => {
    const level = generateLevel(1, 8);
    const state = createState(level.tiles);
    const covered = level.tiles.filter((tile) => !canTake(state, tile.id));
    expect(covered.length).toBeGreaterThan(40);
    expect(level.tiles.length - covered.length).toBeGreaterThan(16);

    const minX = Math.min(...level.tiles.map((tile) => tile.x));
    const stack = level.tiles.filter((tile) => tile.x === minX).sort((a, b) => a.z - b.z);
    expect(stack).toHaveLength(6);
    const top = stack[5];
    expect(top).toBeDefined();
    expect(stack.filter((tile) => canTake(state, tile.id))).toEqual([top]);

    const afterTop = applyMove(state, top!.id);
    const next = stack[4];
    expect(next && canTake(afterTop, next.id)).toBe(true);
  });

  it("同一种子发出来的牌相同，花色数量和每种牌的张数都符合约定", () => {
    const first = generateLevel(42, 8);
    const second = generateLevel(42, 8);
    expect(first.solution).toEqual(second.solution);
    expect(first.tiles.map((tile) => tile.type)).toEqual(second.tiles.map((tile) => tile.type));

    const counts = new Map<number, number>();
    for (const tile of first.tiles) counts.set(tile.type, (counts.get(tile.type) ?? 0) + 1);
    expect(counts.size).toBe(8);
    for (const count of counts.values()) expect(count % 3).toBe(0);
    expect(new Set(first.solution).size).toBe(first.tiles.length);
  });

  it("花色很少时随便点也不会输，花色很多时记录的解法依然能通关", () => {
    const levelSeeds = [1, 2, 7, 99, 2026];
    for (const seed of levelSeeds) {
      for (const typeCount of [2, 3, 4, 8, 16, 35]) {
        const level = generateLevel(seed, typeCount);
        expect(level.typeCount).toBe(typeCount);
        let state = createState(level.tiles);
        for (const id of level.solution) {
          state = applyMove(state, id);
          expect(statusOf(state)).not.toBe("lost");
        }
        expect(statusOf(state)).toBe("won");
      }
    }

    for (const seed of levelSeeds) {
      for (const playSeed of [3, 11, 28]) {
        const level = generateLevel(seed, 3);
        const rng = mulberry32(playSeed);
        let state = createState(level.tiles);
        let guard = 0;
        while (statusOf(state) === "playing" && guard < 300) {
          const choices = shuffle(
            level.tiles.filter((tile) => canTake(state, tile.id)),
            rng,
          );
          const pick = choices[0];
          if (!pick) break;
          state = applyMove(state, pick.id);
          guard++;
        }
        expect(statusOf(state)).toBe("won");
      }
    }
  });

  it("超出范围的花色数量会被收进可玩区间", () => {
    expect(generateLevel(1, 1).typeCount).toBe(2);
    expect(generateLevel(1, 999).typeCount).toBe(35);
  });
});
