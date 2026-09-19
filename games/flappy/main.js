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
    // ==========================================
// FLAPPY PROFILE + FIREBASE LEADERBOARD
// ==========================================

let leaderboardDatabase = null;
let leaderboardAuth = null;
let leaderboardLoaded = false;

let currentUsername = "Khách";


/* =====================================================
   PROFILE PANEL
===================================================== */

const profilePanel =
    document.createElement("aside");

profilePanel.className =
    "side-panel profile-panel";


profilePanel.innerHTML = `
    <h2 class="side-title">👤 Hồ sơ</h2>

    <div class="profile-user">

        <div class="profile-avatar">🐦</div>

        <div class="profile-name">

            <strong id="flappyProfileName">
                Khách
            </strong>

            <div
                class="profile-status"
                id="flappyProfileStatus"
            >
                Chơi khách
            </div>

        </div>

    </div>


    <div class="profile-stat">
        <span>🏆 Best</span>
        <strong id="flappyProfileBest">0</strong>
    </div>


    <div class="profile-stat">
        <span>🎮 Đã chơi</span>
        <strong id="flappyProfileGames">0</strong>
    </div>


    <div class="profile-stat">
        <span>⭐ Điểm hiện tại</span>
        <strong id="flappyProfileScore">0</strong>
    </div>
`;


/* =====================================================
   LEADERBOARD PANEL
===================================================== */

const leaderboardPanel =
    document.createElement("aside");

leaderboardPanel.className =
    "side-panel leaderboard-panel";


leaderboardPanel.innerHTML = `
    <h2 class="side-title">🏆 BXH Flappy</h2>

    <div
        id="flappyLeaderboard"
        class="leaderboard-list"
    >
        <div class="leaderboard-loading">
            Đang tải BXH...
        </div>
    </div>
`;


/* =====================================================
   LAYOUT
===================================================== */

function setupFlappyLayout() {

    const gameArea =
        document.querySelector(
            ".game-area"
        );

    if (!gameArea) {
        return;
    }


    const wrapper =
        document.querySelector(
            ".game-wrapper"
        );

    const topbar =
        document.querySelector(
            ".topbar"
        );

    if (!wrapper || !topbar) {
        return;
    }


    if (
        document.querySelector(
            ".flappy-layout"
        )
    ) {
        return;
    }


    const layout =
        document.createElement("div");

    layout.className =
        "flappy-layout";


    const gameColumn =
        document.createElement("div");

    gameColumn.className =
        "game-column";


    const hint =
        document.querySelector(".hint");


    gameColumn.appendChild(
        gameArea
    );


    if (hint) {

        gameColumn.appendChild(
            hint
        );

    }


    layout.appendChild(
        profilePanel
    );

    layout.appendChild(
        gameColumn
    );

    layout.appendChild(
        leaderboardPanel
    );


    wrapper.appendChild(
        layout
    );

}


/* =====================================================
   UPDATE PROFILE UI
===================================================== */

