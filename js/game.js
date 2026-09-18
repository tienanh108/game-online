/* =====================================================
   CARO 5 - GAME.JS
   OFFLINE + ONLINE
===================================================== */

let boardSize = 15;
let board = [];
let currentPlayer = "X";
let gameOver = false;
let gameMode = "AI";

/*
   AI difficulty:
   easy
   medium
   hard
   extreme
*/
let aiDifficulty = "medium";

let timerSeconds = 30;
let timerInterval = null;

let lastMoveIndex = -1;

let scoreX = 0;
let scoreO = 0;


/* =====================================================
   AI DIFFICULTY UI
===================================================== */

function createDifficultySelector() {

    if (
        document.getElementById(
            "aiDifficultySelect"
        )
    ) {
        return;
    }

    const menu =
        document.getElementById(
            "menuScreen"
        );

    if (!menu) {
        return;
    }

    const wrapper =
        document.createElement("div");

    wrapper.id =
        "aiDifficultyWrapper";

    wrapper.style.margin =
        "12px 0";

    const label =
        document.createElement("label");

    label.textContent =
        "🤖 Độ khó AI";

    label.style.display =
        "block";

    label.style.marginBottom =
        "6px";

    const select =
        document.createElement("select");

    select.id =
        "aiDifficultySelect";

    select.innerHTML = `
        <option value="easy">
            🟢 Dễ
        </option>

        <option value="medium" selected>
            🟡 Trung bình
        </option>

        <option value="hard">
            🔴 Khó
        </option>

        <option value="extreme">
            🟣 Siêu khó
        </option>
    `;

    select.style.width =
        "100%";

    select.style.padding =
        "10px";

    select.style.borderRadius =
        "10px";

    select.style.border =
        "1px solid #ccc";

    select.addEventListener(
        "change",
        function () {

            aiDifficulty =
                this.value;

        }
    );

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    const boardSizeSelect =
        document.getElementById(
            "boardSizeSelect"
        );

    if (
        boardSizeSelect &&
        boardSizeSelect.parentElement
    ) {

        boardSizeSelect
            .parentElement
            .after(wrapper);

    } else {

        menu.appendChild(wrapper);

    }
}


/* =====================================================
   DOM READY
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        createDifficultySelector
    );

} else {

    createDifficultySelector();

}


/* =====================================================
   START OFFLINE GAME
===================================================== */

function startOfflineGame(mode) {

    const modeChanged =
        gameMode !== mode;

    gameMode =
        mode;

    /*
       Đổi mode thì reset điểm offline.
    */
    if (modeChanged) {

        scoreX = 0;
        scoreO = 0;

        try {

            localStorage.removeItem(
                "caro5_scores"
            );

        } catch {}

    }


    /* =========================
       AI DIFFICULTY
    ========================= */

    const difficultySelect =
        document.getElementById(
            "aiDifficultySelect"
        );

    if (difficultySelect) {

        aiDifficulty =
            difficultySelect.value;

    }


    /* =========================
       BOARD SIZE
    ========================= */

    const select =
        document.getElementById(
            "boardSizeSelect"
        );

    if (!select) {
        return;
    }

    boardSize =
        Number(select.value);


    /* =========================
       OFFLINE MODE
    ========================= */

    onlineMode = false;
    onlineRoomCode = "";
    onlineRole = "";

    stopTimer();

    resetBoard();


    /* =========================
       SCREEN
    ========================= */

    document
        .getElementById("menuScreen")
        .classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.remove("hidden");


    const roomInfo =
        document.getElementById(
            "roomInfo"
        );

    if (roomInfo) {
        roomInfo.textContent = "";
    }


    const copyRoomButton =
        document.getElementById(
            "copyRoomButton"
        );

    if (copyRoomButton) {

        copyRoomButton
            .classList
            .add("hidden");

    }


    const copyLinkButton =
        document.getElementById(
            "copyLinkButton"
        );

    if (copyLinkButton) {

        copyLinkButton
            .classList
            .add("hidden");

    }


    const newGameButton =
        document.getElementById(
            "newGameButton"
        );

    if (newGameButton) {

        newGameButton
            .classList
            .remove("hidden");

    }


    if (modeChanged) {

        updateScoreDisplay();

    } else {

        loadScores();

    }


    renderBoard();
    updateGameInfo();
    startTimer();
}


/* =====================================================
   RESET BOARD
===================================================== */

function resetBoard() {

    board =
        new Array(
            boardSize * boardSize
        ).fill("");

    currentPlayer =
        "X";

    gameOver =
        false;

    lastMoveIndex =
        -1;

    timerSeconds =
        30;


    const resultBox =
        document.getElementById(
            "resultBox"
        );

    if (resultBox) {

        resultBox
            .classList
            .add("hidden");

    }


    /*
       Một số phiên bản firebase.js
       dùng id "result".
       Ẩn luôn nếu tồn tại.
    */

    const result =
        document.getElementById(
            "result"
        );

    if (result) {

        result
            .classList
            .add("hidden");

    }
}


/* =====================================================
   RENDER BOARD
===================================================== */

