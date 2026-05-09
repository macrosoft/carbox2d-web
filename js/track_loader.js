// Async track data loader — reads js/track_data.bin (Float32LE: x, y, angle per segment)
const TrackLoader = (function () {
    'use strict';

    function load() {
        return fetch('js/track_data.bin')
            .then(function (resp) { return resp.arrayBuffer(); })
            .then(function (buffer) {
                const data = new Float32Array(buffer);
                const count = data.length / 3;
                return { count: count, data: data };
            });
    }
    return { load: load };
})();
