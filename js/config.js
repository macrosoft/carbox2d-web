const Config = (function () {
    'use strict';

    return {
        // Сглаживание камеры (0..1)
        CAMERA_SMOOTH: 0.08,

        // Толщина дороги (half-height) — как в оригинале: TRACK_THICK = 0.15
        TRACK_THICK: 0.15,

        // Physics
        TIME_STEP: 1 / 60,
        VELOCITY_ITERATIONS: 8,
        POSITION_ITERATIONS: 8,
        CAMERA_Y_OFFSET: 2,
        MASS_MULT: 20,
        TRACK_HALF_W: 2,
        BREAK_STRENGTH: 50,
        MAX_SPARK_COUNT: 512,
        SPARK_IMPULSE_THRESHOLD: 32,

        // Chassis
        NUM_SEGMENTS: 8,
        NUM_COLORS: 16,
        MAX_BROKEN: 7,
        GRAVITY: -15,
        TRACK_FRICTION: 10,

        // Simulation
        TRACK_LENGTH: 1500,
        TIME_LIMIT: 300,

        // Rendering
        CAMERA_SCALE: 45,
        RGBA_ALPHA: 0.6,

        // Evolution
        POPULATION_SIZE: 32,
        ELITE_COUNT: 1,
        RANDOM_COUNT: 3,
        TOP_CROSS_COUNT: 4,
        MAX_DT: 0.1,

        // Chromosome encoding
        COLOR_RANGE: 256,
        MIN_ANGLE: 0.08,
        MIN_MAG: 0.1,
        MAX_MAG: 3.0,
        WHEEL_PROB0: 0.5,
        MIN_WHEEL: 0.1,
        MAX_WHEEL: 1.5,

        // Collision categories for physics filtering
        CAT_CAR: 0x0001,
        CAT_TRACK: 0x0002,
        CAT_DEBRIS: 0x0004,

        // World physics constants
        START_POS_X: -500,
        DROP_CLEARANCE: 2.0,
        MOTOR_SPEED: -6 * Math.PI,
        MAX_MOTOR_TORQUE: 100,
        SPRING_K: 7.5,
        SPRING_DAMPING_MULT: 40,
        SPRING_SPEED_MULT: -20,
        LOWER_TRANSLATION: -0.1,
        UPPER_TRANSLATION: 0.25,
        AXLE_BOX_OFFSET_X: -0.3,
        AXLE_BOX_OFFSET_Y: 0,
        WHEEL_OFFSET_X: -0.5,
        WHEEL_OFFSET_Y: 0,
        MOUNT_BOX_HW: 0.2,
        MOUNT_BOX_HH: 0.1,
        AXLE_BOX_HW: 0.2,
        AXLE_BOX_HH: 0.05,
        SLOW_THRESHOLD_X: 1,
        MAX_SLOW_NEAR: 300,
        MAX_SLOW_FAR: 180,
        DIST_THRESHOLD: 10,
        BACKWARD_DIST: -10
    };
})();