function updateFlappyProfileName(
    name,
    status
) {

    const nameElement =
        document.getElementById(
            "flappyProfileName"
        );

    const statusElement =
        document.getElementById(
            "flappyProfileStatus"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    if (statusElement) {

        statusElement.textContent =
            status;

    }

}


/* =====================================================
   PROFILE BEST
===================================================== */

function updateFlappyProfileBest(
    value
) {

    const element =
        document.getElementById(
            "flappyProfileBest"
        );


    if (element) {

        element.textContent =
            String(
                Number(value) || 0
            );

    }

}


/* =====================================================
   PROFILE CURRENT SCORE
===================================================== */

function updateFlappyProfileScore(
    value
) {

    const element =
        document.getElementById(
            "flappyProfileScore"
        );


    if (element) {

        element.textContent =
            String(
                Number(value) || 0
            );

    }

}


/* =====================================================
   PROFILE GAMES
===================================================== */

function updateFlappyProfileGames() {

    const element =
        document.getElementById(
            "flappyProfileGames"
        );


    if (!element) {
        return;
    }


    const games =
        Number(
            localStorage.getItem(
                "flappy_games_played"
            ) || 0
        );


    element.textContent =
        String(games);

}


function increaseFlappyGamesPlayed() {

    const games =
        Number(
            localStorage.getItem(
                "flappy_games_played"
            ) || 0
        ) + 1;


    localStorage.setItem(
        "flappy_games_played",
        String(games)
    );


    updateFlappyProfileGames();

}


/* =====================================================
   LOAD CURRENT USER
===================================================== */

async function loadFlappyUser() {

    try {

        /*
         * QUAN TRỌNG:
         *
         * Chờ GameHub khôi phục tài khoản.
         */

        await window.GameHub.ready;


        const user =
            window.GameHub.getUser();


        const database =
            window.GameHub.getDatabase();


        console.log(
            "FLAPPY USER:",
            user
        );


        /*
         * Không có user
         */

        if (
            !user ||
            !database
        ) {

            currentUsername =
                "Khách";


            updateFlappyProfileName(
                "Khách",
                "Chơi khách"
            );


            updateFlappyProfileBest(
                highScore
            );


            return;

        }


        /*
         * =====================================
         * GUEST
         * =====================================
         */

        if (user.isAnonymous) {

            console.log(
                "FLAPPY: đang dùng GUEST",
                user.uid
            );


            currentUsername =
                "Khách";


            updateFlappyProfileName(
                "Khách",
                "Chơi khách"
            );


            /*
             * Guest chỉ dùng Best local.
             */

            highScore =
                Number(
                    localStorage.getItem(
                        "flappy_high_score"
                    ) || 0
                );


            updateScore();

            updateFlappyProfileBest(
                highScore
            );


            return;

        }


        /*
         * =====================================
         * TÀI KHOẢN THẬT
         * =====================================
         */

        console.log(
            "FLAPPY: tài khoản thật",
            user.uid
        );


        const usernameSnapshot =
            await database
                .ref(
                    `users/${user.uid}/username`
                )
                .once("value");


        currentUsername =
            usernameSnapshot.val() ||
            "Người chơi";


        updateFlappyProfileName(
            currentUsername,
            "Đã đăng nhập"
        );


        /*
         * =====================================
         * LẤY BEST TỪ FIREBASE
         * =====================================
         */

        const scoreSnapshot =
            await database
                .ref(
                    `leaderboards/flappy/${user.uid}`
                )
                .once("value");


        const data =
            scoreSnapshot.val();


        if (
            data &&
            typeof data.score ===
                "number"
        ) {

            highScore =
                data.score;

        } else {

            highScore =
                0;

        }


        updateScore();

        updateFlappyProfileBest(
            highScore
        );


        console.log(
            "FLAPPY ACCOUNT:",
            currentUsername,
            "BEST:",
            highScore
        );


    } catch (error) {

        console.error(
            "FLAPPY LOAD USER ERROR:",
            error
        );


        updateFlappyProfileName(
            "Lỗi",
            "Không tải được tài khoản"
        );

    }

}


/* =====================================================
   SETUP FIREBASE LEADERBOARD
===================================================== */

async function setupFlappyLeaderboard() {

    try {

        /*
         * Chờ GameHub hoàn thành Firebase + Auth.
         */

        await window.GameHub.ready;


        const user =
            window.GameHub.getUser();

        const database =
            window.GameHub.getDatabase();

        const firebaseAuth =
            window.GameHub.getAuth();


        if (!database || !firebaseAuth) {

            console.error(
                "FLAPPY: GameHub Firebase chưa sẵn sàng."
            );

            return;

        }


        leaderboardDatabase =
            database;

        leaderboardAuth =
            firebaseAuth;


        leaderboardLoaded =
            true;


        console.log(
            "================================"
        );

        console.log(
            "FLAPPY LEADERBOARD READY"
        );

        console.log(
            "UID:",
            user?.uid
        );

        console.log(
            "ACCOUNT:",
            user?.isAnonymous
                ? "GUEST"
                : "ACCOUNT"
        );

        console.log(
            "================================"
        );


        /*
         * Tải profile.
         */

        await loadFlappyUser();


        /*
         * Tải BXH.
         */

        await loadFlappyLeaderboard();


    } catch (error) {

        console.error(
            "FLAPPY LEADERBOARD INIT ERROR:",
            error
        );


        const container =
            document.getElementById(
                "flappyLeaderboard"
            );


        if (container) {

            container.innerHTML = `
                <div class="leaderboard-empty">
                    Không thể tải BXH.
                </div>
            `;

        }

    }

}


/* =====================================================
   SAVE SCORE
===================================================== */

async function saveFlappyLeaderboardScore(
    newScore
) {

    try {

        if (!leaderboardLoaded) {

            console.warn(
                "FLAPPY: leaderboard chưa ready."
            );

            return;

        }


        const user =
            window.GameHub.getUser();


        const database =
            window.GameHub.getDatabase();


        /*
         * Guest không được lưu BXH.
         */

        if (
            !user ||
            user.isAnonymous ||
            !database
        ) {

            console.log(
                "FLAPPY: Guest → không lưu BXH."
            );

            return;

        }


        if (
            !Number.isFinite(
                newScore
            )
        ) {

            return;

        }


        const ref =
            database.ref(
                `leaderboards/flappy/${user.uid}`
            );


        const snapshot =
            await ref.once("value");


        const oldData =
            snapshot.val();


        const oldScore =
            oldData &&
            typeof oldData.score ===
                "number"
                ? oldData.score
                : 0;


        /*
         * Không thấp hơn Best cũ.
         */

        if (
            newScore <= oldScore
        ) {

            console.log(
                "FLAPPY: chưa phá Best."
            );

            return;

        }


        await ref.set({

            username:
                currentUsername,

            score:
                newScore,

            updatedAt:
                firebase.database
                    .ServerValue
                    .TIMESTAMP

        });


        /*
         * Cập nhật UI.
         */

        highScore =
            newScore;


        updateScore();

        updateFlappyProfileBest(
            newScore
        );


        console.log(
            "FLAPPY SCORE SAVED:",
            currentUsername,
            newScore
        );


        /*
         * Tải lại BXH.
         */

        await loadFlappyLeaderboard();


    } catch (error) {

        console.error(
            "FLAPPY SAVE SCORE ERROR:",
            error
        );

    }

}


/* =====================================================
   LOAD LEADERBOARD
===================================================== */

async function loadFlappyLeaderboard() {

    const container =
        document.getElementById(
            "flappyLeaderboard"
        );


    if (
        !container ||
        !leaderboardDatabase
    ) {

        return;

    }


    try {

        container.innerHTML = `
            <div class="leaderboard-loading">
                Đang tải BXH...
            </div>
        `;


        const snapshot =
            await leaderboardDatabase
                .ref(
                    "leaderboards/flappy"
                )
                .orderByChild("score")
                .limitToLast(10)
                .once("value");


        const players = [];


        snapshot.forEach(
            child => {

                const data =
                    child.val();


                if (!data) {
                    return;
                }


                players.push({

                    uid:
                        child.key,

                    username:
                        data.username ||
                        "Người chơi",

                    score:
                        Number(
                            data.score
                        ) || 0

                });

            }
        );


        /*
         * Firebase trả thấp → cao.
         */

        players.reverse();


        if (
            players.length === 0
        ) {

            container.innerHTML = `
                <div class="leaderboard-empty">
                    Chưa có người chơi nào.
                </div>
            `;

            return;

        }


        container.innerHTML =
            "";


        players.forEach(
            (player, index) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "leaderboard-row";


                row.innerHTML = `

                    <div class="leaderboard-rank">
                        ${index + 1}
                    </div>

                    <div class="leaderboard-avatar">
                        🐦
                    </div>

                    <div class="leaderboard-name">
                        ${escapeLeaderboardText(
                            player.username
                        )}
                    </div>

                    <div class="leaderboard-score">
                        ${player.score}
                    </div>

                `;


                container.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "FLAPPY LOAD LEADERBOARD ERROR:",
            error
        );


        container.innerHTML = `
            <div class="leaderboard-empty">
                Không thể tải BXH.
            </div>
        `;

    }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeLeaderboardText(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}    
 

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


    let highScore = 0;

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


    if (score > highScore) {

        highScore =
            score;


        /*
         * Nếu Guest:
         * lưu local.
         *
         * Nếu tài khoản:
         * Firebase sẽ lưu khi Game Over.
         */

        const user =
            window.GameHub?.getUser();


        if (
            !user ||
            user.isAnonymous
        ) {

            localStorage.setItem(
                "flappy_high_score",
                String(highScore)
            );

        }



        updateFlappyProfileBest(
            highScore
        );

    }


    updateScore();

    updateFlappyProfileScore(
        score
    );


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
    */
    if (!gameHubReady) {
        await initGameHub();
    }

    /*
       Nếu đang chơi thì không tạo ván mới.
    */
    if (state === "playing") {
        return;
    }

    state = "playing";

    score = 0;

    pipeTimer = 0;

    clearPipes();

    resetBird();

    updateScore();

    increaseFlappyGamesPlayed();

    updateFlappyProfileScore(0);

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
       Ghi lượt chơi vào GameHub.
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
        updateFlappyProfileScore(score);
saveFlappyLeaderboardScore(score);


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

setupFlappyLayout();

updateFlappyProfileGames();

updateFlappyProfileBest(highScore);

updateFlappyProfileScore(0);

draw();

/*
   Firebase leaderboard.
   setupFlappyLeaderboard() tự chờ
   GameHub.ready trước khi lấy Auth.
*/
setupFlappyLeaderboard();

})();
