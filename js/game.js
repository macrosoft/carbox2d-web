(function () {

    var canvas   = document.getElementById('gameCanvas');
    var renderer = new Renderer(canvas);

    window.addEventListener('resize', function () {
        renderer.resize();
    });

    // Начальная позиция камеры — в начале дороги (без анимации)
    renderer.setCamera(-490, 2);

    function frame() {
        renderer.draw();
        requestAnimationFrame(frame);
    }

    // Стрелки для перемещения камеры
    document.addEventListener('keydown', function (e) {
        var speed = 20;
        if (e.key === 'ArrowRight')  renderer.targetX += speed;
        if (e.key === 'ArrowLeft')   renderer.targetX  -= speed;
        if (e.key === 'ArrowUp')     renderer.targetY  += speed;
        if (e.key === 'ArrowDown')   renderer.targetY  -= speed;
    });

    requestAnimationFrame(frame);

})();
