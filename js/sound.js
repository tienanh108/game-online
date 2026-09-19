/* =========================================================
   GAMEHUB - GAME SOUND
   Caro 5 / Flappy / Chess
   ========================================================= */

"use strict";

const GameSound = (() => {

    const STORAGE_KEY = "gamehub_game_sound";

    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";


    // =====================================================
    // AUDIO CACHE
    // =====================================================

    const cache = {};

    /*
     * Mỗi âm thanh có thể được phát lại nhiều lần.
     * Không tạo new Audio() mỗi lần play().
     */
    const SOUND_FILES = {

        // CARO
        caro_click: "./caro_click.mp3",
        caro_place: "./caro_place.mp3",
        caro_win: "./caro_win.mp3",
        caro_lose: "./caro_lose.mp3",
        caro_timeout: "./caro_timeout.mp3",

        // FLAPPY
        flappy_click: "./flappy_click.mp3",
        flappy_flap: "./flappy_flap.mp3",
        flappy_score: "./flappy_score.mp3",
        flappy_hit: "./flappy_hit.mp3",
        flappy_die: "./flappy_die.mp3",

        // CHESS
        chess_click: "./chess_click.mp3",
        chess_move: "./chess_move.mp3",
        chess_capture: "./chess_capture.mp3",
        chess_check: "./chess_check.mp3",
        chess_checkmate: "./chess_checkmate.mp3",
        chess_win: "./chess_win.mp3",
        chess_lose: "./chess_lose.mp3"
    };


    // =====================================================
    // AUDIO POOL
    // =====================================================

    /*
     * Những âm thanh có thể xuất hiện liên tục
     * sẽ có nhiều Audio instance để không bị cắt tiếng.
     */

    const pools = {};

    const POOL_SIZE = 3;

    const POOL_SOUNDS = new Set([
        "flappy_flap",
        "flappy_score",
        "flappy_hit",
        "caro_click",
        "chess_click"
    ]);


    // =====================================================
    // CREATE AUDIO
    // =====================================================

    function createAudio(src) {

        const audio = new Audio();

        audio.preload = "auto";
        audio.src = src;

        return audio;
    }


    // =====================================================
    // PRELOAD ONE
    // =====================================================

    function preload(name) {

        if (!SOUND_FILES[name]) {
            return;
        }

        // Pool
        if (POOL_SOUNDS.has(name)) {

            if (pools[name]) {
                return;
            }

            const list = [];

            for (let i = 0; i < POOL_SIZE; i++) {

                list.push({
                    audio: createAudio(SOUND_FILES[name]),
                    index: i
                });
            }

            pools[name] = {
                list,
                current: 0
            };

            return;
        }


        // Normal cache
        if (!cache[name]) {
            cache[name] =
                createAudio(SOUND_FILES[name]);
        }
    }


    // =====================================================
    // PRELOAD ALL
    // =====================================================

    function preloadAll() {

        Object.keys(SOUND_FILES).forEach(preload);

    }


    // =====================================================
    // GET AUDIO
    // =====================================================

    function getAudio(name) {

        // Pool
        if (pools[name]) {

            const pool = pools[name];

            /*
             * Ưu tiên audio đã kết thúc / đang rảnh.
             */
            for (let i = 0; i < pool.list.length; i++) {

                const item =
                    pool.list[
                        (pool.current + i) %
                        pool.list.length
                    ];

                if (
                    item.audio.paused ||
                    item.audio.ended
                ) {

                    pool.current =
                        (item.index + 1) %
                        pool.list.length;

                    return item.audio;
                }
            }


            /*
             * Nếu tất cả đang phát,
             * lấy cái tiếp theo và restart.
             */
            const item =
                pool.list[pool.current];

            pool.current =
                (pool.current + 1) %
                pool.list.length;

            return item.audio;
        }


        // Normal audio
        return cache[name] || null;
    }


    // =====================================================
    // FIND SOUND NAME
    // =====================================================

    function getSoundName(file) {

        if (!file) {
            return null;
        }

        const filename =
            String(file)
                .split("/")
                .pop()
                .split("?")[0];


        for (const name of Object.keys(SOUND_FILES)) {

            if (
                filename ===
                `${name}.mp3`
            ) {
                return name;
            }

            if (
                SOUND_FILES[name]
                    .endsWith(filename)
            ) {
                return name;
            }
        }


        return null;
    }


    // =====================================================
    // PLAY
    // =====================================================

    function play(file, volume = 0.6) {

        if (!enabled) {
            return;
        }

        if (!file) {
            return;
        }


        const name =
            getSoundName(file);


        /*
         * Âm thanh đã biết
         */
        if (name) {

            if (
                !cache[name] &&
                !pools[name]
            ) {
                preload(name);
            }

            const audio =
                getAudio(name);

            if (!audio) {
                return;
            }

            try {

                audio.volume =
                    Math.max(
                        0,
                        Math.min(1, volume)
                    );

                audio.currentTime = 0;

                const promise =
                    audio.play();

                if (
                    promise &&
                    typeof promise.catch === "function"
                ) {
                    promise.catch(() => {});
                }

            } catch (error) {
                // Ignore browser audio restrictions.
            }

            return;
        }


        /*
         * Fallback cho file âm thanh khác.
         * Cache lại, không tạo Audio liên tục.
         */

        const key =
            `custom:${file}`;

        if (!cache[key]) {

            cache[key] =
                createAudio(file);
        }


        const audio =
            cache[key];


        try {

            audio.volume =
                Math.max(
                    0,
                    Math.min(1, volume)
                );

            audio.currentTime = 0;

            const promise =
                audio.play();

            if (
                promise &&
                typeof promise.catch === "function"
            ) {
                promise.catch(() => {});
            }

        } catch (error) {
            // Ignore.
        }
    }


    // =====================================================
    // STOP ALL
    // =====================================================

    function stopAll() {

        Object.values(cache).forEach(audio => {

            if (!audio) return;

            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}

        });


        Object.values(pools).forEach(pool => {

            pool.list.forEach(item => {

                try {
                    item.audio.pause();
                    item.audio.currentTime = 0;
                } catch (e) {}

            });

        });
    }


    // =====================================================
    // ENABLE / DISABLE
    // =====================================================

    function setEnabled(value) {

        enabled = !!value;

        localStorage.setItem(
            STORAGE_KEY,
            enabled ? "on" : "off"
        );


        if (!enabled) {
            stopAll();
        }


        updateButton();
    }


    function toggle() {

        setEnabled(!enabled);

    }


    function isEnabled() {

        return enabled;

    }


    // =====================================================
    // GAME DETECTION
    // =====================================================

    function getGame() {

        return (
            document.body?.dataset?.game ||
            document.documentElement?.dataset?.game ||
            ""
        ).toLowerCase();

    }


    // =====================================================
    // SHORTCUTS
    // =====================================================

    function click(volume = 0.5) {

        const game = getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_click.mp3",
                volume
            );

        }
        else if (game === "flappy") {

            play(
                "./flappy_click.mp3",
                volume
            );

        }
        else if (game === "chess") {

            play(
                "./chess_click.mp3",
                volume
            );

        }

    }


    function move(volume = 0.55) {

        const game = getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_place.mp3",
                volume
            );

        }
        else if (game === "flappy") {

            play(
                "./flappy_flap.mp3",
                volume
            );

        }
        else if (game === "chess") {

            play(
                "./chess_move.mp3",
                volume
            );

        }

    }


    function win(volume = 0.7) {

        const game = getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_win.mp3",
                volume
            );

        }
        else if (game === "chess") {

            play(
                "./chess_win.mp3",
                volume
            );

        }

    }


    function lose(volume = 0.7) {

        const game = getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_lose.mp3",
                volume
            );

        }
        else if (game === "chess") {

            play(
                "./chess_lose.mp3",
                volume
            );

        }

    }


    // =====================================================
    // SOUND BUTTON
    // =====================================================

    function createButton() {

        if (
            document.getElementById(
                "gameSoundButton"
            )
        ) {
            return;
        }


        const button =
            document.createElement("button");


        button.id =
            "gameSoundButton";

        button.type =
            "button";


        button.setAttribute(
            "aria-label",
            "Bật tắt âm thanh"
        );


        button.addEventListener(
            "click",
            toggle
        );


        document.body.appendChild(button);


        updateButton();

    }


    // =====================================================
    // UPDATE BUTTON
    // =====================================================

    function updateButton() {

        const button =
            document.getElementById(
                "gameSoundButton"
            );


        if (!button) {
            return;
        }


        if (enabled) {

            button.innerHTML = `
                <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M11 5 6 9H2v6h4l5 4V5Z"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
            `;

        } else {

            button.innerHTML = `
                <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M11 5 6 9H2v6h4l5 4V5Z"/>
                    <path d="m23 9-6 6"/>
                    <path d="m17 9 6 6"/>
                </svg>
            `;
        }


        button.style.cssText = `
            position: fixed;
            top: 14px;
            right: 14px;

            width: 44px;
            height: 44px;

            border: 0;
            border-radius: 12px;

            background: rgba(15,18,28,.82);

            color: white;

            display: flex;
            align-items: center;
            justify-content: center;

            cursor: pointer;

            z-index: 99999;

            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);

            box-shadow:
                0 4px 16px rgba(0,0,0,.25);

            -webkit-tap-highlight-color:
                transparent;
        `;
    }


    // =====================================================
    // INIT
    // =====================================================

    function init() {

        createButton();


        /*
         * Không preload ngay lập tức để tránh
         * làm nặng lúc trang/game vừa mở.
         */

        const startPreload = () => {

            preloadAll();

        };


        if (
            "requestIdleCallback"
            in window
        ) {

            window.requestIdleCallback(
                startPreload,
                {
                    timeout: 1500
                }
            );

        } else {

            setTimeout(
                startPreload,
                500
            );
        }

    }


    // =====================================================
    // PUBLIC API
    // =====================================================

    return {

        play,
        click,
        move,
        win,
        lose,

        toggle,
        setEnabled,
        isEnabled,

        preloadAll,

        init
    };

})();


// =========================================================
// START
// =========================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => GameSound.init(),
        { once: true }
    );

} else {

    GameSound.init();

}
