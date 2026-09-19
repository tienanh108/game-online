/* =========================================================
   GAME SOUND
   Preload + Audio Pool
   ========================================================= */

"use strict";

const GameSound = (() => {

    const STORAGE_KEY = "gamehub_game_sound";

    let enabled = localStorage.getItem(STORAGE_KEY) !== "off";

    // =====================================================
    // AUDIO CACHE
    // =====================================================

    const audioCache = {};
    const audioPools = {};

    const POOL_SIZE = 4;

    const SOUND_FILES = {

        caro_click: "./caro_click.mp3",
        caro_place: "./caro_place.mp3",
        caro_win: "./caro_win.mp3",
        caro_lose: "./caro_lose.mp3",
        caro_timeout: "./caro_timeout.mp3",

        flappy_click: "./flappy_click.mp3",
        flappy_flap: "./flappy_flap.mp3",
        flappy_score: "./flappy_score.mp3",
        flappy_hit: "./flappy_hit.mp3",
        flappy_die: "./flappy_die.mp3",

        chess_click: "./chess_click.mp3",
        chess_move: "./chess_move.mp3",
        chess_capture: "./chess_capture.mp3",
        chess_check: "./chess_check.mp3",
        chess_checkmate: "./chess_checkmate.mp3",
        chess_win: "./chess_win.mp3",
        chess_lose: "./chess_lose.mp3"
    };


    // =====================================================
    // GET GAME
    // =====================================================

    function getGame() {
        return (
            document.body?.dataset?.game ||
            document.documentElement?.dataset?.game ||
            ""
        ).toLowerCase();
    }


    // =====================================================
    // PRELOAD ONE SOUND
    // =====================================================

    function preload(name, src) {

        if (audioCache[name]) {
            return;
        }

        const audio = new Audio();

        audio.preload = "auto";
        audio.src = src;
        audio.load();

        audioCache[name] = audio;
    }


    // =====================================================
    // CREATE AUDIO POOL
    // =====================================================

    function createPool(name, src) {

        if (audioPools[name]) {
            return;
        }

        const pool = [];

        for (let i = 0; i < POOL_SIZE; i++) {

            const audio = new Audio();

            audio.preload = "auto";
            audio.src = src;
            audio.load();

            pool.push({
                audio,
                busy: false
            });
        }

        audioPools[name] = {
            pool,
            index: 0
        };
    }


    // =====================================================
    // PRELOAD
    // =====================================================

    function preloadAll() {

        Object.entries(SOUND_FILES).forEach(([name, src]) => {

            preload(name, src);

            // Flappy flap/score/hit may happen frequently.
            // Give them a small reusable pool.
            if (
                name === "flappy_flap" ||
                name === "flappy_score" ||
                name === "flappy_hit" ||
                name === "caro_click" ||
                name === "chess_click"
            ) {
                createPool(name, src);
            }
        });
    }


    // =====================================================
    // FIND AVAILABLE AUDIO
    // =====================================================

    function getPoolAudio(name) {

        const data = audioPools[name];

        if (!data) {
            return null;
        }

        // First try a free audio.
        for (let i = 0; i < data.pool.length; i++) {

            const item =
                data.pool[
                    (data.index + i) % data.pool.length
                ];

            if (
                item.audio.paused ||
                item.audio.ended
            ) {

                data.index =
                    (data.index + i + 1) %
                    data.pool.length;

                return item.audio;
            }
        }

        // If every audio is busy,
        // reuse the next one instead of creating a new Audio.
        const item = data.pool[data.index];

        data.index =
            (data.index + 1) %
            data.pool.length;

        return item.audio;
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

        // Normalize filename
        const cleanFile =
            String(file)
                .split("/")
                .pop()
                .split("?")[0];

        let name = null;

        for (const [key, src] of Object.entries(SOUND_FILES)) {

            if (
                src.endsWith(cleanFile) ||
                key === cleanFile.replace(".mp3", "")
            ) {
                name = key;
                break;
            }
        }

        // -------------------------------------------------
        // Pooled sound
        // -------------------------------------------------

        let audio = null;

        if (name && audioPools[name]) {

            audio = getPoolAudio(name);

        } else if (name && audioCache[name]) {

            audio = audioCache[name];

        } else {

            // Fallback for unknown sounds.
            // IMPORTANT: only create once and cache it.

            const src =
                file.startsWith("./") ||
                file.startsWith("../") ||
                file.startsWith("/")
                    ? file
                    : "./" + file;

            const key = "custom:" + src;

            if (!audioCache[key]) {

                const newAudio = new Audio();

                newAudio.preload = "auto";
                newAudio.src = src;

                audioCache[key] = newAudio;
            }

            audio = audioCache[key];
        }

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

            const promise = audio.play();

            if (promise && promise.catch) {
                promise.catch(() => {});
            }

        } catch (e) {
            // Ignore mobile autoplay/audio errors.
        }
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

            Object.values(audioCache).forEach(audio => {

                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {}

            });

            Object.values(audioPools).forEach(data => {

                data.pool.forEach(item => {

                    try {
                        item.audio.pause();
                        item.audio.currentTime = 0;
                    } catch (e) {}

                });

            });
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

    function click(volume = 0.5) {

        const game = getGame();

        if (game === "flappy") {
            play("./flappy_click.mp3", volume);
        }
        else if (game === "caro5" || game === "caro") {
            play("./caro_click.mp3", volume);
        }
        else if (game === "chess") {
            play("./chess_click.mp3", volume);
        }
    }


    function move(volume = 0.55) {

        const game = getGame();

        if (game === "flappy") {
            play("./flappy_flap.mp3", volume);
        }
        else if (game === "caro5" || game === "caro") {
            play("./caro_place.mp3", volume);
        }
        else if (game === "chess") {
            play("./chess_move.mp3", volume);
        }
    }


    function win(volume = 0.7) {

        const game = getGame();

        if (game === "caro5" || game === "caro") {
            play("./caro_win.mp3", volume);
        }
        else if (game === "chess") {
            play("./chess_win.mp3", volume);
        }
    }


    function lose(volume = 0.7) {

        const game = getGame();

        if (game === "caro5" || game === "caro") {
            play("./caro_lose.mp3", volume);
        }
        else if (game === "chess") {
            play("./chess_lose.mp3", volume);
        }
    }


    // =====================================================
    // SPEAKER BUTTON
    // =====================================================

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
            "Bật tắt âm thanh"
        );

        button.addEventListener(
            "click",
            toggle,
            { passive: true }
        );

        document.body.appendChild(button);

        updateButton();
    }


    function updateButton() {

        const button =
            document.getElementById(
                "gameSoundButton"
            );

        if (!button) {
            return;
        }

        button.innerHTML = enabled
            ? `
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
              `
            : `
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
            box-shadow: 0 4px 16px rgba(0,0,0,.25);
            -webkit-tap-highlight-color: transparent;
        `;
    }


    // =====================================================
    // INITIALIZE
    // =====================================================

    function init() {

        // Start preloading after page is ready.
        // requestIdleCallback prevents blocking gameplay.
        const startPreload = () => {

            preloadAll();

        };

        if ("requestIdleCallback" in window) {

            window.requestIdleCallback(
                startPreload,
                { timeout: 1500 }
            );

        } else {

            setTimeout(
                startPreload,
                300
            );
        }

        createButton();
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
        preloadAll
    };

})();


// =========================================================
// START
// =========================================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => GameSound.init?.(),
        { once: true }
    );

} else {

    GameSound.init?.();

}
