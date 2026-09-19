/* =========================================================
   GAMEHUB - GAME SOUND
   Caro 5 / Flappy / Chess
   ========================================================= */

"use strict";

const GameSound = (() => {

    const STORAGE_KEY = "gamehub_game_sound";

    let enabled =
        localStorage.getItem(STORAGE_KEY) !== "off";


    /* =====================================================
       CACHE
    ===================================================== */

    const audioCache = new Map();

    const audioPools = new Map();

    const POOL_SIZE = 3;


    const POOL_FILES = new Set([
        "flappy_flap.mp3",
        "flappy_score.mp3",
        "flappy_hit.mp3",
        "caro_click.mp3",
        "chess_click.mp3"
    ]);


    /* =====================================================
       PATH
    ===================================================== */

    function resolvePath(file) {

        try {

            /*
             * Dùng URL của TRANG GAME hiện tại.
             *
             * Ví dụ:
             * /games/flappy/
             *
             * ./flappy_flap.mp3
             *
             * =>
             * /games/flappy/flappy_flap.mp3
             */

            return new URL(
                file,
                window.location.href
            ).href;

        } catch (error) {

            return file;
        }
    }


    /* =====================================================
       AUDIO CREATION
    ===================================================== */

    function createAudio(url) {

        const audio =
            document.createElement("audio");

        audio.preload = "auto";

        audio.src = url;

        audio.setAttribute(
            "playsinline",
            ""
        );

        /*
         * Không dùng controls.
         */
        audio.controls = false;

        return audio;
    }


    /* =====================================================
       FILE NAME
    ===================================================== */

    function getFileName(file) {

        return String(file)
            .split("/")
            .pop()
            .split("?")[0]
            .toLowerCase();
    }


    /* =====================================================
       PRELOAD
    ===================================================== */

    function preload(file) {

        if (!file) {
            return;
        }


        const url =
            resolvePath(file);


        /*
         * Đã có rồi.
         */
        if (
            audioCache.has(url) ||
            audioPools.has(url)
        ) {
            return;
        }


        const filename =
            getFileName(file);


        /*
         * AUDIO POOL
         */
        if (
            POOL_FILES.has(filename)
        ) {

            const list = [];


            for (
                let i = 0;
                i < POOL_SIZE;
                i++
            ) {

                list.push({
                    audio:
                        createAudio(url),

                    index:
                        i
                });
            }


            audioPools.set(
                url,
                {
                    list,
                    current: 0
                }
            );


            return;
        }


        /*
         * NORMAL CACHE
         */

        audioCache.set(
            url,
            createAudio(url)
        );
    }


    /* =====================================================
       GET AUDIO
    ===================================================== */

    function getAudio(file) {

        const url =
            resolvePath(file);


        /*
         * POOL
         */

        const pool =
            audioPools.get(url);


        if (pool) {

            /*
             * Tìm audio đang rảnh.
             */

            for (
                let i = 0;
                i < pool.list.length;
                i++
            ) {

                const item =
                    pool.list[
                        (
                            pool.current +
                            i
                        ) %
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


            /*
             * Tất cả đang phát.
             * Reuse cái tiếp theo.
             */

            const item =
                pool.list[
                    pool.current
                ];


            pool.current =
                (
                    pool.current + 1
                ) %
                pool.list.length;


            return item.audio;
        }


        /*
         * NORMAL
         */

        if (
            !audioCache.has(url)
        ) {

            preload(file);
        }


        return (
            audioCache.get(url) ||
            null
        );
    }


    /* =====================================================
       AUDIO UNLOCK
       ===================================================== */

    let audioUnlocked = false;


    function unlock() {

        if (audioUnlocked) {
            return;
        }


        /*
         * Trên iPhone/Safari, audio nên được
         * khởi động từ một user gesture.
         */

        try {

            const test =
                document.createElement(
                    "audio"
                );


            test.setAttribute(
                "playsinline",
                ""
            );


            test.muted = true;

            test.volume = 0;

            test.src =
                "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACcQCA";

            const promise =
                test.play();


            if (
                promise &&
                typeof promise.then ===
                    "function"
            ) {

                promise
                    .then(() => {

                        test.pause();

                        test.remove();

                        audioUnlocked = true;

                    })
                    .catch(() => {

                        test.remove();

                    });

            } else {

                test.pause();

                test.remove();

                audioUnlocked = true;
            }

        } catch (error) {}

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


        try {

            audio.volume =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(volume) || 0
                    )
                );


            /*
             * Quan trọng:
             * reset audio.
             */

            audio.currentTime = 0;


            const promise =
                audio.play();


            if (
                promise &&
                typeof promise.catch ===
                    "function"
            ) {

                promise.catch(
                    error => {

                        /*
                         * Nếu Safari từ chối lần đầu,
                         * thử lại sau user gesture tiếp theo.
                         */

                        if (
                            error &&
                            error.name ===
                                "NotAllowedError"
                        ) {

                            audioUnlocked = false;
                        }

                    }
                );
            }

        } catch (error) {

            // Không để lỗi audio làm crash game.
        }
    }


    /* =====================================================
       STOP
    ===================================================== */

    function stopAll() {

        audioCache.forEach(
            audio => {

                try {

                    audio.pause();

                    audio.currentTime = 0;

                } catch (e) {}

            }
        );


        audioPools.forEach(
            pool => {

                pool.list.forEach(
                    item => {

                        try {

                            item.audio.pause();

                            item.audio.currentTime = 0;

                        } catch (e) {}

                    }
                );

            }
        );
    }


    /* =====================================================
       ENABLE / DISABLE
    ===================================================== */

    function setEnabled(value) {

        enabled = !!value;


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

        /*
         * Người dùng vừa bấm nút loa.
         * Đây chính là user gesture.
         */

        unlock();

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

                /*
                 * iPhone audio unlock
                 */
                unlock();

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


        /*
         * Unlock audio khi người dùng tương tác
         * với trang game.
         *
         * Không phát tiếng ở đây.
         */

        document.addEventListener(
            "pointerdown",
            unlock,
            {
                once: true,
                passive: true
            }
        );


        document.addEventListener(
            "touchstart",
            unlock,
            {
                once: true,
                passive: true
            }
        );


        /*
         * Preload sau một chút.
         * Không làm chậm lúc game vừa mở.
         */

        setTimeout(
            () => {

                preload(
                    "./caro_click.mp3"
                );

                preload(
                    "./caro_place.mp3"
                );

                preload(
                    "./caro_win.mp3"
                );

                preload(
                    "./caro_lose.mp3"
                );

                preload(
                    "./caro_timeout.mp3"
                );


                preload(
                    "./flappy_click.mp3"
                );

                preload(
                    "./flappy_flap.mp3"
                );

                preload(
                    "./flappy_score.mp3"
                );

                preload(
                    "./flappy_hit.mp3"
                );

                preload(
                    "./flappy_die.mp3"
                );


                preload(
                    "./chess_click.mp3"
                );

                preload(
                    "./chess_move.mp3"
                );

                preload(
                    "./chess_capture.mp3"
                );

                preload(
                    "./chess_check.mp3"
                );

                preload(
                    "./chess_checkmate.mp3"
                );

                preload(
                    "./chess_win.mp3"
                );

                preload(
                    "./chess_lose.mp3"
                );

            },
            300
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
