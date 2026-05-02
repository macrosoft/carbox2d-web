var HUD = (function () {
    var _container = null;
    var _scoreEl = null;
    var _timeEl = null;
    var _torqueEl = null;
    var _speedEl = null;
    var _tableBody = null;
    var _genEl = null;
    var _pauseEl = null;
    var _runs = [];
    var _maxRuns = 32;

    function init() {
        _container = document.createElement('div');
        _container.style.cssText =
            'position:absolute;' +
            'top:0;left:0;width:100%;height:100%;' +
            'pointer-events:none;font-family:monospace;user-select:none;';

        _container.innerHTML =
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;color:blue;text-shadow:1px 1px 2px rgba(0,0,0,0.5);display:none;" id="hudPause">[PAUSE]</div>' +

            '<div style="position:absolute;top:18px;left:5px;background:rgba(255,255,200,0.75);padding:4px 8px;">' +
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
            '<span id="hudGen">Generation: 0</span></div>';

        document.body.appendChild(_container);

        _pauseEl = document.getElementById('hudPause');
        _scoreEl = document.getElementById('hudScore');
        _timeEl = document.getElementById('hudTime');
        _torqueEl = document.getElementById('hudTorque');
        _speedEl = document.getElementById('hudSpeed');
        _tableBody = document.getElementById('hudTableBody');
        _genEl = document.getElementById('hudGen');
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
            row.innerHTML =
                '<span style="display:inline-block;width:20px;text-align:left;padding-left:2px;">' + (i + 1) + '</span>' +
                '<span style="display:inline-block;width:48px;text-align:right;">' + _runs[i].score.toFixed(1) + '</span>' +
                '<span style="display:inline-block;width:50px;text-align:right;">' + formatTime(_runs[i].time) + '</span>';
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

    return { init: init, update: update, saveRun: saveRun, resetRuns: resetRuns, updateGeneration: updateGeneration, setPause: setPause };
})();
