const CarFactory = (function () {
    'use strict';

    const CAR_FILTER = { filterCategoryBits: Config.CAT_CAR, filterMaskBits: Config.CAT_TRACK | Config.CAT_DEBRIS, filterGroupIndex: -1 };

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
        return Config.TRACK_THICK + Config.DROP_CLEARANCE - minLocalY;
    }

    function _createChassisBody(worldInstance, chromo) {
        return worldInstance.createBody({
            type: 'dynamic',
            position: planck.Vec2(Config.START_POS_X, computeDropY(chromo)),
            allowSleep: false,
            bullet: true
        });
    }

    function _createChassisFixtures(chassis, vertices) {
        const segFixtures = [];
        const segShapes = [];
        for (let i = 0; i < Config.NUM_SEGMENTS; i++) {
            const ni = (i + 1) % Config.NUM_SEGMENTS;
            const p1x = vertices[i + 1][0];
            const p1y = vertices[i + 1][1];
            const p2x = vertices[ni + 1][0];
            const p2y = vertices[ni + 1][1];

            const fixture = chassis.createFixture(
                new planck.PolygonShape([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]),
                { density: 2, friction: Config.TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
            );
            fixture.segmentIndex = i;
            segFixtures.push(fixture);
            segShapes.push([planck.Vec2(0, 0), planck.Vec2(p1x, p1y), planck.Vec2(p2x, p2y)]);
        }
        return { segFixtures, segShapes };
    }

    function _initChassisData(chassis, vertices, segColors, axleColors, segFixtures, segShapes) {
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
        chassis.segmentBreakFlags = new Array(Config.NUM_SEGMENTS).fill(false);
        chassis.wheelOnSegment = [];
        chassis.segFixtures = segFixtures;
        chassis.segShapes = segShapes;
    }

    function _createWheelAssembly(worldInstance, chassis, i, decoded, vertices) {
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
            return;
        }

        const px = vertices[segIdx + 1][0];
        const py = vertices[segIdx + 1][1];
        const axleAngle = decoded.axleAngles[i];

        const mountFixture = chassis.createFixture(
            new planck.BoxShape(Config.MOUNT_BOX_HW, Config.MOUNT_BOX_HH, planck.Vec2(px, py), axleAngle),
            { density: 2, friction: Config.TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
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
            new planck.BoxShape(Config.AXLE_BOX_HW, Config.AXLE_BOX_HH, planck.Vec2(Config.AXLE_BOX_OFFSET_X, Config.AXLE_BOX_OFFSET_Y), 0),
            { density: 20, friction: Config.TRACK_FRICTION, restitution: 0.05, ...CAR_FILTER }
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
            lowerTranslation: Config.LOWER_TRANSLATION,
            upperTranslation: Config.UPPER_TRANSLATION,
            enableLimit: true,
            enableMotor: true,
            collideConnected: false
        }, chassis, axleBody, worldAnchor, planck.Vec2(Math.cos(axleAngle), Math.sin(axleAngle))));

        chassis.axles.push(axleBody);
        chassis.springs.push(joint);

        const wheelRadius = decoded.wheelRadii[i];
        const wheelWorldPos = axleBody.getWorldPoint(planck.Vec2(Config.WHEEL_OFFSET_X, Config.WHEEL_OFFSET_Y));

        const wheelBody = worldInstance.createBody({
            type: 'dynamic',
            position: wheelWorldPos,
            allowSleep: false
        });
        wheelBody.createFixture(
            new planck.CircleShape(wheelRadius),
            { density: 0.5, friction: Config.TRACK_FRICTION, restitution: 0.1, ...CAR_FILTER }
        );

        const wheelJoint = worldInstance.createJoint(new planck.RevoluteJoint({
            enableMotor: true,
            collideConnected: false
        }, axleBody, wheelBody, wheelWorldPos));

        wheelJoint.setMotorSpeed(Config.MOTOR_SPEED);
        wheelJoint.setMaxMotorTorque(Config.MAX_MOTOR_TORQUE);

        chassis.wheels.push({ body: wheelBody, joint: wheelJoint, radius: wheelRadius });
    }

    function createCar(worldInstance, chromo) {
        const { decoded, vertices, segColors, axleColors } = CarBuilder.computeCarData(chromo);
        const chassis = _createChassisBody(worldInstance, chromo);
        const { segFixtures, segShapes } = _createChassisFixtures(chassis, vertices);
        _initChassisData(chassis, vertices, segColors, axleColors, segFixtures, segShapes);
        for (let i = 0; i < decoded.wheelOn.length; i++) {
            _createWheelAssembly(worldInstance, chassis, i, decoded, vertices);
        }
        return chassis;
    }

    return { createCar, computeDropY };
})();
