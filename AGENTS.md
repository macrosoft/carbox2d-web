# Project Rules: HTML5 + Planck.js

## Physics (Planck.js)
- We use `planck.js`, not the original `Box2D`.
- Documentation: `@docs/planck.d.ts`
- Planck.js dropped the `b2` prefix. Use `planck.World`, `planck.Body`, `planck.Vec2` instead of `b2World`, `b2Body`, `b2Vec2`.
- Methods use `lowerCamelCase` (e.g., `world.createBody()`, not `CreateBody()`).
- Definition objects (BodyDef, FixtureDef) in Planck.js are replaced with plain JS objects.
  *CORRECT:* `world.createBody({ type: 'dynamic', position: planck.Vec2(0, 0) })`
  *INCORRECT:* `let def = new planck.BodyDef();`
- Shapes are immutable.

## Chassis (Random)
- Chassis body is composed of 8 triangular segments forming a fan shape.
- Each segment has random angle (min 0.08 rad, sum = 2π) and magnitude (0.3-3.0m).
- Each restart generates a new random chassis.
- Physics: density=2, friction=10, restitution=0.05.
- `js/chromosome.js` — gene generation (angles, mags, hue/sat/lit).
- Suspension:
  - 50% probability for each wheel slot to be active.
  - Each chassis segment can host at most one suspension mount.
  - Mount consists of a static `BoxShape` on chassis and a dynamic `axle` body.
  - Connection: `PrismaticJoint` with limits (-0.1, 0.25) and a custom spring-damper motor logic in `World.step`.
  - Axle visual/physical offset: -0.3 units along axle axis.
- Wheels:
  - Connected to axle via `RevoluteJoint` with motor.
  - Radius: random (0.1-1.5m).
  - Collision: all car parts ignore each other (via `filterCategoryBits`/`filterMaskBits`) and only collide with the track.
- Spawn position: `(-500, 5)`.

## Rendering
- Use standard HTML5 Canvas API (or WebGL if chosen) instead of OpenGL.
- Chassis is rendered as 8 colored triangles (triangle fan) with HSL color from chromosome.
- Axles are rendered as rotated rectangles matching the chassis color.
- Wheels are rendered as dark circles with a rotation radius line.
- Camera offset (`CAMERA_Y_OFFSET = 2` in `js/config.js`) pushes the view up on screen, leaving room for future graphs at the bottom.
- Camera X follows instantly (no smoothing); Y uses smooth lerp.

## Game State (js/world.js)
- `World` constructor tracks: `iteration` (physics step count), `maxPosition` (score, distance from spawn X, starts at 0, only grows), `torque` (computed from formula: `mass * 1.5 * 15 / 2^(wheels-1)`), `slow` (stall counter), `prevDist` (for stuck detection), `stopped` (flag).
- Chromosome saved as `this.chromo` for deterministic restart.
- Helper functions: `buildTrack`, `createCar` (used by both constructor and `reset`).
- `CONSTANTS`: `TRACK_LENGTH = 1500`, `MAX_ITERATION = 18000` (5 min at 60fps).
- `step()`: performs physics step, then checks stop conditions via stuck detection: if distance didn't advance by 1m, stall counter increments (cap: 180 ticks if score < 10, 300 ticks if >= 10). Also stops at track end, time expiry, or backward roll (>10m). Resets automatically via `world.reset()` in game loop.
- `reset(newChromo)`: creates a new `planck.World` + track + car. If `newChromo` provided, uses it instead of current chromo. Resets all counters.
- Getters: `getScore()` (capped at TRACK_LENGTH), `getSpeed()` (velocity magnitude), `getTorque()`, `getTime()` (elapsed seconds), `getRemainingTime()` (countdown), `isStopped()`.

## Population (js/game.js)
- `POPULATION_SIZE = 32` — 32 random chromosomes per generation.
- `game.js` orchestrates: generates population, runs cars sequentially. When one stops → `HUD.saveRun()` increments index. When all 32 stop → new generation (32 new random chromosomes), table resets.

## HUD (js/hud.js)
- HTML overlay (`<div>` with `pointer-events: none`), lazy-initialized on first `update()` call.
- Score: red 24px, bottom 15% center.
- Time/Torque/Speed: red 14px, top-right, tight spacing (2px between lines).
- Time displays as countdown `m:ss` from 5:00.
- Run table: left panel, semi-transparent yellow background, columns `#`, `Score` (1 decimal), `Time` (m:ss). Max 32 rows, one per car in population. Filled on each car stop. Resets at generation boundary.
- Generation number + current car index: top-center, black 14px.

## Track Data Format (Deviation from Original)
- Original C++ stored track segments as `std::vector` of objects at runtime with on-demand generation.
- Web version uses pre-computed binary track data in `js/track_data.bin` (6000 bytes, Float32LE: `x, y, angle` per segment × 500 segments).
- Loading is async via `TrackLoader.load()` → returns `{count, data: Float32Array}`.
- Original `config.js` contained `TRACK_SEGMENTS` array (37KB JSON). It was replaced with binary format to reduce parsing overhead and payload size.
- Track data is in `js/track_data.bin`. To regenerate, a Node.js script writes Float32LE.
- Modules consume binary data via `TrackLoader.load()` promise. The game loop starts after track loading completes.

## Legacy Project
- Original C++ source code is located in the `legacy_cpp` folder.

## Git
- **NEVER** commit or push without explicit user permission.
- The user decides when to commit. Only edit code.