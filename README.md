# Carbox2d Web

An evolution simulator for cars, inspired by [boxcar2d.com](http://boxcar2d.com). Cars with procedurally generated bodies evolve across generations using a genetic algorithm.

## Live Demo

**[https://macrosoft.github.io/carbox2d-web/](https://macrosoft.github.io/carbox2d-web/)**

## Features

- Pre-computed binary track data (Float32LE, 6000 bytes) for fast loading
- Random chassis generation: 8 triangular segments with random angles and magnitudes
- Procedural suspension: dynamic axles with spring-damper physics and motorized wheels
- Destructible springs: heavy impacts break suspension joints, detaching axle+wheel from chassis (matching original C++ behavior)
- HSL-colored chassis body, unique on every restart
- Smooth camera tracking with fixed-timestep physics
- HUD overlay: score (bottom-center), time/torque/speed (top-right) in red
- Auto-restart on stop conditions: time expiry (5 min), stuck detection (3–5 sec stall), track end, or backward roll
- Deterministic restart: same car re-runs on each reset for debugging
- Evolution: population of 32 cars, top 16 best (by score, then time) survive to next generation alongside 16 new random cars

## Tech Stack

- Vanilla JavaScript (no bundlers, no modules)
- HTML5 Canvas 2D
- [Planck.js](https://github.com/piqnt/planck.js/) — physics engine

**License:** GPL v3
