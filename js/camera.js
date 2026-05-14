const Camera = (function () {
    'use strict';

    function Camera(canvas) {
        this.canvas = canvas;
        this.cameraX = 0;
        this.cameraY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.w = 0;
        this.h = 0;
        this.resize();
    }

    Camera.prototype.resize = function () {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.canvas.width = this.w * this.dpr;
        this.canvas.height = this.h * this.dpr;
    };

    Camera.prototype.setCamera = function (x, y) {
        this.cameraX = x;
        this.cameraY = y;
        this.targetX = x;
        this.targetY = y;
    };

    Camera.prototype.follow = function (x, y) {
        this.targetX = x;
        this.targetY = y + CAMERA_Y_OFFSET;
    };

    Camera.prototype.updateCamera = function () {
        this.cameraX = this.targetX;
        this.cameraY += (this.targetY - this.cameraY) * CAMERA_SMOOTH;
    };

    Camera.prototype.getTransform = function (scale) {
        const cx = this.cameraX * scale;
        const cy = this.cameraY * scale;
        const w = this.w;
        const h = this.h;
        return {
            toX: function (wx) { return wx * scale - cx + w / 2; },
            toY: function (wy) { return -wy * scale + cy + h / 2; }
        };
    };

    return { Camera: Camera };
})();
