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

        var r = Math.floor(Math.random() * 256);
        var g = Math.floor(Math.random() * 256);
        var b = Math.floor(Math.random() * 256);
        var colors = [];
        for (var i = 0; i < 16; i++) {
            colors.push([r, g, b]);
        }

        return {
            genes: genes,
            colors: colors
        };
    }

    function geneToColorIndex(geneIndex) {
        if (geneIndex < 16) {
            if (geneIndex % 2 === 0) {
                return geneIndex / 2;
            }
        } else {
            if ((geneIndex - 16) % 3 === 0) {
                return (geneIndex - 16) / 3 + 8;
            }
        }
        return -1;
    }

    function swapColors(srcColors, dstColors, ci) {
        for (var c = 0; c < 3; c++) {
            dstColors[ci][c] = srcColors[ci][c];
        }
    }

    function crossover(parentA, parentB) {
        var bend0 = Math.floor(Math.random() * GENES_SIZE);
        var bend1 = Math.floor(Math.random() * GENES_SIZE);
        if (bend0 > bend1) {
            var tmp = bend0;
            bend0 = bend1;
            bend1 = tmp;
        }

        var genesA = new Float32Array(GENES_SIZE);
        var genesB = new Float32Array(GENES_SIZE);
        var colorsA = [];
        var colorsB = [];
        for (var i = 0; i < 16; i++) {
            colorsA.push([0, 0, 0]);
            colorsB.push([0, 0, 0]);
        }

        for (var i = 0; i < GENES_SIZE; i++) {
            var srcA, srcB;
            if (i >= bend0 && i <= bend1) {
                genesA[i] = parentB.genes[i];
                genesB[i] = parentA.genes[i];
                srcA = parentB.colors;
                srcB = parentA.colors;
            } else {
                genesA[i] = parentA.genes[i];
                genesB[i] = parentB.genes[i];
                srcA = parentA.colors;
                srcB = parentB.colors;
            }

            var ci = geneToColorIndex(i);
            if (ci >= 0) {
                swapColors(srcA, colorsA, ci);
                swapColors(srcB, colorsB, ci);
            }
        }

        return {
            offspringA: { genes: genesA, colors: colorsA },
            offspringB: { genes: genesB, colors: colorsB }
        };
    }

    function clone(chromo) {
        var genes = new Float32Array(GENES_SIZE);
        genes.set(chromo.genes);
        var colors = [];
        for (var i = 0; i < 16; i++) {
            colors.push([chromo.colors[i][0], chromo.colors[i][1], chromo.colors[i][2]]);
        }
        return { genes: genes, colors: colors };
    }

    return { generate: generate, crossover: crossover, clone: clone };
})();
