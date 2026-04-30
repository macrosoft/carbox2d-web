var Renderer = (function () {

    var COLOR_BG         = '#FFFFC8';
    var COLOR_GRID_MINOR = '#CCCCCC';
    var COLOR_GRID_MAJOR = '#FF0080';
    var COLOR_TRACK       = 'rgba(0, 0, 0, 0.5)';

    var GRID_STEP    = 1;
    var GRID_MAJOR_X = 100;
    var GRID_MAJOR_Y = 20;
    var _trackCount = 0;
    var _trackData = null;

    /* TRACK_HALF_W, TRACK_THICK from config.js */

    function setTrackData(track) {
        _trackCount = track.count;
        _trackData = track.data;
    }

    function Renderer(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.dpr     = window.devicePixelRatio || 1;
        this.resize();
    }

    Renderer.prototype.setCamera = function (x, y) {
        this.cameraX = x;
        this.cameraY = y;
        this.targetX = x;
        this.targetY = y;
    };

    Renderer.prototype.resize = function () {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.canvas.width  = this.w * this.dpr;
        this.canvas.height = this.h * this.dpr;
        this.canvas.style.width  = this.w + 'px';
        this.canvas.style.height = this.h + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };

    Renderer.prototype.follow = function (x, y) {
        this.targetX = x;
        this.targetY = y + CAMERA_Y_OFFSET;
    };

    Renderer.prototype.updateCamera = function () {
        this.cameraX += (this.targetX - this.cameraX) * CAMERA_SMOOTH;
        this.cameraY += (this.targetY - this.cameraY) * CAMERA_SMOOTH;
    };

    Renderer.prototype.draw = function (box) {
        this.resize();
        this.updateCamera();

        var ctx   = this.ctx,
            w     = this.w,
            h     = this.h,
            camX  = this.cameraX,
            camY  = this.cameraY,
            scale = 32;

        var cx = camX * scale;
        var cy = camY * scale;

        var toX = function (wx) { return wx * scale - cx + w / 2; };
        var toY = function (wy) { return -wy * scale + cy + h / 2; };

        // ---- Фон ----
        ctx.fillStyle = COLOR_BG;
        ctx.fillRect(0, 0, w, h);

        // ---- Сетка ----
        var worldLeft   = Math.floor((camX - w / 2) / GRID_STEP) * GRID_STEP;
        var worldRight  = Math.ceil((camX + w / 2) / GRID_STEP) * GRID_STEP;
        var worldBottom = Math.floor((camY - h / 2) / GRID_STEP) * GRID_STEP;
        var worldTop    = Math.ceil((camY + h / 2) / GRID_STEP) * GRID_STEP;

        ctx.lineWidth = 0.5;

        for (var gx = worldLeft; gx <= worldRight; gx += GRID_STEP) {
            var sx = toX(gx);
            ctx.strokeStyle = (gx % GRID_MAJOR_X === 0) ? COLOR_GRID_MAJOR : COLOR_GRID_MINOR;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, h);
            ctx.stroke();
        }

        for (var gy = worldBottom; gy <= worldTop; gy += GRID_STEP) {
            var sy = toY(gy);
            ctx.strokeStyle = (gy % GRID_MAJOR_Y === 0) ? COLOR_GRID_MAJOR : COLOR_GRID_MINOR;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(w, sy);
            ctx.stroke();
        }

        // ---- Дорога ----
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = '#1a1a1a';

        drawRotRect(ctx, toX, toY, scale, -513, 0, 0, 10, TRACK_THICK);

        for (var i = 0; i < _trackCount; i++) {
            var base = i * 3;
            var segX = _trackData[base];
            var segY = _trackData[base + 1];
            var segAngle = _trackData[base + 2];
            drawRotRect(ctx, toX, toY, scale, segX, segY, segAngle, TRACK_HALF_W, TRACK_THICK);
        }

        // ---- Тестовый бокс ----
        if (box) {
            this.drawBox(box, toX, toY, scale);
        }
    };

    Renderer.prototype.drawBox = function (body, toX, toY, scale) {
        var ctx = this.ctx;
        var pos = body.getPosition();
        var angle = body.getAngle();
        var hw = scale; // box shape is 1x1, so half-width = 1
        var hh = scale;

        var sx = toX(pos.x);
        var sy = toY(pos.y);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle); // Canvas Y flipped → angle negated

        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
        ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
        ctx.restore();
    };

    function drawRotRect(ctx, toX, toY, scale, x, y, angle, hw, hh) {
        var sx = toX(x);
        var sy = toY(y);
        var rw = hw * 2 * scale;
        var rh = hh * 2 * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);
        ctx.fillStyle   = COLOR_TRACK;
        ctx.fillRect(-hw * scale, -hh * scale, rw, rh);
        ctx.strokeRect(-hw * scale, -hh * scale, rw, rh);
        ctx.restore();
    }

    return { setTrackData: setTrackData, Renderer: Renderer };

})();
