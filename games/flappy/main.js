"use strict";

/* ============================================================
   ELEMENTS
============================================================ */

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d", {
        alpha: false
    });

const gameArea =
    document.querySelector(".game-area");

const scoreElement =
    document.getElementById("score");

const highScoreElement =
    document.getElementById("highScore");

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

const finalScoreElement =
    document.getElementById(
        "finalScore"
    );

const finalHighScoreElement =
    document.getElementById(
        "finalHighScore"
    );


/* ============================================================
   SOUND
============================================================ */

function playSound(
    file,
    volume = 0.6
) {

    if (
        window.GameSound &&
        typeof window.GameSound.play ===
            "function"
    ) {

        window.GameSound.play(
            file,
            volume
        );
    }
}


/* ============================================================
   GAME CONFIG
============================================================ */

const CONFIG = {

    gravity: 0.42,

    flapStrength: -7.2,

    pipeWidth: 58,

    pipeGap: 145,

    pipeSpeed: 2.8,

    pipeDistance: 210,

    birdRadius: 15,

    groundHeight: 45

};


/* ============================================================
   GAME STATE
============================================================ */

let width = 360;
let height = 640;

let bird = null;

let pipes = [];

let score = 0;

let highScore = 0;

let gameRunning = false;

let gameOver = false;

let lastTime = 0;

let animationFrame = null;

let pipeTimer = 0;

let analyticsStarted = false;


/*
 * Khoảng thời gian sinh cột.
 * Tính sẵn thay vì tính lại mỗi frame.
 */
let pipeSpawnInterval = 0;


/*
 * Cache background.
 * Background không thay đổi trong lúc chơi,
 * nên không cần render lại mỗi frame.
 */
let backgroundCanvas = null;

let backgroundCtx = null;


/*
 * Cache ground.
 */
let groundCanvas = null;

let groundCtx = null;


/* ============================================================
   HIGH SCORE
============================================================ */

function loadHighScore() {

    try {

        const saved =
            Number(
                localStorage.getItem(
                    "flappy_high_score"
                )
            );

        if (
            Number.isFinite(saved) &&
            saved >= 0
        ) {

            highScore =
                Math.floor(saved);
        }

    } catch (error) {

        highScore = 0;
    }

    updateScoreUI();
}


function saveHighScore() {

    try {

        localStorage.setItem(
            "flappy_high_score",
            String(highScore)
        );

    } catch (error) {

        // Bỏ qua nếu localStorage không khả dụng.
    }
}


/* ============================================================
   CACHE BACKGROUND
============================================================ */

function createBackgroundCache() {

    if (!backgroundCanvas) {

        backgroundCanvas =
            document.createElement(
                "canvas"
            );

        backgroundCtx =
            backgroundCanvas.getContext(
                "2d"
            );
    }


    backgroundCanvas.width =
        Math.max(
            1,
            Math.round(width)
        );

    backgroundCanvas.height =
        Math.max(
            1,
            Math.round(height)
        );


    const bg =
        backgroundCtx;


    /*
     * Gradient chỉ tạo một lần khi resize.
     */
    const gradient =
        bg.createLinearGradient(
            0,
            0,
            0,
            height
        );


    gradient.addColorStop(
        0,
        "#68d5ff"
    );

    gradient.addColorStop(
        0.7,
        "#b9edff"
    );

    gradient.addColorStop(
        1,
        "#eafaff"
    );


    bg.fillStyle =
        gradient;


    bg.fillRect(
        0,
        0,
        width,
        height
    );


    /*
     * Clouds
     */
    drawCloudToContext(
        bg,
        width * 0.18,
        height * 0.17,
        0.8
    );


    drawCloudToContext(
        bg,
        width * 0.72,
        height * 0.28,
        0.65
    );


    drawCloudToContext(
        bg,
        width * 0.48,
        height * 0.08,
        0.5
    );
}


/* ============================================================
   CACHE GROUND
============================================================ */