function renderBoard() {

    const boardElement =
        document.getElementById(
            "board"
        );

    if (!boardElement) {
        return;
    }

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


    for (
        let i = 0;
        i < board.length;
        i++
    ) {

        const cell =
            document.createElement(
                "button"
            );

        cell.type =
            "button";

        cell.className =
            "cell";

        cell.dataset.index =
            i;


        /*
           QUAN TRỌNG:
           Cả X và O đều dùng chung
           handleCellClick().
        */

        cell.addEventListener(
            "click",
            function () {

                handleCellClick(i);

            }
        );


        boardElement.appendChild(
            cell
        );
    }


    updateCells();
}


/* =====================================================
   UPDATE CELLS
===================================================== */

function updateCells() {

    const cells =
        document.querySelectorAll(
            ".cell"
        );

    cells.forEach(
        (cell, index) => {

            cell.classList.remove(
                "x",
                "o",
                "last-move"
            );


            if (
                board[index] === "X"
            ) {

                cell.classList.add(
                    "x"
                );

            }


            if (
                board[index] === "O"
            ) {

                cell.classList.add(
                    "o"
                );

            }


            if (
                index ===
                lastMoveIndex
            ) {

                cell.classList.add(
                    "last-move"
                );

            }


            /*
               Không disable ô trống
               chỉ vì đang tới lượt đối thủ.

               Việc kiểm tra lượt sẽ được
               thực hiện trong handleCellClick()
               và makeOnlineMove().
            */

            cell.disabled =
                gameOver ||
                board[index] !== "";

        }
    );
}


/* =====================================================
   CLICK CELL
===================================================== */

function handleCellClick(index) {

    /* =========================
       BASIC CHECK
    ========================= */

    if (gameOver) {
        return;
    }

    if (
        board[index] !== ""
    ) {
        return;
    }


    /* =================================================
       ONLINE
    ================================================= */

    if (onlineMode) {

        /*
           Kiểm tra trực tiếp role của người chơi.
        */

        console.log(
            "ONLINE CLICK:",
            {
                index: index,
                onlineRole:
                    typeof onlineRole !==
                    "undefined"
                        ? onlineRole
                        : "UNDEFINED",

                currentPlayer:
                    currentPlayer,

                onlineMode:
                    onlineMode
            }
        );


        /*
           Nếu chưa xác định được X/O,
           không cho đánh.
        */

        if (
            typeof onlineRole ===
                "undefined" ||
            !onlineRole
        ) {

            console.warn(
                "ONLINE: Chưa xác định được role."
            );

            return;
        }


        /*
           Không tới lượt mình.
        */

        if (
            currentPlayer !==
            onlineRole
        ) {

            console.log(
                "ONLINE: Chưa tới lượt bạn."
            );

            return;
        }


        /*
           Gửi nước đi lên Firebase.
        */

        makeOnlineMove(index);

        return;
    }


    /* =================================================
       AI TURN
    ================================================= */

    if (
        gameMode === "AI" &&
        currentPlayer === "O"
    ) {

        return;
    }


    /* =================================================
       OFFLINE 2 PLAYER / AI
    ================================================= */

    makeMove(index);
}


/* =====================================================
   MAKE OFFLINE MOVE
===================================================== */

function makeMove(index) {

    if (gameOver) {
        return;
    }

    if (
        board[index] !== ""
    ) {
        return;
    }


    board[index] =
        currentPlayer;

    lastMoveIndex =
        index;


    updateCells();


    /* =========================
       WIN
    ========================= */

    if (
        checkWin(index)
    ) {

        finishOfflineGame(
            currentPlayer
        );

        return;
    }


    /* =========================
       DRAW
    ========================= */

    if (
        board.every(
            cell =>
                cell !== ""
        )
    ) {

        finishOfflineDraw();

        return;
    }


    /* =========================
       CHANGE PLAYER
    ========================= */

    currentPlayer =
        currentPlayer === "X"
            ? "O"
            : "X";


    updateGameInfo();
    startTimer();


    /* =========================
       AI
    ========================= */

    if (
        gameMode === "AI" &&
        currentPlayer === "O"
    ) {

        updateCells();


        setTimeout(
            () => {

                if (gameOver) {
                    return;
                }

                const move =
                    getAIMove(
                        board,
                        boardSize,
                        aiDifficulty
                    );

                if (
                    move !== -1
                ) {

                    makeMove(
                        move
                    );

                }

            },
            300
        );
    }
}


/* =====================================================
   WIN CHECK
===================================================== */

