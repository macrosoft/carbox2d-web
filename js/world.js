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

        var trackFilter = {
            filterCategoryBits: 0x0002,
            filterMaskBits: 0x0001
        };

        this.trackBody.createFixture(
            new planck.BoxShape(10, TRACK_THICK, planck.Vec2(-513, 0), 0),
            { density: 0, friction: 10, restitution: 0, ...trackFilter }
        );

        for (var i = 0; i < _trackCount; i++) {
            var base = i * 3;
            this.trackBody.createFixture(
                new planck.BoxShape(TRACK_HALF_W, TRACK_THICK, planck.Vec2(_trackData[base], _trackData[base + 1]), _trackData[base + 2]),
                { density: 0, friction: 10, restitution: 0, ...trackFilter }
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

        var carFilter = {
            filterCategoryBits: 0x0001,
            filterMaskBits: 0x0002,
            filterGroupIndex: -1
        };

        for (var i = 0; i < chromo.segments; i++) {
            var p1x = chromo.mags[i] * Math.cos(chromo.angles[i]);
            var p1y = chromo.mags[i] * Math.sin(chromo.angles[i]);
            
            this.vertices.push([p1x, p1y]);

            var p2x = chromo.mags[(i + 1) % chromo.segments] * Math.cos(chromo.angles[(i + 1) % chromo.segments]);
            var p2y = chromo.mags[(i + 1) % chromo.segments] * Math.sin(chromo.angles[(i + 1) % chromo.segments]);

            this.chassis.createFixture(
                new planck.PolygonShape([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]),
                { density: 2, friction: 10, restitution: 0.05, ...carFilter }
            );
        }

        this.startPos = planck.Vec2(-500, 4);

        // Create suspension mounts (axle fixtures) and dynamic axles
        this.chassis.axles = [];
        this.chassis.springs = [];
        this.chassis.wheels = [];
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
                { density: 2, friction: 10, restitution: 0.05, ...carFilter }
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
                { density: 20, friction: 10, restitution: 0.05, ...carFilter }
            );

            // Prismatic Joint to simulate the spring axis
            var joint = this.world.createJoint(new planck.PrismaticJoint({
                lowerTranslation: -0.1,
                upperTranslation: 0.25,
                enableLimit: true,
                enableMotor: true,
                collideConnected: false
            }, this.chassis, axleBody, worldAnchor, planck.Vec2(Math.cos(axleAngle), Math.sin(axleAngle))));

            this.chassis.axles.push(axleBody);
            this.chassis.springs.push(joint);

            // Wheel creation
            var wheelRadius = chromo.wheelRadii[i];
            var wheelOffset = planck.Vec2(-0.5, 0);
            var wheelWorldPos = axleBody.getWorldPoint(wheelOffset);
            
            var wheelBody = this.world.createBody({
                type: 'dynamic',
                position: wheelWorldPos,
                allowSleep: false
            });
            wheelBody.createFixture(
                new planck.CircleShape(wheelRadius),
                { density: 0.5, friction: 10, restitution: 0.1, ...carFilter }
            );

            var wheelJoint = this.world.createJoint(new planck.RevoluteJoint({
                enableMotor: true,
                collideConnected: false
            }, axleBody, wheelBody, wheelWorldPos));
            
            wheelJoint.setMotorSpeed(-6 * Math.PI);
            wheelJoint.setMaxMotorTorque(100); // Initial torque, will be adjusted in step if needed

            this.chassis.wheels.push({ body: wheelBody, joint: wheelJoint, radius: wheelRadius });
        }

        // Attach rendering data to chassis body
        this.chassis.vertices = this.vertices;
        this.chassis.color = { h: chromo.hue, s: chromo.sat, l: chromo.lit };

        // Game state tracking
        this.iteration = 0;
        this.maxPosition = 0;
        this.TRACK_LENGTH = 1500;
        this.MAX_ITERATION = 5 * 60 * 60; // 5 minutes at 60fps
        var wheelCount = this.chassis.wheels.length;
        this.torque = this.chassis.getMass() * 1.5 * 15 / Math.pow(2, Math.max(wheelCount - 1, 0));
    }

    World.prototype.step = function () {
        this.iteration++;
        var pos = this.chassis.getPosition();
        var dist = pos.x - this.startPos.x;
        if (dist > this.maxPosition) {
            this.maxPosition = dist;
        }

        // Apply torque to wheel motors
        for (var i = 0; i < this.chassis.wheels.length; i++) {
            this.chassis.wheels[i].joint.setMaxMotorTorque(this.torque);
        }

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

    World.prototype.getScore = function () {
        return Math.min(this.maxPosition, this.TRACK_LENGTH);
    };

    World.prototype.getSpeed = function () {
        var v = this.chassis.getLinearVelocity();
        return Math.sqrt(v.x * v.x + v.y * v.y);
    };

    World.prototype.getTorque = function () {
        return this.torque;
    };

    World.prototype.getTime = function () {
        return this.iteration / 60;
    };

    World.prototype.getRemainingTime = function () {
        return (this.MAX_ITERATION - this.iteration) / 60;
    };

    function resetWorld(chromo) {
        // Clear planck world automatically clears
        return new World(chromo);
    }

    return { load: loadTrack, World: World, reset: resetWorld };
})();
