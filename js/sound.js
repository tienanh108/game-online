/* =========================================================
   GAMEHUB - GAME SOUND
   Caro 5 / Flappy / Chess
   SIMPLE VERSION
   ========================================================= */

"use strict";


const GameSound = (() => {

    /* =====================================================
       SETTINGS
    ===================================================== */

    const STORAGE_KEY =
        "gamehub_game_sound_final";


    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";


    /*
     * Giữ các Audio đang phát để trình duyệt
     * không garbage-collect chúng.
     */
    const activeAudio = new Set();


    /* =====================================================
       PATH
       ===================================================== */

    function resolvePath(file) {

        try {

            return new URL(
                file,
                window.location.href
            ).href;

        } catch (error) {

            return file;
        }
    }


    /* =====================================================
       PLAY
       ===================================================== */

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


        const url =
            resolvePath(file);


        /*
         * Tạo Audio MỚI mỗi lần phát.
         *
         * Không cache.
         * Không preload.
         * Không currentTime.
         * Không pool.
         */

        const audio =
            new Audio(url);


        audio.volume =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(volume) || 0
                )
            );


        audio.preload =
            "auto";


        audio.playsInline =
            true;


        activeAudio.add(
            audio
        );


        /*
         * Xóa khỏi bộ nhớ khi phát xong.
         */

        const cleanup =
            () => {

                activeAudio.delete(
                    audio
                );

            };


        audio.addEventListener(
            "ended",
            cleanup,
            {
                once: true
            }
        );


        audio.addEventListener(
            "error",
            cleanup,
            {
                once: true
            }
        );


        /*
         * PHÁT NGAY.
         */

        try {

            const promise =
                audio.play();


            if (
                promise &&
                typeof promise.catch ===
                    "function"
            ) {

                promise.catch(
                    error => {

                        console.warn(
                            "[GameSound] Không phát được:",
                            url,
                            error
                        );

                        cleanup();

                    }
                );
            }

        } catch (error) {

            console.warn(
                "[GameSound] Audio error:",
                error
            );

            cleanup();
        }
    }


    /* =====================================================
       PRELOAD
       =====================================================

       Không preload nữa.
       Giữ API để code cũ không lỗi.
    */

    function preload(file) {

        /*
         * Cố tình để trống.
         *
         * Game sound sẽ được tải và phát
         * ngay khi game gọi play().
         */
    }


    /* =====================================================
       STOP ALL
       ===================================================== */

    function stopAll() {

        activeAudio.forEach(
            audio => {

                try {

                    audio.pause();

                    audio.currentTime =
                        0;

                } catch (error) {}

            }
        );


        activeAudio.clear();
    }


    /* =====================================================
       ENABLE / DISABLE
       ===================================================== */

    function setEnabled(value) {

        enabled =
            Boolean(value);


        localStorage.setItem(
            STORAGE_KEY,
            enabled
                ? "on"
                : "off"
        );


        if (!enabled) {

            stopAll();
        }


        updateButton();
    }


    function toggle() {

        setEnabled(
            !enabled
        );
    }


    function isEnabled() {

        return enabled;
    }


    /* =====================================================
       GAME
       ===================================================== */

    function getGame() {

        return (

            document.body?.dataset?.game ||

            document.documentElement?.dataset?.game ||

            ""

        ).toLowerCase();
    }


    /* =====================================================
       CLICK
       ===================================================== */

    function click(
        volume = 0.5
    ) {

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

            return;
        }


        if (
            game === "flappy"
        ) {

            play(
                "./flappy_click.mp3",
                volume
            );

            return;
        }


        if (
            game === "chess"
        ) {

            play(
                "./chess_click.mp3",
                volume
            );

            return;
        }
    }


    /* =====================================================
       MOVE
       ===================================================== */

    function move(
        volume = 0.55
    ) {

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

            return;
        }


        if (
            game === "flappy"
        ) {

            play(
                "./flappy_flap.mp3",
                volume
            );

            return;
        }


        if (
            game === "chess"
        ) {

            play(
                "./chess_move.mp3",
                volume
            );

            return;
        }
    }


    /* =====================================================
       WIN
       ===================================================== */

    function win(
        volume = 0.7
    ) {

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

            return;
        }


        if (
            game === "chess"
        ) {

            play(
                "./chess_win.mp3",
                volume
            );

            return;
        }
    }


    /* =====================================================
       LOSE
       ===================================================== */

    function lose(
        volume = 0.7
    ) {

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

            return;
        }


        if (
            game === "chess"
        ) {

            play(
                "./chess_lose.mp3",
                volume
            );

            return;
        }
    }


    /* =====================================================
       BUTTON
       ===================================================== */

    function createButton() {

        if (
            document.getElementById(
                "gameSoundButton"
            )
        ) {

            return;
        }


        const button =
            document.createElement(
                "button"
            );


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
            function () {

                toggle();

            }
        );


        button.style.cssText = `
            position: fixed;

            top: 14px;
            right: 14px;

            width: 44px;
            height: 44px;

            border: 0;
            border-radius: 12px;

            background:
                rgba(15,18,28,.82);

            color: white;

            display: flex;

            align-items: center;
            justify-content: center;

            cursor: pointer;

            z-index: 99999;

            backdrop-filter:
                blur(8px);

            -webkit-backdrop-filter:
                blur(8px);

            box-shadow:
                0 4px 16px
                rgba(0,0,0,.25);

            -webkit-tap-highlight-color:
                transparent;

            touch-action:
                manipulation;
        `;


        document.body.appendChild(
            button
        );


        updateButton();
    }


    /* =====================================================
       BUTTON UI
       ===================================================== */

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
                    <path
                        d="M11 5 6 9H2v6h4l5 4V5Z"
                    />

                    <path
                        d="M19.07 4.93a10 10 0 0 1 0 14.14"
                    />

                    <path
                        d="M15.54 8.46a5 5 0 0 1 0 7.07"
                    />
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
                    <path
                        d="M11 5 6 9H2v6h4l5 4V5Z"
                    />

                    <path
                        d="m23 9-6 6"
                    />

                    <path
                        d="m17 9 6 6"
                    />
                </svg>
            `;
        }
    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        createButton();
    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

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

        init

    };

})();


/* =========================================================
   IMPORTANT
   =========================================================

   main.js của bạn gọi:

       window.GameSound.play(...)

   nên phải đưa GameSound ra window.
   ========================================================= */

window.GameSound =
    GameSound;


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            GameSound.init();

        },
        {
            once: true
        }
    );

} else {

    GameSound.init();
}
