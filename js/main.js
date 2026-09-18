"use strict";

(() => {

    // =========================================================
    // CARO 5 - MAIN CONTROLLER
    // =========================================================
    // - Offline AI / PvP
    // - Online Firebase
    // - 15x15 / 20x20 / 25x25
    // - Timer 30 giây
    // - Tự động tính kích thước bàn cờ
    // - Không cần scroll để xem toàn bộ bàn
    // =========================================================


    // =========================================================
    // GAME STATE
    // =========================================================

    let boardSize = 15;
    let board = [];

    let currentPlayer = "X";
    let gameOver = false;

    let gameMode = "ai";
    let aiDifficulty = "medium";

    let timer = 30;
    let timerInterval = null;

    let scoreX = 0;
    let scoreO = 0;

    let lastMoveIndex = -1;


    // =========================================================
    // ONLINE STATE
    // =========================================================

    let isOnline = false;

    let roomCode = "";
    let onlinePlayer = "";

    let firebaseReady = false;

    let roomRef = null;
    let roomListener = null;

    let auth = null;
    let db = null;
    let user = null;


    // =========================================================
    // DOM
    // =========================================================

    const $ = id => document.getElementById(id);

    const menuScreen = $("menuScreen");
    const gameScreen = $("gameScreen");
    const boardElement = $("board");

    const playButton = $("playButton");

    const aiModeBtn = $("aiModeBtn");
    const pvpModeBtn = $("pvpModeBtn");

    const boardSizeSelect = $("boardSizeSelect");

    const createRoomButton = $("createRoomButton");
    const joinRoomButton = $("joinRoomButton");
    const roomInput = $("roomInput");

    const backMenuButton = $("backMenuButton");

    const playAgainButton = $("playAgainButton");
    const exitMenuButton = $("exitMenuButton");

    const turnText = $("turnText");
    const timerElement = $("timer");

    const scoreXElement = $("scoreX");
    const scoreOElement = $("scoreO");

    const resultBox = $("resultBox");
    const resultText = $("resultText");

    const roomInfo = $("roomInfo");

    const firebaseStatus = $("firebaseStatus");
    const onlineNotice = $("onlineNotice");

    const copyRoomButton = $("copyRoomButton");
    const copyLinkButton = $("copyLinkButton");


    // =========================================================
    // FIREBASE CONFIG
    // =========================================================

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",
        authDomain: "caro-3460d.firebaseapp.com",
        databaseURL: "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "caro-3460d",
        storageBucket: "caro-3460d.firebasestorage.app",
        messagingSenderId: "473059233945",
        appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
        measurementId: "G-WXXMSSSN3W"
    };


    // =========================================================
    // AUTO BOARD SIZE
    // =========================================================

    function calculateCellSize() {

        if (!boardElement || !gameScreen) {
            return;
        }


        /*
            Nếu game chưa hiện thì chưa cần tính.
        */

        if (
            gameScreen.classList.contains(
                "hidden"
            )
        ) {
            return;
        }


        const screenWidth =
            window.innerWidth;

        const screenHeight =
            window.innerHeight;


        /*
            Lấy khoảng không gian thực tế dành cho bàn.
        */

        const gameContainer =
            document.querySelector(
                ".game-container"
            );

        const boardScroll =
            document.querySelector(
                ".board-scroll"
            );


        if (
            !gameContainer ||
            !boardScroll
        ) {
            return;
        }


        const containerStyle =
            window.getComputedStyle(
                gameContainer
            );


        const scrollStyle =
            window.getComputedStyle(
                boardScroll
            );


        const paddingLeft =
            parseFloat(
                containerStyle.paddingLeft
            ) || 0;

        const paddingRight =
            parseFloat(
                containerStyle.paddingRight
            ) || 0;

        const paddingTop =
            parseFloat(
                containerStyle.paddingTop
            ) || 0;

        const paddingBottom =
            parseFloat(
                containerStyle.paddingBottom
            ) || 0;


        const scrollPaddingLeft =
            parseFloat(
                scrollStyle.paddingLeft
            ) || 0;

        const scrollPaddingRight =
            parseFloat(
                scrollStyle.paddingRight
            ) || 0;

        const scrollPaddingTop =
            parseFloat(
                scrollStyle.paddingTop
            ) || 0;

        const scrollPaddingBottom =
            parseFloat(
                scrollStyle.paddingBottom
            ) || 0;


        /*
            Chiều rộng có thể dùng.
        */

        const availableWidth =
            Math.max(
                100,
                Math.min(
                    screenWidth -
                        paddingLeft -
                        paddingRight -
                        scrollPaddingLeft -
                        scrollPaddingRight -
                        10,

                    boardScroll.clientWidth -
                        scrollPaddingLeft -
                        scrollPaddingRight -
                        10
                )
            );


        /*
            Chiều cao có thể dùng.

            Vì phần header / info / result /
            button đã chiếm chỗ nên lấy
            trực tiếp chiều cao thực tế
            của .board-scroll.
        */

        const availableHeight =
            Math.max(
                100,
                boardScroll.clientHeight -
                    scrollPaddingTop -
                    scrollPaddingBottom -
                    10
            );


        /*
            Tính ô dựa trên số ô.

            Trừ 4px để dành cho border.
        */

        const sizeByWidth =
            (
                availableWidth - 4
            ) / boardSize;


        const sizeByHeight =
            (
                availableHeight - 4
            ) / boardSize;


        /*
            Lấy kích thước nhỏ hơn
            để bàn luôn vừa cả ngang lẫn dọc.
        */

        let cellSize =
            Math.floor(
                Math.min(
                    sizeByWidth,
                    sizeByHeight
                )
            );


        /*
            Giới hạn để ô không quá nhỏ
            trên điện thoại.
        */

        const minCellSize =
            screenWidth < 500
                ? 22
                : 20;


        /*
            Không để ô quá to.
        */

        const maxCellSize =
            screenWidth >= 1200
                ? 48
                : screenWidth >= 700
                    ? 42
                    : 38;


        cellSize =
            Math.max(
                minCellSize,
                Math.min(
                    cellSize,
                    maxCellSize
                )
            );


        /*
            Nếu vì một lý do nào đó
            board vẫn lớn hơn vùng hiển thị,
            tính lại lần cuối.
        */

        const finalBoardSize =
            cellSize *
            boardSize;


        if (
            finalBoardSize >
            availableWidth
        ) {

            cellSize =
                Math.floor(
                    availableWidth /
                    boardSize
                );
        }


        if (
            cellSize *
            boardSize >
            availableHeight
        ) {

            cellSize =
                Math.floor(
                    availableHeight /
                    boardSize
                );
        }


        cellSize =
            Math.max(
                18,
                cellSize
            );


        /*
            Gửi kích thước vào CSS.
        */

        boardElement.style.setProperty(
            "--cell-size",
            `${cellSize}px`
        );
    }


    // =========================================================
    // AUTO RESIZE
    // =========================================================

    let resizeTimer = null;


    function scheduleBoardResize() {

        if (resizeTimer) {
            cancelAnimationFrame(
                resizeTimer
            );
        }


        resizeTimer =
            requestAnimationFrame(
                () => {
                    resizeTimer = null;

                    calculateCellSize();
                }
            );
    }


    window.addEventListener(
        "resize",
        scheduleBoardResize
    );


    window.addEventListener(
        "orientationchange",
        () => {
            setTimeout(
                scheduleBoardResize,
                100
            );
        }
    );


    // =========================================================
    // MENU
    // =========================================================

    function showMenu() {

        stopTimer();

        menuScreen.classList.remove(
            "hidden"
        );

        gameScreen.classList.add(
            "hidden"
        );

        resultBox.classList.add(
            "hidden"
        );

        onlineNotice.classList.add(
            "hidden"
        );

        roomInfo.textContent = "";


        detachRoomListener();


        roomRef = null;

        roomCode = "";

        onlinePlayer = "";

        isOnline = false;


        copyRoomButton.classList.add(
            "hidden"
        );

        copyLinkButton.classList.add(
            "hidden"
        );


        lastMoveIndex = -1;
    }


    function showGame() {

        menuScreen.classList.add(
            "hidden"
        );

        gameScreen.classList.remove(
            "hidden"
        );


        /*
            Chờ trình duyệt layout xong
            rồi mới tính kích thước bàn.
        */

        requestAnimationFrame(
            () => {
                calculateCellSize();

                setTimeout(
                    calculateCellSize,
                    50
                );
            }
        );
    }


    // =========================================================
    // MODE
    // =========================================================

    aiModeBtn.addEventListener(
        "click",
        () => {

            gameMode = "ai";

            aiModeBtn.classList.add(
                "active"
            );

            pvpModeBtn.classList.remove(
                "active"
            );
        }
    );


    pvpModeBtn.addEventListener(
        "click",
        () => {

            gameMode = "pvp";

            pvpModeBtn.classList.add(
                "active"
            );

            aiModeBtn.classList.remove(
                "active"
            );
        }
    );


    // =========================================================
    // BOARD SIZE
    // =========================================================

    function getSelectedBoardSize() {

        const size =
            Number(
                boardSizeSelect.value
            );


        if (
            size === 15 ||
            size === 20 ||
            size === 25
        ) {
            return size;
        }


        return 15;
    }


    // =========================================================
    // OFFLINE GAME
    // =========================================================

    function startOfflineGame() {

        isOnline = false;

        roomCode = "";

        onlinePlayer = "";


        boardSize =
            getSelectedBoardSize();


        scoreX = 0;

        scoreO = 0;


        startNewRound();
    }


    function startNewRound() {

        stopTimer();


        board =
            createBoard(
                boardSize
            );


        currentPlayer = "X";

        gameOver = false;

        lastMoveIndex = -1;


        resultBox.classList.add(
            "hidden"
        );


        updateScore();

        renderBoard();

        updateTurn();


        startTimer();


        scheduleBoardResize();
    }


    function createBoard(size) {

        return new Array(
            size * size
        ).fill("");
    }


    // =========================================================
    // BOARD NORMALIZER
    // =========================================================

    function normalizeBoard(
        rawBoard,
        size
    ) {

        const total =
            size * size;


        const result =
            new Array(
                total
            ).fill("");


        if (
            Array.isArray(
                rawBoard
            )
        ) {

            for (
                let i = 0;
                i <
                Math.min(
                    rawBoard.length,
                    total
                );
                i++
            ) {

                result[i] =
                    rawBoard[i] === "X" ||
                    rawBoard[i] === "O"
                        ? rawBoard[i]
                        : "";
            }


            return result;
        }


        if (
            rawBoard &&
            typeof rawBoard ===
                "object"
        ) {

            Object.keys(
                rawBoard
            ).forEach(
                key => {

                    const index =
                        Number(key);


                    if (
                        Number.isInteger(
                            index
                        ) &&
                        index >= 0 &&
                        index < total
                    ) {

                        const value =
                            rawBoard[key];


                        if (
                            value === "X" ||
                            value === "O"
                        ) {

                            result[
                                index
                            ] = value;
                        }
                    }
                }
            );
        }


        return result;
    }


    // =========================================================
    // RENDER BOARD
    // =========================================================

    function renderBoard() {

        boardElement.innerHTML = "";


        boardElement.style.setProperty(
            "--board-size",
            boardSize
        );


        for (
            let i = 0;
            i < board.length;
            i++
        ) {

            const cell =
                document.createElement(
                    "button"
                );


            cell.type = "button";

            cell.className = "cell";

            cell.dataset.index = i;


            if (
                board[i] === "X"
            ) {

                cell.textContent = "X";

                cell.classList.add(
                    "x"
                );
            }


            if (
                board[i] === "O"
            ) {

                cell.textContent = "O";

                cell.classList.add(
                    "o"
                );
            }


            if (
                i === lastMoveIndex
            ) {

                cell.classList.add(
                    "last-move"
                );
            }


            cell.addEventListener(
                "click",
                () => {
                    handleCellClick(i);
                }
            );


            boardElement.appendChild(
                cell
            );
        }


        scheduleBoardResize();
    }


    // =========================================================
    // CELL CLICK
    // =========================================================

    function handleCellClick(
        index
    ) {

        if (gameOver) return;

        if (
            board[index] !== ""
        ) {
            return;
        }


        if (isOnline) {

            makeOnlineMove(
                index
            );

            return;
        }


        if (
            gameMode === "ai" &&
            currentPlayer !== "X"
        ) {
            return;
        }


        makeMove(index);
    }


    // =========================================================
    // OFFLINE MOVE
    // =========================================================

    function makeMove(index) {

        if (gameOver) return;

        if (
            board[index] !== ""
        ) {
            return;
        }


        board[index] =
            currentPlayer;


        lastMoveIndex =
            index;


        renderBoard();


        // WIN
        if (
            checkWin(
                index,
                currentPlayer
            )
        ) {

            gameOver = true;

            stopTimer();


            if (
                currentPlayer ===
                "X"
            ) {

                scoreX++;

            } else {

                scoreO++;
            }


            updateScore();


            showResult(
                currentPlayer === "X"
                    ? "🎉 X thắng!"
                    : "🎉 O thắng!"
            );


            return;
        }


        // DRAW
        if (
            board.every(
                cell =>
                    cell !== ""
            )
        ) {

            gameOver = true;

            stopTimer();

            showResult(
                "🤝 Hòa!"
            );

            return;
        }


        // NEXT PLAYER
        currentPlayer =
            currentPlayer === "X"
                ? "O"
                : "X";


        updateTurn();

        resetTimer();


        // AI
        if (
            gameMode === "ai" &&
            currentPlayer === "O"
        ) {

            setTimeout(
                aiMove,
                300
            );
        }
    }


    // =========================================================
    // WIN CHECK
    // =========================================================

    function checkWin(
        index,
        player
    ) {

        const row =
            Math.floor(
                index /
                boardSize
            );


        const col =
            index %
            boardSize;


        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];


        for (
            const [dr, dc]
            of directions
        ) {

            let count = 1;


            count +=
                countDirection(
                    row,
                    col,
                    dr,
                    dc,
                    player
                );


            count +=
                countDirection(
                    row,
                    col,
                    -dr,
                    -dc,
                    player
                );


            if (
                count >= 5
            ) {
                return true;
            }
        }


        return false;
    }


    function countDirection(
        row,
        col,
        dr,
        dc,
        player
    ) {

        let count = 0;


        let r =
            row + dr;

        let c =
            col + dc;


        while (
            r >= 0 &&
            r < boardSize &&
            c >= 0 &&
            c < boardSize
        ) {

            const index =
                r * boardSize + c;


            if (
                board[index] !==
                player
            ) {
                break;
            }


            count++;


            r += dr;

            c += dc;
        }


        return count;
    }


    // =========================================================
    // AI
    // =========================================================

    function aiMove() {

        if (gameOver) return;

        if (isOnline) return;

        if (
            currentPlayer !== "O"
        ) {
            return;
        }


        const move =
            getBestAIMove();


        if (
            move !== -1
        ) {

            makeMove(
                move
            );
        }
    }


    function getBestAIMove() {

        const empty = [];


        for (
            let i = 0;
            i < board.length;
            i++
        ) {

            if (
                board[i] === ""
            ) {
                empty.push(i);
            }
        }


        if (
            empty.length === 0
        ) {
            return -1;
        }


        // EASY
        if (
            aiDifficulty ===
            "easy"
        ) {

            if (
                Math.random() <
                0.65
            ) {

                return empty[
                    Math.floor(
                        Math.random() *
                        empty.length
                    )
                ];
            }
        }


        // WIN
        for (
            const index of empty
        ) {

            board[index] = "O";


            const win =
                checkWin(
                    index,
                    "O"
                );


            board[index] = "";


            if (win) {
                return index;
            }
        }


        // BLOCK
        for (
            const index of empty
        ) {

            board[index] = "X";


            const win =
                checkWin(
                    index,
                    "X"
                );


            board[index] = "";


            if (win) {
                return index;
            }
        }


        // EASY RANDOM
        if (
            aiDifficulty ===
            "easy"
        ) {

            return empty[
                Math.floor(
                    Math.random() *
                    empty.length
                )
            ];
        }


        let bestScore =
            -Infinity;


        let bestMoves = [];


        for (
            const index of empty
        ) {

            let score =
                evaluateMove(
                    index,
                    "O"
                );


            if (
                aiDifficulty ===
                    "hard" ||
                aiDifficulty ===
                    "extreme"
            ) {

                score +=
                    evaluateMove(
                        index,
                        "O"
                    ) * 1.5;
            }


            score +=
                evaluateMove(
                    index,
                    "X"
                ) * 0.9;


            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                bestMoves = [
                    index
                ];

            } else if (
                score ===
                bestScore
            ) {

                bestMoves.push(
                    index
                );
            }
        }


        if (
            bestMoves.length > 0
        ) {

            return bestMoves[
                Math.floor(
                    Math.random() *
                    bestMoves.length
                )
            ];
        }


        return empty[
            Math.floor(
                Math.random() *
                empty.length
            )
        ];
    }


    function evaluateMove(
        index,
        player
    ) {

        const row =
            Math.floor(
                index /
                boardSize
            );


        const col =
            index %
            boardSize;


        let score = 0;


        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];


        for (
            const [dr, dc]
            of directions
        ) {

            let count = 1;


            count +=
                countDirection(
                    row,
                    col,
                    dr,
                    dc,
                    player
                );


            count +=
                countDirection(
                    row,
                    col,
                    -dr,
                    -dc,
                    player
                );


            if (
                count >= 5
            ) {

                score +=
                    100000;

            } else if (
                count === 4
            ) {

                score +=
                    10000;

            } else if (
                count === 3
            ) {

                score +=
                    1000;

            } else if (
                count === 2
            ) {

                score +=
                    100;
            }
        }


        const center =
            (boardSize - 1) /
            2;


        score -=
            Math.abs(
                row - center
            ) * 2;


        score -=
            Math.abs(
                col - center
            ) * 2;


        return score;
    }


    // =========================================================
    // TIMER
    // =========================================================

    function startTimer() {

        stopTimer();


        timer = 30;

        updateTimer();


        timerInterval =
            setInterval(
                () => {

                    if (
                        gameOver
                    ) {

                        stopTimer();

                        return;
                    }


                    timer--;

                    updateTimer();


                    if (
                        timer <= 0
                    ) {

                        handleTimeout();
                    }

                },
                1000
            );
    }


    function resetTimer() {

        stopTimer();

        startTimer();
    }


    function stopTimer() {

        if (
            timerInterval
        ) {

            clearInterval(
                timerInterval
            );

            timerInterval = null;
        }
    }


    function updateTimer() {

        timerElement.textContent =
            Math.max(
                0,
                timer
            );
    }


    function handleTimeout() {

        stopTimer();


        if (gameOver) return;


        const loser =
            currentPlayer;


        const winner =
            loser === "X"
                ? "O"
                : "X";


        gameOver = true;


        if (
            winner === "X"
        ) {

            scoreX++;

        } else {

            scoreO++;
        }


        updateScore();


        showResult(
            `⏰ ${loser} hết giờ! ${winner} thắng!`
        );
    }


    // =========================================================
    // UI
    // =========================================================

    function updateTurn() {

        if (!isOnline) {

            turnText.textContent =
                `Lượt của ${currentPlayer}`;

            return;
        }


        if (!onlinePlayer) {

            turnText.textContent =
                `Lượt của ${currentPlayer}`;

            return;
        }


        if (
            onlinePlayer ===
            currentPlayer
        ) {

            turnText.textContent =
                `Lượt của bạn (${currentPlayer})`;

        } else {

            turnText.textContent =
                `Lượt của ${currentPlayer}`;
        }
    }


    function updateScore() {

        scoreXElement.textContent =
            scoreX;

        scoreOElement.textContent =
            scoreO;
    }


    function showResult(
        message
    ) {

        resultText.textContent =
            message;

        resultBox.classList.remove(
            "hidden"
        );
    }


    // =========================================================
    // OFFLINE BUTTONS
    // =========================================================

    playButton.addEventListener(
        "click",
        () => {

            startOfflineGame();

            showGame();
        }
    );


    playAgainButton.addEventListener(
        "click",
        () => {

            if (isOnline) {

                startOnlineNewGame();

            } else {

                startNewRound();
            }
        }
    );


    exitMenuButton.addEventListener(
        "click",
        () => {
            showMenu();
        }
    );


    backMenuButton.addEventListener(
        "click",
        () => {
            showMenu();
        }
    );


    // =========================================================
    // FIREBASE INIT
    // =========================================================

    async function initFirebase() {

        try {

            if (
                typeof firebase ===
                    "undefined" ||
                !firebase.initializeApp
            ) {

                firebaseStatus.textContent =
                    "Firebase chưa tải";

                return;
            }


            if (
                !firebase.apps.length
            ) {

                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            }


            auth =
                firebase.auth();


            db =
                firebase.database();


            user =
                auth.currentUser;


            if (!user) {

                await auth.signInAnonymously();

                user =
                    auth.currentUser;
            }


            firebaseReady =
                true;


            firebaseStatus.textContent =
                "🟢 Online sẵn sàng";

        } catch (error) {

            console.error(
                "Firebase init error:",
                error
            );


            firebaseReady =
                false;


            firebaseStatus.textContent =
                "🔴 Firebase lỗi";
        }
    }


    // =========================================================
    // ROOM CODE
    // =========================================================

    function generateRoomCode() {

        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


        let code = "";


        for (
            let i = 0;
            i < 6;
            i++
        ) {

            code +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];
        }


        return code;
    }


    function normalizeRoomCode(
        value
    ) {

        return String(
            value || ""
        )
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            )
            .slice(0, 6);
    }


    // =========================================================
    // CREATE ROOM
    // =========================================================

    createRoomButton.addEventListener(
        "click",
        async () => {

            if (!firebaseReady) {
                await initFirebase();
            }


            if (
                !firebaseReady ||
                !db ||
                !user
            ) {

                alert(
                    "Firebase chưa sẵn sàng. Hãy thử lại."
                );

                return;
            }


            try {

                createRoomButton.disabled =
                    true;


                const code =
                    generateRoomCode();


                roomCode =
                    code;


                onlinePlayer =
                    "X";


                isOnline =
                    true;


                /*
                    Lấy kích thước
                    mà người tạo chọn.
                */

                boardSize =
                    getSelectedBoardSize();


                const initialBoard =
                    createBoard(
                        boardSize
                    );


                const room = {

                    boardSize:
                        boardSize,

                    board:
                        initialBoard,

                    currentPlayer:
                        "X",

                    playerX: {
                        uid:
                            user.uid
                    },

                    playerO:
                        null,

                    scoreX:
                        0,

                    scoreO:
                        0,

                    gameOver:
                        false,

                    winner:
                        null,

                    status:
                        "waiting",

                    turnStartedAt:
                        null,

                    createdAt:
                        firebase.database
                            .ServerValue
                            .TIMESTAMP
                };


                roomRef =
                    db.ref(
                        "rooms/" +
                        code
                    );


                await roomRef.set(
                    room
                );


                listenRoom();


                showGame();


                roomInfo.textContent =
                    `Phòng ${code} • ${boardSize}×${boardSize} • Bạn là X`;


                copyRoomButton.classList.remove(
                    "hidden"
                );


                copyLinkButton.classList.remove(
                    "hidden"
                );


                onlineNotice.textContent =
                    `⏳ Phòng ${code} • Bàn ${boardSize}×${boardSize}. Gửi mã cho người chơi O.`;


                onlineNotice.classList.remove(
                    "hidden"
                );


                renderBoard();

                updateScore();

                updateTurn();


                stopTimer();

                timer = 30;

                updateTimer();


                scheduleBoardResize();

            } catch (error) {

                console.error(
                    "Create room error:",
                    error
                );


                alert(
                    "Không thể tạo phòng: " +
                    error.message
                );


                isOnline =
                    false;

            } finally {

                createRoomButton.disabled =
                    false;
            }
        }
    );


    // =========================================================
    // JOIN ROOM
    // =========================================================

    joinRoomButton.addEventListener(
        "click",
        async () => {

            const code =
                normalizeRoomCode(
                    roomInput.value
                );


            roomInput.value =
                code;


            if (
                code.length !== 6
            ) {

                alert(
                    "Mã phòng phải có 6 ký tự."
                );

                return;
            }


            if (!firebaseReady) {
                await initFirebase();
            }


            if (
                !firebaseReady ||
                !db ||
                !user
            ) {

                alert(
                    "Firebase chưa sẵn sàng."
                );

                return;
            }


            try {

                joinRoomButton.disabled =
                    true;


                const ref =
                    db.ref(
                        "rooms/" +
                        code
                    );


                const snapshot =
                    await ref.once(
                        "value"
                    );


                if (
                    !snapshot.exists()
                ) {

                    alert(
                        "Không tìm thấy phòng."
                    );

                    return;
                }


                const room =
                    snapshot.val();


                const roomSize =
                    Number(
                        room.boardSize
                    );


                if (
                    roomSize !== 15 &&
                    roomSize !== 20 &&
                    roomSize !== 25
                ) {

                    alert(
                        "Phòng có kích thước bàn không hợp lệ."
                    );

                    return;
                }


                let role = "";


                if (
                    room.playerX &&
                    room.playerX.uid ===
                        user.uid
                ) {

                    role = "X";

                } else if (
                    room.playerO &&
                    room.playerO.uid ===
                        user.uid
                ) {

                    role = "O";

                } else if (
                    !room.playerO
                ) {

                    role = "O";

                } else {

                    alert(
                        "Phòng đã đủ 2 người."
                    );

                    return;
                }


                roomCode =
                    code;


                onlinePlayer =
                    role;


                isOnline =
                    true;


                /*
                    QUAN TRỌNG:

                    Máy người vào phòng
                    bỏ qua boardSizeSelect.

                    Dùng size từ Firebase.
                */

                boardSize =
                    roomSize;


                const updates = {};


                if (
                    role === "O" &&
                    !room.playerO
                ) {

                    updates.playerO = {
                        uid:
                            user.uid
                    };


                    updates.status =
                        "playing";


                    updates.board =
                        normalizeBoard(
                            room.board,
                            roomSize
                        );


                    updates.currentPlayer =
                        room.currentPlayer ||
                        "X";


                    updates.gameOver =
                        Boolean(
                            room.gameOver
                        );


                    updates.turnStartedAt =
                        Date.now();
                }


                await ref.update(
                    updates
                );


                roomRef =
                    ref;


                listenRoom();


                showGame();


                roomInfo.textContent =
                    `Phòng ${code} • ${boardSize}×${boardSize} • Bạn là ${role}`;


                copyRoomButton.classList.remove(
                    "hidden"
                );


                copyLinkButton.classList.remove(
                    "hidden"
                );


                scheduleBoardResize();

            } catch (error) {

                console.error(
                    "Join room error:",
                    error
                );


                alert(
                    "Không thể vào phòng: " +
                    error.message
                );


                isOnline =
                    false;

            } finally {

                joinRoomButton.disabled =
                    false;
            }
        }
    );


    // =========================================================
    // LISTEN ROOM
    // =========================================================

    function listenRoom() {

        if (!roomRef) return;


        detachRoomListener();


        roomListener =
            snapshot => {

                if (
                    !snapshot.exists()
                ) {
                    return;
                }


                const room =
                    snapshot.val();


                // SIZE
                const remoteSize =
                    Number(
                        room.boardSize ||
                        15
                    );


                if (
                    remoteSize === 15 ||
                    remoteSize === 20 ||
                    remoteSize === 25
                ) {

                    boardSize =
                        remoteSize;
                }


                // BOARD
                board =
                    normalizeBoard(
                        room.board,
                        boardSize
                    );


                // CURRENT PLAYER
                currentPlayer =
                    room.currentPlayer ||
                    "X";


                // SCORE
                scoreX =
                    Number(
                        room.scoreX ||
                        0
                    );


                scoreO =
                    Number(
                        room.scoreO ||
                        0
                    );


                // GAME OVER
                gameOver =
                    Boolean(
                        room.gameOver
                    );


                // RENDER
                renderBoard();


                updateScore();

                updateTurn();


                // PLAYERS
                const hasX =
                    Boolean(
                        room.playerX
                    );


                const hasO =
                    Boolean(
                        room.playerO
                    );


                if (
                    hasX &&
                    hasO
                ) {

                    onlineNotice.classList.add(
                        "hidden"
                    );

                } else {

                    onlineNotice.textContent =
                        `⏳ Đang chờ người chơi thứ hai... • Bàn ${boardSize}×${boardSize}`;

                    onlineNotice.classList.remove(
                        "hidden"
                    );
                }


                // RESULT
                if (
                    room.gameOver &&
                    room.winner
                ) {

                    if (
                        room.winner ===
                        "draw"
                    ) {

                        showResult(
                            "🤝 Hòa!"
                        );

                    } else {

                        showResult(
                            `🎉 ${room.winner} thắng!`
                        );
                    }


                    stopTimer();

                } else {

                    resultBox.classList.add(
                        "hidden"
                    );
                }


                // TIMER
                if (
                    !room.gameOver &&
                    room.status ===
                        "playing" &&
                    hasX &&
                    hasO
                ) {

                    startOnlineTimer(
                        room
                    );

                } else {

                    stopTimer();
                }


                scheduleBoardResize();
            };


        roomRef.on(
            "value",
            roomListener
        );
    }


    function detachRoomListener() {

        if (
            roomListener &&
            roomRef
        ) {

            roomRef.off(
                "value",
                roomListener
            );
        }


        roomListener =
            null;
    }


    // =========================================================
    // ONLINE TIMER
    // =========================================================

    function startOnlineTimer(
        room
    ) {

        stopTimer();


        const started =
            Number(
                room.turnStartedAt ||
                0
            );


        if (!started) {

            timer = 30;

            updateTimer();

            return;
        }


        function tick() {

            const elapsed =
                Math.floor(
                    (
                        Date.now() -
                        started
                    ) / 1000
                );


            timer =
                Math.max(
                    0,
                    30 -
                        elapsed
                );


            updateTimer();


            if (
                timer <= 0
            ) {

                stopTimer();

                handleOnlineTimeout(
                    room
                );
            }
        }


        tick();


        timerInterval =
            setInterval(
                tick,
                500
            );
    }


    async function handleOnlineTimeout(
        room
    ) {

        if (!roomRef) return;

        if (gameOver) return;


        try {

            await roomRef.transaction(
                currentRoom => {

                    if (
                        !currentRoom
                    ) {
                        return currentRoom;
                    }


                    if (
                        currentRoom.gameOver
                    ) {
                        return;
                    }


                    const started =
                        Number(
                            currentRoom
                                .turnStartedAt ||
                            0
                        );


                    if (!started) {
                        return;
                    }


                    const elapsed =
                        Math.floor(
                            (
                                Date.now() -
                                started
                            ) / 1000
                        );


                    if (
                        elapsed < 30
                    ) {
                        return;
                    }


                    const loser =
                        currentRoom
                            .currentPlayer ||
                        "X";


                    const winner =
                        loser === "X"
                            ? "O"
                            : "X";


                    currentRoom.gameOver =
                        true;


                    currentRoom.winner =
                        winner;


                    currentRoom.turnStartedAt =
                        null;


                    if (
                        winner === "X"
                    ) {

                        currentRoom.scoreX =
                            Number(
                                currentRoom
                                    .scoreX ||
                                0
                            ) + 1;

                    } else {

                        currentRoom.scoreO =
                            Number(
                                currentRoom
                                    .scoreO ||
                                0
                            ) + 1;
                    }


                    return currentRoom;
                }
            );

        } catch (error) {

            console.error(
                "Online timeout error:",
                error
            );
        }
    }


    // =========================================================
    // ONLINE MOVE
    // =========================================================

    async function makeOnlineMove(
        index
    ) {

        if (!roomRef) return;

        if (!onlinePlayer) return;

        if (gameOver) return;


        try {

            await roomRef.transaction(
                room => {

                    if (!room) {
                        return room;
                    }


                    if (
                        room.status !==
                            "playing"
                    ) {
                        return;
                    }


                    if (
                        room.gameOver
                    ) {
                        return;
                    }


                    if (
                        room.currentPlayer !==
                        onlinePlayer
                    ) {
                        return;
                    }


                    const size =
                        Number(
                            room.boardSize ||
                            15
                        );


                    const remoteBoard =
                        normalizeBoard(
                            room.board,
                            size
                        );


                    if (
                        remoteBoard[
                            index
                        ] !== ""
                    ) {
                        return;
                    }


                    // MOVE
                    remoteBoard[
                        index
                    ] =
                        onlinePlayer;


                    room.board =
                        remoteBoard;


                    // WIN
                    if (
                        checkOnlineWin(
                            remoteBoard,
                            size,
                            index,
                            onlinePlayer
                        )
                    ) {

                        room.gameOver =
                            true;


                        room.winner =
                            onlinePlayer;


                        room.turnStartedAt =
                            null;


                        if (
                            onlinePlayer ===
                            "X"
                        ) {

                            room.scoreX =
                                Number(
                                    room.scoreX ||
                                    0
                                ) + 1;

                        } else {

                            room.scoreO =
                                Number(
                                    room.scoreO ||
                                    0
                                ) + 1;
                        }


                        return room;
                    }


                    // DRAW
                    if (
                        remoteBoard.every(
                            cell =>
                                cell !== ""
                        )
                    ) {

                        room.gameOver =
                            true;


                        room.winner =
                            "draw";


                        room.turnStartedAt =
                            null;


                        return room;
                    }


                    // NEXT TURN
                    room.currentPlayer =
                        onlinePlayer ===
                            "X"
                            ? "O"
                            : "X";


                    room.turnStartedAt =
                        Date.now();


                    return room;
                }
            );

        } catch (error) {

            console.error(
                "Online move error:",
                error
            );
        }
    }


    // =========================================================
    // ONLINE WIN CHECK
    // =========================================================

    function checkOnlineWin(
        arr,
        size,
        index,
        player
    ) {

        const row =
            Math.floor(
                index /
                size
            );


        const col =
            index %
            size;


        const directions = [
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1]
        ];


        for (
            const [dr, dc]
            of directions
        ) {

            let count = 1;


            count +=
                countOnline(
                    arr,
                    size,
                    row,
                    col,
                    dr,
                    dc,
                    player
                );


            count +=
                countOnline(
                    arr,
                    size,
                    row,
                    col,
                    -dr,
                    -dc,
                    player
                );


            if (
                count >= 5
            ) {
                return true;
            }
        }


        return false;
    }


    function countOnline(
        arr,
        size,
        row,
        col,
        dr,
        dc,
        player
    ) {

        let count = 0;


        let r =
            row + dr;

        let c =
            col + dc;


        while (
            r >= 0 &&
            r < size &&
            c >= 0 &&
            c < size
        ) {

            const index =
                r * size + c;


            if (
                arr[index] !==
                player
            ) {
                break;
            }


            count++;


            r += dr;

            c += dc;
        }


        return count;
    }


    // =========================================================
    // ONLINE NEW GAME
    // =========================================================

    async function startOnlineNewGame() {

        if (!roomRef) return;


        try {

            await roomRef.transaction(
                room => {

                    if (!room) {
                        return room;
                    }


                    if (
                        !room.playerX ||
                        !room.playerO
                    ) {
                        return;
                    }


                    const size =
                        Number(
                            room.boardSize ||
                            15
                        );


                    room.board =
                        createBoard(
                            size
                        );


                    room.currentPlayer =
                        "X";


                    room.gameOver =
                        false;


                    room.winner =
                        null;


                    room.status =
                        "playing";


                    room.turnStartedAt =
                        Date.now();


                    return room;
                }
            );


            resultBox.classList.add(
                "hidden"
            );


        } catch (error) {

            console.error(
                "New online game error:",
                error
            );
        }
    }


    // =========================================================
    // COPY ROOM
    // =========================================================

    copyRoomButton.addEventListener(
        "click",
        async () => {

            if (!roomCode) return;


            try {

                await navigator.clipboard.writeText(
                    roomCode
                );


                copyRoomButton.textContent =
                    "✅ Đã sao chép mã";


                setTimeout(
                    () => {

                        copyRoomButton.textContent =
                            "📋 Sao chép mã phòng";

                    },
                    1500
                );


            } catch {

                prompt(
                    "Mã phòng:",
                    roomCode
                );
            }
        }
    );


    // =========================================================
    // COPY LINK
    // =========================================================

    copyLinkButton.addEventListener(
        "click",
        async () => {

            if (!roomCode) return;


            const url =
                location.origin +
                location.pathname +
                "?room=" +
                roomCode;


            try {

                await navigator.clipboard.writeText(
                    url
                );


                copyLinkButton.textContent =
                    "✅ Đã sao chép link";


                setTimeout(
                    () => {

                        copyLinkButton.textContent =
                            "🔗 Sao chép link";

                    },
                    1500
                );


            } catch {

                prompt(
                    "Link phòng:",
                    url
                );
            }
        }
    );


    // =========================================================
    // ROOM INPUT
    // =========================================================

    roomInput.addEventListener(
        "input",
        () => {

            roomInput.value =
                normalizeRoomCode(
                    roomInput.value
                );
        }
    );


    roomInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                joinRoomButton.click();
            }
        }
    );


    // =========================================================
    // INIT
    // =========================================================

    function init() {

        console.log(
            "CARO 5 MAIN.JS LOADED"
        );


        menuScreen.classList.remove(
            "hidden"
        );


        gameScreen.classList.add(
            "hidden"
        );


        boardSize =
            getSelectedBoardSize();


        initFirebase();


        const params =
            new URLSearchParams(
                location.search
            );


        const room =
            normalizeRoomCode(
                params.get("room")
            );


        if (
            room.length === 6
        ) {

            roomInput.value =
                room;


            setTimeout(
                () => {

                    joinRoomButton.click();

                },
                800
            );
        }
    }


    // =========================================================
    // START
    // =========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();
