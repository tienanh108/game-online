(function () {
    "use strict";

    /* =========================================================
       CHECK CHESS CORE
    ========================================================= */

    console.log("🔍 Chess main.js loading...");

    if (
        !window.ChessCore
    ) {
        console.error(
            "❌ ChessCore không tồn tại."
        );
        return;
    }

    const Chess =
        window.ChessCore;


    /* =========================================================
       DOM
    ========================================================= */

    const $ = id =>
        document.getElementById(id);


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


    /* =========================================================
       GAME STATE
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

    let aiThinking = false;


    /* =========================================================
       DRAW STATE
    ========================================================= */

    let localDrawPending = false;

    let onlineDrawPending = false;

    let lastDrawKey = null;

    let drawTransactionBusy = false;


    /* =========================================================
       ANALYTICS
    ========================================================= */

    let analyticsTracked = false;


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

    let onlineMoveBusy = false;

    let lastRemoteMoveKey = null;

    let lastCheckKey = null;

    let onlineResultShown = false;


    /* =========================================================
       HELPERS
    ========================================================= */

    function row(index) {
        return Math.floor(index / 8);
    }


    function col(index) {
        return index % 8;
    }


    function opposite(color) {
        return color === "w"
            ? "b"
            : "w";
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
            ).padStart(2, "0")
        );
    }


    function generateRoomCode() {

        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let result = "";

        for (
            let i = 0;
            i < 6;
            i++
        ) {
            result +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];
        }

        return result;
    }


    /* =========================================================
       SOUND
    ========================================================= */

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


    function soundClick() {
        playSound(
            "./chess_click.mp3",
            0.4
        );
    }


    function soundMove() {
        playSound(
            "./chess_move.mp3",
            0.55
        );
    }


    function soundCapture() {
        playSound(
            "./chess_capture.mp3",
            0.6
        );
    }


    function soundCheck() {
        playSound(
            "./chess_check.mp3",
            0.6
        );
    }


    function soundCheckmate() {
        playSound(
            "./chess_checkmate.mp3",
            0.7
        );
    }


    function soundWin() {
        playSound(
            "./chess_win.mp3",
            0.7
        );
    }


    function soundLose() {
        playSound(
            "./chess_lose.mp3",
            0.7
        );
    }


    /* =========================================================
       INITIAL STATE
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


    /* =========================================================
       MESSAGES
    ========================================================= */

    function setMessage(text) {

        const element =
            $("message");

        if (element) {
            element.textContent =
                text;
        }
    }


    function setRoomMessage(text) {

        const element =
            $("roomMessage");

        if (element) {
            element.textContent =
                text;
        }
    }


    /* =========================================================
       GAMEHUB
    ========================================================= */

    async function waitGameHub() {

        if (
            window.GameHub &&
            window.GameHub.ready
        ) {
            try {
                await window.GameHub.ready;
            } catch (error) {
                console.warn(
                    "GameHub ready error:",
                    error
                );
            }
        }
    }


    async function ensureFirebaseUser() {

        await waitGameHub();

        if (
            window.GameHub &&
            typeof window.GameHub.getAuth ===
                "function"
        ) {

            auth =
                window.GameHub.getAuth();
        }


        if (
            window.GameHub &&
            typeof window.GameHub.getDatabase ===
                "function"
        ) {

            db =
                window.GameHub.getDatabase();
        }


        if (
            !auth &&
            window.firebase
        ) {

            const app =
                firebase.apps.find(
                    item =>
                        item.name ===
                        "GameHub"
                );

            if (app) {
                auth =
                    app.auth();

                db =
                    app.database();
            }
        }


        if (
            !auth
        ) {

            throw new Error(
                "Firebase Auth chưa sẵn sàng."
            );
        }


        if (
            auth.currentUser
        ) {

            currentUser =
                auth.currentUser;

            return currentUser;
        }


        const credential =
            await auth.signInAnonymously();

        currentUser =
            credential.user;

        return currentUser;
    }


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
                mode:
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
                "Chess analytics start:",
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
                    mode:
                        mode,

                    difficulty:
                        mode === "ai"
                            ? difficulty
                            : null,

                    winner:
                        winner || null,

                    timeControl:
                        timeLimit
                }
            );

        } catch (error) {

            console.warn(
                "Chess analytics end:",
                error
            );
        }
    }


    /* =========================================================
       CLOCK
    ========================================================= */

    function stopClock() {

        if (
            clockTimer
        ) {

            clearInterval(
                clockTimer
            );

            clockTimer =
                null;
        }
    }


    function startClock() {

        stopClock();


        if (
            timeLimit === 0
        ) {

            updateClocks();

            return;
        }


        /*
         * Online clock:
         * Firebase state là nguồn chính.
         * Không tự giảm ở client để tránh
         * hai máy lệch thời gian.
         */

        if (
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


                    const color =
                        state.turn;


                    clocks[color] -= 0.1;


                    if (
                        clocks[color] <= 0
                    ) {

                        clocks[color] =
                            0;


                        finishGame(
                            "time",
                            opposite(color)
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
       RENDER BOARD
    ========================================================= */

    function render() {

        if (
            !boardEl() ||
            !state
        ) {
            return;
        }


        const board =
            boardEl();

        board.innerHTML =
            "";


        let legalTargets = [];


        if (
            selected !== null
        ) {

            legalTargets =
                Chess
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .map(
                        move =>
                            move.to
                    );
        }


        const checkedKing =
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
                index === checkedKing
            ) {

                square.classList.add(
                    "check"
                );
            }


            const piece =
                state.board[index];


            if (piece) {

                const pieceElement =
                    document.createElement(
                        "span"
                    );


                pieceElement.className =
                    "piece " +
                    (
                        piece.c === "w"
                            ? "white-piece"
                            : "black-piece"
                    );


                pieceElement.textContent =
                    Chess.PIECES[
                        piece.c
                    ][
                        piece.t
                    ];


                pieceElement.style.color =
                    piece.c === "w"
                        ? "#fff"
                        : "#111";


                square.appendChild(
                    pieceElement
                );
            }


            /*
             * File coordinates
             */

            const bottomVisual =
                visual >= 56;


            if (
                bottomVisual
            ) {

                const file =
                    document.createElement(
                        "span"
                    );

                file.className =
                    "coord file";

                file.textContent =
                    FILES[
                        col(index)
                    ];

                square.appendChild(
                    file
                );
            }


            /*
             * Rank coordinates
             */

            if (
                col(visual) === 0
            ) {

                const rank =
                    document.createElement(
                        "span"
                    );

                rank.className =
                    "coord rank";

                rank.textContent =
                    8 - row(index);

                square.appendChild(
                    rank
                );
            }


            /*
             * Legal move indicator
             */

            if (
                legalTargets.includes(
                    index
                )
            ) {

                const hasPiece =
                    !!state.board[index];


                if (
                    hasPiece
                ) {

                    square.style.boxShadow =
                        "inset 0 0 0 4px rgba(239,68,68,.75)";

                } else {

                    square.style.boxShadow =
                        "inset 0 0 0 7px rgba(250,204,21,.45)";
                }
            }


            square.addEventListener(
                "click",
                () => {

                    handleSquare(
                        index
                    );
                }
            );


            board.appendChild(
                square
            );
        }


        updateClocks();

        renderMoves();
    }


    function boardEl() {
        return $("board");
    }


    /* =========================================================
       MOVE HISTORY
    ========================================================= */

    function renderMoves() {

        const element =
            $("moves");

        if (!element) {
            return;
        }


        element.innerHTML =
            "";


        for (
            let i = 0;
            i < history.length;
            i++
        ) {

            const rowElement =
                document.createElement(
                    "div"
                );


            rowElement.className =
                "move-row";


            const number =
                i % 2 === 0
                    ? Math.floor(i / 2) + "."
                    : "";


            rowElement.innerHTML = `
                <span class="move-no">
                    ${number}
                </span>

                <span>
                    ${history[i]}
                </span>
            `;


            element.appendChild(
                rowElement
            );
        }


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
       MOVE NOTATION
    ========================================================= */

    function moveText(
        currentState,
        move
    ) {

        const piece =
            currentState.board[
                move.from
            ];


        if (!piece) {
            return "";
        }


        if (
            move.castle
        ) {

            return move.castle === "K"
                ? "O-O"
                : "O-O-O";
        }


        const captured =
            currentState.board[
                move.to
            ] ||
            move.enPassant;


        let text =
            piece.t === "p"
                ? ""
                : piece.t.toUpperCase();


        if (
            piece.t === "p" &&
            captured
        ) {

            text +=
                FILES[
                    col(move.from)
                ] +
                "x";

        } else if (
            captured
        ) {

            text +=
                "x";
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
       GAME END CHECK
    ========================================================= */

    function checkGameEnd(
        currentState
    ) {

        const legal =
            Chess.legalMoves(
                currentState
            );


        if (
            legal.length > 0
        ) {

            return null;
        }


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


    /* =========================================================
       FINISH OFFLINE
    ========================================================= */

    function finishGame(
        reason,
        winner
    ) {

        if (
            gameFinished
        ) {
            return;
        }


        gameFinished =
            true;


        stopClock();


        aiThinking =
            false;


        $("drawOverlay")
            ?.classList
            .add("hidden");


        let title =
            "Kết thúc";

        let text =
            "";

        let icon =
            "♔";

        let analyticsResult =
            "draw";


        if (
            reason ===
            "checkmate"
        ) {

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


            if (
                mode === "ai"
            ) {

                analyticsResult =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                analyticsResult =
                    "win";
            }


            soundCheckmate();


        } else if (
            reason === "time"
        ) {

            title =
                "Hết giờ!";


            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng do đối thủ hết thời gian.";


            icon =
                "⏱️";


            if (
                mode === "ai"
            ) {

                analyticsResult =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                analyticsResult =
                    "win";
            }


        } else if (
            reason === "resign"
        ) {

            title =
                "Đã xin thua";


            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";


            icon =
                "🏳️";


            if (
                mode === "ai"
            ) {

                analyticsResult =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                analyticsResult =
                    "win";
            }


        } else {

            title =
                "Hòa cờ";


            text =
                reason === "stalemate"
                    ? "Bí nước — hòa cờ."
                    : "Hai người chơi đã đồng ý hòa.";


            icon =
                "🤝";


            analyticsResult =
                "draw";
        }


        if (
            analyticsResult ===
            "win"
        ) {

            soundWin();

        } else if (
            analyticsResult ===
            "loss"
        ) {

            soundLose();
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
            analyticsResult,
            winner
        );


        render();
    }


    /* =========================================================
       OFFLINE MOVE
    ========================================================= */

    function makeLocalMove(
        move
    ) {

        if (
            gameFinished
        ) {
            return;
        }


        const notation =
            moveText(
                state,
                move
            );


        const captured =
            state.board[
                move.to
            ];


        state =
            Chess.applyMove(
                state,
                move
            );


        history.push(
            notation
        );


        lastMove = {

            from:
                move.from,

            to:
                move.to

        };


        selected =
            null;


        if (
            captured ||
            move.enPassant
        ) {

            soundCapture();

        } else {

            soundMove();
        }


        render();


        const end =
            checkGameEnd(
                state
            );


        if (end) {

            finishGame(
                end.reason,
                end.winner
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

            aiMove();
        }
    }


    /* =========================================================
       HANDLE BOARD
    ========================================================= */

    function handleSquare(
        index
    ) {

        if (
            !gameStarted ||
            gameFinished
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

                makeLocalMove(
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

            selected =
                index;


            soundClick();


            setMessage(
                "Chọn ô đích."
            );


            render();

            return;
        }


        selected =
            null;


        render();
    }


    /* =========================================================
       START LOCAL GAME
    ========================================================= */

    function startLocalGame() {

        stopClock();


        state =
            initialState();


        history =
            [];


        selected =
            null;


        lastMove =
            null;


        clocks = {

            w:
                timeLimit,

            b:
                timeLimit

        };


        gameStarted =
            true;


        gameFinished =
            false;


        aiThinking =
            false;


        localDrawPending =
            false;


        onlineDrawPending =
            false;


        lastDrawKey =
            null;


        onlineResultShown =
            false;


        $("setup")
            .classList
            .add("hidden");


        $("game")
            .classList
            .remove("hidden");


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

        updateSideMode();


        trackStart();


        startClock();


        setMessage(
            mode === "ai"
                ? "Bạn cầm Trắng. Chọn quân cờ để đi."
                : "Trắng đi trước."
        );


        render();
    }


    /* =========================================================
       PLAYER NAMES
    ========================================================= */

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


    function updateSideMode() {

        const element =
            $("sideModeText");


        if (!element) {
            return;
        }


        if (
            mode === "ai"
        ) {

            element.textContent =
                "Đấu với máy";

        } else if (
            mode === "local"
        ) {

            element.textContent =
                "2 người";

        } else {

            element.textContent =
                "Chơi online";
        }
    }


    /* =========================================================
       DRAW — LOCAL
    ========================================================= */

    function requestLocalDraw() {

        if (
            !gameStarted ||
            gameFinished
        ) {
            return;
        }


        if (
            localDrawPending
        ) {

            setMessage(
                "Đang chờ người chơi kia trả lời."
            );

            return;
        }


        localDrawPending =
            true;


        const heading =
            $("drawOverlay")
                ?.querySelector(
                    "h2"
                );


        if (heading) {

            heading.textContent =
                "Đối thủ xin hòa";
        }


        $("drawOverlay")
            .classList
            .remove("hidden");
    }


    function acceptLocalDraw() {

        if (
            !localDrawPending
        ) {
            return;
        }


        localDrawPending =
            false;


        $("drawOverlay")
            .classList
            .add("hidden");


        finishGame(
            "draw",
            null
        );
    }


    function rejectLocalDraw() {

        localDrawPending =
            false;


        $("drawOverlay")
            .classList
            .add("hidden");


        setMessage(
            "Đã từ chối yêu cầu hòa."
        );
    }


    /* =========================================================
       DRAW — ONLINE
    ========================================================= */

    async function requestOnlineDraw() {

        if (
            !roomRef ||
            !onlineJoined ||
            !state ||
            gameFinished
        ) {
            return;
        }


        if (
            drawTransactionBusy
        ) {
            return;
        }


        if (
            onlineDrawPending
        ) {

            setMessage(
                "Đang chờ đối thủ trả lời yêu cầu hòa."
            );

            return;
        }


        drawTransactionBusy =
            true;


        try {

            /*
             * Firebase Compat:
             *
             * transaction(
             *   updateFunction,
             *   onComplete,
             *   applyLocally
             * )
             *
             * Không dùng:
             * { applyLocally:false }
             */


            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        game => {

                            if (!game) {
                                return;
                            }


                            if (
                                game.status !==
                                "playing"
                            ) {
                                return;
                            }


                            if (
                                game.drawOffer
                            ) {
                                return;
                            }


                            return {

                                ...game,

                                drawOffer: {

                                    uid:
                                        currentUser
                                            ?.uid ||
                                        null,

                                    from:
                                        onlineColor,

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
                        null,
                        false
                    );


            if (
                result.committed
            ) {

                onlineDrawPending =
                    true;


                setMessage(
                    "🤝 Đã gửi yêu cầu hòa. Đang chờ đối thủ."
                );

            } else {

                setMessage(
                    "Không thể gửi yêu cầu hòa."
                );
            }

        } catch (error) {

            console.error(
                "❌ Request draw:",
                error
            );


            setMessage(
                "Không thể gửi yêu cầu hòa."
            );

        } finally {

            drawTransactionBusy =
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


        if (
            drawTransactionBusy
        ) {
            return;
        }


        drawTransactionBusy =
            true;


        try {

            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        game => {

                            if (!game) {
                                return;
                            }


                            if (
                                game.status !==
                                "playing"
                            ) {
                                return;
                            }


                            if (
                                !game.drawOffer
                            ) {
                                return;
                            }


                            if (
                                game.drawOffer.from ===
                                onlineColor
                            ) {
                                return;
                            }


                            if (
                                accept
                            ) {

                                return {

                                    ...game,

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
                            }


                            return {

                                ...game,

                                drawOffer:
                                    null,

                                updatedAt:
                                    firebase
                                        .database
                                        .ServerValue
                                        .TIMESTAMP

                            };
                        },
                        null,
                        false
                    );


            if (
                result.committed
            ) {

                $("drawOverlay")
                    .classList
                    .add("hidden");


                if (
                    accept
                ) {

                    setMessage(
                        "🤝 Đã đồng ý hòa."
                    );

                } else {

                    setMessage(
                        "❌ Đã từ chối yêu cầu hòa."
                    );
                }

            } else {

                $("drawOverlay")
                    .classList
                    .add("hidden");


                setMessage(
                    "Yêu cầu hòa đã hết hiệu lực."
                );
            }

        } catch (error) {

            console.error(
                "❌ Respond draw:",
                error
            );


            setMessage(
                "Không thể xử lý yêu cầu hòa."
            );

        } finally {

            drawTransactionBusy =
                false;
        }
    }


    function processDrawOffer(
        remoteGame
    ) {

        const offer =
            remoteGame?.drawOffer;


        if (!offer) {

            onlineDrawPending =
                false;


            $("drawOverlay")
                .classList
                .add("hidden");


            return;
        }


        /*
         * Offer của chính mình
         */

        if (
            offer.from ===
            onlineColor
        ) {

            onlineDrawPending =
                true;


            $("drawOverlay")
                .classList
                .add("hidden");


            return;
        }


        /*
         * Offer từ đối thủ
         */

        onlineDrawPending =
            false;


        const key =
            String(
                offer.uid || ""
            ) +
            "-" +
            String(
                offer.timestamp || ""
            );


        if (
            key ===
            lastDrawKey
        ) {
            return;
        }


        lastDrawKey =
            key;


        const heading =
            $("drawOverlay")
                ?.querySelector(
                    "h2"
                );


        if (heading) {

            heading.textContent =
                "Đối thủ xin hòa";
        }


        $("drawOverlay")
            .classList
            .remove("hidden");
    }


    /* =========================================================
       ONLINE BOARD CLICK
    ========================================================= */

    function handleOnlineSquare(
        index
    ) {

        if (
            !onlineJoined ||
            !onlineColor ||
            !state ||
            gameFinished
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

                sendOnlineMove(
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

            selected =
                index;


            soundClick();


            setMessage(
                "Chọn ô đích."
            );


            render();

            return;
        }


        selected =
            null;


        render();
    }


    /* =========================================================
       ONLINE MOVE
    ========================================================= */

    async function sendOnlineMove(
        move
    ) {

        if (
            onlineMoveBusy ||
            !roomRef ||
            !onlineColor
        ) {
            return;
        }


        onlineMoveBusy =
            true;


        try {

            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        game => {

                            if (!game) {
                                return;
                            }


                            if (
                                game.status !==
                                "playing"
                            ) {
                                return;
                            }


                            if (
                                game.turn !==
                                onlineColor
                            ) {
                                return;
                            }


                            const currentState = {

                                board:
                                    game.board,

                                turn:
                                    game.turn,

                                castling:
                                    game.castling,

                                enPassant:
                                    game.enPassant

                            };


                            const legal =
                                Chess.legalMovesFrom(
                                    currentState,
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
                                moveText(
                                    currentState,
                                    valid
                                );


                            const next =
                                Chess.applyMove(
                                    currentState,
                                    valid
                                );


                            const nextHistory =
                                Array.isArray(
                                    game.history
                                )
                                    ? [
                                        ...game.history,
                                        notation
                                    ]
                                    : [
                                        notation
                                    ];


                            const end =
                                checkGameEnd(
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
                                    nextHistory,

                                lastMove: {

                                    from:
                                        valid.from,

                                    to:
                                        valid.to

                                },

                                clocks:
                                    game.clocks || {

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
                        null,
                        false
                    );


            if (
                result.committed
            ) {

                selected =
                    null;

            } else {

                setMessage(
                    "Nước đi không hợp lệ."
                );
            }

        } catch (error) {

            console.error(
                "❌ Online move:",
                error
            );


            setMessage(
                "Không thể gửi nước đi."
            );

        } finally {

            onlineMoveBusy =
                false;
        }
    }


    /* =========================================================
       CREATE ROOM
    ========================================================= */

    async function createRoom() {

        const button =
            $("createRoomBtn");


        try {

            await ensureFirebaseUser();


            if (!db) {

                throw new Error(
                    "Firebase Database chưa sẵn sàng."
                );
            }


            button.disabled =
                true;


            setRoomMessage(
                "Đang tạo phòng..."
            );


            let selectedCode =
                null;


            let selectedRef =
                null;


            for (
                let i = 0;
                i < 10;
                i++
            ) {

                const code =
                    generateRoomCode();


                const ref =
                    db.ref(
                        "chessRooms/" +
                        code
                    );


                const snapshot =
                    await ref.once(
                        "value"
                    );


                if (
                    !snapshot.exists()
                ) {

                    selectedCode =
                        code;

                    selectedRef =
                        ref;

                    break;
                }
            }


            if (
                !selectedRef
            ) {

                throw new Error(
                    "Không thể tạo mã phòng."
                );
            }


            roomId =
                selectedCode;


            roomRef =
                selectedRef;


            onlineColor =
                "w";


            onlineJoined =
                true;


            lastRemoteMoveKey =
                null;


            lastCheckKey =
                null;


            onlineResultShown =
                false;


            lastDrawKey =
                null;


            onlineDrawPending =
                false;


            const start =
                initialState();


            await roomRef.set({

                updatedAt:
    firebase.database.ServerValue.TIMESTAMP,

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
                        null
                }
            });


            $("roomCode")
                .textContent =
                roomId;


            $("waitingText")
                .textContent =
                "⏳ Đang chờ đối thủ...";


            $("createdRoom")
                .classList
                .remove("hidden");


            $("startBtn")
                .classList
                .add("hidden");


            setRoomMessage(
                "✅ Đã tạo phòng! Gửi mã cho đối thủ."
            );


            listenRoom();

        } catch (error) {

            console.error(
                "❌ Create room:",
                error
            );


            setRoomMessage(
                "❌ Không thể tạo phòng: " +
                error.message
            );

        } finally {

            button.disabled =
                false;
        }
    }


    /* =========================================================
       JOIN ROOM
    ========================================================= */

    async function joinRoom() {

    try {

        await ensureFirebaseUser();

        if (!db) {
            throw new Error(
                "Firebase Database chưa sẵn sàng."
            );
        }

        const input =
            $("roomInput")
                .value
                .trim()
                .toUpperCase();

        if (input.length !== 6) {

            setRoomMessage(
                "❌ Mã phòng phải có 6 ký tự."
            );

            return;
        }

        setRoomMessage(
            "⏳ Đang kiểm tra phòng..."
        );

        const ref =
            db.ref(
                "chessRooms/" + input
            );

        /*
         * Đọc phòng trước
         */

        const snapshot =
            await ref.once("value");

        const room =
            snapshot.val();

        /*
         * Không tồn tại
         */

        if (!room) {

            setRoomMessage(
                "❌ Không tìm thấy phòng " +
                input +
                "."
            );

            console.error(
                "Chess room không tồn tại:",
                input
            );

            return;
        }

        console.log(
            "✅ Tìm thấy phòng:",
            room
        );


        /*
         * Kiểm tra trạng thái
         */

        if (
            room.status !== "waiting"
        ) {

            setRoomMessage(
                "❌ Phòng đã bắt đầu hoặc đã đóng."
            );

            console.warn(
                "Room status:",
                room.status
            );

            return;
        }


        /*
         * Không cho chủ phòng tự tham gia
         */

        if (
            room.hostUid ===
            currentUser.uid
        ) {

            setRoomMessage(
                "❌ Đây là phòng bạn vừa tạo."
            );

            return;
        }


        /*
         * Đã có người chơi Đen
         */

        if (
            room.blackUid
        ) {

            setRoomMessage(
                "❌ Phòng đã đủ người."
            );

            return;
        }


        setRoomMessage(
            "⏳ Đang tham gia phòng..."
        );


        /*
         * Cập nhật người chơi Đen
         */

        await ref.update({

            blackUid:
                currentUser.uid,

            status:
                "playing",

            "game/status":
                "playing",

            updatedAt:
                firebase
                    .database
                    .ServerValue
                    .TIMESTAMP

        });


        /*
         * Thiết lập trạng thái client
         */

        roomId =
            input;

        roomRef =
            ref;

        onlineColor =
            "b";

        onlineJoined =
            true;

        lastRemoteMoveKey =
            null;

        lastCheckKey =
            null;

        lastDrawKey =
            null;

        onlineResultShown =
            false;

        onlineDrawPending =
            false;


        console.log(
            "================================"
        );

        console.log(
            "♟️ ĐÃ VÀO PHÒNG"
        );

        console.log(
            "Room:",
            roomId
        );

        console.log(
            "Color:",
            onlineColor
        );

        console.log(
            "UID:",
            currentUser.uid
        );

        console.log(
            "================================"
        );


        setRoomMessage(
            "✅ Đã vào phòng!"
        );


        /*
         * Bắt đầu nghe realtime
         */

        listenRoom();


    } catch (error) {

        console.error(
            "❌ JOIN ROOM ERROR:",
            error
        );

        console.error(
            "Code phòng:",
            $("roomInput")?.value
        );

        console.error(
            "UID:",
            currentUser?.uid
        );

        setRoomMessage(
            "❌ Không thể tham gia phòng: " +
            (
                error.message ||
                error
            )
        );
    }
}


    /* =========================================================
       ROOM LISTENER
    ========================================================= */

    function listenRoom() {

        if (!roomRef) {
            return;
        }


        if (
            roomListener
        ) {

            roomListener();

            roomListener =
                null;
        }


        const reference =
            roomRef;


        const callback =
            snapshot => {

                const room =
                    snapshot.val();


                if (!room) {

                    setRoomMessage(
                        "Phòng không còn tồn tại."
                    );

                    return;
                }


                handleRoom(
                    room
                );
            };


        reference.on(
            "value",
            callback
        );


        roomListener =
            () => {

                reference.off(
                    "value",
                    callback
                );
            };
    }


    /* =========================================================
       HANDLE ROOM
    ========================================================= */

    function handleRoom(
        room
    ) {

        if (
            !currentUser
        ) {
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


        /*
         * WAITING
         */

        if (
            room.status ===
            "waiting"
        ) {

            $("setup")
                .classList
                .remove("hidden");


            $("game")
                .classList
                .add("hidden");


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


        /*
         * PLAYING
         */

        if (
            room.status ===
            "playing"
        ) {

            openOnlineGame(
                room
            );

            return;
        }


        /*
         * FINISHED
         */

        if (
            room.status ===
            "finished"
        ) {

            openOnlineGame(
                room
            );


            if (
                room.game
            ) {

                applyOnlineGame(
                    room.game
                );
            }


            return;
        }


        /*
         * CLOSED
         */

        if (
            room.status ===
            "closed"
        ) {

            setMessage(
                "Đối thủ đã rời phòng."
            );


            stopClock();


            gameFinished =
                true;
        }
    }


    /* =========================================================
       OPEN ONLINE GAME
    ========================================================= */

    function openOnlineGame(
        room
    ) {

        if (
            !room.game
        ) {
            return;
        }


        $("setup")
            .classList
            .add("hidden");


        $("game")
            .classList
            .remove("hidden");


        $("onlineGameBar")
            .classList
            .remove("hidden");


        $("gameRoomCode")
            .textContent =
            roomId;


        $("createdRoom")
            .classList
            .add("hidden");


        $("startBtn")
            .classList
            .add("hidden");


        updatePlayerNames();

        updateSideMode();


        applyOnlineGame(
            room.game
        );
    }


    /* =========================================================
       ONLINE GAME STATE
    ========================================================= */

    function applyOnlineGame(
        remoteGame
    ) {

        if (
            !remoteGame
        ) {
            return;
        }


        const previousBoard =
            state?.board;


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
            remoteGame.clocks ||
            {
                w:
                    timeLimit,

                b:
                    timeLimit
            };


        if (
            !gameStarted
        ) {

            gameStarted =
                true;


            gameFinished =
                false;


            selected =
                null;


            trackStart();
        }


        /*
         * Remote move sound
         */

        if (
            remoteGame.lastMove
        ) {

            const move =
                remoteGame.lastMove;


            const moveKey =
                String(move.from) +
                "-" +
                String(move.to) +
                "-" +
                history.length;


            if (
                moveKey !==
                lastRemoteMoveKey
            ) {

                if (
                    previousBoard
                ) {

                    if (
                        previousBoard[
                            move.to
                        ]
                    ) {

                        soundCapture();

                    } else {

                        soundMove();
                    }
                }


                lastRemoteMoveKey =
                    moveKey;
            }
        }


        /*
         * Draw offer
         */

        processDrawOffer(
            remoteGame
        );


        /*
         * Finished
         */

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


            render();

            return;
        }


        gameFinished =
            false;


        updateOnlineMessage();


        render();
    }


    function updateOnlineMessage() {

        if (
            !state
        ) {
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

        if (
            onlineResultShown
        ) {
            return;
        }


        onlineResultShown =
            true;


        let title =
            "Hòa cờ";


        let text =
            "Hai người chơi đã đồng ý hòa.";


        let icon =
            "🤝";


        let analyticsResult =
            "draw";


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


            analyticsResult =
                winner ===
                onlineColor
                    ? "win"
                    : "loss";


            soundCheckmate();


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


            analyticsResult =
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


            analyticsResult =
                winner ===
                onlineColor
                    ? "win"
                    : "loss";


        } else {

            soundWin();

            /*
             * Không phát win cho hòa thực tế.
             * Reset lại vì soundWin() không cần ở đây.
             */

            title =
                "Hòa cờ";


            icon =
                "🤝";


            text =
                "Hai người chơi đã đồng ý hòa.";


            analyticsResult =
                "draw";
        }


        /*
         * Sound kết quả
         */

        if (
            analyticsResult ===
            "win"
        ) {

            soundWin();

        } else if (
            analyticsResult ===
            "loss"
        ) {

            soundLose();
        }


        $("drawOverlay")
            .classList
            .add("hidden");


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
            analyticsResult,
            winner
        );
    }


    /* =========================================================
       ONLINE RESIGN / FINISH
    ========================================================= */

    async function publishOnlineFinish(
        reason,
        winner
    ) {

        if (
            !roomRef
        ) {
            return;
        }


        try {

            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        game => {

                            if (!game) {
                                return;
                            }


                            if (
                                game.status ===
                                "finished"
                            ) {
                                return;
                            }


                            return {

                                ...game,

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
                        null,
                        false
                    );


            if (
                !result.committed
            ) {

                setMessage(
                    "Ván cờ đã kết thúc."
                );
            }

        } catch (error) {

            console.error(
                "❌ Online finish:",
                error
            );
        }
    }


    /* =========================================================
       LEAVE ROOM
    ========================================================= */

    async function leaveRoom(
        closeRoom = false
    ) {

        stopClock();


        if (
            roomListener
        ) {

            roomListener();

            roomListener =
                null;
        }


        const reference =
            roomRef;


        const id =
            roomId;


        roomRef =
            null;


        roomId =
            null;


        if (
            reference &&
            currentUser
        ) {

            try {

                const snapshot =
                    await reference.once(
                        "value"
                    );


                const room =
                    snapshot.val();


                if (
                    room
                ) {

                    /*
                     * Host rời
                     */

                    if (
                        room.hostUid ===
                        currentUser.uid
                    ) {

                        if (
                            closeRoom
                        ) {

                            await reference.remove();

                        } else {

                            await reference.update({

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

                        /*
                         * Guest rời
                         */

                        await reference.update({

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
                    "Leave room:",
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


        onlineDrawPending =
            false;


        localDrawPending =
            false;


        onlineResultShown =
            false;


        analyticsTracked =
            false;


        $("drawOverlay")
            .classList
            .add("hidden");


        $("resultOverlay")
            .classList
            .add("hidden");


        $("game")
            .classList
            .add("hidden");


        $("setup")
            .classList
            .remove("hidden");


        $("onlineGameBar")
            .classList
            .add("hidden");


        $("createdRoom")
            .classList
            .add("hidden");


        if (
            mode === "online"
        ) {

            $("startBtn")
                .classList
                .add("hidden");

        } else {

            $("startBtn")
                .classList
                .remove("hidden");
        }


        setRoomMessage(
            "Đã rời phòng."
        );
    }


    /* =========================================================
       AI
    ========================================================= */

    const PIECE_VALUES = {

        p: 100,

        n: 320,

        b: 330,

        r: 500,

        q: 900,

        k: 20000
    };


    function aiMove() {

        if (
            aiThinking ||
            gameFinished ||
            mode !== "ai" ||
            state.turn !== "b"
        ) {
            return;
        }


        aiThinking =
            true;


        setMessage(
            "🤖 Máy đang suy nghĩ..."
        );


        render();


        let delay =
            250;


        if (
            difficulty ===
            "medium"
        ) {

            delay =
                450;
        }


        if (
            difficulty ===
            "hard"
        ) {

            delay =
                700;
        }


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
                    chooseAIMove();


                aiThinking =
                    false;


                if (
                    move
                ) {

                    makeLocalMove(
                        move
                    );
                }

            },
            delay
        );
    }


    function chooseAIMove() {

        const legal =
            Chess.legalMoves(
                state
            );


        if (
            !legal.length
        ) {
            return null;
        }


        /*
         * Dễ
         */

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


        /*
         * Medium / Hard
         */

        let bestMove =
            legal[0];


        let bestScore =
            -Infinity;


        const shuffled =
            [...legal].sort(
                () =>
                    Math.random() -
                    0.5
            );


        const depth =
            difficulty ===
            "hard"
                ? 3
                : 2;


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
                score >
                bestScore
            ) {

                bestScore =
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


        if (
            legal.length ===
            0
        ) {

            if (
                Chess.inCheck(
                    currentState.board,
                    currentState.turn
                )
            ) {

                return (
                    -100000 -
                    depth
                );
            }


            return 0;
        }


        if (
            depth <= 0
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
                score >
                best
            ) {

                best =
                    score;
            }


            if (
                score >
                alpha
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

        let score =
            0;


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
                PIECE_VALUES[
                    piece.t
                ];


            const center =
                (
                    3.5 -
                    Math.abs(
                        col(i) - 3.5
                    )
                ) +
                (
                    3.5 -
                    Math.abs(
                        row(i) - 3.5
                    )
                );


            if (
                piece.t === "n" ||
                piece.t === "b"
            ) {

                value +=
                    center * 7;
            }


            if (
                piece.t === "p"
            ) {

                value +=
                    center * 4;
            }


            if (
                piece.c === "b"
            ) {

                score +=
                    value;

            } else {

                score -=
                    value;
            }
        }


        if (
            Chess.inCheck(
                currentState.board,
                "w"
            )
        ) {

            score +=
                30;
        }


        if (
            Chess.inCheck(
                currentState.board,
                "b"
            )
        ) {

            score -=
                30;
        }


        /*
         * AI luôn là Đen.
         * Điểm càng cao = tốt cho Đen.
         */

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


            onlineResultShown =
                false;


            lastRemoteMoveKey =
                null;


            lastCheckKey =
                null;


            lastDrawKey =
                null;


            onlineDrawPending =
                false;


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


            setMessage(
                "🟢 Ván mới bắt đầu."
            );

        } catch (error) {

            console.error(
                "❌ Online replay:",
                error
            );
        }
    }


    /* =========================================================
       BUTTONS
    ========================================================= */

    $("startBtn")
        ?.addEventListener(
            "click",
            () => {

                startLocalGame();
            }
        );


    /*
     * MODE
     */

    document
        .querySelectorAll(
            ".mode-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        mode =
                            button.dataset
                                .mode;


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


                        $("difficultyWrap")
                            ?.classList
                            .toggle(
                                "hidden",
                                mode !==
                                    "ai"
                            );


                        $("onlinePanel")
                            ?.classList
                            .toggle(
                                "hidden",
                                mode !==
                                    "online"
                            );


                        $("startBtn")
                            ?.classList
                            .toggle(
                                "hidden",
                                mode ===
                                    "online"
                            );


                        updateSideMode();


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


    /*
     * DIFFICULTY
     */

    $("difficulty")
        ?.addEventListener(
            "change",
            event => {

                difficulty =
                    event.target.value;
            }
        );


    /*
     * TIME
     */

    $("timeControl")
        ?.addEventListener(
            "change",
            event => {

                timeLimit =
                    Number(
                        event.target.value
                    );
            }
        );


    /*
     * CREATE ROOM
     */

    $("createRoomBtn")
        ?.addEventListener(
            "click",
            createRoom
        );


    /*
     * JOIN ROOM
     */

    $("joinRoomBtn")
        ?.addEventListener(
            "click",
            joinRoom
        );


    /*
     * ROOM INPUT
     */

    $("roomInput")
        ?.addEventListener(
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


    /*
     * COPY WAITING ROOM
     */

    $("copyRoomBtn")
        ?.addEventListener(
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


    /*
     * COPY ACTIVE ROOM
     */

    $("copyGameRoomBtn")
        ?.addEventListener(
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


    /*
     * LEAVE WAITING
     */

    $("leaveWaitingBtn")
        ?.addEventListener(
            "click",
            () => {

                leaveRoom(
                    true
                );
            }
        );


    /*
     * LEAVE ONLINE
     */

    $("leaveOnlineBtn")
        ?.addEventListener(
            "click",
            () => {

                leaveRoom(
                    false
                );
            }
        );


    /*
     * DRAW
     */

    $("drawBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    !gameStarted ||
                    gameFinished
                ) {
                    return;
                }


                if (
                    mode ===
                    "ai"
                ) {

                    setMessage(
                        "Không thể xin hòa khi đấu với máy."
                    );

                    return;
                }


                if (
                    mode ===
                    "online"
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


                    await requestOnlineDraw();

                    return;
                }


                requestLocalDraw();
            }
        );


    /*
     * ACCEPT DRAW
     */

    $("acceptDrawBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    mode ===
                    "online"
                ) {

                    await respondOnlineDraw(
                        true
                    );

                } else {

                    acceptLocalDraw();
                }
            }
        );


    /*
     * REJECT DRAW
     */

    $("rejectDrawBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    mode ===
                    "online"
                ) {

                    await respondOnlineDraw(
                        false
                    );

                } else {

                    rejectLocalDraw();
                }
            }
        );


    /*
     * RESIGN
     */

    $("resignBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    !gameStarted ||
                    gameFinished
                ) {
                    return;
                }


                if (
                    mode ===
                    "online"
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


                finishGame(
                    "resign",
                    opposite(
                        state.turn
                    )
                );
            }
        );


    /*
     * FLIP BOARD
     */

    $("flipBtn")
        ?.addEventListener(
            "click",
            () => {

                flipped =
                    !flipped;


                soundClick();


                render();
            }
        );


    /*
     * TOP NEW GAME
     */

    $("newGameTop")
        ?.addEventListener(
            "click",
            () => {

                if (
                    mode ===
                    "online"
                ) {

                    return;
                }


                startLocalGame();
            }
        );


    /*
     * REPLAY
     */

    $("replayBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    mode ===
                    "online"
                ) {

                    onlineReplay();

                } else {

                    startLocalGame();
                }
            }
        );


    /*
     * BACK MENU
     */

    async function backToMenu() {

        if (
            roomRef
        ) {

            await leaveRoom(
                false
            );
        }


        location.href =
            "../../index.html";
    }


    $("menuBtn")
        ?.addEventListener(
            "click",
            backToMenu
        );


    $("backMenuBtn")
        ?.addEventListener(
            "click",
            backToMenu
        );


    /* =========================================================
       ESCAPE
    ========================================================= */

    window.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                selected =
                    null;


                if (
                    state
                ) {

                    render();
                }
            }
        }
    );


    /* =========================================================
       PAGE LEAVE
    ========================================================= */

    window.addEventListener(
        "pagehide",
        () => {

            stopClock();


            if (
                roomListener
            ) {

                roomListener();

                roomListener =
                    null;
            }
        }
    );


    /* =========================================================
       INIT
    ========================================================= */

    async function init() {

        try {

            await waitGameHub();


            if (
                window.GameHub &&
                typeof window.GameHub.getAuth ===
                    "function"
            ) {

                auth =
                    window.GameHub.getAuth();
            }


            if (
                window.GameHub &&
                typeof window.GameHub.getDatabase ===
                    "function"
            ) {

                db =
                    window.GameHub.getDatabase();
            }


            if (
                auth?.currentUser
            ) {

                currentUser =
                    auth.currentUser;
            }


            updateSideMode();


            console.log(
                "================================"
            );

            console.log(
                "♟️ CHESS READY"
            );

            console.log(
                "UID:",
                currentUser?.uid
            );

            console.log(
                "================================"
            );

        } catch (error) {

            console.error(
                "Chess init error:",
                error
            );
        }
    }


    init();

})();
