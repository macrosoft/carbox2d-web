var World = (function () {
    var _trackCount = 0;
    var _trackData = null;

    function loadTrack(track) {
        _trackCount = track.count;
        _trackData = track.data;
    }

    function World(chromo) {
        this.world = new planck.World({
            gravity: planck.Vec2(0, -15),
            continuousPhysics: true,
            autoClearForces: true
        });

        this.trackBody = this.world.createBody({ type: 'static', position: planck.Vec2(0, 0) });

        this.trackBody.createFixture(
            new planck.BoxShape(10, TRACK_THICK, planck.Vec2(-513, 0), 0),
            { density: 0, friction: 10, restitution: 0 }
        );

        for (var i = 0; i < _trackCount; i++) {
            var base = i * 3;
            this.trackBody.createFixture(
                new planck.BoxShape(TRACK_HALF_W, TRACK_THICK, planck.Vec2(_trackData[base], _trackData[base + 1]), _trackData[base + 2]),
                { density: 0, friction: 10, restitution: 0 }
            );
        }

        // Chassis: 8 triangle segments from random chromosome
        this.chassis = this.world.createBody({
            type: 'dynamic',
            position: planck.Vec2(-490, 5),
            allowSleep: false,
            bullet: true
        });

        // Store vertices for rendering: center [0,0] and 8 outer points
        this.vertices = [[0, 0]];

        for (var i = 0; i < chromo.segments; i++) {
            var p1x = chromo.mags[i] * Math.cos(chromo.angles[i]);
            var p1y = chromo.mags[i] * Math.sin(chromo.angles[i]);
            
            this.vertices.push([p1x, p1y]);

            var p2x = chromo.mags[(i + 1) % chromo.segments] * Math.cos(chromo.angles[(i + 1) % chromo.segments]);
            var p2y = chromo.mags[(i + 1) % chromo.segments] * Math.sin(chromo.angles[(i + 1) % chromo.segments]);

            this.chassis.createFixture(
                new planck.PolygonShape([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]),
                { density: 2, friction: 10, restitution: 0.05 }
            );
        }

        this.startPos = planck.Vec2(-490, 5);

        // Attach rendering data to chassis body
        this.chassis.vertices = this.vertices;
        this.chassis.color = { h: chromo.hue, s: chromo.sat, l: chromo.lit };
    }

    World.prototype.step = function () {
        this.world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
    };

    World.prototype.getChassisPos = function () {
        var p = this.chassis.getPosition();
        return { x: p.x, y: p.y };
    };

    function resetWorld(chromo) {
        // Clear planck world automatically clears
        return new World(chromo);
    }

    return { load: loadTrack, World: World, reset: resetWorld };
})();
