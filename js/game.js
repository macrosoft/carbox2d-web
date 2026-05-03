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
    var KEEP_COUNT = 16;
    var _population = [];
    var _results = [];
    var _carIndex = 0;
    var _generation = 0;

    function startGeneration(prevPopulation, prevResults) {
        if (_generation === 0) {
            _population = [];
            for (var i = 0; i < POPULATION_SIZE; i++) {
                _population.push(Chromosome.generate());
            }
        }
        else {
            var indexed = [];
            for (var k = 0; k < POPULATION_SIZE; k++) {
                indexed.push({ chromo: prevPopulation[k], score: prevResults[k].score, time: prevResults[k].time });
            }
            indexed.sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });
            _population = [];
            for (var j = 0; j < KEEP_COUNT; j++) {
                _population.push(indexed[j].chromo);
            }
            for (var m = 0; m < KEEP_COUNT; m++) {
                _population.push(Chromosome.generate());
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
            renderer.draw(world.chassis);
            HUD.update(world);
            HUD.updateGeneration(_generation, _carIndex);
            HUD.setPause(_paused);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