function createGroundCache() {

    if (!groundCanvas) {

        groundCanvas =
            document.createElement(
                "canvas"
            );

        groundCtx =
            groundCanvas.getContext(
                "2d"
            );
    }


    groundCanvas.width =
        Math.max(
            1,
            Math.round(width)
        );

    groundCanvas.height =
        Math.max(
            1,
            Math.round(
                CONFIG.groundHeight
            )
        );


    const g =
        groundCtx;


    /*
     * Cỏ
     */
    g.fillStyle =
        "#7ac943";

    g.fillRect(
        0,
        0,
        width,
        8
    );


    /*
     * Đất
     */
    g.fillStyle =
        "#d9a441";

    g.fillRect(
        0,
        8,
        width,
        CONFIG.groundHeight - 8
    );


    /*
     * Texture đất
     */
    g.fillStyle =
        "#c28d2c";


    for (
        let x = 0;
        x < width + 30;
        x += 30
    ) {

        g.fillRect(
            x,
            20,
            16,
            5
        );
    }
}


/* ============================================================
   CANVAS
============================================================ */

function resizeCanvas() {

    const rect =
        gameArea.getBoundingClientRect();


    const cssWidth =
        Math.max(
            1,
            rect.width
        );


    const cssHeight =
        Math.max(
            1,
            rect.height
        );


    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );


    canvas.width =
        Math.round(
            cssWidth * dpr
        );


    canvas.height =
        Math.round(
            cssHeight * dpr
        );


    canvas.style.width =
        `${cssWidth}px`;


    canvas.style.height =
        `${cssHeight}px`;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    width =
        cssWidth;

    height =
        cssHeight;


    /*
     * Tính sẵn khoảng sinh cột.
     */
    pipeSpawnInterval =
        (
            CONFIG.pipeDistance /
            CONFIG.pipeSpeed
        ) *
        16.6667;


    /*
     * Tạo lại background cache
     * chỉ khi kích thước thay đổi.
     */
    createBackgroundCache();

    createGroundCache();


    if (
        !gameRunning &&
        !gameOver
    ) {

        resetBird();
    }


    draw();
}


window.addEventListener(
    "resize",
    resizeCanvas
);


/* ============================================================
   BIRD
============================================================ */

function resetBird() {

    bird = {

        x:
            width * 0.28,

        y:
            height * 0.45,

        velocity:
            0,

        radius:
            CONFIG.birdRadius,

        rotation:
            0
    };
}


function flap() {

    if (!gameRunning) {
        return;
    }


    bird.velocity =
        CONFIG.flapStrength;


    playSound(
        "./flappy_flap.mp3",
        0.45
    );
}


/* ============================================================
   PIPES
============================================================ */

function createPipe() {

    const minTop = 70;


    const maxTop =
        height -
        CONFIG.groundHeight -
        CONFIG.pipeGap -
        70;


    const range =
        Math.max(
            1,
            maxTop - minTop
        );


    const topHeight =
        minTop +
        Math.random() *
        range;


    pipes.push({

        x:
            width +
            CONFIG.pipeWidth,

        top:
            topHeight,

        gap:
            CONFIG.pipeGap,

        passed:
            false
    });
}


function resetPipes() {

    /*
     * Thay vì tạo array mới,
     * xóa array cũ.
     */
    pipes.length = 0;

    pipeTimer = 0;
}


/* ============================================================
   SCORE
============================================================ */

function updateScoreUI() {

    scoreElement.textContent =
        score;

    highScoreElement.textContent =
        highScore;
}


function addScore() {

    score++;


    if (
        score > highScore
    ) {

        highScore =
            score;

        saveHighScore();
    }


    updateScoreUI();


    playSound(
        "./flappy_score.mp3",
        0.55
    );
}


/* ============================================================
   ANALYTICS / GAMEHUB
============================================================ */

function startAnalytics() {

    if (
        analyticsStarted ||
        !window.GameHub
    ) {

        return;
    }


    analyticsStarted = true;


    try {

        window.GameHub.startRound({

            mode:
                "single",

            difficulty:
                "normal",

            boardSize:
                null
        });

    } catch (error) {

        console.warn(
            "Flappy analytics start error:",
            error
        );
    }
}


function endAnalytics(
    result
) {

    if (
        !analyticsStarted ||
        !window.GameHub
    ) {

        return;
    }


    analyticsStarted =
        false;


    try {

        window.GameHub.endRound({

            result:
                result,

            mode:
                "single",

            difficulty:
                "normal",

            score:
                score
        });

    } catch (error) {

        console.warn(
            "Flappy analytics end error:",
            error
        );
    }
}


