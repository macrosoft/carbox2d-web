var World = (function () {
    var _trackCount = 0;
    var _trackData = null;

    function loadTrack(track) {
        _trackCount = track.count;
        _trackData = track.data;
    }

    function buildTrack(worldInstance) {
        var trackBody = worldInstance.createBody({ type: 'static', position: planck.Vec2(0, 0) });
        var trackFilter = { filterCategoryBits: 0x0002, filterMaskBits: 0x0001 };
        trackBody.createFixture(new planck.BoxShape(10, TRACK_THICK, planck.Vec2(-513, 0), 0),
                                { density: 0, friction: 10, restitution: 0, ...trackFilter });
        for (var i = 0; i < _trackCount; i++) {
            var base = i * 3;
            trackBody.createFixture(new planck.BoxShape(TRACK_HALF_W, TRACK_THICK, planck.Vec2(_trackData[base], _trackData[base + 1]), _trackData[base + 2]),
                                    { density: 0, friction: 10, restitution: 0, ...trackFilter });
        }
        return trackBody;
    }

    function decodeChromosome(genes) {
        var angles = [];
        var mags = [];
        var NUM = 8;
        var MIN_ANGLE = 0.08;
        var MIN_MAG = 0.1;
        var MAX_MAG = 3.0;

        var rawAngles = [];
        var sum = 0;
        for (var i = 0; i < NUM; i++) {
            var rawAngle = genes[i * 2] * (1 - MIN_ANGLE) + MIN_ANGLE;
            rawAngles.push(rawAngle);
            sum += rawAngle;
            mags.push(genes[i * 2 + 1] * (MAX_MAG - MIN_MAG) + MIN_MAG);
        }

        var cumulative = 0;
        for (var i = 0; i < NUM; i++) {
            angles.push(cumulative);
            cumulative += (rawAngles[i] / sum) * 2 * Math.PI;
        }

        var wheelOn = [];
        var axleAngles = [];
        var wheelRadii = [];
        var WHEEL_PROB0 = 0.5;
        var MIN_WHEEL = 0.1;
        var MAX_WHEEL = 1.5;

        for (var i = 0; i < NUM; i++) {
            var woGene = genes[16 + i * 3];
            if (woGene > WHEEL_PROB0) {
                wheelOn.push(-1);
            } else {
                wheelOn.push(i);
            }
            axleAngles.push(genes[16 + i * 3 + 1] * 2 * Math.PI);
            wheelRadii.push(genes[16 + i * 3 + 2] * (MAX_WHEEL - MIN_WHEEL) + MIN_WHEEL);
        }

        return {
            angles: angles,
            mags: mags,
            wheelOn: wheelOn,
            axleAngles: axleAngles,
            wheelRadii: wheelRadii
        };
    }

    function createCar(worldInstance, chromo) {
        var decoded = decodeChromosome(chromo.genes);
        var NUM = 8;

      var segColors = [];
        for (var i = 0; i < NUM; i++) {
            var c = chromo.colors[i];
            segColors.push('rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
        }

        var axleColors = [];
        for (var i = 0; i < NUM; i++) {
            var c = chromo.colors[8 + i];
            axleColors.push('rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
        }

      var chassis = worldInstance.createBody({
            type: 'dynamic',
            position: planck.Vec2(-500, 5),
            allowSleep: false,
            bullet: true
        });

        var vertices = [[0, 0]];
        var carFilter = {
            filterCategoryBits: 0x0001,
            filterMaskBits: 0x0002,
            filterGroupIndex: -1
        };

        for (var i = 0; i < NUM; i++) {
            var p1x = decoded.mags[i] * Math.cos(decoded.angles[i]);
            var p1y = decoded.mags[i] * Math.sin(decoded.angles[i]);
            vertices.push([p1x, p1y]);

            var ni = (i + 1) % NUM;
            var p2x = decoded.mags[ni] * Math.cos(decoded.angles[ni]);
            var p2y = decoded.mags[ni] * Math.sin(decoded.angles[ni]);

            chassis.createFixture(
                new planck.PolygonShape([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]),
                { density: 2, friction: 10, restitution: 0.05, ...carFilter }
            );
        }

        chassis.axles = [];
        chassis.springs = [];
        chassis.wheels = [];
        chassis.mountFixtures = [];
        chassis.axleBreakFlags = [];
        chassis.wheelActive = [];
        chassis.axleShapeSlots = [];
        chassis.colors = segColors;
        chassis.axleColors = axleColors;

        for (var i = 0; i < decoded.wheelOn.length; i++) {
            var segIdx = decoded.wheelOn[i];
            if (segIdx === -1) {
                chassis.mountFixtures.push(null);
                chassis.axleBreakFlags.push(false);
                chassis.wheelActive.push(false);
                chassis.axles.push(null);
                chassis.springs.push(null);
                chassis.wheels.push(null);
                chassis.axleShapeSlots.push(null);
                continue;
            }

            var angle = decoded.angles[segIdx];
            var mag = decoded.mags[segIdx];
            var px = mag * Math.cos(angle);
            var py = mag * Math.sin(angle);
            var axleAngle = decoded.axleAngles[i];

            var mountFixture = chassis.createFixture(
                new planck.BoxShape(0.2, 0.1, planck.Vec2(px, py), axleAngle),
                { density: 2, friction: 10, restitution: 0.05, ...carFilter }
            );
            mountFixture.axleMount = true;
            mountFixture.wheelIndex = i;
            mountFixture._breakMass = 2 * 0.04;
            chassis.mountFixtures.push(mountFixture);
            chassis.axleBreakFlags.push(false);
            chassis.wheelActive.push(true);

            var worldAnchor = chassis.getWorldPoint(planck.Vec2(px, py));
            var axleBody = worldInstance.createBody({
                type: 'dynamic',
                position: worldAnchor,
                angle: axleAngle
            });

            var axleFixture = axleBody.createFixture(
                new planck.BoxShape(0.2, 0.05, planck.Vec2(-0.3, 0), 0),
                { density: 20, friction: 10, restitution: 0.05, ...carFilter }
            );
            axleFixture.axleBodyFixture = true;
            axleFixture.wheelIndex = i;
            chassis.axleShapeSlots.push({
                fixture: axleFixture,
                body: axleBody,
                localMount: planck.Vec2(px, py),
                mountPx: px,
                mountPy: py,
                mountAngle: axleAngle,
                colorIndex: segIdx
            });

            var joint = worldInstance.createJoint(new planck.PrismaticJoint({
                lowerTranslation: -0.1,
                upperTranslation: 0.25,
                enableLimit: true,
                enableMotor: true,
                collideConnected: false
            }, chassis, axleBody, worldAnchor, planck.Vec2(Math.cos(axleAngle), Math.sin(axleAngle))));

            chassis.axles.push(axleBody);
            chassis.springs.push(joint);

            var wheelRadius = decoded.wheelRadii[i];
            var wheelOffset = planck.Vec2(-0.5, 0);
            var wheelWorldPos = axleBody.getWorldPoint(wheelOffset);

            var wheelBody = worldInstance.createBody({
                type: 'dynamic',
                position: wheelWorldPos,
                allowSleep: false
            });
            wheelBody.createFixture(
                new planck.CircleShape(wheelRadius),
                { density: 0.5, friction: 10, restitution: 0.1, ...carFilter }
            );

            var wheelJoint = worldInstance.createJoint(new planck.RevoluteJoint({
                enableMotor: true,
                collideConnected: false
            }, axleBody, wheelBody, wheelWorldPos));

            wheelJoint.setMotorSpeed(-6 * Math.PI);
            wheelJoint.setMaxMotorTorque(100);

            chassis.wheels.push({ body: wheelBody, joint: wheelJoint, radius: wheelRadius });
        }

        chassis.vertices = vertices;

        return chassis;
    }

    function World(chromo) {
        this.chromo = chromo;

        this.world = new planck.World({
            gravity: planck.Vec2(0, -15),
            continuousPhysics: true,
            autoClearForces: true
        });

        this.trackBody = buildTrack(this.world);
        this.chassis = createCar(this.world, chromo);
        this.startPos = planck.Vec2(-500, 4);

        this.iteration = 0;
        this.maxPosition = 0;
        this.TRACK_LENGTH = 1500;
        this.MAX_ITERATION = 5 * 60 * 60;
        this.slow = 0;
        this.prevDist = 0;
        this.stopped = false;

        var wheelCount = this.chassis.wheels.filter(function(w) { return w !== null; }).length;
        this.torque = this.chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(wheelCount - 1, 0));

        var self = this;
        this.world.on("post-solve", function(contact, impulse) {
            self.onPostSolve(contact, impulse);
        });
    };

    World.prototype.reset = function (newChromo) {
        if (newChromo) this.chromo = newChromo;

        this.world = new planck.World({
            gravity: planck.Vec2(0, -15),
            continuousPhysics: true,
            autoClearForces: true
        });

        this.trackBody = buildTrack(this.world);
        this.chassis = createCar(this.world, this.chromo);
        this.iteration = 0;
        this.maxPosition = 0;
        this.slow = 0;
        this.prevDist = 0;
        this.stopped = false;

        var wheelCount2 = this.chassis.wheels.filter(function(w) { return w !== null; }).length;
        this.torque = this.chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(wheelCount2 - 1, 0));

        var self = this;
        this.world.on("post-solve", function(contact, impulse) {
            self.onPostSolve(contact, impulse);
        });
    };

 World.prototype.onPostSolve = function(contact, impulse) {
        for (var fb = 0; fb < 2; fb++) {
            var fixture = (fb === 0) ? contact.getFixtureA() : contact.getFixtureB();
            var wheelIdx = -1;
            if (fixture.axleMount) {
                wheelIdx = fixture.wheelIndex;
            } else if (fixture.axleBodyFixture) {
                wheelIdx = fixture.wheelIndex;
            }
            if (wheelIdx === -1) continue;

            var impulses = impulse.normalImpulses;
            var maxImpulse = 0;
            for (var ii = 0; ii < impulses.length; ii++) {
                if (impulses[ii] > maxImpulse) maxImpulse = impulses[ii];
            }

            // Per-fixture mass: density * area (as in original C++)
            var density = fixture.m_density;
            var area;
            var shape = fixture.m_shape;
            if (shape.m_radius) {
                area = Math.PI * shape.m_radius * shape.m_radius;
            } else if (shape.m_vertices) {
                var verts = shape.m_vertices;
                area = 0;
                for (var j = 0; j < verts.length; j++) {
                    var j2 = (j + 1) % verts.length;
                    area += verts[j].x * verts[j2].y - verts[j2].x * verts[j].y;
                }
                area = Math.abs(area) / 2;
            } else {
                area = 1;
            }
            var mass = density * area;
            var strength = BREAK_STRENGTH * mass;
            if (strength < maxImpulse) {
                this.chassis.axleBreakFlags[wheelIdx] = true;
                return;
            }
        }
    };

    World.prototype.processBreakage = function () {
        var chassis = this.chassis;
        for (var i = 0; i < chassis.axleBreakFlags.length; i++) {
            if (!chassis.axleBreakFlags[i]) continue;
            chassis.axleBreakFlags[i] = false;

            if (!chassis.wheelActive[i]) continue;

            // Destroy the prismatic joint (spring)
            var spring = chassis.springs[i];
            if (spring) {
                this.world.destroyJoint(spring);
                chassis.springs[i] = null;
            }

            // Remove mount fixture from chassis
            var mountFixture = chassis.mountFixtures[i];
            if (mountFixture) {
                chassis.destroyFixture(mountFixture);
                chassis.mountFixtures[i] = null;
            }

            // Recreate fixtures on axle body (mount + axle, now free-flying)
            var slot = chassis.axleShapeSlots[i];
            if (slot) {
                // Remove old tagged axle fixture
                slot.body.destroyFixture(slot.fixture);

                // Recreate axle box (density=20, offset -0.3)
                slot.body.createFixture(
                    new planck.BoxShape(0.2, 0.05, planck.Vec2(-0.3, 0), 0),
                    { density: 20, friction: 10, restitution: 0.05,
                      filterCategoryBits: 0x0001, filterMaskBits: 0x0002, filterGroupIndex: -1 }
                );

               // Recreate mount box on axle body (was on chassis, now flies with axle)
                // Axle body was created with angle=mountAngle, so fixture angle 0 = same world orientation
                slot.body.createFixture(
                    new planck.BoxShape(0.2, 0.1, planck.Vec2(0, 0), 0),
                    { density: 2, friction: 10, restitution: 0.05,
                      filterCategoryBits: 0x0001, filterMaskBits: 0x0002, filterGroupIndex: -1 }
                );
            }

            // Disable wheel motor
            var wheel = chassis.wheels[i];
            if (wheel) {
                wheel.joint.setMotorSpeed(0);
                wheel.joint.setMaxMotorTorque(0);
            }

            chassis.wheelActive[i] = false;

            // Recalculate torque
            var activeCount = chassis.wheelActive.filter(function(a) { return a; }).length;
            this.torque = chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(activeCount - 1, 0));
        }
    };

    World.prototype.step = function () {
        for (var i = 0; i < this.chassis.wheels.length; i++) {
            var wheel = this.chassis.wheels[i];
            if (wheel && this.chassis.wheelActive[i]) {
                wheel.joint.setMaxMotorTorque(this.torque);
            }
        }

        var baseSpringForce = 7.5 * this.chassis.getMass();
        for (var i = 0; i < this.chassis.springs.length; i++) {
            var joint = this.chassis.springs[i];
            if (!joint) continue;
            var translation = joint.getJointTranslation();
            joint.setMaxMotorForce(baseSpringForce + 40 * baseSpringForce * translation * translation);
            joint.setMotorSpeed(-20 * translation);
        }

        this.world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);

        this.processBreakage();

        this.iteration++;
        var pos = this.chassis.getPosition();
        var rawX = pos.x;
        var dist = rawX - this.startPos.x;
        if (dist > this.maxPosition) {
            this.maxPosition = dist;
        }
        if (dist > this.prevDist + 1) {
            this.slow = 0;
            this.prevDist = dist;
        } else {
            var vel = this.chassis.getLinearVelocity();
            if (vel.x < 1) this.slow++;
        }

        var maxSlow = dist > 10 ? 300 : 180;
        this.stopped = this.slow >= maxSlow
                      || dist >= this.TRACK_LENGTH
                      || this.iteration > this.MAX_ITERATION
                      || dist < -10;
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

    World.prototype.isStopped = function () {
        return this.stopped;
    };

    function resetWorld(chromo) {
        return new World(chromo);
    }

    return { load: loadTrack, World: World, reset: resetWorld };
})();
