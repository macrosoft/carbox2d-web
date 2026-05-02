var Chromosome = (function () {
    var NUM_SEGMENTS = 8;
    var GENES_SIZE = 40;
    var COLORS_SIZE = 48;

    function generate() {
        var genes = new Float32Array(GENES_SIZE);

        for (var i = 0; i < NUM_SEGMENTS; i++) {
            genes[i * 2] = Math.random();
            genes[i * 2 + 1] = Math.random();
        }

        for (var i = 0; i < NUM_SEGMENTS; i++) {
            genes[16 + i * 3] = Math.random();
            genes[16 + i * 3 + 1] = Math.random();
            genes[16 + i * 3 + 2] = Math.random();
        }

        var colors = new Uint8Array(COLORS_SIZE);
        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        for (var i = 0; i < COLORS_SIZE; i += 3) {
            colors[i] = r;
            colors[i + 1] = g;
            colors[i + 2] = b;
        }

        return {
            genes: genes,
            colors: colors
        };
    }

    return { generate: generate };
})();