/* ============================================================
   START GAME
============================================================ */

function startGame() {

    if (gameRunning) {
        return;
    }


    playSound(
        "./flappy_click.mp3",
        0.5
    );


    cancelAnimationFrame(
        animationFrame
    );


    score = 0;

    gameOver = false;

    gameRunning = true;


    resetBird();

    resetPipes();


    startScreen.classList.add(
        "hidden"
    );


    gameOverScreen.classList.add(
        "hidden"
    );


    updateScoreUI();


    startAnalytics();


    lastTime =
        performance.now();


    animationFrame =
        requestAnimationFrame(
            gameLoop
        );
}


/* ============================================================
   GAME OVER
============================================================ */

function finishGame() {

    if (gameOver) {
        return;
    }


    gameRunning = false;

    gameOver = true;


    playSound(
        "./flappy_hit.mp3",
        0.6
    );


    setTimeout(
        () => {

            playSound(
                "./flappy_die.mp3",
                0.6
            );

        },
        70
    );


    finalScoreElement.textContent =
        score;


    finalHighScoreElement.textContent =
        highScore;


    gameOverScreen.classList.remove(
        "hidden"
    );


    endAnalytics(
        "loss"
    );


    draw();
}


/* ============================================================
   COLLISION
============================================================ */

function circleRectCollision(

    circleX,

    circleY,

    radius,

    rectX,

    rectY,

    rectWidth,

    rectHeight

) {

    const closestX =
        Math.max(
            rectX,
            Math.min(
                circleX,
                rectX + rectWidth
            )
        );


    const closestY =
        Math.max(
            rectY,
            Math.min(
                circleY,
                rectY + rectHeight
            )
        );


    const dx =
        circleX -
        closestX;


    const dy =
        circleY -
        closestY;


    return (
        dx * dx +
        dy * dy <
        radius * radius
    );
}


function checkCollision() {

    if (!bird) {
        return false;
    }


    /*
     * Trần
     */
    if (
        bird.y -
        bird.radius <=
        0
    ) {

        return true;
    }


    /*
     * Đất
     */
    if (
        bird.y +
        bird.radius >=
        height -
        CONFIG.groundHeight
    ) {

        return true;
    }


    /*
     * Cột
     */
    for (
        let i = 0;
        i < pipes.length;
        i++
    ) {

        const pipe =
            pipes[i];


        /*
         * Nếu cột đã nằm hoàn toàn
         * ngoài vùng chim thì bỏ qua.
         */
        if (
            bird.x +
                bird.radius <
            pipe.x
        ) {
            continue;
        }


        if (
            bird.x -
                bird.radius >
            pipe.x +
                CONFIG.pipeWidth
        ) {
            continue;
        }


        const bottomY =
            pipe.top +
            pipe.gap;


        const hitTop =
            circleRectCollision(

                bird.x,

                bird.y,

                bird.radius,

                pipe.x,

                0,

                CONFIG.pipeWidth,

                pipe.top
            );


        if (hitTop) {
            return true;
        }


        const hitBottom =
            circleRectCollision(

                bird.x,

                bird.y,

                bird.radius,

                pipe.x,

                bottomY,

                CONFIG.pipeWidth,

                height -
                    CONFIG.groundHeight -
                    bottomY
            );


        if (hitBottom) {
            return true;
        }
    }


    return false;
}


/* ============================================================
   UPDATE
============================================================ */

