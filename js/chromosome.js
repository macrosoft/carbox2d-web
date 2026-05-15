const Chromosome = (function () {
    'use strict';

    const GENES_SIZE = 40;

    function generate() {
        const genes = new Float32Array(GENES_SIZE);

        for (let i = 0; i < Config.NUM_SEGMENTS; i++) {
            genes[i * 2] = Math.random();
            genes[i * 2 + 1] = Math.random();
        }

        for (let i = 0; i < Config.NUM_SEGMENTS; i++) {
            genes[16 + i * 3] = Math.random();
            genes[16 + i * 3 + 1] = Math.random();
            genes[16 + i * 3 + 2] = Math.random();
        }

        const r = Math.floor(Math.random() * Config.COLOR_RANGE);
        const g = Math.floor(Math.random() * Config.COLOR_RANGE);
        const b = Math.floor(Math.random() * Config.COLOR_RANGE);
        const colors = [];
        for (let i = 0; i < Config.NUM_COLORS; i++) {
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
        for (let c = 0; c < 3; c++) {
            dstColors[ci][c] = srcColors[ci][c];
        }
    }

    function crossover(parentA, parentB) {
        let bend0 = Math.floor(Math.random() * GENES_SIZE);
        let bend1 = Math.floor(Math.random() * GENES_SIZE);
        if (bend0 > bend1) {
            const tmp = bend0;
            bend0 = bend1;
            bend1 = tmp;
        }

        const genesA = new Float32Array(GENES_SIZE);
        const genesB = new Float32Array(GENES_SIZE);
        const colorsA = [];
        const colorsB = [];
        for (let i = 0; i < Config.NUM_COLORS; i++) {
            colorsA.push([0, 0, 0]);
            colorsB.push([0, 0, 0]);
        }

        for (let i = 0; i < GENES_SIZE; i++) {
            let srcA, srcB;
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

            const ci = geneToColorIndex(i);
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
        const genes = new Float32Array(GENES_SIZE);
        genes.set(chromo.genes);
        const colors = [];
        for (let i = 0; i < Config.NUM_COLORS; i++) {
            colors.push([chromo.colors[i][0], chromo.colors[i][1], chromo.colors[i][2]]);
        }
        return { genes: genes, colors: colors };
    }

    function encodeFloat32(arr) {
        const bytes = new Uint8Array(arr.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function decodeFloat32(base64, target) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        target.set(new Float32Array(bytes.buffer));
    }

    function encodeColors(colors) {
        const out = [];
        for (let i = 0; i < colors.length; i++) {
            const r = colors[i][0].toString(16).padStart(2, '0');
            const g = colors[i][1].toString(16).padStart(2, '0');
            const b = colors[i][2].toString(16).padStart(2, '0');
            out.push(r + g + b);
        }
        return out.join('');
    }

    function decodeColors(str) {
        const out = [];
        for (let i = 0; i < Config.NUM_COLORS; i++) {
            const hex = str.substring(i * 6, i * 6 + 6);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            out.push([r, g, b]);
        }
        return out;
    }

    function serialize(chromo) {
        return JSON.stringify({
            g: encodeFloat32(chromo.genes),
            c: encodeColors(chromo.colors)
        });
    }

    function deserialize(str) {
        const data = JSON.parse(str);
        const genes = new Float32Array(GENES_SIZE);
        decodeFloat32(data.g, genes);
        return { genes: genes, colors: decodeColors(data.c) };
    }

    return { generate: generate, crossover: crossover, clone: clone, serialize: serialize, deserialize: deserialize };
})();
