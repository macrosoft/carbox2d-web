const Renderer = (function () {
    'use strict';

    function _getColors() {
        if (Theme.isDark()) {
            return {
                bg:         '#1a1a2e',
                gridMinor:  '#2a2a4a',
                gridMajor:  '#ff66b2',
                track:      'rgba(100,100,150,0.6)',
                line:       '#bbb',
                stroke:     '#ddd',
                parentBg:   'rgba(30,30,60,0.8)',
                parentEdge: '#555'
            };
        }
        return {
            bg:         '#FFFFC8',
            gridMinor:  '#CCCCCC',
            gridMajor:  '#FF0080',
            track:      'rgba(0, 0, 0, 0.5)',
            line:       '#1a1a1a',
            stroke:     '#000',
            parentBg:   'rgba(255,255,200,0.7)',
            parentEdge: '#888'
        };
    }

    const GRID_STEP    = 1;
    const GRID_MAJOR_X = 100;
    const GRID_MAJOR_Y = 20;
    let _trackCount = 0;
    let _trackData = null;

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
        this.flagPos = null;
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

    Renderer.prototype.setFlagPos = function (pos) {
        this.flagPos = pos;
    };

    Renderer.prototype.updateCamera = function () {
        this.cameraX = this.targetX;
        this.cameraY += (this.targetY - this.cameraY) * CAMERA_SMOOTH;
    };

    Renderer.prototype.drawLightChassis = function (geometry, x, y, scale, angle) {
        const ctx = this.ctx;
        const sx = x * scale;
        const sy = -y * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);

        if (geometry.wheels) {
            geometry.wheels.forEach(function(wheel) {
                if (!wheel) return;
                const wx = wheel.pos.x * scale;
                const wy = -wheel.pos.y * scale;
                const wr = wheel.radius * scale;

                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(-wheel.angle);
                ctx.beginPath();
                ctx.arc(0, 0, wr, 0, 2 * Math.PI);
                ctx.fillStyle = _getColors().track;
                ctx.fill();
                ctx.strokeStyle = _getColors().stroke;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            });
        }

        if (geometry.wheels) {
            geometry.wheels.forEach(function(wheel, idx) {
                if (!wheel) return;
                const ax = wheel.pos.x * scale;
                const ay = -wheel.pos.y * scale;
                const axleColor = geometry.axleColors && geometry.axleColors[idx] ? geometry.axleColors[idx] : 'rgb(128,128,128)';

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

        const vVerts = geometry.vertices;
        const vSegColors = geometry.colors;
        const vNUM = vSegColors ? vSegColors.length : 8;
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        for (let i = 0; i < vNUM; i++) {
            const vv0 = vVerts[0];
            const vv1 = vVerts[i + 1];
            const vv2 = vVerts[(i + 2) > vNUM ? 1 : i + 2];
            const vCol = vSegColors[i] || 'rgb(128,128,128)';
            ctx.beginPath();
            ctx.moveTo(vv0[0] * scale, -vv0[1] * scale);
            ctx.lineTo(vv1[0] * scale, -vv1[1] * scale);
            ctx.lineTo(vv2[0] * scale, -vv2[1] * scale);
            ctx.closePath();
            ctx.fillStyle = vCol.replace('rgb', 'rgba').replace(')', ',' + RGBA_ALPHA + ')');
            ctx.fill();
            ctx.strokeStyle = vCol;
            ctx.stroke();
        }

        ctx.restore();
    };

    Renderer.prototype.draw = function (chassis, parentChromos, sparks) {
        this.resize();
        this.updateCamera();

        const ctx   = this.ctx,
              w     = this.w,
              h     = this.h,
              camX  = this.cameraX,
              camY  = this.cameraY,
              scale = CAMERA_SCALE;

        const cx = camX * scale;
        const cy = camY * scale;

        const toX = function (wx) { return wx * scale - cx + w / 2; };
        const toY = function (wy) { return -wy * scale + cy + h / 2; };

        ctx.fillStyle = _getColors().bg;
        ctx.fillRect(0, 0, w, h);

        const worldLeft   = Math.floor((camX - w / 2) / GRID_STEP) * GRID_STEP;
        const worldRight  = Math.ceil((camX + w / 2) / GRID_STEP) * GRID_STEP;
        const worldBottom = Math.floor((camY - h / 2) / GRID_STEP) * GRID_STEP;
        const worldTop    = Math.ceil((camY + h / 2) / GRID_STEP) * GRID_STEP;

        ctx.lineWidth = 0.5;

        for (let gx = worldLeft; gx <= worldRight; gx += GRID_STEP) {
            const sx = toX(gx);
            ctx.strokeStyle = (gx % GRID_MAJOR_X === 0) ? _getColors().gridMajor : _getColors().gridMinor;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, h);
            ctx.stroke();
        }

        for (let gy = worldBottom; gy <= worldTop; gy += GRID_STEP) {
            const sy = toY(gy);
            ctx.strokeStyle = (gy % GRID_MAJOR_Y === 0) ? _getColors().gridMajor : _getColors().gridMinor;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(w, sy);
            ctx.stroke();
        }

        ctx.lineWidth = 0.5;
        ctx.strokeStyle = _getColors().line;

        drawRotRect(ctx, toX, toY, scale, -513, 0, 0, 10, TRACK_THICK);

        for (let i = 0; i < _trackCount; i++) {
            const base = i * 3;
            drawRotRect(ctx, toX, toY, scale, _trackData[base], _trackData[base + 1], _trackData[base + 2], TRACK_HALF_W, TRACK_THICK);
        }

        if (this.flagPos) {
            drawFlag(ctx, toX, toY, scale, this.flagPos.x, this.flagPos.y);
        }

        if (chassis) {
            this.drawChassis(chassis, toX, toY, scale);
        }

        if (sparks) {
            this.drawSparks(sparks, toX, toY, scale);
        }

        if (parentChromos && parentChromos.length > 0) {
            const frameW = 120;
            const frameH = 72;
            const frameX = w - frameW - 20;
            const frameY = h - frameH - 20;
            const pScale = 12;
            const self = this;

            parentChromos.forEach(function(pc, idx) {
                const px = frameX - idx * (frameW + 10);
                const py = frameY;
                ctx.fillStyle = _getColors().parentBg;
                ctx.fillRect(px, py, frameW, frameH);
                ctx.strokeStyle = _getColors().parentEdge;
                ctx.strokeRect(px, py, frameW, frameH);

                const geom = World.getCarGeometry(pc);
                ctx.save();
                ctx.translate(px + frameW / 2, py + frameH / 2);
                self.drawLightChassis(geom, 0, 0, pScale, 0);
                ctx.restore();
            });
        }
    };

    Renderer.prototype.drawChassis = function (chassis, toX, toY, scale) {
        const ctx = this.ctx;

        if (chassis.debris) {
            for (let d = 0; d < chassis.debris.length; d++) {
                this.drawDebrisPiece(chassis.debris[d], toX, toY, scale);
            }
        }

        if (chassis.wheels) {
            chassis.wheels.forEach(function(wheel) {
                if (!wheel) return;
                const wPos = wheel.body.getPosition();
                const wAngle = wheel.body.getAngle();
                const wx = toX(wPos.x);
                const wy = toY(wPos.y);
                const wr = wheel.radius * scale;

                ctx.save();
                ctx.translate(wx, wy);
                ctx.rotate(-wAngle);

                ctx.beginPath();
                ctx.arc(0, 0, wr, 0, 2 * Math.PI);
                ctx.fillStyle = _getColors().track;
                ctx.fill();
                ctx.strokeStyle = _getColors().stroke;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wr, 0);
                ctx.strokeStyle = _getColors().stroke;
                ctx.stroke();

                ctx.restore();
            });
        }

        if (chassis.axles) {
            chassis.axles.forEach(function(axle, idx) {
                if (!axle) return;
                const aPos = axle.getPosition();
                const aAngle = axle.getAngle();
                const ax = toX(aPos.x);
                const ay = toY(aPos.y);

                const axleColor = chassis.axleColors && chassis.axleColors[idx] ? chassis.axleColors[idx] : 'rgb(128,128,128)';

                ctx.save();
                ctx.translate(ax, ay);
                ctx.rotate(-aAngle);
                ctx.fillStyle = axleColor;
                ctx.strokeStyle = axleColor;
                ctx.lineWidth = 1;

                let fix = axle.getFixtureList();
                while (fix) {
                    const shape = fix.getShape();
                    if (shape.m_vertices && shape.m_vertices.length === 4) {
                        ctx.beginPath();
                        ctx.moveTo(shape.m_vertices[0].x * scale, -shape.m_vertices[0].y * scale);
                        for (let vv = 1; vv < 4; vv++) {
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

        const pos = chassis.getPosition();
        const angle = chassis.getAngle();
        const sx = toX(pos.x);
        const sy = toY(pos.y);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);

        ctx.lineWidth = 1.5;

        const verts = chassis.vertices;
        const segColors = chassis.colors;
        const NUM = segColors ? segColors.length : 8;

        const centerX = verts[0][0] * scale;
        const centerY = -verts[0][1] * scale;

        ctx.lineJoin = 'round';

        for (let i = 0; i < NUM; i++) {
            if (!chassis.segFixtures || chassis.segFixtures[i]) {
                const v1 = verts[i + 1];
                const v2 = verts[(i + 2) > NUM ? 1 : i + 2];
                const col = segColors[i] || 'rgb(128,128,128)';

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(v1[0] * scale, -v1[1] * scale);
                ctx.lineTo(v2[0] * scale, -v2[1] * scale);
                ctx.closePath();
                ctx.fillStyle = col.replace('rgb', 'rgba').replace(')', ',' + RGBA_ALPHA + ')');
                ctx.fill();
                ctx.strokeStyle = col;
                ctx.stroke();
            }
        }

        let mountFix = chassis.getFixtureList();
        while (mountFix) {
            const mShape = mountFix.getShape();
            if (mShape.m_vertices && mShape.m_vertices.length === 4) {
                const wIdx = mountFix.wheelIndex;
                const mountCol = chassis.axleColors && chassis.axleColors[wIdx] ? chassis.axleColors[wIdx] : 'rgb(128,128,128)';

                ctx.beginPath();
                ctx.moveTo(mShape.m_vertices[0].x * scale, -mShape.m_vertices[0].y * scale);
                for (let vIdx = 1; vIdx < 4; vIdx++) {
                    ctx.lineTo(mShape.m_vertices[vIdx].x * scale, -mShape.m_vertices[vIdx].y * scale);
                }
                ctx.closePath();
                ctx.fillStyle = mountCol.replace('rgb', 'rgba').replace(')', ',' + RGBA_ALPHA + ')');
                ctx.fill();
                ctx.strokeStyle = mountCol;
                ctx.stroke();
            }
            mountFix = mountFix.getNext();
        }

        ctx.restore();
    };

    Renderer.prototype.drawDebrisPiece = function (debris, toX, toY, scale) {
        const ctx = this.ctx;
        const body = debris.body;
        const color = debris.color;
        const pos = body.getPosition();
        const angle = body.getAngle();
        const sx = toX(pos.x);
        const sy = toY(pos.y);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);
        ctx.lineWidth = 1.5;

        let fix = body.getFixtureList();
        while (fix) {
            const shape = fix.getShape();
            if (shape.m_vertices) {
                const verts = shape.m_vertices;
                ctx.beginPath();
                ctx.moveTo(verts[0].x * scale, -verts[0].y * scale);
                for (let v = 1; v < verts.length; v++) {
                    ctx.lineTo(verts[v].x * scale, -verts[v].y * scale);
                }
                ctx.closePath();
                ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',' + RGBA_ALPHA + ')');
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.stroke();
            }
            fix = fix.getNext();
        }

        ctx.restore();
    };

    Renderer.prototype.drawSparks = function (sparks, toX, toY, scale) {
        const ctx = this.ctx;
        for (let i = 0; i < sparks.length; i++) {
            const body = sparks[i].body;
            const color = sparks[i].color;
            const pos = body.getPosition();
            const angle = body.getAngle();
            const sx = toX(pos.x);
            const sy = toY(pos.y);

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(-angle);

            let fix = body.getFixtureList();
            while (fix) {
                const shape = fix.getShape();
                if (shape.m_vertices) {
                    const verts = shape.m_vertices;
                    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ',' + RGBA_ALPHA + ')');
                    ctx.beginPath();
                    ctx.moveTo(verts[0].x * scale, -verts[0].y * scale);
                    for (let v = 1; v < verts.length; v++) {
                        ctx.lineTo(verts[v].x * scale, -verts[v].y * scale);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                fix = fix.getNext();
            }

            ctx.restore();
        }
    };

    function drawFlag(ctx, toX, toY, scale, wx, wy) {
        let groundY = null;
        for (let i = 0; i < _trackCount; i++) {
            const base = i * 3;
            const cx = _trackData[base];
            const cy = _trackData[base + 1];
            const ca = _trackData[base + 2];
            const cosA = Math.cos(ca);
            const sinA = Math.sin(ca);
            const x1 = cx - cosA * TRACK_HALF_W - sinA * TRACK_THICK;
            const x2 = cx + cosA * TRACK_HALF_W - sinA * TRACK_THICK;
            if (wx >= Math.min(x1, x2) && wx <= Math.max(x1, x2)) {
                const lx = Math.abs(cosA) > 1e-8
                    ? (wx - cx + sinA * TRACK_THICK) / cosA
                    : 0;
                const wy2 = cy + sinA * lx + cosA * TRACK_THICK;
                if (groundY === null || wy2 > groundY) {
                    groundY = wy2;
                }
            }
        }

        if (groundY === null) {
            let bestDist = Infinity;
            for (let i = 0; i < _trackCount; i++) {
                const base = i * 3;
                const d = Math.abs(wx - _trackData[base]);
                if (d < bestDist) {
                    bestDist = d;
                    const ca = _trackData[base + 2];
                    groundY = _trackData[base + 1] + Math.cos(ca) * TRACK_THICK;
                }
            }
        }

        const bx = toX(wx);
        const by = toY(groundY);
        const poleH = 0.9 * scale;
        const topY = by - poleH;
        const fw = 0.625 * scale;
        const fh = 0.5 * scale;
        const notch = fw * 0.3;

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - fw, topY);
        ctx.lineTo(bx - fw + notch, topY + fh / 2);
        ctx.lineTo(bx - fw, topY + fh);
        ctx.lineTo(bx, topY + fh);
        ctx.lineTo(bx, topY);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = _getColors().stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, topY);
        ctx.stroke();
    }

    function drawRotRect(ctx, toX, toY, scale, x, y, angle, hw, hh) {
        const sx = toX(x);
        const sy = toY(y);
        const rw = hw * 2 * scale;
        const rh = hh * 2 * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-angle);
        ctx.fillStyle   = _getColors().track;
        ctx.fillRect(-hw * scale, -hh * scale, rw, rh);
        ctx.strokeRect(-hw * scale, -hh * scale, rw, rh);
        ctx.restore();
    }

    return { setTrackData: setTrackData, Renderer: Renderer };

})();
