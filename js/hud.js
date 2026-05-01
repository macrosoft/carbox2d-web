var HUD = (function () {
    var _container = null;
    var _scoreEl = null;
    var _timeEl = null;
    var _torqueEl = null;
    var _speedEl = null;

    function init() {
        _container = document.createElement('div');
        _container.style.cssText =
            'position:absolute;' +
            'top:0;' +
            'left:0;' +
            'width:100%;' +
            'height:100%;' +
            'pointer-events:none;' +
            'font-family:monospace;' +
            'user-select:none;';

        _container.innerHTML =
            '<div style="position:absolute;top:12px;right:12px;font-size:14px;color:red;text-align:right;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<div><span id="hudTime">Time: 5:00</span></div>' +
            '<div style="margin-top:2px;"><span id="hudTorque">Torque: 0.0</span></div>' +
            '<div style="margin-top:2px;"><span id="hudSpeed">Speed: 0.0</span></div></div>' +

            '<div style="position:absolute;bottom:15%;left:50%;transform:translateX(-50%);font-size:24px;color:red;text-shadow:1px 1px 2px rgba(0,0,0,0.3);">' +
            '<span id="hudScore">Score: 0.0</span></div>';

        document.body.appendChild(_container);

        _scoreEl = document.getElementById('hudScore');
        _timeEl = document.getElementById('hudTime');
        _torqueEl = document.getElementById('hudTorque');
        _speedEl = document.getElementById('hudSpeed');
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(seconds));
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function update(world) {
        if (!_container) init();

        var score = world.getScore();
        var remaining = world.getRemainingTime();
        var torque = world.getTorque();
        var speed = world.getSpeed();

        _scoreEl.textContent = 'Score: ' + score.toFixed(1);
        _timeEl.textContent = 'Time: ' + formatTime(remaining);
        _torqueEl.textContent = 'Torque: ' + torque.toFixed(1);
        _speedEl.textContent = 'Speed: ' + speed.toFixed(1);
    }

    return { init: init, update: update };
})();
