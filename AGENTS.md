# Project Rules: HTML5 + Planck.js

## Physics (Planck.js)
- Use `planck.js` (no `b2` prefix). Methods are `lowerCamelCase`.
- Documentation: `@docs/planck.d.ts`
- Use plain JS objects for definitions instead of `BodyDef`.
- Shapes are immutable.

## Chromosome (DNA)
Chromosome: `{ genes: Float32Array(40), colors: Uint8Array(48) }`.
`genes[40]` decoded in `world.js`:
- `j*2` (0..7): angle segment j (`v*0.92+0.08`, normalized sum 2π).
- `j*2+1` (0..7): magnitude segment j (`v*2.9+0.1` → [0.1, 3.0]).
- `16+i*3` (0..7): wheel-on slot i (<=0.5 active).
- `16+i*3+1` (0..7): axle angle slot i (`v*2π`).
- `16+i*3+2` (0..7): wheel radius slot i (`v*1.4+0.1` → [0.1, 1.5]).

Colors: 16 RGB triples (0-255). Slots 0-7: chassis; 8-15: axles.

## Chassis & Destruction
- 8 triangular segments. Physics: density=2, friction=10, restitution=0.05.
- Suspension: `PrismaticJoint` (-0.1, 0.25) + spring-damper motor in `World.step`.
- Wheels: `RevoluteJoint` with motor.
- Breakage: `post-solve` check on axle mount fixtures. Break threshold: `BREAK_STRENGTH (50) * mass`.
- On break: destroy joint, remove mount fixture, disable motor.

## Rendering
- HTML5 Canvas.
- Chassis: 8 colored segments.
- Wheels: dark circles with rotation radius line.
- Camera: `CAMERA_Y_OFFSET = 2`, X instant, Y smooth lerp.

## Game State (js/world.js)
- `World`: `iteration`, `maxPosition` (score), `torque`, `slow`, `prevDist`, `stopped`.
- `TRACK_LENGTH = 1500`, `MAX_ITERATION = 18000`.
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
