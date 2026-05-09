(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const renderer = new Renderer.Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    let _paused = false;
    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            _paused = !_paused;
        }
    });

    const POPULATION_SIZE = 32;
    let _population = [];
    let _results = [];
    let _carIndex = 0;
    let _generation = 0;
    let _avgScores = [0];
    let _maxScores = [0];
    let _prevIndexed = [];

    function shuffle(arr) {
        for (let q = arr.length - 1; q > 0; q--) {
            const swapIdx = Math.floor(Math.random() * (q + 1));
            const tmp = arr[q];
            arr[q] = arr[swapIdx];
            arr[swapIdx] = tmp;
        }
        return arr;
    }

    function calcStats(results) {
        let totalScore = 0;
        let maxScore = 0;
        for (let r = 0; r < results.length; r++) {
            totalScore += results[r].score;
            if (results[r].score > maxScore) maxScore = results[r].score;
        }
        return { avg: totalScore / results.length, max: maxScore };
    }

    function handleCarFinished(world, carIndex) {
        HUD.saveRun(carIndex, world.getScore(), world.getTime());
        _results.push({ score: world.getScore(), time: world.getTime() });
    }

    function startGeneration(prevPopulation, prevResults) {
        _population = [];
        _prevIndexed = [];

        if (_generation === 0) {
            for (let i = 0; i < POPULATION_SIZE; i++) {
                const chromo = Chromosome.generate();
                chromo.parents = null;
                _population.push(chromo);
            }
        } else {
            const indexed = [];
            for (let k = 0; k < POPULATION_SIZE; k++) {
                indexed.push({ chromo: prevPopulation[k], score: prevResults[k].score, time: prevResults[k].time });
            }
            indexed.sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });

            const parentSet = new Set();
            parentSet.add(0);

            const indices = [];
            for (let p = 0; p < POPULATION_SIZE; p++) {
                indices.push(p);
            }
            shuffle(indices);

            for (let pair = 0; pair < 14; pair++) {
                const idxA = indices[pair * 2];
                const idxB = indices[pair * 2 + 1];
                parentSet.add(idxA);
                parentSet.add(idxB);
            }

            for (let m = 0; m < indexed.length; m++) {
                indexed[m].hasOffspring = parentSet.has(m);
            }

            _prevIndexed = indexed;

            _population.push(Chromosome.clone(indexed[0].chromo));
            _population[_population.length - 1].parents = [indexed[0].chromo];

            for (let n = 0; n < 3; n++) {
                const chromo = Chromosome.generate();
                chromo.parents = null;
                _population.push(chromo);
            }

            for (let pair = 0; pair < 14; pair++) {
                const pa = indexed[indices[pair * 2]].chromo;
                const pb = indexed[indices[pair * 2 + 1]].chromo;
                const result = Chromosome.crossover(pa, pb);
                result.offspringA.parents = [pa, pb];
                result.offspringB.parents = [pa, pb];
                _population.push(result.offspringA);
                _population.push(result.offspringB);
            }
        }
        _results = [];
        _carIndex = 0;
    }

    function finishGeneration() {
        const stats = calcStats(_results);
        _avgScores.push(stats.avg);
        _maxScores.push(stats.max);
        _generation++;
        startGeneration(_population, _results);
    }

    HUD.setCopyCallback(function(index) {
        if (_carIndex === 0 && _results.length === 0 && _prevIndexed.length > 0) {
            return _prevIndexed[index].chromo;
        }
        return _population[index];
    });

    TrackLoader.load().then(function (track) {
        World.load(track);
        Renderer.setTrackData(track);

        startGeneration();
        let world = new World.World(_population[0]);
        renderer.setCamera(world.getChassisPos().x, world.getChassisPos().y + CAMERA_Y_OFFSET);

        let lastTick = null;
        let accumulator = 0;

        function frame(timestamp) {
            if (lastTick === null) lastTick = timestamp;
            let dt = (timestamp - lastTick) / 1000;
            lastTick = timestamp;

            if (dt > 0.1) dt = 0.1;
            accumulator += dt;

            while (accumulator >= TIME_STEP) {
                if (!_paused) {
                    world.step();
                    accumulator -= TIME_STEP;

                    if (world.isStopped()) {
                        handleCarFinished(world, _carIndex);
                        _carIndex++;

                        if (_carIndex >= POPULATION_SIZE) {
                            finishGeneration();
                            HUD.resetRuns();
                            HUD.showResults(_prevIndexed);
                        }

                        world.reset(_population[_carIndex]);
                        renderer.setCamera(world.getChassisPos().x, world.getChassisPos().y + CAMERA_Y_OFFSET);
                        accumulator = 0;
                        break;
                    }
                } else {
                    accumulator -= TIME_STEP;
                }
            }

            const pos = world.getChassisPos();
            renderer.follow(pos.x, pos.y);
            renderer.draw(world.chassis, world.chromo.parents, world.sparks);
            HUD.update(world);
            HUD.updateGeneration(_generation, _carIndex);
            HUD.drawGraphs(_avgScores, _maxScores);
            HUD.setPause(_paused);

            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
