import type { Tile } from "./types";

export const TILE_W = 48;
export const TILE_H = 56;

const HALF_X = TILE_W / 2;
const HALF_Y = TILE_H / 2;

interface LayerSpec {
  cols: number;
  rows: number;
  ox: number;
  oy: number;
  z: number;
}

/**
 * 十二层交叉叠牌。
 * 奇数层错开半张牌，压在下层四张牌的接缝上。
 * 外圈露在外面，中间越往上越窄，最深处有一整条十二层的塔。
 * 总数 180，能被 3 整除。
 */
export function createLayout(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  const layers: LayerSpec[] = [
    { z: 0, cols: 8, rows: 7, ox: 0, oy: 0 },
    { z: 1, cols: 6, rows: 5, ox: TILE_W + HALF_X, oy: TILE_H + HALF_Y },
    { z: 2, cols: 6, rows: 5, ox: TILE_W, oy: TILE_H },
    { z: 3, cols: 4, rows: 3, ox: TILE_W * 2 + HALF_X, oy: TILE_H * 2 + HALF_Y },
  ];

  for (let step = 0; step < 4; step++) {
    const peek = step * 4;
    const z = 4 + step * 2;
    layers.push(
      { z, cols: 3, rows: 3, ox: TILE_W * 2 + HALF_X + peek, oy: TILE_H * 2 + peek },
      { z: z + 1, cols: 2, rows: 2, ox: TILE_W * 3 + peek, oy: TILE_H * 2 + HALF_Y + peek },
    );
  }

  for (const layer of layers) {
    for (let row = 0; row < layer.rows; row++) {
      for (let col = 0; col < layer.cols; col++) {
        tiles.push({
          id: id++,
          type: 0,
          x: layer.ox + col * TILE_W,
          y: layer.oy + row * TILE_H,
          z: layer.z,
          w: TILE_W,
          h: TILE_H,
        });
      }
    }
  }

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
