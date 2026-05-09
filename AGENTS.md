## Syntax & Module Pattern
- ES6+ syntax: `const`/`let`, arrow functions, template literals.
- IIFE + revealing module pattern: `const Module = (function(){ ... })();`
- `'use strict'` at top of each IIFE (except config.js).
- Named constants at module scope (no magic numbers).
- Script loading order: planck.min.js → config.js → theme.js → track_loader.js → chromosome.js → car_builder.js → world.js → hud.js → camera.js → renderer.js → game.js.

## Physics (Planck.js)
- `planck.js` (no `b2` prefix). Methods: `lowerCamelCase`.
- Shapes are immutable.

## Modules
**config.js** — global constants (`TIME_STEP`, `CAMERA_*`, physics params).
**track_loader.js** — async load `track_data.bin` (Float32LE: x, y, angle × 500 segments).
**chromosome.js** — DNA: `{ genes: Float32Array(40), colors: Array(16) }`.
**car_builder.js** — decode genes → vertices, colors, wheels (pure functions).
**world.js** — physics simulation, breakage, scoring.
**theme.js** — dark/light theme toggle, persisted to localStorage.
**hud.js** — HTML overlay: score, time, table, graphs.
**camera.js** — viewport management: position, smoothing, resize, coordinate transforms.
**renderer.js** — canvas rendering: grid, track, chassis, wheels, debris, sparks, parents.
**game.js** — main loop, population (size=32), selection, crossover.

## Chromosome (DNA)
```
{ genes: Float32Array(40), colors: [[r,g,b], ... ×16] }
```
Decoded via `CarBuilder.decodeChromosome()`:
- `genes[0..15]` (j*2, j*2+1) — 8 segments: angle (sum 2π), magnitude [0.1, 3.0]
- `genes[16..39]` (i*3, i*3+1, i*3+2) — 8 wheels: on/off, axle angle, radius [0.1, 1.5]
- `colors[0..7]` — chassis segments; `colors[8..15]` — axles

## World
- 8 triangular chassis segments on single dynamic body.
- Suspension: `PrismaticJoint` + spring-damper motor in `step()`.
- Wheels: `RevoluteJoint` with motor.
- Breakage: `post-solve` impulse check on fixtures. Threshold: `BREAK_STRENGTH * fixtureMass`.
- Stop conditions: stall, track end (1500m), time limit (5min), backward roll, destroyed (7 segments broken).

## Population
- POPULATION_SIZE = 32.
- Gen 0: random.
- Next gens: top-1 clone (elitism) + 3 random + 28 crossover (two-point).

## Rendering
- Canvas, scale = 32.
- Camera: X instant, Y smooth lerp with `CAMERA_Y_OFFSET = 2`.

## Git
- NEVER commit or push without explicit user permission.
