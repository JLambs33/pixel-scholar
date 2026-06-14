# ps-11 — Bonus Game Suite, Scoreboard & Champion Screen Refresh

## Problem
The champion screen's mystery mob reveal feels dated now that bonus games exist. There is only one bonus game. Users want variety. There is no way to track progress or try to beat a previous score. The game screen doesn't tell players what they're working toward.

## Goals
1. Remove mystery mob reveal (mob tease, champion-mob canvas, revealMob)
2. Add "get all correct → bonus game" hint in the game screen
3. Add two new bonus mini-games: Mob Horde (arrow shooter) and TNT Catch (dodge/catch)
4. Store one personal best score per bonus game in localStorage; show "NEW BEST!" on beat
5. Champion screen shows all three personal bests so players have something to chase
6. Champion screen offers a choice of all three games (not one random)

## Anti-goals
- No multi-user leaderboards or initials/name entry — single personal best only
- No changes to the endless runner mechanics — it works fine
- No reading module bonus games (out of scope)
- No server, no accounts, no CDN dependencies
- No new abstractions beyond what three parallel IIFE files require

## Constraints
- Vanilla JS, no bundler, runs from `file://` or `uv run serve.py`
- IIFE pattern: each bonus game is a self-contained `const bonus_X = (() => { ... })();`
- All three games share `#bonus-canvas` (same element, different game running)
- Must work on mobile (touch) and desktop (mouse/keyboard)
- Font: Press Start 2P (local TTF, no CDN)
- New files must be added to `sw.js` ASSETS and `index.html` script tags

## Research notes
- MDN Touch Controls: unified click+touchstart on canvas; coords via `e.touches[0].pageX - canvas.offsetLeft` for touch, `e.offsetX` for mouse. Single handler, `preventDefault()` to block scroll. ([MDN Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch))
- MDN 2D Collision: AABB sufficient for all sprites in this game; no need for quad-tree at ≤30 objects. ([MDN 2D Collision](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection))
- bencentra.com: convert canvas click/touch to sprite coordinates; loop over sprite array for hit detection; trigger visual flash from collision callback. ([bencentra canvas touch](https://bencentra.com/code/2014/12/05/html5-canvas-touch-events.html))
- MDN Paddle Controls: boolean key-state flags (`leftPressed`, `rightPressed`) set on keydown/keyup, read in game loop — correct pattern for smooth left-right movement. ([MDN Breakout Controls](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Paddle_and_keyboard_controls))
- gamedevjs.com & Medium: `localStorage.getItem('key') || '0'`; compare at game end; update if higher; display "NEW BEST!" overlay. Simple, durable across sessions. ([gamedevjs localStorage](https://gamedevjs.com/articles/using-local-storage-for-high-scores-and-game-progress/))

## Chosen approach — Three parallel IIFEs + champion picker

Each bonus game is an IIFE matching the existing `bonus.js` pattern:
```
const bonusHorde = (() => { ... return { startGame, stopGame }; })();
const bonusTnt   = (() => { ... return { startGame, stopGame }; })();
```

All three render to `#bonus-canvas`. Champion screen shows 3 buttons when perfect. `db.js` gets `getBestScore(game)` / `setBestScore(game, score)` helpers. `game.js` reads scores on champion render and writes on game-over callback.

**localStorage keys:**
- `ps_best_runner` — blocks (runner)
- `ps_best_horde`  — mobs hit (horde)
- `ps_best_tnt`    — diamonds caught (tnt)

## Rejected alternatives

**Single bonus orchestrator file:** Adds abstraction not needed for three known games. Against codebase style.

**All three games in one file:** `bonus.js` is already 365 lines. A single file for all three would be ~1100 lines and hard to navigate.

**Random game assignment:** Simpler but removes player agency. Kids enjoy picking. Three buttons is still simple enough for a first grader.

## Game designs

### Game 1 — Mob Horde (bonus-horde.js)
- **Scene:** Night sky (dark blue gradient), moon, stars, grass strip at bottom
- **Mobs:** Zombies, skeletons, creepers — enter from left AND right, walk toward the far edge
- **Player action:** Click or tap directly on a mob to shoot an arrow → mob flashes white, plays small particle burst, disappears
- **Lose condition:** 5 mobs escape (reach opposite edge) → game over
- **Score:** Total mobs hit
- **Difficulty ramp:** mob speed +10px/s every 10s; max active mobs increases from 4 to 10 over 60s
- **Touch:** tap the mob sprite's bounding box; touch coords via `e.touches[0]`
- **Arrow visual:** small yellow pixel line fires from center-bottom toward clicked point, travels briefly then disappears

### Game 2 — TNT Catch (bonus-tnt.js)
- **Scene:** Daytime sky, clouds, grass at bottom; Creepers visible at top edge
- **Falling items:** TNT (red, lit fuse flicker) and Diamonds (cyan pixel gem)
- **Player:** Steve at bottom, moves left/right (arrow keys + A/D + touch tap-zones: left half / right half of canvas)
- **Rules:** Catching a diamond → +1 score; catching TNT → lose 1 life (3 lives total); diamond hits ground → no penalty; TNT hits ground → no penalty
- **Lose condition:** All 3 lives lost
- **Score:** Diamonds caught
- **Difficulty ramp:** fall speed and spawn rate increase every 15s; more TNT ratio over time
- **Visual:** Steve flashes red briefly on TNT hit; life indicators (3 hearts or creeper faces) in HUD

## Champion screen redesign

**Perfect score:**
```
YOU DID IT! — Spelling Champion!
10/10 correct!

🎮 CHOOSE YOUR BONUS GAME:
[🏃 Runner]  [🏹 Mob Horde]  [💎 TNT Catch]

Personal Bests
Runner: 847 blocks | Horde: 23 mobs | TNT: 15 diamonds
```

**Imperfect score:**
```
NICE TRY! — Keep Practicing!
7/10 correct — spell ALL correctly for a BONUS GAME!

Practice these: CAT, DOG, RUN
```

## Files changed

| File | Change |
|------|--------|
| `bonus-horde.js` | New IIFE — mob horde arrow shooter |
| `bonus-tnt.js` | New IIFE — TNT catch/dodge |
| `db.js` | Add `getBestScore(game)`, `setBestScore(game, score)` |
| `rewards.js` | Remove `revealMob`; keep `triggerBlockBurst` |
| `game.js` | Remove mob index calls; add 3-button bonus picker logic; read/write scores |
| `index.html` | Remove `#mob-tease`, `#champion-mob`; add 3 bonus buttons; add score display; add script tags; update version badge |
| `style.css` | Remove mob-tease/champion-mob styles; add bonus picker + score panel styles |
| `sw.js` | Add new JS files to ASSETS; bump CACHE version |

## Acceptance checks
- [ ] Mystery mob tease box gone from game screen
- [ ] Champion screen shows 3 bonus game buttons on perfect score
- [ ] Each bonus game launches correctly and returns to champion screen on game over
- [ ] Personal best updates and "NEW BEST!" appears when beaten
- [ ] All three personal bests visible on champion screen
- [ ] Imperfect champion screen says "spell all correctly for a BONUS GAME!"
- [ ] All three bonus games work on mobile touch
- [ ] Service worker cache updated; no stale assets
