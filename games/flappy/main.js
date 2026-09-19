/* =========================================================
   FLAPPY BIRD — MAX PERFORMANCE + GAMEHUB
   ---------------------------------------------------------
   - Canvas background cache
   - Pipe object pooling
   - Không tạo object trong game loop
   - Không splice array trong game loop
   - Audio Web Audio API
   - Audio decode/preload một lần
   - Không cloneNode()
   - Không setTimeout()
   - DPR giới hạn
   - Delta time ổn định
   - R = restart
   - Space / Touch = flap

   GAMEHUB:
   - Firebase presence
   - Daily player
   - Game start
   - Game end
   - Score tracking
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       DOM
    ===================================================== */

    const canvas =
        document.getElementById("gameCanvas");

    const ctx =
        canvas.getContext("2d", {
            alpha: false,
            desynchronized: true
        });


    const startScreen =
        document.getElementById("startScreen");

    const gameOverScreen =
        document.getElementById("gameOverScreen");

    const startButton =
        document.getElementById("startButton");

    const restartButton =
        document.getElementById("restartButton");

    const backButton =
        document.getElementById("backButton");

    const backMenuButton =
        document.getElementById("backMenuButton");

    const gameOverMenuButton =
        document.getElementById(
            "gameOverMenuButton"
        );


    const scoreElement =
        document.getElementById("score");

    const highScoreElement =
        document.getElementById("highScore");

    const finalScoreElement =
        document.getElementById("finalScore");

    const finalHighScoreElement =
        document.getElementById(
            "finalHighScore"
        );


    /* =====================================================
       GAME CONFIG
    ===================================================== */

    const GRAVITY = 1450;

    const FLAP_POWER = -470;

    const PIPE_SPEED = 220;

    const PIPE_WIDTH = 64;

    const PIPE_GAP = 170;

    const PIPE_INTERVAL = 1.45;

    const BIRD_RADIUS = 15;

    const GROUND_HEIGHT = 55;


    /*
       Không cho 1 frame bị tính quá lâu.
    */

    const MAX_DELTA = 0.032;


    /* =====================================================
       CANVAS
    ===================================================== */

    let width = 320;

    let height = 500;

    let dpr = 1;


    /*
       Background cache.
    */

    const backgroundCanvas =
        document.createElement(
            "canvas"
        );

    const backgroundCtx =
        backgroundCanvas.getContext(
            "2d"
        );


    /* =====================================================
       GAME STATE
    ===================================================== */

    let state = "ready";

    let score = 0;


    let highScore =
        Number(
            localStorage.getItem(
                "flappy_high_score"
            ) || 0
        );


    let lastTime = 0;

    let rafId = 0;

    let pipeTimer = 0;


    /* =====================================================
       GAMEHUB STATE
    ===================================================== */

    let gameHubReady = false;

    let roundTrackingStarted = false;


    /* =====================================================
       BIRD
    ===================================================== */

    const bird = {
        x: 0,
        y: 0,
        velocity: 0,
        rotation: 0
    };


    /* =====================================================
       PIPE POOL
       -----------------------------------------------------
       Không tạo object mới trong game loop.
    ===================================================== */

    const MAX_PIPES = 8;

    const pipePool =
        new Array(MAX_PIPES);

    let activePipeCount = 0;


    for (
        let i = 0;
        i < MAX_PIPES;
        i++
    ) {

        pipePool[i] = {

            x: 0,

            top: 0,

            passed: false,

            active: false

        };
    }


    /* =====================================================
       AUDIO ENGINE
       -----------------------------------------------------
       Decode MP3 → AudioBuffer.
    ===================================================== */

    let audioContext = null;

    let audioReady = false;


    const audioBuffers = {

        flap: null,

        score: null,

        hit: null,

        die: null

    };


    const audioFiles = {

        flap:
            "./flappy_flap.mp3",

        score:
            "./flappy_score.mp3",

        hit:
            "./flappy_hit.mp3",

        die:
            "./flappy_die.mp3"

    };


    function ensureAudioContext() {

        if (audioContext) {

            return audioContext;

        }


        try {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        } catch (error) {

            audioContext = null;

        }


        return audioContext;
    }


    async function loadAudio() {

        const ac =
            ensureAudioContext();


        if (!ac) {

            return;

        }


        try {

            const names =
                Object.keys(
                    audioFiles
                );


            await Promise.all(

                names.map(
                    async (name) => {

                        const response =
                            await fetch(
                                audioFiles[name]
                            );


                        const arrayBuffer =
                            await response.arrayBuffer();


                        audioBuffers[name] =
                            await ac.decodeAudioData(
                                arrayBuffer
                            );

                    }
                )

            );


            audioReady = true;


        } catch (error) {

            /*
               Audio lỗi thì game vẫn chạy.
            */

            audioReady = false;

        }
    }


    function resumeAudio() {

        const ac =
            ensureAudioContext();


        if (!ac) {

            return;

        }


        if (
            ac.state ===
            "suspended"
        ) {

            ac.resume().catch(
                () => {}
            );

        }
    }


    function isSoundEnabled() {

        if (

            window.GameSound &&

            typeof window.GameSound.isEnabled ===
                "function"

        ) {

            return window.GameSound.isEnabled();

        }


        return true;
    }


    function playSound(
        name,
        volume = 0.5
    ) {

        if (!audioReady) {

            return;

        }


        if (!isSoundEnabled()) {

            return;

        }


        const ac =
            audioContext;


        const buffer =
            audioBuffers[name];


        if (
            !ac ||
            !buffer
        ) {

            return;

        }


        try {

            const source =
                ac.createBufferSource();


            const gain =
                ac.createGain();


            source.buffer =
                buffer;


            gain.gain.value =
                volume;


            source.connect(
                gain
            );


            gain.connect(
                ac.destination
            );


            source.start(0);


        } catch (error) {

            // Không làm crash game

        }
    }


    /*
       Load audio song song.
    */

    loadAudio();


    /* =====================================================
       GAMEHUB
       ===================================================== */

    async function initGameHub() {

        if (
            !window.GameHub
        ) {

            console.warn(
                "Flappy: GameHub không tồn tại."
            );

            return false;
        }


        if (
            !window.GameHub.ready
        ) {

            console.warn(
                "Flappy: GameHub.ready không tồn tại."
            );

            return false;
        }


        try {

            /*
               Chờ Firebase anonymous auth +
               presence + daily player.
            */

            await window.GameHub.ready;


            gameHubReady = true;


            /*
               Đảm bảo Flappy được ghi
               là đang online.
            */

            if (
                typeof window.GameHub.updatePresence ===
                "function"
            ) {

                await window.GameHub.updatePresence();

            }


            console.log(
                "Flappy GameHub READY"
            );


            return true;


        } catch (error) {

            console.warn(
                "Flappy GameHub init lỗi:",
                error
            );


            return false;

        }
    }


    /*
       Khởi tạo Firebase song song.
       Không chặn việc render game.
    */

    initGameHub();


    /* =====================================================
       GAMEHUB — START ROUND
       ===================================================== */

    async function startGameHubRound() {

        if (
            !gameHubReady
        ) {

            return;

        }


        if (
            roundTrackingStarted
        ) {

            return;

        }


        if (
            !window.GameHub
        ) {

            return;

        }


        try {

            roundTrackingStarted =
                true;


            /*
               Ghi game_start.
            */

            if (
                typeof window.GameHub.start ===
                "function"
            ) {

                await window.GameHub.start({

                    device:
                        window.innerWidth <= 768
                            ? "mobile"
                            : "desktop",

                    score:
                        0

                });

            }


            /*
               Refresh presence.
            */

            if (
                typeof window.GameHub.updatePresence ===
                "function"
            ) {

                window.GameHub.updatePresence();

            }


            console.log(
                "Flappy game_start tracked"
            );


        } catch (error) {

            roundTrackingStarted =
                false;


            console.warn(
                "Flappy game_start lỗi:",
                error
            );

        }
    }


    /* =====================================================
       GAMEHUB — END ROUND
       ===================================================== */

    async function endGameHubRound() {

        if (
            !gameHubReady
        ) {

            return;

        }


        if (
            !roundTrackingStarted
        ) {

            return;

        }


        if (
            !window.GameHub
        ) {

            return;

        }


        try {

            /*
               GameHub.end() sẽ ghi:
               game_end
               với result = loss
            */

            if (
                typeof window.GameHub.end ===
                "function"
            ) {

                await window.GameHub.end({

                    result:
                        "loss",

                    score:
                        score

                });

            }


            console.log(
                "Flappy game_end tracked:",
                score
            );


        } catch (error) {

            console.warn(
                "Flappy game_end lỗi:",
                error
            );

        }


        roundTrackingStarted =
            false;
    }


    /* =====================================================
       RESIZE
    ===================================================== */

    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();


        width =
            Math.max(
                320,
                rect.width
            );


        height =
            Math.max(
                400,
                rect.height
            );


        /*
           Retina nhưng giới hạn DPR.
        */

        dpr =
            Math.min(
                window.devicePixelRatio ||
                    1,
                1.5
            );


        canvas.width =
            Math.floor(
                width * dpr
            );


        canvas.height =
            Math.floor(
                height * dpr
            );


        ctx.setTransform(

            dpr,

            0,

            0,

            dpr,

            0,

            0

        );


        /*
           Background cache.
        */

        backgroundCanvas.width =
            Math.floor(
                width * dpr
            );


        backgroundCanvas.height =
            Math.floor(
                height * dpr
            );


        backgroundCtx.setTransform(

            dpr,

            0,

            0,

            dpr,

            0,

            0

        );


        backgroundCtx.imageSmoothingEnabled =
            true;


        createBackground();


        resetBird();

    }


    window.addEventListener(

        "resize",

        resizeCanvas,

        {
            passive: true
        }

    );


    /* =====================================================
       STATIC BACKGROUND
    ===================================================== */

    function createBackground() {

        const c =
            backgroundCtx;


        /*
           Sky
        */

        c.fillStyle =
            "#70c5ce";


        c.fillRect(

            0,

            0,

            width,

            height

        );


        /*
           Clouds
        */

        drawCloud(

            c,

            width * 0.18,

            height * 0.20,

            32

        );


        drawCloud(

            c,

            width * 0.72,

            height * 0.12,

            26

        );


        drawCloud(

            c,

            width * 0.55,

            height * 0.35,

            20

        );

    }


    function drawCloud(

        c,

        x,

        y,

        size

    ) {

        c.fillStyle =
            "rgba(255,255,255,0.65)";


        c.beginPath();


        c.arc(

            x,

            y,

            size * 0.55,

            0,

            Math.PI * 2

        );


        c.arc(

            x + size * 0.6,

            y + 3,

            size * 0.4,

            0,

            Math.PI * 2

        );


        c.arc(

            x - size * 0.55,

            y + 5,

            size * 0.38,

            0,

            Math.PI * 2

        );


        c.fill();

    }


    /* =====================================================
       BIRD
    ===================================================== */

    function resetBird() {

        bird.x =
            width * 0.28;


        bird.y =
            height * 0.42;


        bird.velocity =
            0;


        bird.rotation =
            0;

    }


    /* =====================================================
       PIPE POOL
    ===================================================== */

    function clearPipes() {

        for (

            let i = 0;

            i < MAX_PIPES;

            i++

        ) {

            pipePool[i].active =
                false;


            pipePool[i].passed =
                false;

        }


        activePipeCount =
            0;

    }


    function spawnPipe() {

        if (

            activePipeCount >=
            MAX_PIPES

        ) {

            return;

        }


        /*
           Tìm pipe inactive.
        */

        let pipe =
            null;


        for (

            let i = 0;

            i < MAX_PIPES;

            i++

        ) {

            if (
                !pipePool[i].active
            ) {

                pipe =
                    pipePool[i];

                break;

            }

        }


        if (!pipe) {

            return;

        }


        const topMargin =
            70;


        const bottomMargin =
            GROUND_HEIGHT + 70;


        const available =

            height -

            GROUND_HEIGHT -

            PIPE_GAP -

            topMargin -

            bottomMargin;


        pipe.x =
            width + PIPE_WIDTH;


        pipe.top =

            topMargin +

            Math.random() *

            Math.max(

                0,

                available

            );


        pipe.passed =
            false;


        pipe.active =
            true;


        activePipeCount++;

    }


    function recyclePipe(
        pipe
    ) {

        pipe.active =
            false;


        pipe.passed =
            false;


        activePipeCount--;

    }


    /* =====================================================
       COLLISION
    ===================================================== */

    function circleRectCollision(

        cx,

        cy,

        radius,

        rx,

        ry,

        rw,

        rh

    ) {

        const closestX =

            cx < rx

                ? rx

                : cx > rx + rw

                    ? rx + rw

                    : cx;


        const closestY =

            cy < ry

                ? ry

                : cy > ry + rh

                    ? ry + rh

                    : cy;


        const dx =
            cx - closestX;


        const dy =
            cy - closestY;


        return (

            dx * dx +

            dy * dy <

            radius * radius

        );

    }


    function checkCollision() {

        /*
           Ceiling
        */

        if (

            bird.y -
            BIRD_RADIUS <=
            0

        ) {

            return true;

        }


        /*
           Ground
        */

        const groundY =

            height -
            GROUND_HEIGHT;


        if (

            bird.y +
            BIRD_RADIUS >=
            groundY

        ) {

            return true;

        }


        /*
           Pipes
        */

        for (

            let i = 0;

            i < MAX_PIPES;

            i++

        ) {

            const pipe =
                pipePool[i];


            if (!pipe.active) {

                continue;

            }


            const bottomY =

                pipe.top +
                PIPE_GAP;


            /*
               Top pipe
            */

            if (

                circleRectCollision(

                    bird.x,

                    bird.y,

                    BIRD_RADIUS,

                    pipe.x,

                    0,

                    PIPE_WIDTH,

                    pipe.top

                )

            ) {

                return true;

            }


            /*
               Bottom pipe
            */

            if (

                circleRectCollision(

                    bird.x,

                    bird.y,

                    BIRD_RADIUS,

                    pipe.x,

                    bottomY,

                    PIPE_WIDTH,

                    groundY -
                    bottomY

                )

            ) {

                return true;

            }

        }


        return false;

    }


    /* =====================================================
       SCORE
    ===================================================== */

    function updateScore() {

        scoreElement.textContent =
            score;


        highScoreElement.textContent =
            highScore;

    }


    function addScore() {

        score++;


        if (

            score >
            highScore

        ) {

            highScore =
                score;


            localStorage.setItem(

                "flappy_high_score",

                String(
                    highScore
                )

            );

        }


        updateScore();


        playSound(

            "score",

            0.4

        );

    }


    /* =====================================================
       START
    ===================================================== */

    async function startGame() {

        resumeAudio();


        /*
           Đảm bảo GameHub đã sẵn sàng.

           Nếu Firebase chưa xong thì game vẫn
           không bị crash.
        */

        if (
            !gameHubReady
        ) {

            await initGameHub();

        }


        state =
            "playing";


        score =
            0;


        pipeTimer =
            0;


        clearPipes();


        resetBird();


        updateScore();


        startScreen.classList.add(
            "hidden"
        );


        gameOverScreen.classList.add(
            "hidden"
        );


        playSound(

            "flap",

            0.35

        );


        /*
           Ghi lượt chơi vào Firebase.
        */

        startGameHubRound();


        lastTime =
            performance.now();


        if (!rafId) {

            rafId =
                requestAnimationFrame(
                    gameLoop
                );

        }

    }


    /* =====================================================
       RESTART
    ===================================================== */

    function restartGame() {

        resumeAudio();


        startGame();

    }


    /* =====================================================
       GAME OVER
    ===================================================== */

    function gameOver() {

        if (

            state !==
            "playing"

        ) {

            return;

        }


        state =
            "gameover";


        /*
           Âm thanh va chạm.
        */

        playSound(

            "hit",

            0.55

        );


        /*
           Âm thanh chết.
        */

        playSound(

            "die",

            0.35

        );


        finalScoreElement.textContent =
            score;


        finalHighScoreElement.textContent =
            highScore;


        gameOverScreen.classList.remove(
            "hidden"
        );


        /*
           Ghi game_end.

           Chạy ngoài game loop,
           không ảnh hưởng FPS.
        */

        endGameHubRound();

    }


    /* =====================================================
       FLAP
    ===================================================== */

    function flap() {

        resumeAudio();


        /*
           Nếu đang ở màn hình READY,
           chạm màn hình sẽ bắt đầu game.
        */

        if (

            state ===
            "ready"

        ) {

            startGame();

            return;

        }


        /*
           Game over thì không flap.
        */

        if (

            state ===
            "gameover"

        ) {

            return;

        }


        bird.velocity =
            FLAP_POWER;


        playSound(

            "flap",

            0.35

        );

    }


    /* =====================================================
       UPDATE
    ===================================================== */

    function update(
        delta
    ) {

        if (

            state !==
            "playing"

        ) {

            return;

        }


        /*
           Bird physics
        */

        bird.velocity +=

            GRAVITY *
            delta;


        bird.y +=

            bird.velocity *
            delta;


        bird.rotation =

            Math.max(

                -0.45,

                Math.min(

                    1.25,

                    bird.velocity /
                    650

                )

            );


        /*
           Pipe spawn
        */

        pipeTimer +=
            delta;


        if (

            pipeTimer >=
            PIPE_INTERVAL

        ) {

            pipeTimer -=
                PIPE_INTERVAL;


            spawnPipe();

        }


        /*
           Pipe movement
        */

        for (

            let i = 0;

            i < MAX_PIPES;

            i++

        ) {

            const pipe =
                pipePool[i];


            if (!pipe.active) {

                continue;

            }


            pipe.x -=

                PIPE_SPEED *
                delta;


            /*
               Score
            */

            if (

                !pipe.passed &&

                pipe.x +
                PIPE_WIDTH <
                bird.x

            ) {

                pipe.passed =
                    true;


                addScore();

            }


            /*
               Recycle
            */

            if (

                pipe.x +
                PIPE_WIDTH <
                -20

            ) {

                recyclePipe(
                    pipe
                );

            }

        }


        /*
           Collision
        */

        if (

            checkCollision()

        ) {

            gameOver();

        }

    }


    /* =====================================================
       DRAW
    ===================================================== */

    function draw() {

        /*
           Background cached.
        */

        ctx.drawImage(

            backgroundCanvas,

            0,

            0,

            width,

            height

        );


        drawPipes();


        drawGround();


        drawBird();

    }


    /* =====================================================
       DRAW PIPES
    ===================================================== */

    function drawPipes() {

        const groundY =

            height -
            GROUND_HEIGHT;


        for (

            let i = 0;

            i < MAX_PIPES;

            i++

        ) {

            const pipe =
                pipePool[i];


            if (!pipe.active) {

                continue;

            }


            const x =
                pipe.x;


            const top =
                pipe.top;


            const bottomY =

                top +
                PIPE_GAP;


            /*
               Top pipe
            */

            ctx.fillStyle =
                "#58be42";


            ctx.fillRect(

                x,

                0,

                PIPE_WIDTH,

                top

            );


            ctx.fillStyle =
                "#3d9632";


            ctx.fillRect(

                x,

                0,

                5,

                top

            );


            ctx.fillRect(

                x +
                PIPE_WIDTH -
                5,

                0,

                5,

                top

            );


            /*
               Top cap
            */

            ctx.fillStyle =
                "#69d34d";


            ctx.fillRect(

                x - 5,

                top - 26,

                PIPE_WIDTH + 10,

                26

            );


            ctx.fillStyle =
                "#3d9632";


            ctx.fillRect(

                x - 5,

                top - 26,

                5,

                26

            );


            ctx.fillRect(

                x +
                PIPE_WIDTH,

                top - 26,

                5,

                26

            );


            /*
               Bottom pipe
            */

            ctx.fillStyle =
                "#58be42";


            ctx.fillRect(

                x,

                bottomY,

                PIPE_WIDTH,

                groundY -
                bottomY

            );


            ctx.fillStyle =
                "#3d9632";


            ctx.fillRect(

                x,

                bottomY,

                5,

                groundY -
                bottomY

            );


            ctx.fillRect(

                x +
                PIPE_WIDTH -
                5,

                bottomY,

                5,

                groundY -
                bottomY

            );


            /*
               Bottom cap
            */

            ctx.fillStyle =
                "#69d34d";


            ctx.fillRect(

                x - 5,

                bottomY,

                PIPE_WIDTH + 10,

                26

            );


            ctx.fillStyle =
                "#3d9632";


            ctx.fillRect(

                x - 5,

                bottomY,

                5,

                26

            );


            ctx.fillRect(

                x +
                PIPE_WIDTH,

                bottomY,

                5,

                26

            );

        }

    }


    /* =====================================================
       DRAW GROUND
    ===================================================== */

    function drawGround() {

        const groundY =

            height -
            GROUND_HEIGHT;


        ctx.fillStyle =
            "#ded895";


        ctx.fillRect(

            0,

            groundY,

            width,

            GROUND_HEIGHT

        );


        ctx.fillStyle =
            "#79c850";


        ctx.fillRect(

            0,

            groundY,

            width,

            9

        );


        /*
           Không tạo array/object.
        */

        ctx.fillStyle =
            "#c9bd73";


        for (

            let x = 0;

            x < width;

            x += 40

        ) {

            ctx.fillRect(

                x,

                groundY + 17,

                16,

                4

            );

        }

    }


    /* =====================================================
       DRAW BIRD
    ===================================================== */

    function drawBird() {

        ctx.save();


        ctx.translate(

            bird.x,

            bird.y

        );


        ctx.rotate(

            bird.rotation

        );


        /*
           Body
        */

        ctx.fillStyle =
            "#f8d84a";


        ctx.beginPath();


        ctx.arc(

            0,

            0,

            BIRD_RADIUS,

            0,

            Math.PI * 2

        );


        ctx.fill();


        /*
           Wing
        */

        ctx.fillStyle =
            "#e9b83f";


        ctx.beginPath();


        ctx.ellipse(

            -5,

            6,

            9,

            5,

            -0.25,

            0,

            Math.PI * 2

        );


        ctx.fill();


        /*
           Eye
        */

        ctx.fillStyle =
            "#fff";


        ctx.beginPath();


        ctx.arc(

            6,

            -6,

            5,

            0,

            Math.PI * 2

        );


        ctx.fill();


        ctx.fillStyle =
            "#111";


        ctx.beginPath();


        ctx.arc(

            7,

            -6,

            2,

            0,

            Math.PI * 2

        );


        ctx.fill();


        /*
           Beak
        */

        ctx.fillStyle =
            "#f28c28";


        ctx.beginPath();


        ctx.moveTo(

            13,

            0

        );


        ctx.lineTo(

            24,

            4

        );


        ctx.lineTo(

            13,

            8

        );


        ctx.closePath();


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       GAME LOOP
    ===================================================== */

    function gameLoop(
        timestamp
    ) {

        rafId =
            0;


        let delta =

            (
                timestamp -
                lastTime
            ) / 1000;


        lastTime =
            timestamp;


        /*
           Giới hạn delta.
        */

        if (

            delta >
            MAX_DELTA

        ) {

            delta =
                MAX_DELTA;

        }


        /*
           Nếu delta âm.
        */

        if (

            delta <
            0

        ) {

            delta =
                0;

        }


        update(
            delta
        );


        draw();


        rafId =

            requestAnimationFrame(
                gameLoop
            );

    }


    /* =====================================================
       KEYBOARD
    ===================================================== */

    function handleKeyDown(
        event
    ) {

        const key =
            event.key.toLowerCase();


        /*
           R = RESTART
        */

        if (

            key === "r" &&

            state ===
            "gameover"

        ) {

            event.preventDefault();


            restartGame();


            return;

        }


        /*
           SPACE = FLAP
        */

        if (

            event.code ===
            "Space"

        ) {

            event.preventDefault();


            flap();

        }

    }


    window.addEventListener(

        "keydown",

        handleKeyDown

    );


    /* =====================================================
       TOUCH / MOUSE
    ===================================================== */

    canvas.addEventListener(

        "pointerdown",

        (event) => {

            event.preventDefault();


            flap();

        },

        {
            passive: false
        }

    );


    /* =====================================================
       BUTTONS
    ===================================================== */

    startButton?.addEventListener(

        "click",

        () => {

            resumeAudio();


            startGame();

        }

    );


    restartButton?.addEventListener(

        "click",

        () => {

            resumeAudio();


            restartGame();

        }

    );


    /* =====================================================
       BACK TO HUB
    ===================================================== */

    function goBack() {

        window.location.href =
            "../../index.html";

    }


    backButton?.addEventListener(

        "click",

        goBack

    );


    backMenuButton?.addEventListener(

        "click",

        goBack

    );


    gameOverMenuButton?.addEventListener(

        "click",

        goBack

    );


    /* =====================================================
       INIT
    ===================================================== */

    resizeCanvas();


    updateScore();


    draw();

})();
