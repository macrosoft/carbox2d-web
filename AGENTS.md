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
- Spawn position: `(-500, 4)`.

## Rendering
- Use standard HTML5 Canvas API (or WebGL if chosen) instead of OpenGL.
- Chassis is rendered as 8 colored triangles (triangle fan) with HSL color from chromosome.
- Axles are rendered as rotated rectangles matching the chassis color.
- Wheels are rendered as dark circles with a rotation radius line.

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