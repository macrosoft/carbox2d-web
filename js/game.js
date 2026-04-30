(function () {

    var canvas = document.getElementById('gameCanvas');
    var renderer = new Renderer.Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    // Async: load track data → init world → start loop
    TrackLoader.load().then(function (track) {
        World.load(track);
        Renderer.setTrackData(track);

        var world = new World.World();
        renderer.setCamera(world.getBoxPos().x, world.getBoxPos().y + CAMERA_Y_OFFSET);

        var lastTick = null;
        var accumulator = 0;

        function frame(timestamp) {
            if (lastTick === null) lastTick = timestamp;
            var dt = (timestamp - lastTick) / 1000;
            lastTick = timestamp;

            // Prevent spiral of death on lag frames
            if (dt > 0.1) dt = 0.1;
            accumulator += dt;

            // Fixed timestep physics loop
            while (accumulator >= TIME_STEP) {
                world.step();
                accumulator -= TIME_STEP;
            }

            var pos = world.getBoxPos();
            renderer.follow(pos.x, pos.y);
            renderer.draw(world.box);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });

})();
