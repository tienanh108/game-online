"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameArea = document.querySelector(".game-area");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const backButton = document.getElementById("backButton");
const backMenuButton = document.getElementById("backMenuButton");
const gameOverMenuButton =
    document.getElementById("gameOverMenuButton");

const finalScoreElement =
    document.getElementById("finalScore");

const finalHighScoreElement =
    document.getElementById("finalHighScore");


// ============================================================
// SOUND
// ============================================================

function playSound(file, volume = 0.6) {

    if (
        window.GameSound &&
        typeof window.GameSound.play === "function"
    ) {
        window.GameSound.play(
            file,
            volume
        );
    }

}


// ============================================================
// GAME CONFIG
// ============================================================

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


// ============================================================
// GAME STATE
// ============================================================

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


// ============================================================
// HIGH SCORE
// ============================================================

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

        // localStorage không khả dụng thì bỏ qua

    }

}


// ============================================================
// CANVAS
// ============================================================

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


// ============================================================
// BIRD
// ============================================================

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


    // Âm thanh vỗ cánh
    playSound(
        "./flappy_flap.mp3",
        0.45
    );

}


// ============================================================
// PIPES
// ============================================================

function createPipe() {

    const minTop =
        70;


    const maxTop =
        height -
        CONFIG.groundHeight -
        CONFIG.pipeGap -
        70;


    const topHeight =
        minTop +
        Math.random() *
        Math.max(
            1,
            maxTop - minTop
        );


    pipes.push({

        x:
            width + CONFIG.pipeWidth,

        top:
            topHeight,

        gap:
            CONFIG.pipeGap,

        passed:
            false

    });

}


function resetPipes() {

    pipes = [];

    pipeTimer = 0;

}


// ============================================================
// SCORE
// ============================================================

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


    // Âm thanh qua ống
    playSound(
        "./flappy_score.mp3",
        0.55
    );

}


// ============================================================
// ANALYTICS / GAMEHUB
// ============================================================

function startAnalytics() {

    if (
        analyticsStarted ||
        !window.GameHub
    ) {

        return;

    }


    analyticsStarted =
        true;


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


// ============================================================
// START GAME
// ============================================================

function startGame() {

    if (gameRunning) {
        return;
    }


    // Click sound
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


// ============================================================
// GAME OVER
// ============================================================

function finishGame() {

    if (gameOver) {
        return;
    }


    gameRunning = false;

    gameOver = true;


    // Va chạm
    playSound(
        "./flappy_hit.mp3",
        0.6
    );


    // Game over
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


// ============================================================
// COLLISION
// ============================================================

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


    if (
        bird.y -
        bird.radius <=
        0
    ) {

        return true;

    }


    if (
        bird.y +
        bird.radius >=
        height -
        CONFIG.groundHeight
    ) {

        return true;

    }


    for (
        const pipe of pipes
    ) {

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


        if (
            hitTop ||
            hitBottom
        ) {

            return true;

        }

    }


    return false;

}


// ============================================================
// UPDATE
// ============================================================

function update(
    delta
) {

    const dt =
        Math.min(
            delta,
            32
        ) /
        16.6667;


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


    pipeTimer +=
        delta;


    if (
        pipeTimer >=
        CONFIG.pipeDistance /
        CONFIG.pipeSpeed *
        16.6667
    ) {

        pipeTimer = 0;

        createPipe();

    }


    for (
        const pipe of pipes
    ) {

        pipe.x -=
            CONFIG.pipeSpeed *
            dt;


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


    pipes =
        pipes.filter(

            pipe =>

                pipe.x +
                CONFIG.pipeWidth >
                -20

        );


    if (
        checkCollision()
    ) {

        finishGame();

    }

}


// ============================================================
// DRAW BACKGROUND
// ============================================================

function drawBackground() {

    const gradient =
        ctx.createLinearGradient(
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


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    drawCloud(
        width * 0.18,
        height * 0.17,
        0.8
    );


    drawCloud(
        width * 0.72,
        height * 0.28,
        0.65
    );


    drawCloud(
        width * 0.48,
        height * 0.08,
        0.5
    );

}


function drawCloud(
    x,
    y,
    scale
) {

    ctx.save();


    ctx.globalAlpha =
        0.72;


    ctx.fillStyle =
        "#ffffff";


    ctx.beginPath();


    ctx.arc(
        x,
        y,
        20 * scale,
        0,
        Math.PI * 2
    );


    ctx.arc(
        x + 22 * scale,
        y - 5 * scale,
        27 * scale,
        0,
        Math.PI * 2
    );


    ctx.arc(
        x + 48 * scale,
        y,
        19 * scale,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.restore();

}


// ============================================================
// DRAW PIPES
// ============================================================

function drawPipe(
    pipe
) {

    const bottomY =
        pipe.top +
        pipe.gap;


    const capHeight =
        22;


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


    ctx.lineWidth =
        3;


    ctx.strokeRect(

        pipe.x,

        0,

        CONFIG.pipeWidth,

        pipe.top

    );


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


// ============================================================
// DRAW BIRD
// ============================================================

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


    // thân
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


    ctx.lineWidth =
        2;


    ctx.stroke();


    // cánh
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


    // mắt
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


    // mỏ
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


// ============================================================
// DRAW GROUND
// ============================================================

function drawGround() {

    const groundY =
        height -
        CONFIG.groundHeight;


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


    ctx.fillStyle =
        "#c28d2c";


    for (

        let x = 0;

        x < width + 30;

        x += 30

    ) {

        ctx.fillRect(

            x,

            groundY + 20,

            16,

            5

        );

    }

}


// ============================================================
// DRAW
// ============================================================

function draw() {

    ctx.clearRect(

        0,

        0,

        width,

        height

    );


    drawBackground();


    for (
        const pipe of pipes
    ) {

        drawPipe(
            pipe
        );

    }


    drawGround();

    drawBird();

}


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(
    timestamp
) {

    if (!gameRunning) {

        draw();

        return;

    }


    const delta =
        timestamp -
        lastTime;


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


// ============================================================
// INPUT
// ============================================================

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


// ============================================================
// BUTTONS
// ============================================================

startButton.addEventListener(

    "click",

    startGame

);


restartButton.addEventListener(

    "click",

    startGame

);


function goToMenu() {

    gameRunning =
        false;


    gameOver =
        false;


    cancelAnimationFrame(
        animationFrame
    );


    // Click sound
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


// ============================================================
// INIT
// ============================================================

loadHighScore();

resizeCanvas();

resetBird();

draw();


// Đảm bảo GameHub đã khởi tạo.
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
