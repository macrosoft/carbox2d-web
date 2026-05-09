const CarBuilder = (function () {
    'use strict';

    function decodeChromosome(genes) {
        const angles = [];
        const mags = [];

        const rawAngles = [];
        let sum = 0;
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const rawAngle = genes[i * 2] * (1 - MIN_ANGLE) + MIN_ANGLE;
            rawAngles.push(rawAngle);
            sum += rawAngle;
            mags.push(genes[i * 2 + 1] * (MAX_MAG - MIN_MAG) + MIN_MAG);
        }

        let cumulative = 0;
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            angles.push(cumulative);
            cumulative += (rawAngles[i] / sum) * 2 * Math.PI;
        }

        const wheelOn = [];
        const axleAngles = [];
        const wheelRadii = [];

        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const woGene = genes[16 + i * 3];
            if (woGene > WHEEL_PROB0) {
                wheelOn.push(-1);
            } else {
                wheelOn.push(i);
            }
            axleAngles.push(genes[16 + i * 3 + 1] * 2 * Math.PI);
            wheelRadii.push(genes[16 + i * 3 + 2] * (MAX_WHEEL - MIN_WHEEL) + MIN_WHEEL);
        }

        return { angles, mags, wheelOn, axleAngles, wheelRadii };
    }

    function makeRgbStrings(colors, startIdx, count) {
        const result = [];
        for (let i = 0; i < count; i++) {
            const c = colors[startIdx + i];
            result.push(`rgb(${c[0]},${c[1]},${c[2]})`);
        }
        return result;
    }

    function computeCarData(chromo) {
        const decoded = decodeChromosome(chromo.genes);
        const segColors = makeRgbStrings(chromo.colors, 0, NUM_SEGMENTS);
        const axleColors = makeRgbStrings(chromo.colors, NUM_SEGMENTS, NUM_SEGMENTS);

        const vertices = [[0, 0]];
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            vertices.push([
                decoded.mags[i] * Math.cos(decoded.angles[i]),
                decoded.mags[i] * Math.sin(decoded.angles[i])
            ]);
        }

        const wheels = [];
        for (let i = 0; i < decoded.wheelOn.length; i++) {
            const segIdx = decoded.wheelOn[i];
            if (segIdx !== -1) {
                const angle = decoded.angles[segIdx];
                const mag = decoded.mags[segIdx];
                wheels.push({
                    pos: { x: mag * Math.cos(angle), y: mag * Math.sin(angle) },
                    angle: decoded.axleAngles[i],
                    radius: decoded.wheelRadii[i],
                    index: i
                });
            } else {
                wheels.push(null);
            }
        }

        return { decoded, vertices, segColors, axleColors, wheels };
    }

    function getCarGeometry(chromo) {
        const { vertices, segColors, axleColors, wheels } = computeCarData(chromo);
        return { vertices, colors: segColors, axleColors, wheels };
    }

    return { computeCarData, getCarGeometry, decodeChromosome };
})();
