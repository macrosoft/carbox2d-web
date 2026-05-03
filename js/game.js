(function () {

    var canvas = document.getElementById('gameCanvas');
    var renderer = new Renderer.Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    var _paused = false;
    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            _paused = !_paused;
        }
    });

    var POPULATION_SIZE = 32;
    var _population = [];
    var _results = [];
    var _carIndex = 0;
    var _generation = 0;

    function startGeneration(prevPopulation, prevResults) {
        _population = [];

        if (_generation === 0) {
            for (var i = 0; i < POPULATION_SIZE; i++) {
                var chromo = Chromosome.generate();
                chromo.parents = null;
                _population.push(chromo);
            }
        } else {
            var indexed = [];
            for (var k = 0; k < POPULATION_SIZE; k++) {
                indexed.push({ chromo: prevPopulation[k], score: prevResults[k].score, time: prevResults[k].time });
            }
            indexed.sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });

            _population.push(Chromosome.clone(indexed[0].chromo));
            _population[_population.length - 1].parents = [indexed[0].chromo];

            for (var n = 0; n < 3; n++) {
                var chromo = Chromosome.generate();
                chromo.parents = null;
                _population.push(chromo);
            }

            var indices = [];
            for (var p = 0; p < POPULATION_SIZE; p++) {
                indices.push(p);
            }
            for (var q = indices.length - 1; q > 0; q--) {
                var swapIdx = Math.floor(Math.random() * (q + 1));
                var tmp = indices[q];
                indices[q] = indices[swapIdx];
                indices[swapIdx] = tmp;
            }

            for (var pair = 0; pair < 14; pair++) {
                var pa = indexed[indices[pair * 2]].chromo;
                var pb = indexed[indices[pair * 2 + 1]].chromo;
            var result = Chromosome.crossover(pa, pb);
            result.offspringA.parents = [pa, pb];
            result.offspringB.parents = [pa, pb];
            _population.push(result.offspringA);
            _population.push(result.offspringB);

            }
        }
        _results = [];
        _carIndex = 0;
    }

    TrackLoader.load().then(function (track) {
        World.load(track);
        Renderer.setTrackData(track);

        startGeneration();
        var world = new World.World(_population[0]);
        renderer.setCamera(world.getChassisPos().x, world.getChassisPos().y + CAMERA_Y_OFFSET);

        var lastTick = null;
        var accumulator = 0;

        function frame(timestamp) {
            if (lastTick === null) lastTick = timestamp;
            var dt = (timestamp - lastTick) / 1000;
            lastTick = timestamp;

            if (dt > 0.1) dt = 0.1;
            accumulator += dt;

            while (accumulator >= TIME_STEP) {
                if (!_paused) {
                    world.step();
                    accumulator -= TIME_STEP;

                    if (world.isStopped()) {
                        if (_generation > 0 && _carIndex === 0) {
                            HUD.resetRuns();
                        }
                        HUD.saveRun(_carIndex, world.getScore(), world.getTime());
                        _results.push({ score: world.getScore(), time: world.getTime() });
                        _carIndex++;

                        if (_carIndex >= POPULATION_SIZE) {
                            _generation++;
                            startGeneration(_population, _results);
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

            var pos = world.getChassisPos();
            renderer.follow(pos.x, pos.y);
            renderer.draw(world.chassis, world.chromo.parents);
            HUD.update(world);
            HUD.updateGeneration(_generation, _carIndex);
            HUD.setPause(_paused);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
