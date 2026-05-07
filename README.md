# Carbox2d Web

An evolution simulator for cars, inspired by [boxcar2d.com](http://boxcar2d.com). Cars with procedurally generated bodies evolve across generations using a genetic algorithm.

## Live Demo

**[https://macrosoft.github.io/carbox2d-web/](https://macrosoft.github.io/carbox2d-web/)**

## Features

- **Evolution**: Population of 32 cars evolving via a genetic algorithm with elitism and two-point crossover.
- **Procedural Generation**: Randomly generated chassis (8 triangular segments) and suspension systems.
- **Physics**: Dynamic motorized wheels with realistic suspension.
- **Destructible Chassis**: Segments break off under heavy impact, creating debris; wheels on broken segments are lost; car is destroyed when 7+ segments break.

## Tech Stack

- Vanilla JavaScript
- HTML5 Canvas 2D
- [Planck.js](https://github.com/piqnt/planck.js/) — physics engine

**License:** GPL v3
