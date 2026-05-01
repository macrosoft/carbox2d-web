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
            position: planck.Vec2(-500, 4),
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

        this.startPos = planck.Vec2(-500, 4);

        // Create suspension mounts (axle fixtures) and dynamic axles
        this.chassis.axles = [];
        this.chassis.springs = [];
        for (var i = 0; i < chromo.wheelOn.length; i++) {
            var segIdx = chromo.wheelOn[i];
            if (segIdx === -1) continue;

            var angle = chromo.angles[segIdx];
            var mag = chromo.mags[segIdx];
            var px = mag * Math.cos(angle);
            var py = mag * Math.sin(angle);
            var axleAngle = chromo.axleAngles[i];

            // Static mount on chassis
            this.chassis.createFixture(
                new planck.BoxShape(0.2, 0.1, planck.Vec2(px, py), axleAngle),
                { density: 2, friction: 10, restitution: 0.05 }
            );

            // Dynamic axle body
            var worldAnchor = this.chassis.getWorldPoint(planck.Vec2(px, py));
            var axleBody = this.world.createBody({
                type: 'dynamic',
                position: worldAnchor,
                angle: axleAngle
            });

            // Axle physical shape: offset by -0.3 along the local axis as per legacy code
            axleBody.createFixture(
                new planck.BoxShape(0.2, 0.05, planck.Vec2(-0.3, 0), 0),
                { density: 20, friction: 10, restitution: 0.05 }
            );

            // Prismatic Joint to simulate the spring axis
            var worldAnchor = this.chassis.getWorldPoint(planck.Vec2(px, py));
            var joint = this.world.createJoint(new planck.PrismaticJoint({
                lowerTranslation: -0.1,
                upperTranslation: 0.25,
                enableLimit: true,
                enableMotor: true,
                collideConnected: false
            }, this.chassis, axleBody, worldAnchor, planck.Vec2(Math.cos(axleAngle), Math.sin(axleAngle))));

            this.chassis.axles.push(axleBody);
            this.chassis.springs.push(joint);
        }

        // Attach rendering data to chassis body
        this.chassis.vertices = this.vertices;
        this.chassis.color = { h: chromo.hue, s: chromo.sat, l: chromo.lit };
    }

    World.prototype.step = function () {
        // Update spring-damper physics for axles
        var baseSpringForce = 7.5 * this.chassis.getMass();
        for (var i = 0; i < this.chassis.springs.length; i++) {
            var joint = this.chassis.springs[i];
            var translation = joint.getJointTranslation();
            joint.setMaxMotorForce(baseSpringForce + 40 * baseSpringForce * translation * translation);
            joint.setMotorSpeed(-20 * translation);
        }

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
