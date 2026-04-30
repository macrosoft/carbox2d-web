# Carbox2d Web

An evolution simulator for cars, inspired by [boxcar2d.com](http://boxcar2d.com). Cars with procedurally generated bodies evolve across generations using a genetic algorithm.

## Live Demo

**[https://macrosoft.github.io/carbox2d-web/](https://macrosoft.github.io/carbox2d-web/)**

## Features

- Pre-computed binary track data (Float32LE, 6000 bytes) for fast loading
- Random chassis generation: 8 triangular segments with random angles and magnitudes
- HSL-colored chassis body, unique on every restart
- Smooth camera tracking with fixed-timestep physics

## Tech Stack

- Vanilla JavaScript (no bundlers, no modules)
- HTML5 Canvas 2D
- [Planck.js](https://github.com/piqnt/planck.js/) — physics engine

**License:** GPL v3
