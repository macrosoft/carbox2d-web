// Конфигурация

// Сглаживание камеры (0..1)
const CAMERA_SMOOTH = 0.08;

// Толщина дороги (half-height) — как в оригинале: TRACK_THICK = 0.15
const TRACK_THICK = 0.15;

// Physics
const TIME_STEP = 1 / 60;
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 8;
const CAMERA_Y_OFFSET = 2;
const MASS_MULT = 20; // torque scaling
const TRACK_HALF_W = 2;
const BREAK_STRENGTH = 50; // impulse threshold for breakage
const MAX_SPARK_COUNT = 512;
const SPARK_IMPULSE_THRESHOLD = 32;

// Chassis
const NUM_SEGMENTS = 8;
const NUM_COLORS = 16; // NUM_SEGMENTS * 2
const MAX_BROKEN = 7;
const GRAVITY = -15;
const TRACK_FRICTION = 10;

// Simulation
const TRACK_LENGTH = 1500;
const TIME_LIMIT = 300; // seconds (5 min)

// Rendering
const CAMERA_SCALE = 45;
const RGBA_ALPHA = 0.6;

// Evolution
const POPULATION_SIZE = 32;
const ELITE_COUNT = 1;
const RANDOM_COUNT = 3;
const CROSSOVER_PAIRS = (POPULATION_SIZE - ELITE_COUNT - RANDOM_COUNT) / 2; // = 14
const MAX_DT = 0.1;

// Chromosome encoding
const COLOR_RANGE = 256;
const MIN_ANGLE = 0.08;
const MIN_MAG = 0.1;
const MAX_MAG = 3.0;
const WHEEL_PROB0 = 0.5;
const MIN_WHEEL = 0.1;
const MAX_WHEEL = 1.5;

// Track data: loaded asynchronously from js/track_data.bin via TrackLoader
