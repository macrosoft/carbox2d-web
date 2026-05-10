const HUD = (function () {
    'use strict';

    let _container = null;
    let _scoreEl = null;
    let _timeEl = null;
    let _torqueEl = null;
    let _speedEl = null;
    let _tableBody = null;
    let _genEl = null;
    let _pauseEl = null;
    let _graphCanvas = null;
    let _graphCtx = null;
    let _runs = [];
    let _copyCallback = null;
    let _copyTimers = {};

    const _maxRuns = POPULATION_SIZE;

    function init() {
        _container = document.createElement('div');
        _container.style.cssText =
            'position:absolute;' +
            'top:0;left:0;width:100%;height:100%;' +
            'pointer-events:none;font-family:monospace;user-select:none;';

        _container.innerHTML =
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;color:var(--pause-color);text-shadow:1px 1px 2px rgba(0,0,0,0.5);display:none;" id="hudPause">[PAUSE]</div>' +

            '<div id="hudTableContainer" style="position:absolute;top:18px;left:5px;background:var(--hud-bg);padding:4px 8px;pointer-events:auto;">' +
            '<div style="font-size:12px;color:var(--hud-text);margin-bottom:2px;">' +
            '<span style="display:inline-block;width:20px;text-align:left;">#</span>' +
            '<span style="display:inline-block;width:48px;text-align:right;">Score</span>' +
            '<span style="display:inline-block;width:50px;text-align:right;">Time</span></div>' +
            '<div id="hudTableBody"></div></div>' +

            '<div style="position:absolute;bottom:15%;left:50%;transform:translateX(-50%);font-size:24px;color:red;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<span id="hudScore">Score: 0.0</span></div>' +

            '<div style="position:absolute;top:40px;right:12px;font-size:14px;color:red;text-align:right;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<div><span id="hudTime">Time: 5:00</span></div>' +
            '<div style="margin-top:2px;"><span id="hudTorque">Torque: 0.0</span></div>' +
            '<div style="margin-top:2px;"><span id="hudSpeed">Speed: 0.0</span></div></div>' +

             '<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:14px;color:var(--hud-gen-color);text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
             '<span id="hudGen">Generation: 0</span></div>' +
             '<canvas id="hudGraph" style="position:absolute;top:60px;left:50%;transform:translateX(-50%);width:600px;height:200px;background:transparent;border:none;"></canvas>';


        document.body.appendChild(_container);

        _pauseEl = document.getElementById('hudPause');
        _scoreEl = document.getElementById('hudScore');
        _timeEl = document.getElementById('hudTime');
        _torqueEl = document.getElementById('hudTorque');
        _speedEl = document.getElementById('hudSpeed');
        _tableBody = document.getElementById('hudTableBody');
        _genEl = document.getElementById('hudGen');
        _graphCanvas = document.getElementById('hudGraph');
        if (_graphCanvas) {
            _graphCtx = _graphCanvas.getContext('2d');
            _graphCanvas.width = 600;
            _graphCanvas.height = 200;
        }
    }



    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(seconds));
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function update(world) {
        if (!_container) init();

        _scoreEl.textContent = 'Score: ' + world.getScore().toFixed(1);
        _timeEl.textContent = 'Time: ' + formatTime(world.getRemainingTime());
        _torqueEl.textContent = 'Torque: ' + world.getTorque().toFixed(1);
        _speedEl.textContent = 'Speed: ' + world.getSpeed().toFixed(1);
    }

    function updateGeneration(gen, carIndex) {
        if (!_genEl) return;
        _genEl.textContent = 'Generation: ' + (gen + 1) + '  Car: ' + (carIndex + 1);
    }

    function _createRow(displayIndex, score, time, copyIndex, colorClass) {
        const row = document.createElement('div');
        row.style.fontSize = '12px';
        row.style.marginTop = '1px';
        row.style.borderTop = '1px solid var(--hud-border)';
        row.style.paddingTop = '1px';
        row.style.cursor = 'pointer';
        row.style.position = 'relative';
        if (colorClass) {
            row.className = colorClass;
        } else {
            row.style.color = 'var(--hud-text)';
        }
        row.innerHTML =
            '<span style="display:inline-block;width:20px;text-align:left;padding-left:2px;">' + displayIndex + '</span>' +
            '<span style="display:inline-block;width:48px;text-align:right;">' + score.toFixed(1) + '</span>' +
            '<span style="display:inline-block;width:50px;text-align:right;">' + formatTime(time) + '</span>' +
            '<span class="copyIcon" style="position:absolute;left:125px;top:0;opacity:0;font-size:11px;color:var(--hud-icon-color);white-space:nowrap;">📋</span>';

        (function(rowIdx, rowEl) {
            rowEl.addEventListener('mouseenter', function() {
                rowEl.style.background = 'var(--hud-row-hover)';
                const icon = rowEl.querySelector('.copyIcon');
                if (icon) icon.style.opacity = '1';
            });
            rowEl.addEventListener('mouseleave', function() {
                rowEl.style.background = '';
                const icon = rowEl.querySelector('.copyIcon');
                if (icon) icon.style.opacity = '0';
            });
            rowEl.addEventListener('click', function(e) {
                e.stopPropagation();
                if (_copyCallback) {
                    const chromo = _copyCallback(rowIdx);
                    if (chromo) {
                        navigator.clipboard.writeText(Chromosome.serialize(chromo)).then(function() {
                            const icon = rowEl.querySelector('.copyIcon');
                            if (icon) {
                                icon.textContent = '✓';
                                icon.style.opacity = '1';
                                icon.style.color = 'var(--hud-icon-ok)';
                                clearTimeout(_copyTimers[rowIdx]);
                                _copyTimers[rowIdx] = setTimeout(function() {
                                    icon.textContent = '📋';
                                    icon.style.color = 'var(--hud-icon-color)';
                                }, 1500);
                            }
                        });
                    }
                }
            });
        })(copyIndex, row);

        return row;
    }

    function saveRun(index, score, elapsedSec) {
        if (_runs.length >= _maxRuns) _runs.shift();
        _runs.push({ index: index, score: score, time: elapsedSec });

        _tableBody.innerHTML = '';
        for (let i = 0; i < _runs.length; i++) {
            _tableBody.appendChild(_createRow(i + 1, _runs[i].score, _runs[i].time, i, null));
        }
    }

    function showResults(indexed) {
        _tableBody.innerHTML = '';
        const styleId = 'hudHighlightStyle';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent =
                '.hudRowWinner{color:var(--hud-winner)!important;}' +
                '.hudRowLoser{color:var(--hud-loser)!important;}';
            document.head.appendChild(styleEl);
        }

        for (let i = 0; i < indexed.length; i++) {
            const item = indexed[i];
            let cls = null;
            if (i === 0) {
                cls = 'hudRowWinner';
            } else if (!item.hasOffspring) {
                cls = 'hudRowLoser';
            }
            _tableBody.appendChild(_createRow(i + 1, item.score, item.time, i, cls));
        }
    }

    function resetRuns() {
        _runs = [];
        if (_tableBody) _tableBody.innerHTML = '';
    }

    function setPause(paused) {
        if (_pauseEl) _pauseEl.style.display = paused ? 'block' : 'none';
    }

    function setCopyCallback(fn) {
        _copyCallback = fn;
    }

    function drawGraphs(avgScores, maxScores) {
        if (!_graphCtx) return;
        const ctx = _graphCtx;
        const w = _graphCanvas.width;
        const h = _graphCanvas.height;

        ctx.clearRect(0, 0, w, h);

        if (avgScores.length < 2) return;

        let maxVal = 0;
        for (let i = 0; i < maxScores.length; i++) {
            if (maxScores[i] > maxVal) maxVal = maxScores[i];
        }
        if (maxVal === 0) maxVal = 1;

        const stepX = w / Math.max(1, avgScores.length - 1);
        ctx.lineWidth = 2;

        function drawLine(data, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            for (let i = 0; i < data.length; i++) {
                const x = i * stepX;
                const y = h - (data[i] / maxVal) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        drawLine(avgScores, Theme.isDark() ? '#aaa' : 'black');
        drawLine(maxScores, Theme.isDark() ? '#f66' : 'red');
    }

    return { init: init, update: update, saveRun: saveRun, resetRuns: resetRuns, showResults: showResults, updateGeneration: updateGeneration, setPause: setPause, drawGraphs: drawGraphs, setCopyCallback: setCopyCallback };

})();
