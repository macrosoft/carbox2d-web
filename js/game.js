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

    const SUN_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const MOON_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    const themeBtn = document.getElementById('themeToggle');
    themeBtn.innerHTML = Theme.isDark() ? SUN_ICON : MOON_ICON;
    themeBtn.addEventListener('click', function () {
        Theme.toggle();
        themeBtn.innerHTML = Theme.isDark() ? SUN_ICON : MOON_ICON;
    });

    let _population = [];
    let _results = [];
    let _carIndex = 0;
    let _generation = 0;
    let _avgScores = [0];
    let _maxScores = [0];
    let _prevIndexed = [];
    let _flagPos = null;
    let _bestDist = 0;

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
        if (world.furthestPos && world.getScore() > _bestDist) {
            _bestDist = world.getScore();
            _flagPos = { x: world.furthestPos.x, y: world.furthestPos.y };
        }
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

            for (let pair = 0; pair < CROSSOVER_PAIRS; pair++) {
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

            for (let n = 0; n < RANDOM_COUNT; n++) {
                const chromo = Chromosome.generate();
                chromo.parents = null;
                _population.push(chromo);
            }

            for (let pair = 0; pair < CROSSOVER_PAIRS; pair++) {
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
        _flagPos = null;
        _bestDist = 0;
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

            if (dt > MAX_DT) dt = MAX_DT;
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
            renderer.setFlagPos(_flagPos);
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
