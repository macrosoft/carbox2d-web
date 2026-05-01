var Chromosome = (function () {
    var NUM_SEGMENTS = 8;
    var MIN_MAG = 0.3;
    var MAX_MAG = 3.0;

    function generate() {
        // Random angles between segments (min 0.08 rad each), summing to 2*PI
        var totalAngle = 2 * Math.PI;
        var minAngle = 0.08;
        var numAngles = NUM_SEGMENTS;
        var rawAngles = [];

        for (var i = 0; i < numAngles; i++) {
            rawAngles.push(minAngle + Math.random() * (totalAngle - minAngle * numAngles) / numAngles);
        }

        // Normalize to sum exactly to 2*PI
        var sum = 0;
        for (var i = 0; i < numAngles; i++) {
            sum += rawAngles[i];
        }
        for (var i = 0; i < numAngles; i++) {
            rawAngles[i] = (rawAngles[i] / sum) * totalAngle;
        }

        // Convert to cumulative polar angles
        var cumulative = 0;
        var angles = [];
        for (var i = 0; i < numAngles; i++) {
            angles.push(cumulative);
            cumulative += rawAngles[i];
        }
        var mags = [];
        for (var i = 0; i < NUM_SEGMENTS; i++) {
            mags.push(MIN_MAG + Math.random() * (MAX_MAG - MIN_MAG));
        }
        // Wheel placement: for each of 8 slots, which segment is it on (-1 = none)
        var wheelOn = [];
        for (var i = 0; i < NUM_SEGMENTS; i++) {
            var prob = Math.random();
            if (prob > 0.7) { // 30% chance of wheel in this slot
                wheelOn.push(Math.floor(Math.random() * NUM_SEGMENTS));
            } else {
                wheelOn.push(-1);
            }
        }

        // Axle angles for the 8 slots
        var axleAngles = [];
        for (var i = 0; i < NUM_SEGMENTS; i++) {
            axleAngles.push(Math.random() * 2 * Math.PI);
        }

        return {
            angles: angles,
            mags: mags,
            wheelOn: wheelOn,
            axleAngles: axleAngles,
            segments: NUM_SEGMENTS,
            hue: Math.random() * 360,
            sat: 70 + Math.random() * 30,
            lit: 40 + Math.random() * 25
        };
    }

    return { generate: generate };
})();
