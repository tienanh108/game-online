/* =========================================================
   GAMEHUB
   SOUND.JS
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "gamehub_game_sound";

    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";

    let audioCache = {};

    /* =========================================================
       SETTINGS
    ========================================================= */

    function isEnabled() {
        return enabled;
    }

    function setEnabled(value) {
        enabled = Boolean(value);

        localStorage.setItem(
            STORAGE_KEY,
            enabled ? "on" : "off"
        );

        updateButtons();
    }

    function toggle() {
        setEnabled(!enabled);
        return enabled;
    }

    /* =========================================================
       PLAY SOUND
    ========================================================= */

    function play(file, volume = 1) {
        if (!enabled || !file) {
            return;
        }

        try {
            let audio = audioCache[file];

            if (!audio) {
                audio = new Audio(file);
                audioCache[file] = audio;
            }

            /*
             * Cho phép cùng một âm thanh phát lại
             * nhanh liên tiếp.
             */
            audio.pause();
            audio.currentTime = 0;
            audio.volume =
                Math.max(
                    0,
                    Math.min(1, volume)
                );

            const promise = audio.play();

            if (
                promise &&
                typeof promise.catch === "function"
            ) {
                promise.catch(() => {});
            }

        } catch (error) {
            console.warn(
                "GameSound error:",
                error
            );
        }
    }

    /* =========================================================
       COMMON SOUNDS
    ========================================================= */

    function click() {
        play("./caro_click.mp3", 0.45);
    }

    function move() {
        play("./chess_move.mp3", 0.55);
    }

    function win() {
        play("./chess_win.mp3", 0.75);
    }

    function lose() {
        play("./chess_lose.mp3", 0.75);
    }

    /* =========================================================
       UI BUTTON
    ========================================================= */

    function createButton() {
        if (document.getElementById("gameSoundButton")) {
            return;
        }

        const button =
            document.createElement("button");

        button.id = "gameSoundButton";
        button.type = "button";
        button.setAttribute(
            "aria-label",
            enabled
                ? "Tắt âm thanh"
                : "Bật âm thanh"
        );

        button.innerHTML = getIcon();

        button.addEventListener(
            "click",
            function () {
                const state = toggle();

                button.innerHTML =
                    getIcon();

                button.setAttribute(
                    "aria-label",
                    state
                        ? "Tắt âm thanh"
                        : "Bật âm thanh"
                );

                /*
                 * Khi người dùng vừa chạm nút,
                 * phát thử click để iPhone/Safari
                 * cho phép audio hoạt động.
                 */
                if (state) {
                    play(
                        getCurrentClickSound(),
                        0.45
                    );
                }
            }
        );

        document.body.appendChild(button);

        injectStyle();
    }

    function getCurrentClickSound() {
        const game =
            document.body.dataset.game;

        if (game === "chess") {
            return "./chess_click.mp3";
        }

        if (game === "flappy") {
            return "./flappy_click.mp3";
        }

        return "./caro_click.mp3";
    }

    function getIcon() {
        if (enabled) {
            return `
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        d="M4 9v6h4l5 4V5L8 9H4z"
                        fill="currentColor"
                    />
                    <path
                        d="M16 8.5a5 5 0 0 1 0 7"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <path
                        d="M18.5 6a8.5 8.5 0 0 1 0 12"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </svg>
            `;
        }

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    d="M4 9v6h4l5 4V5L8 9H4z"
                    fill="currentColor"
                />
                <path
                    d="M17 9l4 4m0-4-4 4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    /* =========================================================
       STYLE
    ========================================================= */

    function injectStyle() {
        if (
            document.getElementById(
                "game-sound-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "game-sound-style";

        style.textContent = `
            #gameSoundButton {
                position: fixed;
                top: max(16px, env(safe-area-inset-top));
                right: max(16px, env(safe-area-inset-right));

                width: 46px;
                height: 46px;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 0;

                border: 1px solid rgba(255,255,255,.12);
                border-radius: 14px;

                background: rgba(15,23,42,.88);
                color: #ffffff;

                box-shadow:
                    0 8px 24px rgba(0,0,0,.28);

                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);

                cursor: pointer;

                z-index: 9999;

                -webkit-tap-highlight-color:
                    transparent;

                transition:
                    transform .15s ease,
                    background .15s ease;
            }

            #gameSoundButton svg {
                width: 22px;
                height: 22px;
                display: block;
            }

            #gameSoundButton:hover {
                transform: translateY(-1px);
                background: rgba(30,41,59,.95);
            }

            #gameSoundButton:active {
                transform: scale(.92);
            }

            @media (max-width: 600px) {
                #gameSoundButton {
                    width: 42px;
                    height: 42px;

                    top: max(
                        12px,
                        env(safe-area-inset-top)
                    );

                    right: max(
                        12px,
                        env(safe-area-inset-right)
                    );

                    border-radius: 12px;
                }

                #gameSoundButton svg {
                    width: 20px;
                    height: 20px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       UPDATE
    ========================================================= */

    function updateButtons() {
        const button =
            document.getElementById(
                "gameSoundButton"
            );

        if (!button) {
            return;
        }

        button.innerHTML =
            getIcon();

        button.setAttribute(
            "aria-label",
            enabled
                ? "Tắt âm thanh"
                : "Bật âm thanh"
        );
    }

    /* =========================================================
       INIT
    ========================================================= */

    function init() {
        createButton();
    }

    /* =========================================================
       EXPORT
    ========================================================= */

    window.GameSound = {
        play,
        click,
        move,
        win,
        lose,

        isEnabled,
        setEnabled,
        toggle,

        init
    };

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }

})();
