import type { Tile } from "./types";

export const TILE_W = 48;
export const TILE_H = 56;

const STEP_X = TILE_W;
const STEP_Y = TILE_H;

/**
 * 第二关式样的一层叠牌：
 * 底层 8×8，上面两层逐级缩小并向内错开半张牌，边上一圈露在外面。
 * 左右各一叠只能从顶上抽的牌堆。总数 105，能被 3 整除。
 */
export function createLayout(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  const layers = [
    { cols: 8, rows: 8, ox: 0, oy: 0, z: 0 },
    { cols: 5, rows: 5, ox: (STEP_X * 3) / 2, oy: (STEP_Y * 3) / 2, z: 1 },
    { cols: 2, rows: 2, ox: STEP_X * 3, oy: STEP_Y * 3, z: 2 },
  ];

  for (const layer of layers) {
    for (let row = 0; row < layer.rows; row++) {
      for (let col = 0; col < layer.cols; col++) {
        tiles.push({
          id: id++,
          type: 0,
          x: layer.ox + col * STEP_X,
          y: layer.oy + row * STEP_Y,
          z: layer.z,
          w: TILE_W,
          h: TILE_H,
        });
      }
    }
  }

  const pile = (x: number, y: number) => {
    for (let z = 0; z < 6; z++) {
      tiles.push({
        id: id++,
        type: 0,
        x,
        y: y + (5 - z) * 4,
        z,
        w: TILE_W,
        h: TILE_H,
      });
    }
  };

  pile(-TILE_W - 24, 120);
  pile(8 * STEP_X + 24, 120);

  return tiles;
}

export function boardBounds(tiles: readonly Tile[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const tile of tiles) {
    minX = Math.min(minX, tile.x);
    minY = Math.min(minY, tile.y);
    maxX = Math.max(maxX, tile.x + tile.w);
    maxY = Math.max(maxY, tile.y + tile.h);
  }
  const pad = 10;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}
