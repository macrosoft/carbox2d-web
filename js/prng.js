const PRNG = (function () {
    'use strict';

    function hashChromosome(genes) {
        const bytes = new Uint8Array(genes.buffer);
        let hash = 5381;
        for (let i = 0; i < bytes.length; i++) {
            hash = ((hash << 5) + hash + bytes[i]) | 0;
        }
        return hash >>> 0;
    }

    function create(seed) {
        let state = seed | 0;

        function next() {
            state |= 0;
            state = state + 0x6D2B79F5 | 0;
            let t = Math.imul(state ^ state >>> 15, 1 | state);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }

        return { next: next };
    }

    return { create: create, hashChromosome: hashChromosome };
})();
