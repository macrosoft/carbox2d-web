var World = (function () {
    function World() {
        this.world = new planck.World({
            gravity: planck.Vec2(0, -15),
            continuousPhysics: true,
            autoClearForces: true
        });

        // Track: one static body
        this.trackBody = this.world.createBody({ type: 'static', position: planck.Vec2(0, 0) });

        // Starting platform (from original track.cpp: SetAsBox(10, TRACK_THICK, center=-513, 0))
        this.trackBody.createFixture(
            new planck.BoxShape(10, TRACK_THICK, planck.Vec2(-513, 0), 0),
            { density: 0, friction: 10, restitution: 0 }
        );

        // 500 terrain segments
        for (var i = 0; i < TRACK_SEGMENTS.length; i++) {
            var seg = TRACK_SEGMENTS[i];
            this.trackBody.createFixture(
                new planck.BoxShape(TRACK_HALF_W, TRACK_THICK, planck.Vec2(seg.x, seg.y), seg.angle),
                { density: 0, friction: 10, restitution: 0 }
            );
        }

        // Test box: 2x2 (hw=1, hh=1), starts above the track
        this.box = this.world.createBody({
            type: 'dynamic',
            position: planck.Vec2(-490, 5),
            allowSleep: false,
            bullet: true
        });
        this.box.createFixture(new planck.BoxShape(1, 1), { density: 1, friction: 0.5, restitution: 0.1 });
    }

    World.prototype.step = function () {
        this.world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
    };

    World.prototype.getBoxPos = function () {
        var p = this.box.getPosition();
        return { x: p.x, y: p.y };
    };

    return World;
})();
