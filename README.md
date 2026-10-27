# 牛了个牛

[中文说明](README-zh.md)

A stacked tile match-3 you can open in a browser. Every deal is solvable. Difficulty is the number of tile types, and the same link always opens the same deal.

Play it here: https://yixin-zhu.github.io/My-Match-3-game/

## How to play

The board is twelve layers of overlapping tiles, 180 in total. A tile can be taken only when nothing above it covers it. Odd layers sit half a tile off the seams, so one upper tile presses on several tiles below. Taking those upper tiles uncovers the ones underneath.

Taken tiles go into a tray of seven slots. Three of the same type disappear, even if they are not next to each other. If the seventh slot is filled and no triple is made, the deal is lost. Clear the board to win.

- **Types** sets the difficulty, from 2 to 35. Fewer types is easier. With 2 or 3 types, any sequence of legal picks still clears the board. From 4 types up, a wrong pick can fill the tray. The deal itself still has a solution.
- **Seed** picks which deal you get. The address keeps both values, for example `#s=7&t=8`. Send that address to play the same deal.
- **开这一关** starts or restarts the deal shown in the form.
- **随机一关** draws a new seed.
- **撤销** takes back the last pick. `Ctrl+Z` does the same.

## Run it locally

Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173/

| Script | What it does |
| --- | --- |
| `npm test` | Checks the rules and that generated deals stay solvable |
| `npm run build` | Typechecks and writes the static site to `dist/` |
| `npm run preview` | Serves the built site |

Pushing to `main` runs the tests and publishes the site with GitHub Pages.

## Code map

| File | Role |
| --- | --- |
| `src/layout.ts` | Twelve-layer board. Upper tiles overlap the seams below |
| `src/rules.ts` | Which tiles can be taken, the tray, triples, win and loss |
| `src/generator.ts` | Builds a solvable deal for a seed and a type count |
| `src/view.ts` | Draws the board and the tray |
| `src/main.ts` | Buttons, undo, and the address hash |
| `src/icons.ts` | The tile faces |

The generator does not show its solution in the game. It places types along a legal order of picks, then replays that order before the deal is used. A deal that would fill the tray on that order is thrown away.
