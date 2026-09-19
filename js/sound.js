/* =========================================================
   GAMEHUB - GAME SOUND
   Caro 5 / Flappy / Chess
   ========================================================= */

"use strict";

const GameSound = (() => {

    const STORAGE_KEY = "gamehub_game_sound_v2";

    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";


    /* =====================================================
       AUDIO CACHE
       ===================================================== */

    const audioCache = new Map();


    /* =====================================================
       PATH
       ===================================================== */

    function resolvePath(file) {

        try {
            return new URL(
                file,
                window.location.href
            ).href;
        } catch (e) {
            return file;
        }
    }


    /* =====================================================
       CREATE AUDIO
       ===================================================== */

    function createAudio(file) {

        const url =
            resolvePath(file);

        const audio =
            new Audio(url);

        audio.preload = "auto";

        audio.playsInline = true;

        /*
         * Đưa audio vào DOM.
         *
         * Trên một số trình duyệt mobile,
         * audio element nằm trong DOM ổn định hơn
         * audio element hoàn toàn detached.
         */

        audio.style.display = "none";

        document.body.appendChild(audio);

        return audio;
    }


    /* =====================================================
       GET AUDIO
       ===================================================== */

    function getAudio(file) {

        const url =
            resolvePath(file);

        if (!audioCache.has(url)) {

            const audio =
                createAudio(file);

            audioCache.set(
                url,
                audio
            );
        }

        return audioCache.get(url);
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


        const audio =
            getAudio(file);


        if (!audio) {
            return;
        }


        const vol =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(volume) || 0
                )
            );


        audio.volume = vol;


        /*
         * Không reset currentTime nếu audio
         * chưa load metadata.
         *
         * Đây là phần quan trọng.
         */

        try {

            if (
                audio.readyState >= 1 &&
                !audio.paused
            ) {

                audio.currentTime = 0;

            }
            else if (
                audio.readyState >= 1
            ) {

                audio.currentTime = 0;
            }

        } catch (e) {
            /*
             * Không làm crash game.
             */
        }


        /*
         * play() phải được gọi trực tiếp.
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
                            file,
                            error
                        );

                    }
                );
            }

        } catch (error) {

            console.warn(
                "[GameSound] play error:",
                file,
                error
            );
        }
    }


    /* =====================================================
       PRELOAD
       ===================================================== */

    function preload(file) {

        if (!file) {
            return;
        }

        const audio =
            getAudio(file);

        try {
            audio.load();
        } catch (e) {}
    }


    /* =====================================================
       STOP
       ===================================================== */

    function stopAll() {

        audioCache.forEach(
            audio => {

                try {

                    audio.pause();

                    if (
                        audio.readyState >= 1
                    ) {
                        audio.currentTime = 0;
                    }

                } catch (e) {}

            }
        );
    }


    /* =====================================================
       ENABLE / DISABLE
       ===================================================== */

    function setEnabled(value) {

        enabled =
            !!value;


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
       SHORTCUTS
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


    /* =====================================================
       SOUND BUTTON
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
            () => {

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

            touch-action: manipulation;
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


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        createButton();


        /*
         * Preload sau khi trang ổn định.
         */

        setTimeout(
            () => {

                const files = [

                    "./caro_click.mp3",
                    "./caro_place.mp3",
                    "./caro_win.mp3",
                    "./caro_lose.mp3",
                    "./caro_timeout.mp3",

                    "./flappy_click.mp3",
                    "./flappy_flap.mp3",
                    "./flappy_score.mp3",
                    "./flappy_hit.mp3",
                    "./flappy_die.mp3",

                    "./chess_click.mp3",
                    "./chess_move.mp3",
                    "./chess_capture.mp3",
                    "./chess_check.mp3",
                    "./chess_checkmate.mp3",
                    "./chess_win.mp3",
                    "./chess_lose.mp3"

                ];


                files.forEach(
                    preload
                );

            },
            500
        );
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
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => GameSound.init(),
        {
            once: true
        }
    );

} else {

    GameSound.init();
}
