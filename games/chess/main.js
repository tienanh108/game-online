(function () {

    "use strict";


    const $ = id =>
        document.getElementById(id);


    const boardEl =
        $("board");

    const setupEl =
        $("setup");

    const gameEl =
        $("game");


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


    const row = index =>
        Math.floor(index / 8);


    const col = index =>
        index % 8;


    function opposite(color) {

        return color === "w"
            ? "b"
            : "w";

    }


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


    const VALUES = {

        p: 100,

        n: 320,

        b: 330,

        r: 500,

        q: 900,

        k: 20000

    };


    function initialState() {

        return {

            board:
                ChessCore.initialBoard(),

            turn: "w",

            castling: {

                wK: true,
                wQ: true,

                bK: true,
                bQ: true

            },

            enPassant: null

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
            ).padStart(2, "0")
        );

    }


    /* =========================
       CLOCK
    ========================= */

    function startClock() {

        clearInterval(
            clockTimer
        );


        if (
            timeLimit === 0
        ) {

            return;

        }


        clockTimer =
            setInterval(() => {

                if (
                    !gameStarted ||
                    gameFinished
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


                    finish(
                        "time",
                        opposite(
                            state.turn
                        )
                    );

                }

            }, 100);

    }


    function updateClocks() {

        $("whiteClock")
            .textContent =
            formatTime(
                clocks.w
            );


        $("blackClock")
            .textContent =
            formatTime(
                clocks.b
            );


        $("whiteStatus")
            .textContent =
            state.turn === "w"
                ? "Đang đi"
                : "Chờ lượt";


        $("blackStatus")
            .textContent =
            state.turn === "b"
                ? "Đang đi"
                : "Chờ lượt";


        $("turnPill")
            .textContent =
            state.turn === "w"
                ? "Lượt Trắng"
                : "Lượt Đen";

    }


    /* =========================
       MESSAGE
    ========================= */

    function setMessage(text) {

        $("message")
            .textContent =
            text;

    }


    /* =========================
       RENDER BOARD
    ========================= */

    function render() {

        boardEl.innerHTML = "";


        const legal =
            selected === null
                ? []
                : ChessCore
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .map(
                        move =>
                            move.to
                    );


        const checkSquare =
            ChessCore.inCheck(
                state.board,
                state.turn
            )
                ? ChessCore.kingIndex(
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
                    "piece";


                span.textContent =
                    ChessCore.PIECES[
                        piece.c
                    ][
                        piece.t
                    ];


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

                if (
                    !piece
                ) {

                    square.style.boxShadow =
                        `
                        inset 0 0 0 999px
                        rgba(0,0,0,.08),
                        inset 0 0 0 8px
                        rgba(250,204,21,.55)
                        `;

                }

                else {

                    square.style.boxShadow =
                        `
                        inset
                        0 0 0 5px
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


    /* =========================
       MOVE LIST
    ========================= */

    function renderMoves() {

        const element =
            $("moves");


        element.innerHTML =
            "";


        history.forEach(
            (move, index) => {

                const rowElement =
                    document.createElement(
                        "div"
                    );


                rowElement.className =
                    "move-row";


                rowElement.innerHTML =

                    `
                    <span class="move-no">
                        ${
                            index % 2 === 0
                                ? Math.floor(index / 2) + "."
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

    }


    /* =========================
       MOVE NOTATION
    ========================= */

    function moveText(move) {

        const piece =
            state.board[
                move.from
            ];


        const capture =
            state.board[
                move.to
            ] ||
            move.enPassant;


        if (
            move.castle
        ) {

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

        }

        else if (
            capture
        ) {

            text += "x";

        }


        text +=
            ChessCore.squareName(
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
                    "Q"
                ).toUpperCase();

        }


        return text;

    }


    /* =========================
       GAMEHUB ANALYTICS
    ========================= */

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

        }

        catch (error) {

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

        }

        catch (error) {

            console.warn(
                "Chess analytics error:",
                error
            );

        }

    }


    /* =========================
       START GAME
    ========================= */

    function begin() {

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


        setupEl.classList.add(
            "hidden"
        );


        gameEl.classList.remove(
            "hidden"
        );


        $("resultOverlay")
            .classList.add(
                "hidden"
            );


        trackStart();

        startClock();


        if (
            mode === "ai"
        ) {

            setMessage(
                "Bạn cầm Trắng. Chọn quân cờ để đi."
            );

        }

        else {

            setMessage(
                "Trắng đi trước."
            );

        }


        render();

    }


    /* =========================
       END GAME
    ========================= */

    function finish(
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


        clearInterval(
            clockTimer
        );


        aiThinking =
            false;


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

        }


        else if (
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

        }


        else if (
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

        }


        else {

            title =
                "Hòa cờ";


            text =
                reason === "stalemate"
                    ? "Bí nước — hòa cờ."
                    : "Ván cờ kết thúc hòa.";


            icon = "🤝";

            result = "draw";

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
            .classList.remove(
                "hidden"
            );


        trackEnd(
            result,
            winner || null
        );


        render();

    }


    /* =========================
       MOVE
    ========================= */

    function afterMove(move) {

        const notation =
            moveText(move);


        lastMove = {

            from:
                move.from,

            to:
                move.to

        };


        state =
            ChessCore.applyMove(
                state,
                move
            );


        history.push(
            notation
        );


        selected = null;


        render();


        const legal =
            ChessCore.legalMoves(
                state
            );


        if (
            legal.length === 0
        ) {

            if (
                ChessCore.inCheck(
                    state.board,
                    state.turn
                )
            ) {

                finish(
                    "checkmate",
                    opposite(
                        state.turn
                    )
                );

            }

            else {

                finish(
                    "stalemate",
                    null
                );

            }


            return;

        }


        if (
            mode === "ai" &&
            state.turn === "b" &&
            !gameFinished
        ) {

            requestAI();

        }

    }


    /* =========================
       CLICK BOARD
    ========================= */

    function handleSquare(index) {

        if (
            !gameStarted ||
            gameFinished ||
            aiThinking
        ) {

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
                ChessCore
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .find(
                        move =>
                            move.to === index
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
            piece.c === state.turn
        ) {

            selected = index;

            setMessage(
                "Chọn ô đích."
            );

            render();

            return;

        }


        selected = null;

        setMessage(
            "Nước đi không hợp lệ."
        );

        render();

    }


    /* =========================
       AI
    ========================= */

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
                    gameFinished
                ) {

                    return;

                }


                const move =
                    chooseAI();


                aiThinking = false;


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
            ChessCore.legalMoves(
                state
            );


        if (
            !legal.length
        ) {

            return null;

        }


        if (
            difficulty === "easy"
        ) {

            return legal[
                Math.floor(
                    Math.random() *
                    legal.length
                )
            ];

        }


        const depth =
            difficulty === "medium"
                ? 2
                : 3;


        let best =
            -Infinity;


        let bestMove =
            legal[0];


        const shuffled =
            [...legal].sort(
                () =>
                    Math.random() - .5
            );


        for (
            const move of shuffled
        ) {

            const next =
                ChessCore.applyMove(
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

                best = score;

                bestMove = move;

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
            ChessCore.legalMoves(
                currentState
            );


        if (
            legal.length === 0
        ) {

            return ChessCore.inCheck(
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
            const move of legal
        ) {

            const next =
                ChessCore.applyMove(
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

                best = score;

            }


            if (
                score > alpha
            ) {

                alpha = score;

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
                VALUES[
                    piece.t
                ];


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
            ChessCore.inCheck(
                currentState.board,
                "w"
            )
        ) {

            score += 35;

        }


        if (
            ChessCore.inCheck(
                currentState.board,
                "b"
            )
        ) {

            score -= 35;

        }


        return currentState.turn === "b"
            ? score
            : -score;

    }


    /* =========================
       MENU EVENTS
    ========================= */

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
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        mode =
                            button.dataset.mode;


                        $("difficultyWrap")
                            .classList.toggle(
                                "hidden",
                                mode !== "ai"
                            );

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


    /* =========================
       NAVIGATION
    ========================= */

    $("menuBtn")
        .addEventListener(
            "click",
            () => {

                location.href =
                    "../../index.html";

            }
        );


    $("backMenuBtn")
        .addEventListener(
            "click",
            () => {

                location.href =
                    "../../index.html";

            }
        );


    $("newGameTop")
        .addEventListener(
            "click",
            begin
        );


    $("replayBtn")
        .addEventListener(
            "click",
            begin
        );


    /* =========================
       FLIP
    ========================= */

    $("flipBtn")
        .addEventListener(
            "click",
            () => {

                flipped =
                    !flipped;

                render();

            }
        );


    /* =========================
       RESIGN
    ========================= */

    $("resignBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    gameStarted &&
                    !gameFinished
                ) {

                    finish(
                        "resign",
                        opposite(
                            state.turn
                        )
                    );

                }

            }
        );


    /* =========================
       UNDO
    ========================= */

    $("undoBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    !gameStarted ||
                    gameFinished ||
                    aiThinking ||
                    history.length === 0
                ) {

                    return;

                }


                /*
                    Với AI:
                    quay lại cả nước
                    của người chơi + AI.
                */

                if (
                    mode === "ai" &&
                    history.length >= 2
                ) {

                    begin();

                    return;

                }


                /*
                    Chế độ 2 người:
                    khôi phục bằng cách
                    chơi lại các nước trước đó.
                */

                const keep =
                    history.slice(
                        0,
                        -1
                    );


                let restored =
                    initialState();


                for (
                    let i = 0;
                    i < keep.length;
                    i++
                ) {

                    const legal =
                        ChessCore.legalMoves(
                            restored
                        );


                    const target =
                        legal.find(
                            move =>
                                ChessCore
                                    .algebraicMove(
                                        move.from,
                                        move.to,
                                        move.promotion
                                    ) ===
                                keep[i]
                        );


                    if (target) {

                        restored =
                            ChessCore.applyMove(
                                restored,
                                target
                            );

                    }

                }


                state =
                    restored;


                history =
                    keep;


                selected = null;

                lastMove = null;


                render();


                setMessage(
                    "Đã hoàn tác."
                );

            }
        );


    /* =========================
       KEYBOARD
    ========================= */

    window.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                selected = null;

                if (state) {

                    render();

                }

            }

        }
    );


})();
