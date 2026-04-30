// Async track data loader — reads js/track_data.bin (Float32LE: x, y, angle per segment)
var TrackLoader = (function () {
    function load() {
        return fetch('js/track_data.bin')
            .then(function (resp) { return resp.arrayBuffer(); })
            .then(function (buffer) {
                var data = new Float32Array(buffer);
                var count = data.length / 3;
                return { count: count, data: data };
            });
    }
    return { load: load };
})();
