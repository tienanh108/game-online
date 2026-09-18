/* =====================================================
   CARO 5 - OFFLINE GAME
===================================================== */

let boardSize = 15;
let board = [];

let currentPlayer = "X";
let gameOver = false;

let gameMode = "AI";

let timerSeconds = 30;
let timerInterval = null;

let lastMoveIndex = -1;

let scoreX = 0;
let scoreO = 0;


/* ================= START ================= */

function startOfflineGame(mode) {

    gameMode = mode;

    const select = document.getElementById("boardSizeSelect");

    boardSize = Number(select.value);

    onlineMode = false;

    onlineRoomCode = "";
    onlineRole = "";

    stopTimer();

    resetBoard();

    document.getElementById("menuScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");

    document.getElementById("roomInfo").textContent = "";

    document.getElementById("copyRoomButton").classList.add("hidden");
    document.getElementById("copyLinkButton").classList.add("hidden");

    document.getElementById("newGameButton").classList.remove("hidden");

    loadScores();

    renderBoard();

    updateGameInfo();

    startTimer();
}


/* ================= RESET ================= */

function resetBoard() {

    board = new Array(boardSize * boardSize).fill("");

    currentPlayer = "X";

    gameOver = false;

    lastMoveIndex = -1;

    timerSeconds = 30;

    const resultBox = document.getElementById("resultBox");

    if (resultBox) {
        resultBox.classList.add("hidden");
    }
}


/* ================= RENDER ================= */

function renderBoard() {

    const boardElement = document.getElementById("board");

    boardElement.innerHTML = "";

    boardElement.style.setProperty(
        "--board-size",
        boardSize
    );


    let cellSize = 38;

    if (boardSize === 20) {
        cellSize = 32;
    }

    if (boardSize === 25) {
        cellSize = 27;
    }

    boardElement.style.setProperty(
        "--cell-size",
        cellSize + "px"
    );


    for (let i = 0; i < board.length; i++) {

        const cell = document.createElement("button");

        cell.type = "button";

        cell.className = "cell";

        cell.dataset.index = i;

        cell.addEventListener(
            "click",
            () => handleCellClick(i)
        );

        boardElement.appendChild(cell);
    }

    updateCells();
}


/* ================= UPDATE CELLS ================= */

function updateCells() {

    const cells =
        document.querySelectorAll(".cell");

    cells.forEach((cell, index) => {

        cell.classList.remove(
            "x",
            "o",
            "last-move"
        );

        if (board[index] === "X") {
            cell.classList.add("x");
        }

        if (board[index] === "O") {
            cell.classList.add("o");
        }

        if (index === lastMoveIndex) {
            cell.classList.add("last-move");
        }

        cell.disabled =
            gameOver ||
            board[index] !== "";

    });
}


/* ================= CLICK ================= */

function handleCellClick(index) {

    if (gameOver) {
        return;
    }

    if (board[index] !== "") {
        return;
    }


    /* Online */

    if (onlineMode) {

        makeOnlineMove(index);

        return;
    }


    /* AI turn */

    if (
        gameMode === "AI" &&
        currentPlayer === "O"
    ) {
        return;
    }


    makeMove(index);
}


/* ================= MAKE MOVE ================= */

function makeMove(index) {

    if (gameOver) {
        return;
    }

    if (board[index] !== "") {
        return;
    }


    board[index] = currentPlayer;

    lastMoveIndex = index;

    updateCells();


    /* Win */

    if (checkWin(index)) {

        finishOfflineGame(currentPlayer);

        return;
    }


    /* Draw */

    if (board.every(cell => cell !== "")) {

        finishOfflineDraw();

        return;
    }


    /* Change player */

    currentPlayer =
        currentPlayer === "X"
            ? "O"
            : "X";

    updateGameInfo();

    startTimer();


    /* AI */

    if (
        gameMode === "AI" &&
        currentPlayer === "O"
    ) {

        setTimeout(() => {

            if (gameOver) {
                return;
            }

            const move = getAIMove(
                board,
                boardSize
            );

            if (move !== -1) {
                makeMove(move);
            }

        }, 350);
    }
}


/* ================= WIN CHECK ================= */