function update(
    delta
) {

    /*
     * Chặn delta quá lớn khi iPhone
     * vừa chuyển tab / bị Safari pause.
     */
    const dt =
        Math.min(
            delta,
            32
        ) /
        16.6667;


    /*
     * BIRD
     */
    bird.velocity +=
        CONFIG.gravity *
        dt;


    bird.y +=
        bird.velocity *
        dt;


    bird.rotation =
        Math.max(

            -0.45,

            Math.min(

                1.25,

                bird.velocity *
                0.08
            )
        );


    /*
     * PIPE TIMER
     */
    pipeTimer += delta;


    if (
        pipeTimer >=
        pipeSpawnInterval
    ) {

        /*
         * Giữ lại phần dư timer
         * thay vì reset = 0.
         */
        pipeTimer -=
            pipeSpawnInterval;


        createPipe();
    }


    /*
     * MOVE PIPES
     */
    for (
        let i = 0;
        i < pipes.length;
        i++
    ) {

        const pipe =
            pipes[i];


        pipe.x -=
            CONFIG.pipeSpeed *
            dt;


        /*
         * SCORE
         */
        if (
            !pipe.passed &&
            pipe.x +
                CONFIG.pipeWidth <
            bird.x
        ) {

            pipe.passed = true;

            addScore();
        }
    }


    /*
     * REMOVE OLD PIPES
     *
     * Không dùng filter() để tránh
     * tạo array mới mỗi frame.
     */
    let removeCount = 0;


    while (
        removeCount <
            pipes.length &&
        pipes[removeCount].x +
            CONFIG.pipeWidth <=
            -20
    ) {

        removeCount++;
    }


    if (removeCount > 0) {

        pipes.splice(
            0,
            removeCount
        );
    }


    /*
     * COLLISION
     */
    if (
        checkCollision()
    ) {

        finishGame();
    }
}


/* ============================================================
   DRAW BACKGROUND
============================================================ */

function drawBackground() {

    if (
        backgroundCanvas
    ) {

        ctx.drawImage(
            backgroundCanvas,
            0,
            0
        );

        return;
    }


    /*
     * Fallback
     */
    ctx.fillStyle =
        "#68d5ff";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}


/* ============================================================
   CLOUD
============================================================ */

function drawCloudToContext(
    targetCtx,
    x,
    y,
    scale
) {

    targetCtx.save();


    targetCtx.globalAlpha =
        0.72;


    targetCtx.fillStyle =
        "#ffffff";


    targetCtx.beginPath();


    targetCtx.arc(
        x,
        y,
        20 * scale,
        0,
        Math.PI * 2
    );


    targetCtx.arc(
        x + 22 * scale,
        y - 5 * scale,
        27 * scale,
        0,
        Math.PI * 2
    );


    targetCtx.arc(
        x + 48 * scale,
        y,
        19 * scale,
        0,
        Math.PI * 2
    );


    targetCtx.fill();


    targetCtx.restore();
}


/* ============================================================
   DRAW PIPES
============================================================ */

function drawPipe(
    pipe
) {

    const bottomY =
        pipe.top +
        pipe.gap;


    const capHeight =
        22;


    /*
     * TOP PIPE
     */

    ctx.fillStyle =
        "#4fc33b";


    ctx.fillRect(

        pipe.x,

        0,

        CONFIG.pipeWidth,

        pipe.top
    );


    ctx.fillStyle =
        "#65d94b";


    ctx.fillRect(

        pipe.x - 4,

        pipe.top -
            capHeight,

        CONFIG.pipeWidth + 8,

        capHeight
    );


    ctx.strokeStyle =
        "#2d8c27";


    ctx.lineWidth = 3;


    ctx.strokeRect(

        pipe.x,

        0,

        CONFIG.pipeWidth,

        pipe.top
    );


    /*
     * BOTTOM PIPE
     */

    ctx.fillStyle =
        "#4fc33b";


    ctx.fillRect(

        pipe.x,

        bottomY,

        CONFIG.pipeWidth,

        height -
            CONFIG.groundHeight -
            bottomY
    );


    ctx.fillStyle =
        "#65d94b";


    ctx.fillRect(

        pipe.x - 4,

        bottomY,

        CONFIG.pipeWidth + 8,

        capHeight
    );


    ctx.strokeStyle =
        "#2d8c27";


    ctx.strokeRect(

        pipe.x,

        bottomY,

        CONFIG.pipeWidth,

        height -
            CONFIG.groundHeight -
            bottomY
    );
}


/* ============================================================
   DRAW BIRD
============================================================ */

