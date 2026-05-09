const Theme = (function () {
    'use strict';

    const STORAGE_KEY = 'carbox2d_theme';

    let _isDark = false;

    function apply() {
        document.documentElement.setAttribute('data-theme', _isDark ? 'dark' : 'light');
        try {
            localStorage.setItem(STORAGE_KEY, _isDark ? 'dark' : 'light');
        } catch (_) {}
    }

    function init() {
        let stored = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch (_) {}
        _isDark = stored === 'dark';
        apply();
    }

    function toggle() {
        _isDark = !_isDark;
        apply();
        return _isDark;
    }

    function isDark() {
        return _isDark;
    }

    init();

    return { toggle: toggle, isDark: isDark };
})();