function checkWin(index) {

    const player = board[index];

    const row = Math.floor(index / boardSize);
    const col = index % boardSize;


    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];


    for (const [dr, dc] of directions) {

        let count = 1;


        count += countDirection(
            row,
            col,
            dr,
            dc,
            player
        );


        count += countDirection(
            row,
            col,
            -dr,
            -dc,
            player
        );


        if (count >= 5) {
            return true;
        }
    }

    return false;
}


/* ================= COUNT ================= */

function countDirection(
    row,
    col,
    dr,
    dc,
    player
) {

    let count = 0;

    let r = row + dr;
    let c = col + dc;


    while (
        r >= 0 &&
        r < boardSize &&
        c >= 0 &&
        c < boardSize
    ) {

        const index =
            r * boardSize + c;

        if (board[index] !== player) {
            break;
        }

        count++;

        r += dr;
        c += dc;
    }

    return count;
}


/* ================= FINISH ================= */

function finishOfflineGame(winner) {

    gameOver = true;

    stopTimer();

    if (winner === "X") {
        scoreX++;
    } else {
        scoreO++;
    }

    saveScores();

    updateScoreDisplay();

    showResult(
        "🎉 " + winner + " thắng!"
    );

    updateCells();
}


/* ================= DRAW ================= */

function finishOfflineDraw() {

    gameOver = true;

    stopTimer();

    showResult("🤝 Hòa!");

    updateCells();
}


/* ================= RESULT ================= */

function showResult(text) {

    const box =
        document.getElementById("resultBox");

    const resultText =
        document.getElementById("resultText");

    resultText.textContent = text;

    box.classList.remove("hidden");
}


/* ================= TIMER ================= */

function startTimer() {

    stopTimer();

    timerSeconds = 30;

    updateTimerDisplay();


    timerInterval = setInterval(() => {

        timerSeconds--;

        updateTimerDisplay();


        if (timerSeconds <= 0) {

            stopTimer();

            handleOfflineTimeout();
        }

    }, 1000);
}


/* ================= STOP TIMER ================= */

function stopTimer() {

    if (timerInterval !== null) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


/* ================= TIMEOUT ================= */

function handleOfflineTimeout() {

    if (gameOver) {
        return;
    }

    const winner =
        currentPlayer === "X"
            ? "O"
            : "X";

    finishOfflineGame(winner);
}


/* ================= TIMER DISPLAY ================= */

function updateTimerDisplay() {

    const timer =
        document.getElementById("timer");

    timer.textContent =
        Math.max(0, timerSeconds);
}


/* ================= INFO ================= */

function updateGameInfo() {

    const turn =
        document.getElementById("turnText");

    if (gameOver) {
        return;
    }

    turn.textContent =
        "Lượt của " + currentPlayer;
}


/* ================= SCORE ================= */

function updateScoreDisplay() {

    document.getElementById("scoreX")
        .textContent = scoreX;

    document.getElementById("scoreO")
        .textContent = scoreO;
}


/* ================= LOCAL STORAGE ================= */

function loadScores() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(
                    "caro5_scores"
                )
            );

        if (
            saved &&
            typeof saved.X === "number" &&
            typeof saved.O === "number"
        ) {

            scoreX = saved.X;
            scoreO = saved.O;

        } else {

            scoreX = 0;
            scoreO = 0;
        }

    } catch {

        scoreX = 0;
        scoreO = 0;
    }

    updateScoreDisplay();
}


function saveScores() {

    localStorage.setItem(
        "caro5_scores",
        JSON.stringify({
            X: scoreX,
            O: scoreO
        })
    );
}


/* ================= NEW OFFLINE GAME ================= */

function startNewOfflineGame() {

    stopTimer();

    resetBoard();

    renderBoard();

    updateGameInfo();

    startTimer();
}


/* ================= MENU ================= */

function showMenu() {

    stopTimer();

    if (onlineMode) {
        leaveOnlineRoom();
    }

    document.getElementById("gameScreen")
        .classList.add("hidden");

    document.getElementById("menuScreen")
        .classList.remove("hidden");

    document.getElementById("resultBox")
        .classList.add("hidden");
}
