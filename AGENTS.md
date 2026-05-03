# Project Rules: HTML5 + Planck.js

## Physics (Planck.js)
- We use `planck.js`, not the original `Box2D`.
- Documentation: `@docs/planck.d.ts`
- Planck.js dropped the `b2` prefix. Use `planck.World`, `planck.Body`, `planck.Vec2`.
- Methods use `lowerCamelCase` (e.g., `world.createBody()`).
- Definition objects are replaced with plain JS objects.
  *CORRECT:* `world.createBody({ type: 'dynamic', position: planck.Vec2(0, 0) })`
  *INCORRECT:* `let def = new planck.BodyDef();`
- Shapes are immutable.

## Chromosome (DNA)

Each car is defined by a chromosome: `{ genes: Float32Array(40), colors: Uint8Array(48) }`.

**`genes[40]`** — all values in [0, 1], decoded by `decodeChromosome()` in `world.js`:

| Indices | Field | Decode |
|---------|-------|--------|
| `j*2` (j=0..7) | raw angle segment j | `v * 0.92 + 0.08`, normalized so sum = 2π, cumulative |
| `j*2+1` (j=0..7) | magnitude segment j | `v * 2.9 + 0.1` → [0.1, 3.0] |
| `16+i*3` (i=0..7) | wheel-on slot i | `<= 0.5` → active on segment i, `> 0.5` → no wheel |
| `16+i*3+1` (i=0..7) | axle angle slot i | `v * 2π` |
| `16+i*3+2` (i=0..7) | wheel radius slot i | `v * 1.4 + 0.1` → [0.1, 1.5] |

**`colors[16][3]`** — 16 RGB triples, values 0-255:

| Slot | Field |
|------|-------|
| `colors[0..7]` | chassis segment 0-7 — `[r, g, b]` |
| `colors[8..15]` | axle slot 0-7 — `[r, g, b]` |

At init, all 16 slots get the same random RGB (like original C++).

**`js/chromosome.js`** — `Chromosome.generate()` creates a new random chromosome.

## Chassis

- 8 triangular segments forming a fan shape.
- Wheel slot `i` maps 1-to-1 to segment `i` (50% chance active).
- Physics: density=2, friction=10, restitution=0.05.
- Suspension: `PrismaticJoint` with limits (-0.1, 0.25), custom spring-damper motor in `World.step`.
- Axle offset: -0.3 units along axle axis.
- Wheels: `RevoluteJoint` with motor, radius random 0.1-1.5m.
- Collision: car parts ignore each other (`filterCategoryBits`/`filterMaskBits`), only collide with track.
- Spawn: `(-500, 5)`.

## Destruction (Destructible Springs)

- `post-solve` listener checks impulse on `axleMount` / `axleBodyFixture` fixtures.
- Break threshold: `BREAK_STRENGTH * fixture_mass` (BREAK_STRENGTH = 50).
- On break: destroy prismatic joint, remove mount fixture, recreate boxes on axle body, disable wheel motor, recalculate torque.
- Arrays on chassis: `mountFixtures[]`, `axleBreakFlags[]`, `wheelActive[]`, `axleShapeSlots[]` (stores `{fixture, body, localMount, mountPx, mountPy, mountAngle, colorIndex}`).

## Rendering

- HTML5 Canvas API.
- Chassis: 8 individual triangle segments, each drawn with its own color from `body.colors[]`.
- Internal spokes drawn with the color of the segment they lead to.
- Axles: per-slot color from `body.axleColors[]`.
- Mounts: color of the segment they're attached to.
- Wheels: dark circles with rotation radius line.
- Camera: `CAMERA_Y_OFFSET = 2` (js/config.js), X instant, Y smooth lerp.

## Game State (js/world.js)

- `World` constructor: `iteration`, `maxPosition` (score, only grows), `torque` (`mass * 1.5 * 15 / 2^(wheels-1)`), `slow`, `prevDist`, `stopped`.
- Chromosome saved as `this.chromo` for deterministic restart.
- `TRACK_LENGTH = 1500`, `MAX_ITERATION = 18000` (5 min at 60fps).
- `step()`: physics step, breakage processing, stop conditions (stall detection, track end, time, backward roll).
- `reset(newChromo)`: new world + track + car, resets counters.
- Getters: `getScore()`, `getSpeed()`, `getTorque()`, `getTime()`, `getRemainingTime()`, `isStopped()`.

## Population (js/game.js)

- `POPULATION_SIZE = 32`, `KEEP_COUNT = 16`.
- Cars run sequentially. When one stops → `HUD.saveRun()`, result stored in `_results[]` as `{score, time}`.
- **Selection:** Generation 0 = 32 random. Subsequent generations: sort previous population by score desc (tiebreaker: time asc), keep top 16, add 16 new random chromosomes.
- When all 32 stop → `startGeneration(_population, _results)` → new generation.

## HUD (js/hud.js)

- HTML overlay (`pointer-events: none`), lazy-init on first `update()`.
- Score: red 24px, bottom 15% center.
- Time/Torque/Speed: red 14px, top-right.
- Time: countdown `m:ss` from 5:00.
- Run table: left panel, yellow bg, columns `#`, `Score`, `Time`. Max 32 rows, resets at generation boundary.
- Generation + car index: top-center, black 14px.

## Track Data Format

- Binary: `js/track_data.bin` (6000 bytes, Float32LE: `x, y, angle` × 500 segments).
- Async load: `TrackLoader.load()` → `{count, data: Float32Array}`.
- Game loop starts after track loads.

## Legacy Project

- Original C++ source: `legacy_cpp` folder.

## Git

- **NEVER** commit or push without explicit user permission.
