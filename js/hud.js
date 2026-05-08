var HUD = (function () {
    var _container = null;
    var _scoreEl = null;
    var _timeEl = null;
    var _torqueEl = null;
    var _speedEl = null;
    var _tableBody = null;
    var _tableContainer = null;
    var _genEl = null;
    var _pauseEl = null;
    var _graphCanvas = null;
    var _graphCtx = null;
    var _runs = [];
    var _copyCallback = null;
    var _copyTimers = {};

    var _maxRuns = 32;

    function init() {
        _container = document.createElement('div');
        _container.style.cssText =
            'position:absolute;' +
            'top:0;left:0;width:100%;height:100%;' +
            'pointer-events:none;font-family:monospace;user-select:none;';

        _container.innerHTML =
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;color:blue;text-shadow:1px 1px 2px rgba(0,0,0,0.5);display:none;" id="hudPause">[PAUSE]</div>' +

            '<div id="hudTableContainer" style="position:absolute;top:18px;left:5px;background:rgba(255,255,200,0.75);padding:4px 8px;pointer-events:auto;">' +
            '<div style="font-size:12px;color:black;margin-bottom:2px;">' +
            '<span style="display:inline-block;width:20px;text-align:left;">#</span>' +
            '<span style="display:inline-block;width:48px;text-align:right;">Score</span>' +
            '<span style="display:inline-block;width:50px;text-align:right;">Time</span></div>' +
            '<div id="hudTableBody"></div></div>' +

            '<div style="position:absolute;bottom:15%;left:50%;transform:translateX(-50%);font-size:24px;color:red;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<span id="hudScore">Score: 0.0</span></div>' +

            '<div style="position:absolute;top:12px;right:12px;font-size:14px;color:red;text-align:right;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<div><span id="hudTime">Time: 5:00</span></div>' +
            '<div style="margin-top:2px;"><span id="hudTorque">Torque: 0.0</span></div>' +
            '<div style="margin-top:2px;"><span id="hudSpeed">Speed: 0.0</span></div></div>' +

             '<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:14px;color:black;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
             '<span id="hudGen">Generation: 0</span></div>' +
             '<canvas id="hudGraph" style="position:absolute;top:60px;left:50%;transform:translateX(-50%);width:600px;height:200px;background:transparent;border:none;"></canvas>';


        document.body.appendChild(_container);

        _pauseEl = document.getElementById('hudPause');
        _scoreEl = document.getElementById('hudScore');
        _timeEl = document.getElementById('hudTime');
        _torqueEl = document.getElementById('hudTorque');
        _speedEl = document.getElementById('hudSpeed');
        _tableBody = document.getElementById('hudTableBody');
        _tableContainer = document.getElementById('hudTableContainer');
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
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
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

    function saveRun(index, score, elapsedSec) {
        if (_runs.length >= _maxRuns) _runs.shift();
        _runs.push({ index: index, score: score, time: elapsedSec });

        _tableBody.innerHTML = '';
        for (var i = 0; i < _runs.length; i++) {
            var row = document.createElement('div');
            row.style.fontSize = '12px';
            row.style.marginTop = '1px';
            row.style.borderTop = '1px solid rgba(0,0,0,0.15)';
            row.style.paddingTop = '1px';
            row.style.color = 'black';
            row.style.cursor = 'pointer';
            row.style.position = 'relative';
            row.innerHTML =
                '<span style="display:inline-block;width:20px;text-align:left;padding-left:2px;">' + (i + 1) + '</span>' +
                '<span style="display:inline-block;width:48px;text-align:right;">' + _runs[i].score.toFixed(1) + '</span>' +
                '<span style="display:inline-block;width:50px;text-align:right;">' + formatTime(_runs[i].time) + '</span>' +
                '<span class="copyIcon" style="position:absolute;left:125px;top:0;opacity:0;font-size:11px;color:#555;white-space:nowrap;">📋</span>';

            (function(rowIdx, rowEl) {
                rowEl.addEventListener('mouseenter', function() {
                    rowEl.style.background = 'rgba(255,255,220,0.9)';
                    var icon = rowEl.querySelector('.copyIcon');
                    if (icon) icon.style.opacity = '1';
                });
                rowEl.addEventListener('mouseleave', function() {
                    rowEl.style.background = '';
                    var icon = rowEl.querySelector('.copyIcon');
                    if (icon) icon.style.opacity = '0';
                });
                rowEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (_copyCallback) {
                        var chromo = _copyCallback(rowIdx);
                        if (chromo) {
                            navigator.clipboard.writeText(Chromosome.serialize(chromo)).then(function() {
                                var icon = rowEl.querySelector('.copyIcon');
                                if (icon) {
                                    icon.textContent = '✓';
                                    icon.style.opacity = '1';
                                    icon.style.color = '#2a2';
                                    clearTimeout(_copyTimers[rowIdx]);
                                    _copyTimers[rowIdx] = setTimeout(function() {
                                        icon.textContent = '📋';
                                        icon.style.color = '#555';
                                    }, 1500);
                                }
                            });
                        }
                    }
                });
            })(i, row);

            _tableBody.appendChild(row);
        }
    }

    function showResults(indexed) {
        _tableBody.innerHTML = '';
        var styleId = 'hudHighlightStyle';
        if (!document.getElementById(styleId)) {
            var styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent =
                '.hudRowWinner{color:green!important;}' +
                '.hudRowLoser{color:red!important;}';
            document.head.appendChild(styleEl);
        }

        for (var i = 0; i < indexed.length; i++) {
            var item = indexed[i];
            var row = document.createElement('div');
            row.style.fontSize = '12px';
            row.style.marginTop = '1px';
            row.style.borderTop = '1px solid rgba(0,0,0,0.15)';
            row.style.paddingTop = '1px';
            row.style.position = 'relative';
            row.style.cursor = 'default';

            if (i === 0) {
                row.className = 'hudRowWinner';
            } else if (!item.hasOffspring) {
                row.className = 'hudRowLoser';
            } else {
                row.style.color = 'black';
            }

            row.innerHTML =
                '<span style="display:inline-block;width:20px;text-align:left;padding-left:2px;">' + (i + 1) + '</span>' +
                '<span style="display:inline-block;width:48px;text-align:right;">' + item.score.toFixed(1) + '</span>' +
                '<span style="display:inline-block;width:50px;text-align:right;">' + formatTime(item.time) + '</span>';

            _tableBody.appendChild(row);
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
        var ctx = _graphCtx;
        var w = _graphCanvas.width;
        var h = _graphCanvas.height;

        ctx.clearRect(0, 0, w, h);

        if (avgScores.length < 2) return;

        var maxVal = 0;
        for (var i = 0; i < maxScores.length; i++) {
            if (maxScores[i] > maxVal) maxVal = maxScores[i];
        }
        if (maxVal === 0) maxVal = 1;

        var stepX = w / Math.max(1, avgScores.length - 1);
        ctx.lineWidth = 2;

        function drawLine(data, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            for (var i = 0; i < data.length; i++) {
                var x = i * stepX;
                var y = h - (data[i] / maxVal) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        drawLine(avgScores, 'black');
        drawLine(maxScores, 'red');
    }

    return { init: init, update: update, saveRun: saveRun, resetRuns: resetRuns, showResults: showResults, updateGeneration: updateGeneration, setPause: setPause, drawGraphs: drawGraphs, setCopyCallback: setCopyCallback };

})();
