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
        this.cameraX = this.targetX;
        this.cameraY += (this.targetY - this.cameraY) * CAMERA_SMOOTH;
    };

    Renderer.prototype.drawLightChassis = function (geometry, x, y, scale, angle) {
        var ctx = this.ctx;
        var sx = x * scale;
        var sy = -y * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);

        // Wheels
        if (geometry.wheels) {
            geometry.wheels.forEach(function(wheel) {
                if (!wheel) return;
                var wx = wheel.pos.x * scale;
                var wy = -wheel.pos.y * scale;
                var wr = wheel.radius * scale;

                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(-wheel.angle);
                ctx.beginPath();
                ctx.arc(0, 0, wr, 0, 2 * Math.PI);
                ctx.fillStyle = COLOR_TRACK;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            });
        }

        // Axles
        if (geometry.wheels) {
            geometry.wheels.forEach(function(wheel, idx) {
                if (!wheel) return;
                var ax = wheel.pos.x * scale;
                var ay = -wheel.pos.y * scale;
                var axleColor = geometry.axleColors && geometry.axleColors[idx] ? geometry.axleColors[idx] : 'rgb(128,128,128)';

                ctx.save();
                ctx.translate(ax, ay);
                ctx.rotate(-wheel.angle);
                ctx.fillStyle = axleColor;
                ctx.strokeStyle = axleColor;
                ctx.lineWidth = 1;
                ctx.fillRect(-0.2 * scale, -0.05 * scale, 0.4 * scale, 0.1 * scale);
                ctx.strokeRect(-0.2 * scale, -0.05 * scale, 0.4 * scale, 0.1 * scale);
                ctx.restore();
            });
        }

        // Chassis fills
        var vVerts = geometry.vertices;
        var vSegColors = geometry.colors;
        var vNUM = vSegColors ? vSegColors.length : 8;
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        for (var i = 0; i < vNUM; i++) {
            var vv0 = vVerts[0];
            var vv1 = vVerts[i + 1];
            var vv2 = vVerts[(i + 2) > vNUM ? 1 : i + 2];
            var vCol = vSegColors[i] || 'rgb(128,128,128)';
            ctx.beginPath();
            ctx.moveTo(vv0[0] * scale, -vv0[1] * scale);
            ctx.lineTo(vv1[0] * scale, -vv1[1] * scale);
            ctx.lineTo(vv2[0] * scale, -vv2[1] * scale);
            ctx.closePath();
            ctx.fillStyle = vCol.replace('rgb', 'rgba').replace(')', ',0.6)');
            ctx.fill();
            ctx.strokeStyle = vCol;
            ctx.stroke();
        }

        ctx.restore();
    };

    Renderer.prototype.draw = function (chassis, parentChromos) {
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

        ctx.fillStyle = COLOR_BG;
        ctx.fillRect(0, 0, w, h);

        // Grid
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

        // Track
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = '#1a1a1a';

        drawRotRect(ctx, toX, toY, scale, -513, 0, 0, 10, TRACK_THICK);

        for (var i = 0; i < _trackCount; i++) {
            var base = i * 3;
            drawRotRect(ctx, toX, toY, scale, _trackData[base], _trackData[base + 1], _trackData[base + 2], TRACK_HALF_W, TRACK_THICK);
        }

        // Chassis
        if (chassis) {
            this.drawChassis(chassis, toX, toY, scale);
        }

        if (parentChromos && parentChromos.length > 0) {
            var frameW = 120;
            var frameH = 72;
            var frameX = w - frameW - 20;
            var frameY = h - frameH - 20;
            var pScale = 12;
            var self = this;

            parentChromos.forEach(function(pc, idx) {
                var px = frameX - idx * (frameW + 10);
                var py = frameY;
                ctx.fillStyle = 'rgba(255, 255, 200, 0.7)';
                ctx.fillRect(px, py, frameW, frameH);
                ctx.strokeStyle = '#888';
                ctx.strokeRect(px, py, frameW, frameH);

                var geom = World.getCarGeometry(pc);
                ctx.save();
                ctx.translate(px + frameW / 2, py + frameH / 2);
                self.drawLightChassis(geom, 0, 0, pScale, 0);
                ctx.restore();
            });
        }
    };

    Renderer.prototype.drawChassis = function (chassis, toX, toY, scale) {
        var ctx = this.ctx;

        if (chassis.debris) {
            for (var d = 0; d < chassis.debris.length; d++) {
                this.drawDebrisPiece(chassis.debris[d], toX, toY, scale);
            }
        }

        if (chassis.wheels) {
            chassis.wheels.forEach(function(wheel) {
                if (!wheel) return;
                var wPos = wheel.body.getPosition();
                var wAngle = wheel.body.getAngle();
                var wx = toX(wPos.x);
                var wy = toY(wPos.y);
                var wr = wheel.radius * scale;

                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(-wAngle);

                ctx.beginPath();
                ctx.arc(0, 0, wr, 0, 2 * Math.PI);
                ctx.fillStyle = COLOR_TRACK;
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wr, 0);
                ctx.strokeStyle = '#000';
                ctx.stroke();

                ctx.restore();
            });
        }

        if (chassis.axles) {
            chassis.axles.forEach(function(axle, idx) {
                if (!axle) return;
                var aPos = axle.getPosition();
                var aAngle = axle.getAngle();
                var ax = toX(aPos.x);
                var ay = toY(aPos.y);

                var axleColor = chassis.axleColors && chassis.axleColors[idx] ? chassis.axleColors[idx] : 'rgb(128,128,128)';

                ctx.save();
                ctx.translate(ax, ay);
                ctx.rotate(-aAngle);
                ctx.fillStyle = axleColor;
                ctx.strokeStyle = axleColor;
                ctx.lineWidth = 1;

                var fix = axle.getFixtureList();
                while (fix) {
                    var shape = fix.getShape();
                    if (shape.m_vertices && shape.m_vertices.length === 4) {
                        ctx.beginPath();
                        ctx.moveTo(shape.m_vertices[0].x * scale, -shape.m_vertices[0].y * scale);
                        for (var vv = 1; vv < 4; vv++) {
                            ctx.lineTo(shape.m_vertices[vv].x * scale, -shape.m_vertices[vv].y * scale);
                        }
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                    fix = fix.getNext();
                }

                ctx.restore();
            });
        }

        var pos = chassis.getPosition();
        var angle = chassis.getAngle();
        var sx = toX(pos.x);
        var sy = toY(pos.y);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);

        ctx.lineWidth = 1.5;

        var verts = chassis.vertices;
        var segColors = chassis.colors;
        var NUM = segColors ? segColors.length : 8;

        var centerX = verts[0][0] * scale;
        var centerY = -verts[0][1] * scale;

        ctx.lineJoin = 'round';

        // Fills
        for (var i = 0; i < NUM; i++) {
            if (!chassis.segFixtures || chassis.segFixtures[i]) {
                var v1 = verts[i + 1];
                var v2 = verts[(i + 2) > NUM ? 1 : i + 2];
                var col = segColors[i] || 'rgb(128,128,128)';

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(v1[0] * scale, -v1[1] * scale);
                ctx.lineTo(v2[0] * scale, -v2[1] * scale);
                ctx.closePath();
                ctx.fillStyle = col.replace('rgb', 'rgba').replace(')', ',0.6)');
                ctx.fill();
                ctx.strokeStyle = col;
                ctx.stroke();
            }
        }

        var mountFix = chassis.getFixtureList();
        while (mountFix) {
            var mShape = mountFix.getShape();
            if (mShape.m_vertices && mShape.m_vertices.length === 4) {
                var wIdx = mountFix.wheelIndex;
                var mountCol = chassis.axleColors && chassis.axleColors[wIdx] ? chassis.axleColors[wIdx] : 'rgb(128,128,128)';

                ctx.beginPath();
                ctx.moveTo(mShape.m_vertices[0].x * scale, -mShape.m_vertices[0].y * scale);
                for (var vIdx = 1; vIdx < 4; vIdx++) {
                    ctx.lineTo(mShape.m_vertices[vIdx].x * scale, -mShape.m_vertices[vIdx].y * scale);
                }
                ctx.closePath();
                ctx.fillStyle = mountCol.replace('rgb', 'rgba').replace(')', ',0.6)');
                ctx.fill();
                ctx.strokeStyle = mountCol;
                ctx.stroke();
            }
            mountFix = mountFix.getNext();
        }

        ctx.restore();
    };

    Renderer.prototype.drawDebrisPiece = function (debris, toX, toY, scale) {
        var ctx = this.ctx;
        var body = debris.body;
        var color = debris.color;
        var pos = body.getPosition();
        var angle = body.getAngle();
        var sx = toX(pos.x);
        var sy = toY(pos.y);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);
        ctx.lineWidth = 1.5;

        var fix = body.getFixtureList();
        while (fix) {
            var shape = fix.getShape();
            if (shape.m_vertices) {
                var verts = shape.m_vertices;
                ctx.beginPath();
                ctx.moveTo(verts[0].x * scale, -verts[0].y * scale);
                for (var v = 1; v < verts.length; v++) {
                    ctx.lineTo(verts[v].x * scale, -verts[v].y * scale);
                }
                ctx.closePath();
                ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',0.6)');
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.stroke();
            }
            fix = fix.getNext();
        }

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
