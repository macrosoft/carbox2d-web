const World = (function () {
    'use strict';

    const CAR_FILTER = { filterCategoryBits: 0x0001, filterMaskBits: 0x0002 | 0x0004, filterGroupIndex: -1 };
    const DEBRIS_FILTER = { filterCategoryBits: 0x0004, filterMaskBits: 0x0001 | 0x0002 | 0x0004 };
    const TRACK_FILTER = { filterCategoryBits: 0x0002, filterMaskBits: 0x0001 | 0x0004 };
    const START_POS_X = -500;
    const DROP_CLEARANCE = 2.0;
    const MOTOR_SPEED = -6 * Math.PI;
    const MAX_MOTOR_TORQUE = 100;
    const SPRING_K = 7.5;
    const SPRING_DAMPING_MULT = 40;
    const SPRING_SPEED_MULT = -20;
    const LOWER_TRANSLATION = -0.1;
    const UPPER_TRANSLATION = 0.25;
    const AXLE_BOX_OFFSET = planck.Vec2(-0.3, 0);
    const WHEEL_OFFSET = planck.Vec2(-0.5, 0);
    const MOUNT_BOX_HW = 0.2;
    const MOUNT_BOX_HH = 0.1;
    const AXLE_BOX_HW = 0.2;
    const AXLE_BOX_HH = 0.05;
    const SLOW_THRESHOLD_X = 1;
    const MAX_SLOW_NEAR = 300;
    const MAX_SLOW_FAR = 180;
    const DIST_THRESHOLD = 10;
    const BACKWARD_DIST = -10;

    let _trackCount = 0;
    let _trackData = null;

    function loadTrack(track) {
        _trackCount = track.count;
        _trackData = track.data;
    }

    function computeDropY(chromo) {
        const { vertices, wheels } = CarBuilder.computeCarData(chromo);
        let minLocalY = 0;
        for (let i = 1; i < vertices.length; i++) {
            if (vertices[i][1] < minLocalY) {
                minLocalY = vertices[i][1];
            }
        }
        for (let i = 0; i < wheels.length; i++) {
            if (wheels[i]) {
                const wheelBottom = wheels[i].pos.y - wheels[i].radius;
                if (wheelBottom < minLocalY) {
                    minLocalY = wheelBottom;
                }
            }
        }
        return TRACK_THICK + DROP_CLEARANCE - minLocalY;
    }

    function calcTorque(chassis) {
        const wheelCount = chassis.wheels.filter(w => w !== null).length;
        return chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(wheelCount - 1, 0));
    }

    function buildTrack(worldInstance) {
        const trackBody = worldInstance.createBody({ type: 'static', position: planck.Vec2(0, 0) });

        trackBody.createFixture(
            new planck.BoxShape(10, TRACK_THICK, planck.Vec2(-513, 0), 0),
            { density: 0, friction: TRACK_FRICTION, restitution: 0, ...TRACK_FILTER }
        );

        for (let i = 0; i < _trackCount; i++) {
            const base = i * 3;
            trackBody.createFixture(
                new planck.BoxShape(TRACK_HALF_W, TRACK_THICK, planck.Vec2(_trackData[base], _trackData[base + 1]), _trackData[base + 2]),
                { density: 0, friction: TRACK_FRICTION, restitution: 0, ...TRACK_FILTER }
            );
        }

        return trackBody;
    }

    function cloneShape(fixture) {
        const shape = fixture.getShape();
        if (shape.m_vertices) {
            const verts = shape.m_vertices;
            const cloned = [];
            for (let i = 0; i < verts.length; i++) {
                cloned.push(planck.Vec2(verts[i].x, verts[i].y));
            }
            return new planck.PolygonShape(cloned);
        } else if (shape.m_radius !== undefined) {
            return new planck.CircleShape(shape.m_radius);
        }
        return null;
    }

    function createCar(worldInstance, chromo) {
        const { decoded, vertices, segColors, axleColors } = CarBuilder.computeCarData(chromo);

        const chassis = worldInstance.createBody({
            type: 'dynamic',
            position: planck.Vec2(START_POS_X, computeDropY(chromo)),
            allowSleep: false,
            bullet: true
        });

        const segFixtures = [];
        const segShapes = [];
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const ni = (i + 1) % NUM_SEGMENTS;
            const p1x = vertices[i + 1][0];
            const p1y = vertices[i + 1][1];
            const p2x = vertices[ni + 1][0];
            const p2y = vertices[ni + 1][1];

            const fixture = chassis.createFixture(
                new planck.PolygonShape([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]),
                { density: 2, friction: TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
            );
            fixture.segmentIndex = i;
            segFixtures.push(fixture);
            segShapes.push([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]);
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
        chassis.vertices = vertices;
        chassis.debris = [];
        chassis.brokeNum = 0;
        chassis.segmentBreakFlags = new Array(NUM_SEGMENTS).fill(false);
        chassis.wheelOnSegment = [];
        chassis.segFixtures = segFixtures;
        chassis.segShapes = segShapes;

        for (let i = 0; i < decoded.wheelOn.length; i++) {
            const segIdx = decoded.wheelOn[i];
            if (segIdx === -1) {
                chassis.mountFixtures.push(null);
                chassis.axleBreakFlags.push(false);
                chassis.wheelActive.push(false);
                chassis.axles.push(null);
                chassis.springs.push(null);
                chassis.wheels.push(null);
                chassis.axleShapeSlots.push(null);
                chassis.wheelOnSegment.push(-1);
                continue;
            }

            const px = vertices[segIdx + 1][0];
            const py = vertices[segIdx + 1][1];
            const axleAngle = decoded.axleAngles[i];

            const mountFixture = chassis.createFixture(
                new planck.BoxShape(MOUNT_BOX_HW, MOUNT_BOX_HH, planck.Vec2(px, py), axleAngle),
                { density: 2, friction: TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
            );
            mountFixture.axleMount = true;
            mountFixture.wheelIndex = i;
            mountFixture._breakMass = 2 * 0.04;
            chassis.mountFixtures.push(mountFixture);
            chassis.axleBreakFlags.push(false);
            chassis.wheelActive.push(true);
            chassis.wheelOnSegment.push(segIdx);

            const worldAnchor = chassis.getWorldPoint(planck.Vec2(px, py));
            const axleBody = worldInstance.createBody({
                type: 'dynamic',
                position: worldAnchor,
                angle: axleAngle
            });

            const axleFixture = axleBody.createFixture(
                new planck.BoxShape(AXLE_BOX_HW, AXLE_BOX_HH, AXLE_BOX_OFFSET, 0),
                { density: 20, friction: TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
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

            const joint = worldInstance.createJoint(new planck.PrismaticJoint({
                lowerTranslation: LOWER_TRANSLATION,
                upperTranslation: UPPER_TRANSLATION,
                enableLimit: true,
                enableMotor: true,
                collideConnected: false
            }, chassis, axleBody, worldAnchor, planck.Vec2(Math.cos(axleAngle), Math.sin(axleAngle))));

            chassis.axles.push(axleBody);
            chassis.springs.push(joint);

            const wheelRadius = decoded.wheelRadii[i];
            const wheelWorldPos = axleBody.getWorldPoint(WHEEL_OFFSET);

            const wheelBody = worldInstance.createBody({
                type: 'dynamic',
                position: wheelWorldPos,
                allowSleep: false
            });
            wheelBody.createFixture(
                new planck.CircleShape(wheelRadius),
                { density: 0.5, friction: TRACK_FRICTION, restitution: 0.1, ...CAR_FILTER }
            );

            const wheelJoint = worldInstance.createJoint(new planck.RevoluteJoint({
                enableMotor: true,
                collideConnected: false
            }, axleBody, wheelBody, wheelWorldPos));

            wheelJoint.setMotorSpeed(MOTOR_SPEED);
            wheelJoint.setMaxMotorTorque(MAX_MOTOR_TORQUE);

            chassis.wheels.push({ body: wheelBody, joint: wheelJoint, radius: wheelRadius });
        }

        return chassis;
    }

    function initPhysics(worldInstance) {
        worldInstance.world = new planck.World({
            gravity: planck.Vec2(0, GRAVITY),
            continuousPhysics: true,
            autoClearForces: true
        });
        worldInstance.trackBody = buildTrack(worldInstance.world);
        worldInstance.world.on('post-solve', (contact, impulse) => worldInstance.onPostSolve(contact, impulse));
    }

    function World(chromo) {
        this.chromo = chromo;
        initPhysics(this);
        this.chassis = createCar(this.world, chromo);
        this.startPos = planck.Vec2(START_POS_X, computeDropY(chromo));

        this.iteration = 0;
        this.maxPosition = 0;
        this.furthestPos = null;
        this.TRACK_LENGTH = TRACK_LENGTH;
        this.MAX_ITERATION = TIME_LIMIT * 60;
        this.slow = 0;
        this.prevDist = 0;
        this.stopped = false;

        this.torque = calcTorque(this.chassis);
        this.sparks = [];
        this.sparkList = [];
    }

    World.prototype.reset = function (newChromo) {
        if (newChromo) this.chromo = newChromo;
        initPhysics(this);
        this.chassis = createCar(this.world, this.chromo);
        this.startPos = planck.Vec2(START_POS_X, computeDropY(this.chromo));
        this.iteration = 0;
        this.maxPosition = 0;
        this.furthestPos = null;
        this.slow = 0;
        this.prevDist = 0;
        this.stopped = false;
        this.torque = calcTorque(this.chassis);
        this.sparks = [];
        this.sparkList = [];
    };

    function getFixtureMass(fixture) {
        const md = { mass: 0, center: planck.Vec2(0, 0), I: 0 };
        fixture.getMassData(md);
        return md.mass;
    }

    World.prototype.onPostSolve = function(contact, impulse) {
        for (let fb = 0; fb < 2; fb++) {
            const fixture = fb === 0 ? contact.getFixtureA() : contact.getFixtureB();
            const maxImpulse = Math.max(...impulse.normalImpulses);

            let fixtureColor = null;

            const segIdx = fixture.segmentIndex;
            if (segIdx !== undefined && segIdx !== null) {
                fixtureColor = this.chassis.colors ? this.chassis.colors[segIdx] : null;

                if (this.chassis.segFixtures[segIdx]) {
                    const mass = getFixtureMass(fixture);
                    const strength = BREAK_STRENGTH * mass;
                    if (strength < maxImpulse) {
                        this.chassis.segmentBreakFlags[segIdx] = true;
                    }
                }
            }

            const wheelIdx = fixture.axleMount || fixture.axleBodyFixture ? fixture.wheelIndex : -1;
            if (wheelIdx !== -1) {
                fixtureColor = this.chassis.axleColors ? this.chassis.axleColors[wheelIdx] : null;

                const mass = getFixtureMass(fixture);
                const strength = BREAK_STRENGTH * mass;
                if (strength < maxImpulse) {
                    this.chassis.axleBreakFlags[wheelIdx] = true;
                }
            }

            if (fixtureColor) {
                const wm = contact.getWorldManifold();
                if (wm && wm.points) {
                    for (let i = 0; i < wm.pointCount; i++) {
                        this.addSparksList(
                            impulse.normalImpulses[i] || maxImpulse,
                            wm.points[i],
                            fixtureColor
                        );
                    }
                }
            }
        }
    };

    World.prototype.destroyWheel = function (i) {
        const chassis = this.chassis;
        const spring = chassis.springs[i];
        if (spring) {
            this.world.destroyJoint(spring);
            chassis.springs[i] = null;
        }

        const mountFixture = chassis.mountFixtures[i];
        if (mountFixture) {
            chassis.destroyFixture(mountFixture);
            chassis.mountFixtures[i] = null;
        }

        const slot = chassis.axleShapeSlots[i];
        if (slot) {
            slot.body.destroyFixture(slot.fixture);
            slot.body.createFixture(
                new planck.BoxShape(AXLE_BOX_HW, AXLE_BOX_HH, AXLE_BOX_OFFSET, 0),
                { density: 20, friction: TRACK_FRICTION, restitution: 0.05, ...DEBRIS_FILTER }
            );
            slot.body.createFixture(
                new planck.BoxShape(MOUNT_BOX_HW, MOUNT_BOX_HH, planck.Vec2(0, 0), 0),
                { density: 2, friction: TRACK_FRICTION, restitution: 0.05, ...DEBRIS_FILTER }
            );
        }

        const wheel = chassis.wheels[i];
        if (wheel) {
            wheel.joint.setMotorSpeed(0);
            wheel.joint.setMaxMotorTorque(0);
        }

        chassis.wheelActive[i] = false;
    };

    World.prototype.recalcTorque = function () {
        const activeWheels = this.chassis.wheelActive.filter(a => a).length;
        this.torque = this.chassis.getMass() * MASS_MULT / Math.pow(2, Math.max(activeWheels - 1, 0));
    };

    World.prototype.addSparksList = function (impulses, pos, color) {
        if (impulses > SPARK_IMPULSE_THRESHOLD) {
            const count = Math.min(Math.floor(impulses / 4), 32);
            this.sparkList.push({ count, pos: planck.Vec2(pos.x, pos.y), color });
        }
    };

    World.prototype.updateSparks = function () {
        const world = this.world;

        while (this.sparkList.length > 0) {
            const entry = this.sparkList.shift();
            for (let i = 0; i < entry.count; i++) {
                if (this.sparks.length >= MAX_SPARK_COUNT) continue;

                const hw = Math.random() / 30 + 0.02;
                const hh = Math.random() / 30 + 0.02;

                const body = world.createBody({
                    type: 'dynamic',
                    position: entry.pos,
                    allowSleep: false,
                    bullet: true
                });
                body.createFixture(new planck.BoxShape(hw, hh), {
                    density: 0.5,
                    restitution: 0.7,
                    filterCategoryBits: 0x0003,
                    filterMaskBits: 0x0002,
                    filterGroupIndex: -1
                });

                const speed = Math.max(3.0, this.getSpeed());
                const vx = (Math.random() * 0.75 + 0.25) * speed * 2 - speed;
                const vy = (Math.random() * 0.75 + 0.25) * speed;
                body.setLinearVelocity(planck.Vec2(vx, vy));

                this.sparks.push({ body, color: entry.color });
            }
        }

        let i = 0;
        while (i < this.sparks.length) {
            const vel = this.sparks[i].body.getLinearVelocity();
            if (Math.abs(vel.x) < 0.01 && Math.abs(vel.y) < 0.01) {
                world.destroyBody(this.sparks[i].body);
                this.sparks.splice(i, 1);
                continue;
            }
            i++;
        }
    };

    World.prototype.breakSegment = function (i) {
        const chassis = this.chassis;
        const fixture = chassis.segFixtures[i];
        if (!fixture) return;

        chassis.brokeNum++;

        const shape = cloneShape(fixture);
        const pos = chassis.getPosition();
        const angle = chassis.getAngle();
        const vel = chassis.getLinearVelocity();

        chassis.destroyFixture(fixture);
        chassis.segFixtures[i] = null;

        const debrisBody = this.world.createBody({
            type: 'dynamic',
            position: pos,
            angle: angle,
            allowSleep: false
        });
        debrisBody.createFixture(shape, { density: 2, friction: TRACK_FRICTION, restitution: 0.05, ...DEBRIS_FILTER });
        debrisBody.setLinearVelocity(vel);

        chassis.debris.push({ body: debrisBody, color: chassis.colors[i] });

        for (let w = 0; w < chassis.wheelOnSegment.length; w++) {
            if (chassis.wheelOnSegment[w] === i && chassis.wheelActive[w]) {
                this.destroyWheel(w);
            }
        }

        this.recalcTorque();
    };

    World.prototype.processBreakage = function () {
        const chassis = this.chassis;

        for (let i = 0; i < NUM_SEGMENTS; i++) {
            if (!chassis.segmentBreakFlags[i]) continue;
            chassis.segmentBreakFlags[i] = false;
            if (!chassis.segFixtures[i]) continue;
            if (chassis.brokeNum >= MAX_BROKEN) continue;
            this.breakSegment(i);
        }

        for (let i = 0; i < chassis.axleBreakFlags.length; i++) {
            if (!chassis.axleBreakFlags[i]) continue;
            chassis.axleBreakFlags[i] = false;
            if (!chassis.wheelActive[i]) continue;
            this.destroyWheel(i);
            this.recalcTorque();
        }
    };

    World.prototype.step = function () {
        for (let i = 0; i < this.chassis.wheels.length; i++) {
            const wheel = this.chassis.wheels[i];
            if (wheel && this.chassis.wheelActive[i]) {
                wheel.joint.setMaxMotorTorque(this.torque);
            }
        }

        const baseSpringForce = SPRING_K * this.chassis.getMass();
        for (let i = 0; i < this.chassis.springs.length; i++) {
            const joint = this.chassis.springs[i];
            if (!joint) continue;
            const translation = joint.getJointTranslation();
            joint.setMaxMotorForce(baseSpringForce + SPRING_DAMPING_MULT * baseSpringForce * translation * translation);
            joint.setMotorSpeed(SPRING_SPEED_MULT * translation);
        }

        this.world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
        this.processBreakage();
        this.updateSparks();

        this.iteration++;
        const pos = this.chassis.getPosition();
        const dist = pos.x - this.startPos.x;

        if (dist > this.maxPosition) {
            this.maxPosition = dist;
            this.furthestPos = { x: pos.x, y: pos.y };
        }

        if (dist > this.prevDist + 1) {
            this.slow = 0;
            this.prevDist = dist;
        } else {
            const vel = this.chassis.getLinearVelocity();
            if (vel.x < SLOW_THRESHOLD_X) this.slow++;
        }

        const maxSlow = dist > DIST_THRESHOLD ? MAX_SLOW_NEAR : MAX_SLOW_FAR;
        this.stopped = this.slow >= maxSlow
            || dist >= this.TRACK_LENGTH
            || this.iteration > this.MAX_ITERATION
            || dist < BACKWARD_DIST
            || this.chassis.brokeNum >= MAX_BROKEN;
    };

    World.prototype.getChassisPos = function () {
        const p = this.chassis.getPosition();
        return { x: p.x, y: p.y };
    };

    World.prototype.getScore = function () {
        return Math.min(this.maxPosition, this.TRACK_LENGTH);
    };

    World.prototype.getSpeed = function () {
        const v = this.chassis.getLinearVelocity();
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

    return { load: loadTrack, World, reset: resetWorld, getCarGeometry: CarBuilder.getCarGeometry };
})();
