/* =========================================================
   GAMEHUB - GAME SOUND
   ========================================================= */

"use strict";

const GameSound = (() => {

    const STORAGE_KEY = "gamehub_game_sound";

    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";


    // =====================================================
    // AUDIO CACHE
    // =====================================================

    const cache = new Map();

    const pools = new Map();

    const POOL_SIZE = 3;


    // Những âm thanh có thể được gọi liên tục
    const POOL_FILES = new Set([
        "flappy_flap.mp3",
        "flappy_score.mp3",
        "flappy_hit.mp3",
        "caro_click.mp3",
        "chess_click.mp3"
    ]);


    // =====================================================
    // RESOLVE PATH
    // =====================================================

    /*
     * QUAN TRỌNG:
     *
     * "./flappy_flap.mp3"
     *
     * sẽ được tính dựa trên URL của trang Flappy,
     * KHÔNG dựa trên vị trí sound.js.
     */

    function resolvePath(file) {

        try {

            return new URL(
                file,
                document.baseURI
            ).href;

        } catch (error) {

            return file;
        }
    }


    // =====================================================
    // CREATE AUDIO
    // =====================================================

    function createAudio(url) {

        const audio = new Audio();

        audio.preload = "auto";

        audio.src = url;

        return audio;
    }


    // =====================================================
    // GET FILE NAME
    // =====================================================

    function getFileName(file) {

        try {

            return String(file)
                .split("/")
                .pop()
                .split("?")[0]
                .toLowerCase();

        } catch (error) {

            return String(file)
                .toLowerCase();
        }
    }


    // =====================================================
    // GET CACHE KEY
    // =====================================================

    function getKey(file) {

        return resolvePath(file);
    }


    // =====================================================
    // PRELOAD
    // =====================================================

    function preload(file) {

        if (!file) {
            return;
        }


        const key =
            getKey(file);


        /*
         * Đã cache rồi
         */
        if (
            cache.has(key) ||
            pools.has(key)
        ) {
            return;
        }


        const filename =
            getFileName(file);


        // =================================================
        // AUDIO POOL
        // =================================================

        if (POOL_FILES.has(filename)) {

            const list = [];

            for (
                let i = 0;
                i < POOL_SIZE;
                i++
            ) {

                list.push({
                    audio: createAudio(key),
                    index: i
                });
            }


            pools.set(key, {
                list,
                current: 0
            });


            return;
        }


        // =================================================
        // NORMAL CACHE
        // =================================================

        cache.set(
            key,
            createAudio(key)
        );
    }


    // =====================================================
    // GET AUDIO
    // =====================================================

    function getAudio(file) {

        const key =
            getKey(file);


        // =================================================
        // POOL
        // =================================================

        if (pools.has(key)) {

            const pool =
                pools.get(key);


            for (
                let i = 0;
                i < pool.list.length;
                i++
            ) {

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
                        (
                            item.index + 1
                        ) %
                        pool.list.length;


                    return item.audio;
                }
            }


            // Nếu tất cả đang phát
            const item =
                pool.list[pool.current];


            pool.current =
                (pool.current + 1) %
                pool.list.length;


            return item.audio;
        }


        // =================================================
        // NORMAL
        // =================================================

        if (!cache.has(key)) {

            preload(file);
        }


        return cache.get(key) || null;
    }


    // =====================================================
    // PLAY
    // =====================================================

    function play(
        file,
        volume = 0.6
    ) {

        if (!enabled) {
            return;
        }


        if (!file) {
            return;
        }


        const audio =
            getAudio(file);


        if (!audio) {
            return;
        }


        try {

            audio.volume =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(volume) || 0
                    )
                );


            audio.currentTime = 0;


            const promise =
                audio.play();


            if (
                promise &&
                typeof promise.catch ===
                    "function"
            ) {

                promise.catch(() => {});
            }

        } catch (error) {

            // Browser audio error:
            // không làm crash game.

        }
    }


    // =====================================================
    // STOP ALL
    // =====================================================

    function stopAll() {

        cache.forEach(audio => {

            try {

                audio.pause();

                audio.currentTime = 0;

            } catch (e) {}

        });


        pools.forEach(pool => {

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
    // SHORTCUTS
    // =====================================================

    function getGame() {

        return (
            document.body?.dataset?.game ||
            document.documentElement?.dataset?.game ||
            ""
        ).toLowerCase();
    }


    function click(volume = 0.5) {

        const game =
            getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_click.mp3",
                volume
            );

        }
        else if (
            game === "flappy"
        ) {

            play(
                "./flappy_click.mp3",
                volume
            );

        }
        else if (
            game === "chess"
        ) {

            play(
                "./chess_click.mp3",
                volume
            );
        }
    }


    function move(volume = 0.55) {

        const game =
            getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_place.mp3",
                volume
            );

        }
        else if (
            game === "flappy"
        ) {

            play(
                "./flappy_flap.mp3",
                volume
            );

        }
        else if (
            game === "chess"
        ) {

            play(
                "./chess_move.mp3",
                volume
            );
        }
    }


    function win(volume = 0.7) {

        const game =
            getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_win.mp3",
                volume
            );

        }
        else if (
            game === "chess"
        ) {

            play(
                "./chess_win.mp3",
                volume
            );
        }
    }


    function lose(volume = 0.7) {

        const game =
            getGame();


        if (
            game === "caro5" ||
            game === "caro"
        ) {

            play(
                "./caro_lose.mp3",
                volume
            );

        }
        else if (
            game === "chess"
        ) {

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


        document.body.appendChild(
            button
        );


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
    }


    // =====================================================
    // INIT
    // =====================================================

    function init() {

        createButton();


        /*
         * Không preload ngay khi trang vừa mở.
         *
         * Các âm thanh sẽ được preload khi game
         * gọi GameSound.play() lần đầu.
         */

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

        preload,

        preloadAll: function(files) {

            if (!Array.isArray(files)) {
                return;
            }

            files.forEach(preload);
        },

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