function drawBird() {

    if (!bird) {
        return;
    }


    ctx.save();


    ctx.translate(
        bird.x,
        bird.y
    );


    ctx.rotate(
        bird.rotation
    );


    /*
     * BODY
     */

    ctx.fillStyle =
        "#ffd83d";


    ctx.beginPath();


    ctx.arc(

        0,

        0,

        bird.radius,

        0,

        Math.PI * 2
    );


    ctx.fill();


    ctx.strokeStyle =
        "#d49d00";


    ctx.lineWidth = 2;


    ctx.stroke();


    /*
     * WING
     */

    ctx.fillStyle =
        "#f5b900";


    ctx.beginPath();


    ctx.ellipse(

        -7,

        6,

        10,

        6,

        -0.25,

        0,

        Math.PI * 2
    );


    ctx.fill();


    /*
     * EYE
     */

    ctx.fillStyle =
        "#ffffff";


    ctx.beginPath();


    ctx.arc(

        6,

        -5,

        5,

        0,

        Math.PI * 2
    );


    ctx.fill();


    ctx.fillStyle =
        "#111111";


    ctx.beginPath();


    ctx.arc(

        7,

        -5,

        2.3,

        0,

        Math.PI * 2
    );


    ctx.fill();


    /*
     * BEAK
     */

    ctx.fillStyle =
        "#ff7b22";


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


/* ============================================================
   DRAW GROUND
============================================================ */

function drawGround() {

    const groundY =
        height -
        CONFIG.groundHeight;


    if (
        groundCanvas
    ) {

        ctx.drawImage(
            groundCanvas,
            0,
            groundY
        );

        return;
    }


    /*
     * Fallback
     */

    ctx.fillStyle =
        "#7ac943";


    ctx.fillRect(

        0,

        groundY,

        width,

        8
    );


    ctx.fillStyle =
        "#d9a441";


    ctx.fillRect(

        0,

        groundY + 8,

        width,

        CONFIG.groundHeight - 8
    );
}


/* ============================================================
   DRAW
============================================================ */

function draw() {

    /*
     * Background đã cache.
     */
    drawBackground();


    /*
     * Pipes
     */
    for (
        let i = 0;
        i < pipes.length;
        i++
    ) {

        drawPipe(
            pipes[i]
        );
    }


    /*
     * Ground đã cache.
     */
    drawGround();


    /*
     * Bird
     */
    drawBird();
}


/* ============================================================
   GAME LOOP
============================================================ */

function gameLoop(
    timestamp
) {

    if (!gameRunning) {

        draw();

        return;
    }


    let delta =
        timestamp -
        lastTime;


    /*
     * Nếu Safari bị pause một lúc,
     * không cho game nhảy quá xa.
     */
    if (
        delta > 32
    ) {

        delta = 32;
    }


    lastTime =
        timestamp;


    update(
        delta
    );


    draw();


    if (gameRunning) {

        animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }
}


/* ============================================================
   INPUT
============================================================ */

function handleFlap(
    event
) {

    if (
        event &&
        event.target &&
        event.target.closest &&
        event.target.closest(
            "button"
        )
    ) {

        return;
    }


    if (!gameRunning) {
        return;
    }


    if (event) {
        event.preventDefault();
    }


    flap();
}


gameArea.addEventListener(

    "pointerdown",

    handleFlap,

    {
        passive: false
    }
);


document.addEventListener(

    "keydown",

    event => {

        if (
            event.code ===
                "Space" ||
            event.code ===
                "ArrowUp"
        ) {

            event.preventDefault();


            if (!gameRunning) {
                return;
            }


            flap();
        }
    }
);


/* ============================================================
   BUTTONS
============================================================ */

startButton.addEventListener(
    "click",
    startGame
);


restartButton.addEventListener(
    "click",
    startGame
);


/* ============================================================
   MENU
============================================================ */

function goToMenu() {

    gameRunning = false;

    gameOver = false;


    cancelAnimationFrame(
        animationFrame
    );


    playSound(
        "./flappy_click.mp3",
        0.5
    );


    if (analyticsStarted) {

        endAnalytics(
            "end"
        );
    }


    window.location.href =
        "../../index.html";
}


backButton.addEventListener(
    "click",
    goToMenu
);


backMenuButton.addEventListener(
    "click",
    goToMenu
);


gameOverMenuButton.addEventListener(
    "click",
    goToMenu
);


/* ============================================================
   INIT
============================================================ */

loadHighScore();

resizeCanvas();

resetBird();

draw();


/* ============================================================
   GAMEHUB
============================================================ */

if (window.GameHub) {

    window.GameHub.ready.catch(
        error => {

            console.warn(
                "GameHub chưa sẵn sàng:",
                error
            );
        }
    );
}
