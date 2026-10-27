import { clampTypeCount, generateLevel, maxTypeCount } from "./generator";
import { normalizeSeed } from "./rng";
import { canTake, clearingIds, clearIds, createState, placeTile, statusOf } from "./rules";
import type { GameState } from "./types";
import { paint, type Screen } from "./view";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("找不到页面根节点");

const maxTypes = maxTypeCount();

app.innerHTML = `
  <main class="page">
    <header>
      <h1>牛了个牛</h1>
      <p class="lede">每一关都留有解法。花色越少越好过：2 到 3 种时，把能点的牌一直点下去就会清空；从 4 种开始，点错就可能把卡槽塞满。</p>
    </header>
    <section class="panel">
      <form class="setup" id="setup">
        <label class="field">
          <span>花色 <strong id="type-readout">8</strong></span>
          <input id="type-range" type="range" min="2" max="${maxTypes}" value="8" />
        </label>
        <label class="field">
          <span>种子</span>
          <input id="seed-input" type="number" min="1" inputmode="numeric" autocomplete="off" />
        </label>
        <div class="actions">
          <button class="primary" type="submit">开这一关</button>
          <button class="ghost" id="random" type="button">随机一关</button>
          <button class="texty" id="undo" type="button">撤销</button>
        </div>
      </form>
      <p class="hint" id="dirty" hidden>花色或种子已改，点「开这一关」才会换牌。</p>
    </section>
    <p class="status" id="status"></p>
    <div class="stage" id="stage"><div class="board" id="board"></div></div>
    <div class="tray-wrap">
      <div class="tray-label">卡槽</div>
      <div class="tray" id="tray" aria-label="卡槽"></div>
    </div>
  </main>
  <div class="mask" id="mask" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <h2 id="result-title"></h2>
      <p id="result-copy"></p>
      <div class="dialog-actions">
        <button class="texty" id="lose-undo" type="button">撤销一步</button>
        <button class="primary" id="retry" type="button">重开这一关</button>
        <button class="ghost" id="another" type="button">随机一关</button>
      </div>
    </div>
  </div>
`;

function must<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`找不到 ${selector}`);
  return node;
}

const screen: Screen = {
  board: must("#board"),
  stage: must("#stage"),
  tray: must("#tray"),
  status: must("#status"),
  dirty: must("#dirty"),
  mask: must("#mask"),
  resultTitle: must("#result-title"),
  resultCopy: must("#result-copy"),
  undoButtons: [must<HTMLButtonElement>("#undo"), must<HTMLButtonElement>("#lose-undo")],
  loseUndo: must("#lose-undo"),
};

const form = must<HTMLFormElement>("#setup");
const typeRange = must<HTMLInputElement>("#type-range");
const typeReadout = must("#type-readout");
const seedInput = must<HTMLInputElement>("#seed-input");
const retry = must<HTMLButtonElement>("#retry");

let state: GameState = createState([]);
let past: GameState[] = [];
let seed = 1;
let typeCount = 8;
let busy = false;
let round = 0;
let announced = false;

function show(): void {
  const playing = statusOf(state) === "playing";
  paint(screen, state, currentClearing, seed, typeCount, past.length > 0 && !busy, take);
  const edited =
    clampTypeCount(Number(typeRange.value)) !== typeCount ||
    normalizeSeed(Number(seedInput.value)) !== seed;
  screen.dirty.hidden = !edited;
  if (playing) {
    announced = false;
    return;
  }
  if (!announced) {
    retry.focus();
    announced = true;
  }
}

let currentClearing = new Set<number>();

function start(nextSeed: number, nextTypes: number): void {
  round += 1;
  busy = false;
  currentClearing = new Set();
  const level = generateLevel(nextSeed, nextTypes);
  seed = level.seed;
  typeCount = level.typeCount;
  state = createState(level.tiles);
  past = [];
  seedInput.value = String(seed);
  typeRange.value = String(typeCount);
  typeReadout.textContent = String(typeCount);
  const hash = `#s=${seed}&t=${typeCount}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  show();
}

function beginFromInputs(): void {
  start(Number(seedInput.value), Number(typeRange.value));
}

function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return ((values[0] ?? 1) % 2147483646) + 1;
}

function undo(): void {
  if (busy || past.length === 0) return;
  const previous = past.pop();
  if (!previous) return;
  currentClearing = new Set();
  state = previous;
  show();
}

function take(id: number): void {
  if (busy || !canTake(state, id)) return;
  const before = state;
  const placed = placeTile(state, id);
  const matched = clearingIds(placed);
  past.push(before);
  if (matched.length === 0) {
    state = placed;
    show();
    return;
  }
  const ticket = round;
  busy = true;
  currentClearing = new Set(matched);
  state = placed;
  show();
  window.setTimeout(() => {
    if (ticket !== round) return;
    state = clearIds(placed, matched);
    currentClearing = new Set();
    busy = false;
    show();
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  beginFromInputs();
});

must<HTMLButtonElement>("#random").addEventListener("click", () => {
  seedInput.value = String(randomSeed());
  beginFromInputs();
});

must<HTMLButtonElement>("#another").addEventListener("click", () => {
  seedInput.value = String(randomSeed());
  beginFromInputs();
});

retry.addEventListener("click", beginFromInputs);
for (const button of screen.undoButtons) button.addEventListener("click", undo);

typeRange.addEventListener("input", () => {
  typeReadout.textContent = typeRange.value;
  show();
});

seedInput.addEventListener("input", () => show());

window.addEventListener("resize", () => show());

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  }
});

const params = new URLSearchParams(location.hash.replace(/^#/, ""));
const fromSeed = params.get("s");
const fromTypes = params.get("t");
start(fromSeed === null ? randomSeed() : Number(fromSeed), fromTypes === null ? 8 : Number(fromTypes));
