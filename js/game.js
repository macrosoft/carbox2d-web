(function () {

    var canvas = document.getElementById('gameCanvas');
    var renderer = new Renderer.Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    var POPULATION_SIZE = 32;
    var _population = [];
    var _carIndex = 0;
    var _generation = 0;

    function startGeneration() {
        _population = [];
        for (var i = 0; i < POPULATION_SIZE; i++) {
            _population.push(Chromosome.generate());
        }
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
                world.step();
                accumulator -= TIME_STEP;

                if (world.isStopped()) {
                    if (_generation > 0 && _carIndex === 0) {
                        HUD.resetRuns();
                    }
                    HUD.saveRun(_carIndex, world.getScore(), world.getTime());
                    _carIndex++;

                    if (_carIndex >= POPULATION_SIZE) {
                        _generation++;
                        startGeneration();
                    }

                    world.reset(_population[_carIndex]);
                    renderer.setCamera(world.getChassisPos().x, world.getChassisPos().y + CAMERA_Y_OFFSET);
                    accumulator = 0;
                    break;
                }
            }

            var pos = world.getChassisPos();
            renderer.follow(pos.x, pos.y);
            renderer.draw(world.chassis);
            HUD.update(world);
            HUD.updateGeneration(_generation, _carIndex);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
