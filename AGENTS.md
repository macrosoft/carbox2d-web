# Project Rules: HTML5 + Planck.js

## Physics (Planck.js)
- We use `planck.js`, not the original `Box2D`.
- Planck.js dropped the `b2` prefix. Use `planck.World`, `planck.Body`, `planck.Vec2` instead of `b2World`, `b2Body`, `b2Vec2`.
- Methods use `lowerCamelCase` (e.g., `world.createBody()`, not `CreateBody()`).
- Definition objects (BodyDef, FixtureDef) in Planck.js are replaced with plain JS objects.
  *CORRECT:* `world.createBody({ type: 'dynamic', position: planck.Vec2(0, 0) })`
  *INCORRECT:* `let def = new planck.BodyDef();`
- Shapes are immutable.

## Rendering
- Use standard HTML5 Canvas API (or WebGL if chosen) instead of OpenGL.

## Git
- **NEVER** commit or push without explicit user permission.
- The user decides when to commit. Only edit code.
