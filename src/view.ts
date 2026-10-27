import { maxTypeCount } from "./generator";
import { ICONS } from "./icons";
import { boardBounds } from "./layout";
import { canTake, statusOf, tileById } from "./rules";
import { SLOT_CAPACITY, type GameState } from "./types";

if (ICONS.length < maxTypeCount()) {
  throw new Error(`图案只有 ${ICONS.length} 个，盖不住全部花色`);
}

export interface Screen {
  board: HTMLElement;
  stage: HTMLElement;
  tray: HTMLElement;
  status: HTMLElement;
  dirty: HTMLElement;
  mask: HTMLElement;
  resultTitle: HTMLElement;
  resultCopy: HTMLElement;
  undoButtons: HTMLButtonElement[];
  loseUndo: HTMLButtonElement;
}

export function paint(
  screen: Screen,
  state: GameState,
  clearing: ReadonlySet<number>,
  seed: number,
  typeCount: number,
  canUndo: boolean,
  onTake: (id: number) => void,
): void {
  paintBoard(screen, state, onTake);
  paintTray(screen.tray, state, clearing);
  paintStatus(screen, state, seed, typeCount, canUndo);
  fit(screen.stage, screen.board);
}

function paintBoard(screen: Screen, state: GameState, onTake: (id: number) => void): void {
  const bounds = boardBounds(state.tiles);
  screen.board.style.width = `${bounds.width}px`;
  screen.board.style.height = `${bounds.height}px`;
  screen.board.replaceChildren();

  for (const tile of state.tiles) {
    if (state.cleared.has(tile.id) || state.slot.includes(tile.id)) continue;
    const free = canTake(state, tile.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = free ? "tile is-free" : "tile is-covered";
    button.style.left = `${tile.x - bounds.minX}px`;
    button.style.top = `${tile.y - bounds.minY}px`;
    button.style.zIndex = String(tile.z * 20);
    button.textContent = ICONS[tile.type] ?? "？";
    button.dataset.id = String(tile.id);
    button.dataset.type = String(tile.type);
    if (free) {
      button.addEventListener("click", () => onTake(tile.id));
      button.setAttribute("aria-label", `拿起 ${button.textContent}`);
    } else {
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
    }
    screen.board.append(button);
  }
}

function paintTray(tray: HTMLElement, state: GameState, clearing: ReadonlySet<number>): void {
  tray.replaceChildren();
  for (let index = 0; index < SLOT_CAPACITY; index++) {
    const groove = document.createElement("div");
    groove.className = "groove";
    const id = state.slot[index];
    if (id !== undefined) {
      const tile = tileById(state, id);
      const token = document.createElement("div");
      token.className = clearing.has(id) ? "token is-clearing" : "token";
      token.textContent = ICONS[tile.type] ?? "？";
      token.dataset.type = String(tile.type);
      groove.append(token);
    }
    tray.append(groove);
  }
}

function paintStatus(
  screen: Screen,
  state: GameState,
  seed: number,
  typeCount: number,
  canUndo: boolean,
): void {
  const onBoard = state.tiles.length - state.cleared.size - state.slot.length;
  screen.status.textContent = `牌桌还剩 ${onBoard} 张 · 卡槽 ${state.slot.length}/${SLOT_CAPACITY} · 花色 ${typeCount} · 种子 ${seed}`;

  for (const button of screen.undoButtons) button.disabled = !canUndo;

  const status = statusOf(state);
  screen.loseUndo.hidden = status !== "lost";
  if (status === "playing") {
    screen.mask.hidden = true;
    return;
  }

  screen.mask.hidden = false;
  if (status === "won") {
    screen.resultTitle.textContent = "清空了";
    screen.resultCopy.textContent = `花色 ${typeCount} 这一关过了。可以把花色调高，或者换一个种子。`;
    return;
  }
  screen.resultTitle.textContent = "卡槽满了";
  screen.resultCopy.textContent = "这局牌是有解的，只是这条拿法走进了死路。可以撤销最后一步，或重开同一关。";
}

function fit(stage: HTMLElement, board: HTMLElement): void {
  const width = board.offsetWidth;
  const height = board.offsetHeight;
  if (width === 0 || height === 0 || stage.clientWidth === 0) return;
  const scale = Math.min(1, stage.clientWidth / width);
  board.style.transform = `scale(${scale})`;
  stage.style.height = `${Math.round(height * scale)}px`;
}
