## Syntax & Module Pattern
- **ES6+ syntax** inside IIFE modules: `const`/`let`, arrow functions, template literals, destructuring, spread operator.
- All JS files use IIFE + revealing module pattern (`var Module = (function(){ ... })();`) — no bundler, no ES modules.
- Strict mode: `'use strict'` at the top of each IIFE.
- Named constants extracted at module scope (no magic numbers).
- Script loading order: planck.min.js → config.js → track_loader.js → chromosome.js → world.js → hud.js → renderer.js → game.js.

## Physics (Planck.js)
- Use `planck.js` (no `b2` prefix). Methods are `lowerCamelCase`.
- Documentation: `@docs/planck.d.ts`
- Use plain JS objects for definitions instead of `BodyDef`.
- Shapes are immutable.

## World Architecture (js/world.js)
### Module Exports
- `load(track)` — load track data.
- `World` — constructor function (IIFE-style).
- `reset(chromo)` — factory: `new World(chromo)`.
- `getCarGeometry(chromo)` — returns geometry for rendering.

### Geometry Pipeline (single source of truth)
1. `decodeChromosome(genes)` → `{ angles, mags, wheelOn, axleAngles, wheelRadii }`
2. `computeCarData(chromo)` → calls decode + computes vertices, colors, wheels.
3. `getCarGeometry(chromo)` → returns `{ vertices, colors, axleColors, wheels }` for rendering.
4. `createCar(world, chromo)` → uses `computeCarData()` for building physics bodies.

**Never** duplicate vertex/color computation — always go through `computeCarData()`.

### Torque Calculation
- `calcTorque(chassis)` → single function: `chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(wheelCount - 1, 0))`.
- Called in: constructor, `reset()`, `processBreakage()`.

## Chromosome (DNA)
Chromosome: `{ genes: Float32Array(40), colors: Uint8Array(48) }`.
`genes[40]` decoded via `decodeChromosome()`:
- `j*2` (0..7): angle segment j (`v*0.92+0.08`, normalized sum 2π).
- `j*2+1` (0..7): magnitude segment j (`v*2.9+0.1` → [0.1, 3.0]).
- `16+i*3` (0..7): wheel-on slot i (<=0.5 active).
- `16+i*3+1` (0..7): axle angle slot i (`v*2π`).
- `16+i*3+2` (0..7): wheel radius slot i (`v*1.4+0.1` → [0.1, 1.5]).

Colors: 16 RGB triples (0-255). Slots 0-7: chassis; 8-15: axles.

## Chassis & Destruction
- 8 triangular segments on a single dynamic body. Physics: density=2, friction=10, restitution=0.05.
- Each segment fixture has `fixture.segmentIndex` (0..7) for breakage identification.
- `chassis.segFixtures[]` — array of segment fixtures; set to `null` when broken.
- `chassis.segmentBreakFlags[]` — boolean flags set in `onPostSolve`.
- `chassis.debris[]` — array of `{ body, color }` for broken-off pieces.
- `chassis.brokeNum` — count of broken segments (max 7).
- `chassis.wheelOnSegment[]` — maps wheel index → segment index.
- Suspension: `PrismaticJoint` (-0.1, 0.25) + spring-damper motor in `World.step`.
- Wheels: `RevoluteJoint` with motor.
- Breakage: `post-solve` check on both axle mount fixtures AND chassis segment fixtures. Break threshold: `BREAK_STRENGTH (50) * fixtureMass` (mass via `fixture.getMassData(md)`).
- `breakSegment(i)`: clones fixture shape, creates independent debris body at chassis position/velocity, destroys original fixture, marks `segFixtures[i] = null`.
- On segment break: cascade-destroy any wheels mounted on that segment (joint, mount fixture, motor disable).
- `processBreakage()`: called after each `world.step()`. Processes both segment and axle breakage flags. Recalculates torque after each break.
- Stop condition: `chassis.brokeNum >= 7` (car destroyed).
- Rendering: `drawDebrisPiece()` renders broken pieces as independent physics bodies with their original color.

## Rendering
- HTML5 Canvas.
- Chassis: 8 colored segments.
- Wheels: dark circles with rotation radius line.
- Camera: `CAMERA_Y_OFFSET = 2`, X instant, Y smooth lerp.

## Game State (js/world.js)
- `World`: `iteration`, `maxPosition` (score), `torque`, `slow`, `prevDist`, `stopped`.
- `TRACK_LENGTH = 1500`, `MAX_ITERATION = 5 * 60 * 60` (18000).
- `step()`: physics, breakage, stop conditions (stall, track end, time, backward roll).

## Population (js/game.js)
- `POPULATION_SIZE = 32`.
- Selection: Generation 0 random. Then: top-1 clone (elitism), 3 random, 28 crossover (two-point, reciprocal).
- Crossover: Two random breakpoints in `[0, 40)`. Colors follow genes.

## HUD (js/hud.js)
- HTML overlay.
- Score: red 24px, bottom 15% center.
- Time/Torque/Speed: red 14px, top-right.
- Run table: left panel, yellow bg.
- Generation + car index: top-center, black 14px.
- Score Graphs: Centered canvas showing average (black) and max (red) scores per generation.

## Track Data
- Binary: `js/track_data.bin` (Float32LE: `x, y, angle` × 500 segments).

## Legacy Project
- Original C++ source: `legacy_cpp` folder.

## Git
- **NEVER** commit or push without explicit user permission.
