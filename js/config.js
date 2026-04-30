// Конфигурация

// Сглаживание камеры (0..1)
const CAMERA_SMOOTH = 0.08;

// Толщина дороги (half-height) — как в оригинале: TRACK_THICK = 0.15
const TRACK_THICK = 0.15;

// Physics
const TIME_STEP = 1 / 60;
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 3;
const CAMERA_Y_OFFSET = -1;
const TRACK_HALF_W = 2;

// Track data: loaded asynchronously from js/track_data.bin via TrackLoader
