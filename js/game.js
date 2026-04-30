(function () {

    var canvas = document.getElementById('gameCanvas');
    var renderer = new Renderer.Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    TrackLoader.load().then(function (track) {
        World.load(track);
        Renderer.setTrackData(track);

        var chromo = Chromosome.generate();
        var world = new World.World(chromo);
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
            }

            var pos = world.getChassisPos();
            renderer.follow(pos.x, pos.y);
            renderer.draw(world.chassis);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