function checkWin(index) {

    const player =
        board[index];

    const row =
        Math.floor(
            index / boardSize
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
        const [
            dr,
            dc
        ]
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


/* =====================================================
   COUNT DIRECTION
===================================================== */

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
            r * boardSize +
            c;


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


/* =====================================================
   FINISH OFFLINE
===================================================== */

function finishOfflineGame(
    winner
) {

    gameOver = true;

    stopTimer();


    if (
        winner === "X"
    ) {

        scoreX++;

    } else {

        scoreO++;

    }


    saveScores();

    updateScoreDisplay();


    showResult(
        "🎉 " +
        winner +
        " thắng!"
    );


    updateCells();
}


/* =====================================================
   OFFLINE DRAW
===================================================== */

function finishOfflineDraw() {

    gameOver = true;

    stopTimer();


    showResult(
        "🤝 Hòa!"
    );


    updateCells();
}


/* =====================================================
   RESULT
===================================================== */

function showResult(text) {

    const box =
        document.getElementById(
            "resultBox"
        );

    const resultText =
        document.getElementById(
            "resultText"
        );


    if (
        !box ||
        !resultText
    ) {
        return;
    }


    resultText.textContent =
        text;


    box.classList.remove(
        "hidden"
    );
}


/* =====================================================
   TIMER OFFLINE
===================================================== */

function startTimer() {

    stopTimer();

    timerSeconds =
        30;

    updateTimerDisplay();


    timerInterval =
        setInterval(
            () => {

                timerSeconds--;

                updateTimerDisplay();


                if (
                    timerSeconds <= 0
                ) {

                    stopTimer();

                    handleOfflineTimeout();

                }

            },
            1000
        );
}


/* =====================================================
   STOP TIMER
===================================================== */

function stopTimer() {

    if (
        timerInterval !==
        null
    ) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;
    }
}


/* =====================================================
   OFFLINE TIMEOUT
===================================================== */

function handleOfflineTimeout() {

    if (gameOver) {
        return;
    }


    const winner =
        currentPlayer === "X"
            ? "O"
            : "X";


    finishOfflineGame(
        winner
    );
}


/* =====================================================
   TIMER DISPLAY
===================================================== */

function updateTimerDisplay() {

    const timer =
        document.getElementById(
            "timer"
        );

    if (!timer) {
        return;
    }


    timer.textContent =
        Math.max(
            0,
            timerSeconds
        );
}


/* =====================================================
   GAME INFO
===================================================== */

function updateGameInfo() {

    const turn =
        document.getElementById(
            "turnText"
        );


    if (!turn) {
        return;
    }


    if (gameOver) {
        return;
    }


    if (
        gameMode === "AI"
    ) {

        if (
            currentPlayer === "X"
        ) {

            turn.textContent =
                "Lượt của bạn (X)";

        } else {

            turn.textContent =
                "🤖 AI đang suy nghĩ...";

        }

    } else {

        turn.textContent =
            "Lượt của " +
            currentPlayer;

    }
}


/* =====================================================
   SCORE
===================================================== */

function updateScoreDisplay() {

    const x =
        document.getElementById(
            "scoreX"
        );

    const o =
        document.getElementById(
            "scoreO"
        );


    if (x) {

        x.textContent =
            scoreX;

    }


    if (o) {

        o.textContent =
            scoreO;

    }
}


/* =====================================================
   LOCAL STORAGE
===================================================== */

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
            typeof saved.X ===
                "number" &&
            typeof saved.O ===
                "number"
        ) {

            scoreX =
                saved.X;

            scoreO =
                saved.O;

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

    try {

        localStorage.setItem(
            "caro5_scores",

            JSON.stringify({
                X: scoreX,
                O: scoreO
            })
        );

    } catch {}
}


/* =====================================================
   NEW GAME
   OFFLINE + ONLINE
===================================================== */

function startNewOfflineGame() {

    /*
       CỰC KỲ QUAN TRỌNG:

       Nếu đang chơi ONLINE,
       nút Ván mới không được reset
       bàn ở client.

       Nó phải reset trên Firebase
       để cả X và O cùng nhận được.
    */

    if (onlineMode) {

        console.log(
            "ONLINE: Bấm Ván mới"
        );


        if (
            typeof startNewOnlineGame ===
            "function"
        ) {

            startNewOnlineGame();

        } else {

            console.error(
                "Không tìm thấy startNewOnlineGame()."
            );

        }

        return;
    }


    /* =========================
       OFFLINE
    ========================= */

    stopTimer();

    resetBoard();

    renderBoard();

    updateGameInfo();

    startTimer();
}


/*
   Một số HTML có thể gọi
   startNewGame() thay vì
   startNewOfflineGame().
*/

function startNewGame() {

    if (onlineMode) {

        if (
            typeof startNewOnlineGame ===
            "function"
        ) {

            startNewOnlineGame();

        }

        return;
    }


    startNewOfflineGame();
}


/* =====================================================
   MENU
===================================================== */

function showMenu() {

    stopTimer();


    if (onlineMode) {

        if (
            typeof leaveOnlineRoom ===
            "function"
        ) {

            leaveOnlineRoom();

        }

    }


    onlineMode =
        false;

    onlineRoomCode =
        "";

    onlineRole =
        "";


    const gameScreen =
        document.getElementById(
            "gameScreen"
        );

    if (gameScreen) {

        gameScreen
            .classList
            .add("hidden");

    }


    const menuScreen =
        document.getElementById(
            "menuScreen"
        );

    if (menuScreen) {

        menuScreen
            .classList
            .remove("hidden");

    }


    const resultBox =
        document.getElementById(
            "resultBox"
        );

    if (resultBox) {

        resultBox
            .classList
            .add("hidden");

    }
}
