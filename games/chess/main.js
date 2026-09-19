(function () {
    "use strict";

    /* =========================================================
       SAFETY CHECK
    ========================================================= */

    console.log("🔍 main.js đang kiểm tra ChessCore...");
    console.log("window.ChessCore =", window.ChessCore);

    if (
        typeof window.ChessCore === "undefined" ||
        window.ChessCore === null
    ) {
        console.error(
            "❌ ChessCore KHÔNG tồn tại."
        );

        const msg =
            document.createElement("div");

        msg.style.cssText = `
            position:fixed;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:24px;
            background:#111827;
            color:white;
            font-family:system-ui,sans-serif;
            text-align:center;
            z-index:99999;
        `;

        msg.innerHTML = `
            <div>
                <h2>⚠️ ChessCore chưa được tạo</h2>
                <p>chess.js đã được gọi nhưng không tạo được ChessCore.</p>
                <p>Hãy mở Console để xem lỗi của chess.js.</p>
            </div>
        `;

        document.body.appendChild(msg);

        return;
    }

    const Chess =
        window.ChessCore;

    console.log(
        "✅ main.js đã nhận được ChessCore:",
        Chess
    );


    /* =========================================================
       DOM
    ========================================================= */

    const $ =
        id =>
            document.getElementById(id);

    const boardEl =
        $("board");

    const setupEl =
        $("setup");

    const gameEl =
        $("game");


    /* =========================================================
       CONSTANTS
    ========================================================= */

    const FILES = [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h"
    ];

    const row =
        index =>
            Math.floor(index / 8);

    const col =
        index =>
            index % 8;

    function opposite(color) {
        return color === "w"
            ? "b"
            : "w";
    }


    /* =========================================================
       STATE
    ========================================================= */

    let state = null;

    let history = [];

    let selected = null;

    let lastMove = null;

    let flipped = false;

    let mode = "ai";

    let difficulty = "medium";

    let timeLimit = 300;

    let clocks = {
        w: 300,
        b: 300
    };

    let clockTimer = null;

    let gameStarted = false;

    let gameFinished = false;

    let analyticsTracked = false;

    let aiThinking = false;


    /* =========================================================
       DRAW OFFER
    ========================================================= */

    let localDrawOffer = false;

    let localDrawResponseOpen = false;

    let onlineDrawOffer = null;

    let onlineDrawWriting = false;

    let lastDrawOfferKey = null;


    /* =========================================================
       ONLINE STATE
    ========================================================= */

    let db = null;

    let auth = null;

    let currentUser = null;

    let roomRef = null;

    let roomListener = null;

    let roomId = null;

    let onlineColor = null;

    let onlineJoined = false;

    let onlineWriting = false;

    let lastOnlineSoundKey = null;

    let onlineResultSoundPlayed = false;


    /* =========================================================
       AI
    ========================================================= */

    const VALUES = {

        p: 100,

        n: 320,

        b: 330,

        r: 500,

        q: 900,

        k: 20000

    };


    /* =========================================================
       SOUND
    ========================================================= */

    function playChessSound(
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

    function soundClick() {

        playChessSound(
            "./chess_click.mp3",
            0.45
        );
    }

    function soundMove() {

        playChessSound(
            "./chess_move.mp3",
            0.55
        );
    }

    function soundCapture() {

        playChessSound(
            "./chess_capture.mp3",
            0.6
        );
    }

    function soundCheck() {

        playChessSound(
            "./chess_check.mp3",
            0.6
        );
    }

    function soundCheckmate() {

        playChessSound(
            "./chess_checkmate.mp3",
            0.7
        );
    }

    function soundWin() {

        playChessSound(
            "./chess_win.mp3",
            0.7
        );
    }

    function soundLose() {

        playChessSound(
            "./chess_lose.mp3",
            0.7
        );
    }


    /* =========================================================
       BASIC
    ========================================================= */

    function initialState() {

        return {

            board:
                Chess.initialBoard(),

            turn:
                "w",

            castling: {

                wK: true,

                wQ: true,

                bK: true,

                bQ: true

            },

            enPassant:
                null
        };
    }


    function formatTime(seconds) {

        if (
            timeLimit === 0
        ) {

            return "∞";
        }

        seconds =
            Math.max(
                0,
                Math.ceil(seconds)
            );

        return (
            Math.floor(
                seconds / 60
            ) +
            ":" +
            String(
                seconds % 60
            ).padStart(
                2,
                "0"
            )
        );
    }


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


    /* =========================================================
       FIREBASE
    ========================================================= */

    function getDatabase() {

        if (db) {
            return db;
        }

        if (
            window.GameHub &&
            typeof window.GameHub.getDatabase ===
                "function"
        ) {

            db =
                window.GameHub.getDatabase();
        }

        return db;
    }


    function getAuth() {

        if (auth) {
            return auth;
        }

        if (
            window.GameHub &&
            typeof window.GameHub.getAuth ===
                "function"
        ) {

            auth =
                window.GameHub.getAuth();
        }

        return auth;
    }


    async function ensureUser() {

        if (
            window.GameHub &&
            window.GameHub.ready
        ) {

            await window.GameHub.ready;
        }

        const firebaseAuth =
            getAuth();

        if (
            firebaseAuth &&
            firebaseAuth.currentUser
        ) {

            currentUser =
                firebaseAuth.currentUser;

            return currentUser;
        }

        throw new Error(
            "Firebase Auth chưa sẵn sàng."
        );
    }


    /* =========================================================
       MESSAGE
    ========================================================= */

    function setMessage(text) {

        const el =
            $("message");

        if (el) {
            el.textContent =
                text;
        }
    }


    function setRoomMessage(text) {

        const el =
            $("roomMessage");

        if (el) {
            el.textContent =
                text;
        }
    }


    /* =========================================================
       CLOCK
    ========================================================= */

    function stopClock() {

        clearInterval(
            clockTimer
        );

        clockTimer = null;
    }


    function startClock() {

        stopClock();

        if (
            timeLimit === 0 ||
            mode === "online"
        ) {

            updateClocks();

            return;
        }

        clockTimer =
            setInterval(
                () => {

                    if (
                        !gameStarted ||
                        gameFinished ||
                        !state
                    ) {

                        return;
                    }

                    clocks[
                        state.turn
                    ] -= 0.1;

                    if (
                        clocks[
                            state.turn
                        ] <= 0
                    ) {

                        clocks[
                            state.turn
                        ] = 0;

                        const winner =
                            opposite(
                                state.turn
                            );

                        finish(
                            "time",
                            winner
                        );

                        return;
                    }

                    updateClocks();

                },
                100
            );
    }


    function updateClocks() {

        if (!state) {
            return;
        }

        const whiteClock =
            $("whiteClock");

        const blackClock =
            $("blackClock");

        if (whiteClock) {

            whiteClock.textContent =
                formatTime(
                    clocks.w
                );
        }

        if (blackClock) {

            blackClock.textContent =
                formatTime(
                    clocks.b
                );
        }

        const whiteStatus =
            $("whiteStatus");

        const blackStatus =
            $("blackStatus");

        if (whiteStatus) {

            whiteStatus.textContent =
                state.turn === "w"
                    ? "Đang đi"
                    : "Chờ lượt";
        }

        if (blackStatus) {

            blackStatus.textContent =
                state.turn === "b"
                    ? "Đang đi"
                    : "Chờ lượt";
        }

        const turnPill =
            $("turnPill");

        if (turnPill) {

            turnPill.textContent =
                state.turn === "w"
                    ? "Lượt Trắng"
                    : "Lượt Đen";
        }
    }


    /* =========================================================
       RENDER
    ========================================================= */

    function render() {

        if (
            !state ||
            !boardEl
        ) {

            return;
        }

        boardEl.innerHTML = "";

        const legal =
            selected === null
                ? []
                : Chess
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .map(
                        move =>
                            move.to
                    );

        const checkSquare =
            Chess.inCheck(
                state.board,
                state.turn
            )
                ? Chess.kingIndex(
                    state.board,
                    state.turn
                )
                : -1;


        for (
            let visual = 0;
            visual < 64;
            visual++
        ) {

            const index =
                flipped
                    ? 63 - visual
                    : visual;

            const square =
                document.createElement(
                    "button"
                );

            square.type =
                "button";

            square.className =
                "square " +
                (
                    (
                        row(visual) +
                        col(visual)
                    ) % 2 === 0
                        ? "light"
                        : "dark"
                );


            if (
                index === selected
            ) {

                square.classList.add(
                    "selected"
                );
            }


            if (
                lastMove &&
                (
                    index ===
                        lastMove.from ||
                    index ===
                        lastMove.to
                )
            ) {

                square.classList.add(
                    "last"
                );
            }


            if (
                index === checkSquare
            ) {

                square.classList.add(
                    "check"
                );
            }


            const piece =
                state.board[index];


            if (piece) {

                const span =
                    document.createElement(
                        "span"
                    );

                span.className =
                    piece.c === "w"
                        ? "piece white-piece"
                        : "piece black-piece";

                const pieceSymbol =
                    Chess.PIECES[
                        piece.c
                    ][
                        piece.t
                    ];

                span.textContent =
                    pieceSymbol;

                span.style.setProperty(
                    "color",
                    piece.c === "w"
                        ? "#ffffff"
                        : "#111111",
                    "important"
                );

                span.style.setProperty(
                    "-webkit-text-fill-color",
                    piece.c === "w"
                        ? "#ffffff"
                        : "#111111",
                    "important"
                );

                span.style.setProperty(
                    "font-variant-emoji",
                    "text",
                    "important"
                );

                span.style.setProperty(
                    "-webkit-font-smoothing",
                    "antialiased"
                );

                square.appendChild(
                    span
                );
            }


            if (
                visual >= 56
            ) {

                const coordinate =
                    document.createElement(
                        "span"
                    );

                coordinate.className =
                    "coord file";

                coordinate.textContent =
                    FILES[
                        col(index)
                    ];

                square.appendChild(
                    coordinate
                );
            }


            if (
                col(visual) === 0
            ) {

                const coordinate =
                    document.createElement(
                        "span"
                    );

                coordinate.className =
                    "coord rank";

                coordinate.textContent =
                    8 - row(index);

                square.appendChild(
                    coordinate
                );
            }


            if (
                legal.includes(index)
            ) {

                if (!piece) {

                    square.style.boxShadow = `
                        inset 0 0 0 999px
                        rgba(0,0,0,.08),
                        inset 0 0 0 8px
                        rgba(250,204,21,.55)
                    `;

                } else {

                    square.style.boxShadow = `
                        inset 0 0 0 5px
                        rgba(239,68,68,.7)
                    `;
                }
            }


            square.addEventListener(
                "click",
                () =>
                    handleSquare(index)
            );

            boardEl.appendChild(
                square
            );
        }

        updateClocks();

        renderMoves();
    }


    /* =========================================================
       MOVES
    ========================================================= */

    function renderMoves() {

        const element =
            $("moves");

        if (!element) {
            return;
        }

        element.innerHTML = "";

        history.forEach(
            (move, index) => {

                const rowElement =
                    document.createElement(
                        "div"
                    );

                rowElement.className =
                    "move-row";

                rowElement.innerHTML = `
                    <span class="move-no">
                        ${
                            index % 2 === 0
                                ? Math.floor(
                                    index / 2
                                ) + "."
                                : ""
                        }
                    </span>

                    <span>
                        ${move}
                    </span>
                `;

                element.appendChild(
                    rowElement
                );
            }
        );

        element.scrollTop =
            element.scrollHeight;

        const count =
            $("moveCount");

        if (count) {

            count.textContent =
                history.length;
        }
    }


    /* =========================================================
       NOTATION
    ========================================================= */

    function moveTextFromState(
        currentState,
        move
    ) {

        const piece =
            currentState.board[
                move.from
            ];

        if (!piece) {

            return Chess.squareName(
                move.to
            );
        }

        const capture =
            currentState.board[
                move.to
            ] ||
            move.enPassant;

        if (move.castle) {

            return move.castle === "K"
                ? "O-O"
                : "O-O-O";
        }

        let text =
            piece.t === "p"
                ? ""
                : piece.t.toUpperCase();

        if (
            piece.t === "p" &&
            capture
        ) {

            text +=
                FILES[
                    col(move.from)
                ] +
                "x";

        } else if (capture) {

            text += "x";
        }

        text +=
            Chess.squareName(
                move.to
            );

        if (
            piece.t === "p" &&
            (
                row(move.to) === 0 ||
                row(move.to) === 7
            )
        ) {

            text +=
                "=" +
                (
                    move.promotion ||
                    "q"
                ).toUpperCase();
        }

        return text;
    }


    /* =========================================================
       GAMEHUB
    ========================================================= */

    function trackStart() {

        if (
            analyticsTracked ||
            !window.GameHub
        ) {

            return;
        }

        analyticsTracked =
            true;

        try {

            window.GameHub.startRound({
                mode,

                difficulty:
                    mode === "ai"
                        ? difficulty
                        : null,

                timeControl:
                    timeLimit
            });

        } catch (error) {

            console.warn(
                "Chess analytics error:",
                error
            );
        }
    }


    function trackEnd(
        result,
        winner
    ) {

        if (
            !analyticsTracked ||
            !window.GameHub
        ) {

            return;
        }

        analyticsTracked =
            false;

        try {

            window.GameHub.endRound(
                result,
                {
                    mode,

                    difficulty:
                        mode === "ai"
                            ? difficulty
                            : null,

                    winner,

                    timeControl:
                        timeLimit
                }
            );

        } catch (error) {

            console.warn(
                "Chess analytics error:",
                error
            );
        }
    }


    /* =========================================================
       MODE TEXT
    ========================================================= */

    function updateSideModeText() {

        const el =
            $("sideModeText");

        if (!el) {
            return;
        }

        if (mode === "ai") {

            el.textContent =
                "Đấu với máy";

        } else if (
            mode === "local"
        ) {

            el.textContent =
                "2 người";

        } else {

            el.textContent =
                "Chơi online";
        }
    }


    /* =========================================================
       OFFLINE START
    ========================================================= */

    function begin() {

        if (
            mode === "online"
        ) {

            setRoomMessage(
                "Hãy tạo hoặc tham gia phòng trước."
            );

            return;
        }

        stopClock();

        state =
            initialState();

        history = [];

        selected = null;

        lastMove = null;

        clocks = {
            w: timeLimit,
            b: timeLimit
        };

        gameStarted = true;

        gameFinished = false;

        aiThinking = false;

        localDrawOffer = false;

        localDrawResponseOpen =
            false;

        onlineDrawOffer = null;

        lastDrawOfferKey = null;

        lastOnlineSoundKey = null;

        onlineResultSoundPlayed =
            false;

        setupEl.classList.add(
            "hidden"
        );

        gameEl.classList.remove(
            "hidden"
        );

        $("onlineGameBar")
            .classList
            .add("hidden");

        $("resultOverlay")
            .classList
            .add("hidden");

        $("drawOverlay")
            .classList
            .add("hidden");

        updatePlayerNames();

        updateSideModeText();

        trackStart();

        startClock();

        setMessage(
            mode === "ai"
                ? "Bạn cầm Trắng. Chọn quân cờ để đi."
                : "Trắng đi trước."
        );

        render();
    }


    function updatePlayerNames() {

        if (
            mode === "ai"
        ) {

            $("whiteName")
                .textContent =
                "Bạn";

            $("blackName")
                .textContent =
                "Máy";

        } else if (
            mode === "local"
        ) {

            $("whiteName")
                .textContent =
                "Trắng";

            $("blackName")
                .textContent =
                "Đen";

        } else {

            $("whiteName")
                .textContent =
                onlineColor === "w"
                    ? "Bạn • Trắng"
                    : "Đối thủ • Trắng";

            $("blackName")
                .textContent =
                onlineColor === "b"
                    ? "Bạn • Đen"
                    : "Đối thủ • Đen";
        }
    }


    /* =========================================================
       END GAME
    ========================================================= */

    function finish(
        reason,
        winner
    ) {

        if (gameFinished) {
            return;
        }

        gameFinished =
            true;

        stopClock();

        aiThinking = false;

        localDrawOffer = false;

        localDrawResponseOpen =
            false;

        onlineDrawOffer = null;

        $("drawOverlay")
            .classList
            .add("hidden");

        let title = "";

        let text = "";

        let icon = "♔";

        let result = "draw";


        if (
            reason === "checkmate"
        ) {

            winner =
                winner ||
                opposite(
                    state.turn
                );

            title =
                "Chiếu hết!";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            icon =
                winner === "w"
                    ? "♔"
                    : "♚";

            result =
                mode === "ai"
                    ? (
                        winner === "w"
                            ? "win"
                            : "loss"
                    )
                    : "win";

        } else if (
            reason === "time"
        ) {

            winner =
                winner ||
                opposite(
                    state.turn
                );

            title =
                "Hết giờ!";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng do đối thủ hết thời gian.";

            icon = "⏱️";

            result =
                mode === "ai"
                    ? (
                        winner === "w"
                            ? "win"
                            : "loss"
                    )
                    : "win";

        } else if (
            reason === "resign"
        ) {

            winner =
                winner ||
                opposite(
                    state.turn
                );

            title =
                "Đã xin thua";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            icon = "🏳️";

            result =
                mode === "ai"
                    ? (
                        winner === "w"
                            ? "win"
                            : "loss"
                    )
                    : "win";

        } else {

            title =
                "Hòa cờ";

            text =
                reason === "stalemate"
                    ? "Bí nước — hòa cờ."
                    : "Hai người chơi đã đồng ý hòa.";

            icon = "🤝";

            result = "draw";
        }


        if (
            mode === "ai"
        ) {

            if (
                result === "win"
            ) {

                soundWin();

            } else if (
                result === "loss"
            ) {

                soundLose();
            }
        }


        if (
            reason === "checkmate"
        ) {

            soundCheckmate();
        }


        $("resultIcon")
            .textContent =
            icon;

        $("resultTitle")
            .textContent =
            title;

        $("resultText")
            .textContent =
            text;

        $("resultOverlay")
            .classList
            .remove("hidden");


        trackEnd(
            result,
            winner || null
        );

        render();
    }


    function getEndState(
        currentState
    ) {

        const legal =
            Chess.legalMoves(
                currentState
            );

        if (
            legal.length === 0
        ) {

            if (
                Chess.inCheck(
                    currentState.board,
                    currentState.turn
                )
            ) {

                return {

                    reason:
                        "checkmate",

                    winner:
                        opposite(
                            currentState.turn
                        )
                };
            }

            return {

                reason:
                    "stalemate",

                winner:
                    null
            };
        }

        return null;
    }


    /* =========================================================
       OFFLINE MOVE
    ========================================================= */

    function afterMove(move) {

        const notation =
            moveTextFromState(
                state,
                move
            );

        const capturedPiece =
            state.board[
                move.to
            ];

        lastMove = {

            from:
                move.from,

            to:
                move.to
        };


        state =
            Chess.applyMove(
                state,
                move
            );


        history.push(
            notation
        );

        selected = null;


        if (capturedPiece) {

            soundCapture();

        } else {

            soundMove();
        }


        render();


        const result =
            getEndState(
                state
            );

        if (result) {

            finish(
                result.reason,
                result.winner
            );

            return;
        }


        if (
            Chess.inCheck(
                state.board,
                state.turn
            )
        ) {

            soundCheck();
        }


        if (
            mode === "ai" &&
            state.turn === "b" &&
            !gameFinished
        ) {

            requestAI();
        }
    }


    /* =========================================================
       BOARD CLICK
    ========================================================= */

    function handleSquare(index) {

        if (
            !gameStarted ||
            gameFinished ||
            aiThinking
        ) {

            return;
        }


        if (
            mode === "online"
        ) {

            handleOnlineSquare(
                index
            );

            return;
        }


        if (
            mode === "ai" &&
            state.turn === "b"
        ) {

            return;
        }


        const piece =
            state.board[index];


        if (
            selected !== null
        ) {

            const move =
                Chess
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .find(
                        item =>
                            item.to ===
                            index
                    );

            if (move) {

                afterMove(
                    move
                );

                return;
            }
        }


        if (
            piece &&
            piece.c ===
                state.turn
        ) {

            selected = index;

            setMessage(
                "Chọn ô đích."
            );

            soundClick();

            render();

            return;
        }


        selected = null;

        setMessage(
            "Nước đi không hợp lệ."
        );

        render();
    }


    /* =========================================================
       ONLINE BOARD
    ========================================================= */

    function handleOnlineSquare(index) {

        if (
            !onlineJoined ||
            !onlineColor ||
            !state
        ) {

            return;
        }


        if (
            state.turn !==
            onlineColor
        ) {

            setMessage(
                "Chưa đến lượt bạn."
            );

            return;
        }


        const piece =
            state.board[index];


        if (
            selected !== null
        ) {

            const moves =
                Chess.legalMovesFrom(
                    state,
                    selected
                );

            const candidates =
                moves.filter(
                    move =>
                        move.to ===
                        index
                );

            const move =
                candidates.find(
                    item =>
                        item.promotion ===
                        "q"
                ) ||
                candidates[0];

            if (move) {

                makeOnlineMove(
                    move
                );

                return;
            }
        }


        if (
            piece &&
            piece.c ===
                onlineColor
        ) {

            selected = index;

            setMessage(
                "Chọn ô đích."
            );

            soundClick();

            render();

            return;
        }


        selected = null;

        render();
    }


    /* =========================================================
       ONLINE MOVE
    ========================================================= */

    async function makeOnlineMove(
        move
    ) {

        if (
            onlineWriting ||
            !roomRef ||
            !onlineColor
        ) {

            return;
        }

        onlineWriting =
            true;

        try {

            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        current => {

                            if (!current) {
                                return;
                            }

                            if (
                                current.status !==
                                "playing"
                            ) {

                                return;
                            }

                            if (
                                current.turn !==
                                onlineColor
                            ) {

                                return;
                            }

                            const remoteState = {

                                board:
                                    current.board,

                                turn:
                                    current.turn,

                                castling:
                                    current.castling,

                                enPassant:
                                    current.enPassant
                            };


                            const legal =
                                Chess.legalMovesFrom(
                                    remoteState,
                                    move.from
                                );


                            const valid =
                                legal.find(
                                    item =>
                                        item.to ===
                                            move.to &&
                                        (
                                            item.promotion ||
                                            null
                                        ) ===
                                            (
                                                move.promotion ||
                                                null
                                            )
                                );


                            if (!valid) {
                                return;
                            }


                            const notation =
                                moveTextFromState(
                                    remoteState,
                                    valid
                                );


                            const next =
                                Chess.applyMove(
                                    remoteState,
                                    valid
                                );


                            const historyNext =
                                Array.isArray(
                                    current.history
                                )
                                    ? [
                                        ...current.history,
                                        notation
                                    ]
                                    : [
                                        notation
                                    ];


                            const end =
                                getEndState(
                                    next
                                );


                            return {

                                status:
                                    end
                                        ? "finished"
                                        : "playing",

                                board:
                                    next.board,

                                turn:
                                    next.turn,

                                castling:
                                    next.castling,

                                enPassant:
                                    next.enPassant,

                                history:
                                    historyNext,

                                lastMove: {

                                    from:
                                        valid.from,

                                    to:
                                        valid.to

                                },

                                clocks:
                                    current.clocks ||
                                    {
                                        w:
                                            timeLimit,

                                        b:
                                            timeLimit
                                    },

                                result:
                                    end
                                        ? end.reason
                                        : null,

                                winner:
                                    end
                                        ? end.winner
                                        : null,

                                drawOffer:
                                    null,

                                updatedAt:
                                    firebase
                                        .database
                                        .ServerValue
                                        .TIMESTAMP
                            };
                        },
                        {
                            applyLocally:
                                false
                        }
                    );


            if (
                result.committed
            ) {

                selected = null;

            } else {

                setMessage(
                    "Nước đi không hợp lệ hoặc đối thủ vừa đi."
                );
            }

        } catch (error) {

            console.error(
                "Online move error:",
                error
            );

            setMessage(
                "Không thể gửi nước đi."
            );

        } finally {

            onlineWriting =
                false;
        }
    }


    /* =========================================================
       DRAW — OFFLINE
    ========================================================= */

    function requestLocalDraw() {

        if (
            !gameStarted ||
            gameFinished
        ) {

            return;
        }


        if (
            mode === "ai"
        ) {

            setMessage(
                "Không thể xin hòa khi đấu với máy."
            );

            return;
        }


        if (
            localDrawOffer ||
            localDrawResponseOpen
        ) {

            return;
        }


        localDrawOffer = true;

        localDrawResponseOpen = true;

        showDrawRequest(
            "Đối thủ xin hòa"
        );
    }


    function showDrawRequest(
        title = "Đối thủ xin hòa"
    ) {

        const overlay =
            $("drawOverlay");

        if (!overlay) {
            return;
        }

        const heading =
            overlay.querySelector(
                "h2"
            );

        if (heading) {
            heading.textContent =
                title;
        }

        overlay.classList.remove(
            "hidden"
        );
    }


    function closeDrawRequest() {

        $("drawOverlay")
            .classList
            .add("hidden");

        localDrawResponseOpen =
            false;
    }


    function acceptLocalDraw() {

        if (
            !gameStarted ||
            gameFinished
        ) {

            closeDrawRequest();

            return;
        }

        localDrawOffer = false;

        closeDrawRequest();

        finish(
            "draw",
            null
        );
    }


    function rejectLocalDraw() {

        localDrawOffer = false;

        closeDrawRequest();

        setMessage(
            "❌ Đã từ chối yêu cầu hòa."
        );
    }


    /* =========================================================
       DRAW — ONLINE
    ========================================================= */

    async function requestOnlineDraw() {

        if (
            !roomRef ||
            !onlineJoined ||
            !onlineColor ||
            gameFinished
        ) {

            return;
        }


        if (
            onlineDrawWriting
        ) {

            return;
        }


        try {

            onlineDrawWriting =
                true;


            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        current => {

                            if (!current) {
                                return;
                            }

                            if (
                                current.status !==
                                "playing"
                            ) {

                                return;
                            }

                            if (
                                current.drawOffer
                            ) {

                                return;
                            }

                            return {

                                ...current,

                                drawOffer: {

                                    from:
                                        onlineColor,

                                    uid:
                                        currentUser
                                            ?.uid ||
                                        null,

                                    timestamp:
                                        firebase
                                            .database
                                            .ServerValue
                                            .TIMESTAMP

                                },

                                updatedAt:
                                    firebase
                                        .database
                                        .ServerValue
                                        .TIMESTAMP
                            };
                        },
                        {
                            applyLocally:
                                false
                        }
                    );


            if (
                result.committed
            ) {

                setMessage(
                    "🤝 Đã gửi yêu cầu hòa. Đang chờ đối thủ."
                );

            } else {

                setMessage(
                    "Đã có một yêu cầu hòa đang chờ."
                );
            }

        } catch (error) {

            console.error(
                "Draw request error:",
                error
            );

            setMessage(
                "Không thể gửi yêu cầu hòa."
            );

        } finally {

            onlineDrawWriting =
                false;
        }
    }


    async function respondOnlineDraw(
        accept
    ) {

        if (
            !roomRef ||
            !onlineJoined ||
            gameFinished
        ) {

            return;
        }


        try {

            if (accept) {

                const result =
                    await roomRef
                        .child("game")
                        .transaction(
                            current => {

                                if (!current) {
                                    return;
                                }

                                if (
                                    current.status !==
                                    "playing"
                                ) {

                                    return;
                                }

                                if (
                                    !current.drawOffer
                                ) {

                                    return;
                                }

                                if (
                                    current.drawOffer
                                        .from ===
                                    onlineColor
                                ) {

                                    return;
                                }

                                return {

                                    ...current,

                                    status:
                                        "finished",

                                    result:
                                        "draw",

                                    winner:
                                        null,

                                    drawOffer:
                                        null,

                                    updatedAt:
                                        firebase
                                            .database
                                            .ServerValue
                                            .TIMESTAMP
                                };
                            },
                            {
                                applyLocally:
                                    false
                            }
                        );


                if (
                    !result.committed
                ) {

                    setMessage(
                        "Yêu cầu hòa đã hết hiệu lực."
                    );
                }

            } else {

                const result =
                    await roomRef
                        .child("game")
                        .transaction(
                            current => {

                                if (!current) {
                                    return;
                                }

                                if (
                                    !current.drawOffer
                                ) {

                                    return;
                                }

                                if (
                                    current.drawOffer
                                        .from ===
                                    onlineColor
                                ) {

                                    return;
                                }

                                return {

                                    ...current,

                                    drawOffer:
                                        null,

                                    updatedAt:
                                        firebase
                                            .database
                                            .ServerValue
                                            .TIMESTAMP
                                };
                            },
                            {
                                applyLocally:
                                    false
                            }
                        );


                if (
                    result.committed
                ) {

                    setMessage(
                        "❌ Đã từ chối yêu cầu hòa."
                    );
                }
            }

        } catch (error) {

            console.error(
                "Draw response error:",
                error
            );

            setMessage(
                "Không thể xử lý yêu cầu hòa."
            );
        }
    }


    function processOnlineDrawOffer(
        remoteGame
    ) {

        const offer =
            remoteGame?.drawOffer;

        if (!offer) {

            onlineDrawOffer = null;

            $("drawOverlay")
                .classList
                .add("hidden");

            return;
        }


        onlineDrawOffer =
            offer;


        const offerKey =
            String(
                offer.from
            ) +
            "-" +
            String(
                offer.timestamp || ""
            );


        if (
            offer.from ===
            onlineColor
        ) {

            $("drawOverlay")
                .classList
                .add("hidden");

            if (
                lastDrawOfferKey !==
                offerKey
            ) {

                setMessage(
                    "🤝 Đã gửi yêu cầu hòa. Đang chờ đối thủ."
                );

                lastDrawOfferKey =
                    offerKey;
            }

            return;
        }


        if (
            lastDrawOfferKey ===
            offerKey
        ) {

            return;
        }


        lastDrawOfferKey =
            offerKey;


        showDrawRequest(
            "Đối thủ xin hòa"
        );
    }


    /* =========================================================
       CREATE ROOM
    ========================================================= */

    async function createRoom() {

        const createBtn =
            $("createRoomBtn");

        try {

            await ensureUser();

            const database =
                getDatabase();

            if (!database) {

                throw new Error(
                    "Database chưa sẵn sàng."
                );
            }


            if (createBtn) {

                createBtn.disabled =
                    true;
            }


            setRoomMessage(
                "Đang tạo phòng..."
            );


            let reference = null;

            let code = null;


            for (
                let attempt = 0;
                attempt < 10;
                attempt++
            ) {

                const candidate =
                    generateRoomCode();

                const candidateRef =
                    database.ref(
                        "chessRooms/" +
                        candidate
                    );

                const snapshot =
                    await candidateRef.once(
                        "value"
                    );


                if (
                    !snapshot.exists()
                ) {

                    code =
                        candidate;

                    reference =
                        candidateRef;

                    break;
                }
            }


            if (!reference) {

                throw new Error(
                    "Không tạo được mã phòng."
                );
            }


            roomId =
                code;

            roomRef =
                reference;

            onlineColor =
                "w";

            onlineJoined =
                true;

            lastOnlineSoundKey =
                null;

            onlineResultSoundPlayed =
                false;

            lastDrawOfferKey =
                null;


            const first =
                initialState();


            clocks = {

                w:
                    timeLimit,

                b:
                    timeLimit

            };


            await roomRef.set({

                gameName:
                    "chess",

                status:
                    "waiting",

                hostUid:
                    currentUser.uid,

                whiteUid:
                    currentUser.uid,

                blackUid:
                    null,

                createdAt:
                    firebase
                        .database
                        .ServerValue
                        .TIMESTAMP,

                game: {

                    status:
                        "waiting",

                    board:
                        first.board,

                    turn:
                        "w",

                    castling:
                        first.castling,

                    enPassant:
                        null,

                    history:
                        [],

                    lastMove:
                        null,

                    clocks: {

                        w:
                            timeLimit,

                        b:
                            timeLimit

                    },

                    result:
                        null,

                    winner:
                        null,

                    drawOffer:
                        null
                }
            });


            setupEl.classList.remove(
                "hidden"
            );

            gameEl.classList.add(
                "hidden"
            );


            $("onlinePanel")
                .classList
                .remove("hidden");


            $("createdRoom")
                .classList
                .remove("hidden");


            $("roomCode")
                .textContent =
                roomId;


            $("waitingText")
                .textContent =
                "⏳ Đang chờ đối thủ...";


            $("startBtn")
                .classList
                .add("hidden");


            setRoomMessage(
                "✅ Đã tạo phòng! Gửi mã này cho đối thủ."
            );


            listenToRoom();

        } catch (error) {

            console.error(
                "Create room error:",
                error
            );

            setRoomMessage(
                "❌ Không thể tạo phòng: " +
                error.message
            );

        } finally {

            if (createBtn) {

                createBtn.disabled =
                    false;
            }
        }
    }


    /* =========================================================
       JOIN ROOM
    ========================================================= */

    async function joinRoom() {

        try {

            await ensureUser();

            const database =
                getDatabase();

            if (!database) {

                throw new Error(
                    "Database chưa sẵn sàng."
                );
            }


            const input =
                $("roomInput")
                    .value
                    .trim()
                    .toUpperCase();


            if (
                input.length !== 6
            ) {

                setRoomMessage(
                    "Mã phòng phải gồm 6 ký tự."
                );

                return;
            }


            setRoomMessage(
                "Đang tham gia phòng..."
            );


            const reference =
                database.ref(
                    "chessRooms/" +
                    input
                );


            const result =
                await reference.transaction(
                    room => {

                        if (!room) {
                            return;
                        }

                        if (
                            room.status !==
                            "waiting"
                        ) {

                            return;
                        }

                        if (
                            room.whiteUid ===
                            currentUser.uid
                        ) {

                            return;
                        }

                        if (
                            room.blackUid &&
                            room.blackUid !==
                                currentUser.uid
                        ) {

                            return;
                        }


                        room.blackUid =
                            currentUser.uid;

                        room.status =
                            "playing";


                        if (room.game) {

                            room.game.status =
                                "playing";
                        }


                        return room;
                    },
                    {
                        applyLocally:
                            false
                    }
                );


            if (
                !result.committed ||
                !result.snapshot.exists()
            ) {

                setRoomMessage(
                    "❌ Phòng không tồn tại, đã đủ người hoặc đã bắt đầu."
                );

                return;
            }


            roomId =
                input;

            roomRef =
                reference;

            onlineColor =
                "b";

            onlineJoined =
                true;

            lastOnlineSoundKey =
                null;

            onlineResultSoundPlayed =
                false;

            lastDrawOfferKey =
                null;


            $("roomInput")
                .value =
                "";


            $("createdRoom")
                .classList
                .add("hidden");


            setRoomMessage(
                "✅ Đã tham gia phòng."
            );


            listenToRoom();

        } catch (error) {

            console.error(
                "Join room error:",
                error
            );

            setRoomMessage(
                "❌ Không thể tham gia phòng: " +
                error.message
            );
        }
    }


    /* =========================================================
       ROOM LISTENER
    ========================================================= */

    function listenToRoom() {

        if (!roomRef) {
            return;
        }


        if (roomListener) {

            roomListener();

            roomListener =
                null;
        }


        const currentRef =
            roomRef;


        const handler =
            snapshot => {

                const room =
                    snapshot.val();


                if (!room) {

                    setRoomMessage(
                        "Phòng không còn tồn tại."
                    );

                    return;
                }


                updateRoomFromSnapshot(
                    room
                );
            };


        currentRef.on(
            "value",
            handler
        );


        roomListener =
            () => {

                currentRef.off(
                    "value",
                    handler
                );
            };
    }


    /* =========================================================
       ROOM STATE
    ========================================================= */

    function updateRoomFromSnapshot(
        room
    ) {

        if (!currentUser) {
            return;
        }


        if (
            room.whiteUid ===
            currentUser.uid
        ) {

            onlineColor =
                "w";

        } else if (
            room.blackUid ===
            currentUser.uid
        ) {

            onlineColor =
                "b";
        }


        if (
            room.status ===
            "waiting"
        ) {

            setupEl.classList.remove(
                "hidden"
            );

            gameEl.classList.add(
                "hidden"
            );


            $("createdRoom")
                .classList
                .remove("hidden");


            $("roomCode")
                .textContent =
                roomId;


            $("waitingText")
                .textContent =
                "⏳ Đang chờ đối thủ...";


            $("startBtn")
                .classList
                .add("hidden");


            return;
        }


        if (
            room.status ===
            "playing"
        ) {

            startOnlineGame(
                room
            );

            return;
        }


        if (
            room.status ===
            "finished"
        ) {

            startOnlineGame(
                room
            );

            if (room.game) {

                applyOnlineState(
                    room.game,
                    false
                );
            }

            return;
        }


        if (
            room.status ===
            "closed"
        ) {

            stopClock();

            gameFinished =
                true;

            setRoomMessage(
                "Phòng đã được đóng."
            );

            setMessage(
                "Đối thủ đã rời phòng."
            );

            return;
        }
    }


    /* =========================================================
       START ONLINE GAME
    ========================================================= */

    function startOnlineGame(
        room
    ) {

        if (!room.game) {
            return;
        }


        setupEl.classList.add(
            "hidden"
        );

        gameEl.classList.remove(
            "hidden"
        );


        $("onlineGameBar")
            .classList
            .remove("hidden");


        $("gameRoomCode")
            .textContent =
            roomId;


        $("createdRoom")
            .classList
            .add("hidden");


        onlineJoined =
            true;


        updateSideModeText();


        applyOnlineState(
            room.game,
            true
        );
    }


    /* =========================================================
       ONLINE SOUND
    ========================================================= */

    function playOnlineMoveSound(
        remoteGame
    ) {

        if (
            !remoteGame ||
            !remoteGame.lastMove
        ) {

            return;
        }


        const move =
            remoteGame.lastMove;


        const historyLength =
            Array.isArray(
                remoteGame.history
            )
                ? remoteGame.history.length
                : 0;


        const soundKey =
            String(move.from) +
            "-" +
            String(move.to) +
            "-" +
            String(historyLength);


        if (
            soundKey ===
            lastOnlineSoundKey
        ) {

            return;
        }


        if (
            !gameStarted
        ) {

            lastOnlineSoundKey =
                soundKey;

            return;
        }


        const oldBoard =
            state &&
            Array.isArray(
                state.board
            )
                ? state.board
                : null;


        const capturedPiece =
            oldBoard
                ? oldBoard[
                    move.to
                ]
                : null;


        if (capturedPiece) {

            soundCapture();

        } else {

            soundMove();
        }


        lastOnlineSoundKey =
            soundKey;
    }


    /* =========================================================
       APPLY ONLINE STATE
    ========================================================= */

    function applyOnlineState(
        remoteGame,
        allowStart
    ) {

        if (!remoteGame) {
            return;
        }


        playOnlineMoveSound(
            remoteGame
        );


        state = {

            board:
                remoteGame.board,

            turn:
                remoteGame.turn,

            castling:
                remoteGame.castling,

            enPassant:
                remoteGame.enPassant

        };


        history =
            Array.isArray(
                remoteGame.history
            )
                ? remoteGame.history
                : [];


        lastMove =
            remoteGame.lastMove ||
            null;


        clocks =
            remoteGame.clocks || {

                w:
                    timeLimit,

                b:
                    timeLimit

            };


        processOnlineDrawOffer(
            remoteGame
        );


        if (
            !gameStarted &&
            allowStart
        ) {

            gameStarted =
                true;

            gameFinished =
                false;

            selected =
                null;

            aiThinking =
                false;


            updatePlayerNames();

            trackStart();
        }


        if (
            remoteGame.status ===
            "finished"
        ) {

            gameFinished =
                true;

            stopClock();


            showOnlineResult(
                remoteGame.result,
                remoteGame.winner
            );

            return;
        }


        updatePlayerNames();

        updateOnlineMessage();

        render();


        if (
            remoteGame.lastMove &&
            remoteGame.status ===
                "playing" &&
            Chess.inCheck(
                remoteGame.board,
                remoteGame.turn
            )
        ) {

            const move =
                remoteGame.lastMove;


            const historyLength =
                Array.isArray(
                    remoteGame.history
                )
                    ? remoteGame.history.length
                    : 0;


            const checkKey =
                "check-" +
                move.from +
                "-" +
                move.to +
                "-" +
                historyLength;


            if (
                applyOnlineState.lastCheckKey !==
                checkKey
            ) {

                soundCheck();

                applyOnlineState.lastCheckKey =
                    checkKey;
            }
        }
    }


    function updateOnlineMessage() {

        if (!state) {
            return;
        }


        if (
            state.turn ===
            onlineColor
        ) {

            setMessage(
                "🟢 Đến lượt bạn."
            );

        } else {

            setMessage(
                "🟡 Đang chờ đối thủ đi..."
            );
        }
    }


    /* =========================================================
       ONLINE RESULT
    ========================================================= */

    function showOnlineResult(
        reason,
        winner
    ) {

        let title = "";

        let text = "";

        let icon = "🤝";

        let result = "draw";


        if (
            reason ===
            "checkmate"
        ) {

            title =
                "Chiếu hết!";

            icon =
                winner === "w"
                    ? "♔"
                    : "♚";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            result =
                winner ===
                onlineColor
                    ? "win"
                    : "loss";

        } else if (
            reason ===
            "time"
        ) {

            title =
                "Hết giờ!";

            icon =
                "⏱️";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng do đối thủ hết thời gian.";

            result =
                winner ===
                onlineColor
                    ? "win"
                    : "loss";

        } else if (
            reason ===
            "resign"
        ) {

            title =
                "Đã xin thua";

            icon =
                "🏳️";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            result =
                winner ===
                onlineColor
                    ? "win"
                    : "loss";

        } else {

            title =
                "Hòa cờ";

            icon =
                "🤝";

            text =
                "Hai người chơi đã đồng ý hòa.";

            result =
                "draw";
        }


        if (
            !onlineResultSoundPlayed
        ) {

            onlineResultSoundPlayed =
                true;


            if (
                reason ===
                "checkmate"
            ) {

                soundCheckmate();
            }


            if (
                result ===
                "win"
            ) {

                soundWin();

            } else if (
                result ===
                "loss"
            ) {

                soundLose();
            }
        }


        $("resultIcon")
            .textContent =
            icon;

        $("resultTitle")
            .textContent =
            title;

        $("resultText")
            .textContent =
            text;


        $("drawOverlay")
            .classList
            .add("hidden");


        $("resultOverlay")
            .classList
            .remove("hidden");


        trackEnd(
            result,
            winner || null
        );


        render();
    }


    /* =========================================================
       ONLINE FINISH
    ========================================================= */

    async function publishOnlineFinish(
        reason,
        winner
    ) {

        if (!roomRef) {
            return;
        }


        try {

            await roomRef
                .child("game")
                .transaction(
                    current => {

                        if (!current) {
                            return;
                        }

                        if (
                            current.status ===
                            "finished"
                        ) {

                            return;
                        }


                        return {

                            ...current,

                            status:
                                "finished",

                            result:
                                reason,

                            winner:
                                winner,

                            drawOffer:
                                null,

                            updatedAt:
                                firebase
                                    .database
                                    .ServerValue
                                    .TIMESTAMP

                        };
                    },
                    {
                        applyLocally:
                            false
                    }
                );

        } catch (error) {

            console.warn(
                "Online finish error:",
                error
            );
        }
    }


    /* =========================================================
       LEAVE ROOM
    ========================================================= */

    async function leaveRoom(
        deleteRoom
    ) {

        stopClock();


        if (roomListener) {

            roomListener();

            roomListener =
                null;
        }


        const ref =
            roomRef;

        const id =
            roomId;


        roomRef = null;

        roomId = null;


        if (
            ref &&
            currentUser
        ) {

            try {

                const snapshot =
                    await ref.once(
                        "value"
                    );

                const room =
                    snapshot.val();


                if (room) {

                    if (
                        room.hostUid ===
                        currentUser.uid
                    ) {

                        if (
                            deleteRoom
                        ) {

                            await ref.remove();

                        } else {

                            await ref.update({

                                status:
                                    "closed",

                                updatedAt:
                                    firebase
                                        .database
                                        .ServerValue
                                        .TIMESTAMP

                            });
                        }

                    } else {

                        await ref.update({

                            blackUid:
                                null,

                            status:
                                "waiting",

                            game: {

                                ...(room.game ||
                                    {}),

                                status:
                                    "waiting",

                                result:
                                    null,

                                winner:
                                    null,

                                history:
                                    [],

                                lastMove:
                                    null,

                                turn:
                                    "w",

                                drawOffer:
                                    null
                            },

                            updatedAt:
                                firebase
                                    .database
                                    .ServerValue
                                    .TIMESTAMP
                        });
                    }
                }

            } catch (error) {

                console.warn(
                    "Leave room error:",
                    error
                );
            }
        }


        onlineColor =
            null;

        onlineJoined =
            false;


        state =
            null;

        history =
            [];

        selected =
            null;

        lastMove =
            null;


        gameStarted =
            false;

        gameFinished =
            false;

        analyticsTracked =
            false;


        lastOnlineSoundKey =
            null;

        onlineResultSoundPlayed =
            false;


        onlineDrawOffer =
            null;

        lastDrawOfferKey =
            null;


        $("resultOverlay")
            .classList
            .add("hidden");


        $("drawOverlay")
            .classList
            .add("hidden");


        setupEl.classList.remove(
            "hidden"
        );

        gameEl.classList.add(
            "hidden"
        );


        $("onlineGameBar")
            .classList
            .add("hidden");


        $("createdRoom")
            .classList
            .add("hidden");


        $("startBtn")
            .classList
            .toggle(
                "hidden",
                mode === "online"
            );


        setRoomMessage(
            "Đã rời phòng."
        );
    }


    /* =========================================================
       AI
    ========================================================= */

    function requestAI() {

        aiThinking = true;

        setMessage(
            "🤖 Máy đang suy nghĩ..."
        );

        render();


        const delay =
            difficulty === "easy"
                ? 220
                : difficulty === "medium"
                    ? 420
                    : 650;


        setTimeout(
            () => {

                if (
                    gameFinished ||
                    mode !== "ai"
                ) {

                    aiThinking =
                        false;

                    return;
                }


                const move =
                    chooseAI();


                aiThinking =
                    false;


                if (move) {

                    afterMove(
                        move
                    );
                }

            },
            delay
        );
    }


    function chooseAI() {

        const legal =
            Chess.legalMoves(
                state
            );


        if (!legal.length) {
            return null;
        }


        if (
            difficulty ===
            "easy"
        ) {

            return legal[
                Math.floor(
                    Math.random() *
                    legal.length
                )
            ];
        }


        const depth =
            difficulty ===
            "medium"
                ? 2
                : 3;


        let best =
            -Infinity;


        let bestMove =
            legal[0];


        const shuffled =
            [...legal].sort(
                () =>
                    Math.random() -
                    0.5
            );


        for (
            const move
            of shuffled
        ) {

            const next =
                Chess.applyMove(
                    state,
                    move
                );


            const score =
                -negamax(
                    next,
                    depth - 1,
                    -Infinity,
                    Infinity
                );


            if (
                score > best
            ) {

                best =
                    score;

                bestMove =
                    move;
            }
        }


        return bestMove;
    }


    function negamax(
        currentState,
        depth,
        alpha,
        beta
    ) {

        const legal =
            Chess.legalMoves(
                currentState
            );


        if (!legal.length) {

            return Chess.inCheck(
                currentState.board,
                currentState.turn
            )
                ? -100000 - depth
                : 0;
        }


        if (
            depth === 0
        ) {

            return evaluate(
                currentState
            );
        }


        let best =
            -Infinity;


        for (
            const move
            of legal
        ) {

            const next =
                Chess.applyMove(
                    currentState,
                    move
                );


            const score =
                -negamax(
                    next,
                    depth - 1,
                    -beta,
                    -alpha
                );


            if (
                score > best
            ) {

                best =
                    score;
            }


            if (
                score > alpha
            ) {

                alpha =
                    score;
            }


            if (
                alpha >= beta
            ) {

                break;
            }
        }


        return best;
    }


    function evaluate(
        currentState
    ) {

        let score = 0;


        for (
            let i = 0;
            i < 64;
            i++
        ) {

            const piece =
                currentState.board[i];


            if (!piece) {
                continue;
            }


            let value =
                VALUES[piece.t];


            const center =
                3.5 -
                Math.abs(
                    col(i) - 3.5
                ) +
                3.5 -
                Math.abs(
                    row(i) - 3.5
                );


            if (
                piece.t === "p"
            ) {

                value +=
                    center * 5;
            }


            if (
                piece.t === "n" ||
                piece.t === "b"
            ) {

                value +=
                    center * 7;
            }


            score +=
                piece.c === "b"
                    ? value
                    : -value;
        }


        if (
            Chess.inCheck(
                currentState.board,
                "w"
            )
        ) {

            score += 35;
        }


        if (
            Chess.inCheck(
                currentState.board,
                "b"
            )
        ) {

            score -= 35;
        }


        return currentState.turn ===
            "b"
            ? score
            : -score;
    }


    /* =========================================================
       ONLINE REPLAY
    ========================================================= */

    async function onlineReplay() {

        if (
            !roomRef ||
            !onlineJoined
        ) {

            return;
        }


        if (
            onlineColor !== "w"
        ) {

            setMessage(
                "Chỉ chủ phòng có thể bắt đầu ván mới."
            );

            return;
        }


        try {

            const start =
                initialState();


            lastOnlineSoundKey =
                null;

            onlineResultSoundPlayed =
                false;

            lastDrawOfferKey =
                null;


            await roomRef
                .child("game")
                .set({

                    status:
                        "playing",

                    board:
                        start.board,

                    turn:
                        "w",

                    castling:
                        start.castling,

                    enPassant:
                        null,

                    history:
                        [],

                    lastMove:
                        null,

                    clocks: {

                        w:
                            timeLimit,

                        b:
                            timeLimit

                    },

                    result:
                        null,

                    winner:
                        null,

                    drawOffer:
                        null,

                    updatedAt:
                        firebase
                            .database
                            .ServerValue
                            .TIMESTAMP

                });


            $("resultOverlay")
                .classList
                .add("hidden");


            $("drawOverlay")
                .classList
                .add("hidden");


            gameFinished =
                false;

            gameStarted =
                true;


            clocks = {

                w:
                    timeLimit,

                b:
                    timeLimit

            };


            setMessage(
                "🟢 Ván mới bắt đầu."
            );

        } catch (error) {

            console.warn(
                "Online replay error:",
                error
            );
        }
    }


    /* =========================================================
       BUTTONS
    ========================================================= */

    $("startBtn")
        .addEventListener(
            "click",
            begin
        );


    document
        .querySelectorAll(
            ".mode-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".mode-btn"
                            )
                            .forEach(
                                item => {

                                    item.classList
                                        .remove(
                                            "active"
                                        );
                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        mode =
                            button.dataset
                                .mode;


                        $("difficultyWrap")
                            .classList
                            .toggle(
                                "hidden",
                                mode !==
                                    "ai"
                            );


                        $("onlinePanel")
                            .classList
                            .toggle(
                                "hidden",
                                mode !==
                                    "online"
                            );


                        $("startBtn")
                            .classList
                            .toggle(
                                "hidden",
                                mode ===
                                    "online"
                            );


                        updateSideModeText();


                        if (
                            mode ===
                            "online"
                        ) {

                            setRoomMessage(
                                "Tạo phòng mới hoặc nhập mã phòng."
                            );
                        }
                    }
                );
            }
        );


    $("difficulty")
        .addEventListener(
            "change",
            event => {

                difficulty =
                    event.target.value;
            }
        );


    $("timeControl")
        .addEventListener(
            "change",
            event => {

                timeLimit =
                    Number(
                        event.target.value
                    );
            }
        );


    $("createRoomBtn")
        .addEventListener(
            "click",
            createRoom
        );


    $("joinRoomBtn")
        .addEventListener(
            "click",
            joinRoom
        );


    $("roomInput")
        .addEventListener(
            "input",
            event => {

                event.target.value =
                    event.target.value
                        .replace(
                            /[^a-zA-Z0-9]/g,
                            ""
                        )
                        .toUpperCase()
                        .slice(
                            0,
                            6
                        );
            }
        );


    $("copyRoomBtn")
        .addEventListener(
            "click",
            async () => {

                if (!roomId) {
                    return;
                }

                try {

                    await navigator
                        .clipboard
                        .writeText(
                            roomId
                        );

                    setRoomMessage(
                        "✅ Đã copy mã phòng."
                    );

                } catch {

                    setRoomMessage(
                        "Mã phòng: " +
                        roomId
                    );
                }
            }
        );


    $("leaveWaitingBtn")
        .addEventListener(
            "click",
            () =>
                leaveRoom(true)
        );


    $("copyGameRoomBtn")
        .addEventListener(
            "click",
            async () => {

                if (!roomId) {
                    return;
                }

                try {

                    await navigator
                        .clipboard
                        .writeText(
                            roomId
                        );

                    setMessage(
                        "✅ Đã copy mã phòng."
                    );

                } catch {

                    setMessage(
                        "Mã phòng: " +
                        roomId
                    );
                }
            }
        );


    $("leaveOnlineBtn")
        .addEventListener(
            "click",
            () =>
                leaveRoom(false)
        );


    /* =========================================================
       DRAW BUTTON
    ========================================================= */

    $("drawBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    !gameStarted ||
                    gameFinished
                ) {

                    return;
                }


                if (
                    mode === "ai"
                ) {

                    setMessage(
                        "Không thể xin hòa khi đấu với máy."
                    );

                    return;
                }


                if (
                    mode === "online"
                ) {

                    if (
                        state.turn !==
                        onlineColor
                    ) {

                        setMessage(
                            "Chỉ có thể xin hòa khi đến lượt bạn."
                        );

                        return;
                    }


                    if (
                        onlineDrawOffer
                    ) {

                        setMessage(
                            "Đang chờ đối thủ trả lời yêu cầu hòa."
                        );

                        return;
                    }


                    await requestOnlineDraw();

                    return;
                }


                requestLocalDraw();
            }
        );


    /* =========================================================
       DRAW RESPONSE
    ========================================================= */

    $("acceptDrawBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    mode === "online"
                ) {

                    await respondOnlineDraw(
                        true
                    );

                } else {

                    acceptLocalDraw();
                }
            }
        );


    $("rejectDrawBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    mode === "online"
                ) {

                    await respondOnlineDraw(
                        false
                    );

                } else {

                    rejectLocalDraw();
                }
            }
        );


    /* =========================================================
       RESIGN
    ========================================================= */

    $("resignBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    !gameStarted ||
                    gameFinished
                ) {

                    return;
                }


                if (
                    mode === "online"
                ) {

                    if (
                        state.turn !==
                        onlineColor
                    ) {

                        setMessage(
                            "Chỉ có thể xin thua khi đến lượt bạn."
                        );

                        return;
                    }


                    await publishOnlineFinish(
                        "resign",
                        opposite(
                            onlineColor
                        )
                    );

                    return;
                }


                finish(
                    "resign",
                    opposite(
                        state.turn
                    )
                );
            }
        );


    /* =========================================================
       NAVIGATION
    ========================================================= */

    $("menuBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    mode ===
                        "online" &&
                    roomRef
                ) {

                    await leaveRoom(
                        false
                    );
                }

                location.href =
                    "../../index.html";
            }
        );


    $("backMenuBtn")
        .addEventListener(
            "click",
            async () => {

                if (
                    mode ===
                        "online" &&
                    roomRef
                ) {

                    await leaveRoom(
                        false
                    );
                }

                location.href =
                    "../../index.html";
            }
        );


    $("newGameTop")
        .addEventListener(
            "click",
            () => {

                if (
                    mode ===
                    "online"
                ) {

                    return;
                }

                begin();
            }
        );


    $("replayBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    mode ===
                    "online"
                ) {

                    onlineReplay();

                    return;
                }

                begin();
            }
        );


    /* =========================================================
       FLIP
    ========================================================= */

    $("flipBtn")
        .addEventListener(
            "click",
            () => {

                flipped =
                    !flipped;

                soundClick();

                render();
            }
        );


    /* =========================================================
       KEYBOARD
    ========================================================= */

    window.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                selected = null;

                if (state) {

                    render();
                }
            }
        }
    );


    /* =========================================================
       INIT
    ========================================================= */

    async function init() {

        try {

            if (
                window.GameHub &&
                window.GameHub.ready
            ) {

                await window.GameHub.ready;
            }


            currentUser =
                await ensureUser();


            updateSideModeText();


            console.log(
                "Chess ready:",
                currentUser.uid
            );

        } catch (error) {

            console.warn(
                "Chess Firebase init:",
                error
            );
        }
    }


    init();

})();
