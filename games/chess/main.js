(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const boardEl = $("board");
    const setupEl = $("setup");
    const gameEl = $("game");

    const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

    const row = index => Math.floor(index / 8);
    const col = index => index % 8;

    function opposite(color) {
        return color === "w" ? "b" : "w";
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

    /* =========================
       ONLINE
    ========================= */

    let db = null;
    let auth = null;
    let currentUser = null;

    let roomRef = null;
    let roomListener = null;
    let disconnectRef = null;

    let roomId = null;
    let onlineColor = null;
    let onlineOpponentUid = null;

    let onlineJoined = false;
    let onlineWriting = false;
    let onlineFinishing = false;

    const VALUES = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 20000
    };

    /* =========================
       HELPERS
    ========================= */

    function soundClick() {
        if (
            window.GameSound &&
            typeof GameSound.click === "function"
        ) {
            GameSound.click();
        }
    }

    function initialState() {
        return {
            board: ChessCore.initialBoard(),
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
        if (timeLimit === 0) {
            return "∞";
        }

        seconds = Math.max(0, Math.ceil(seconds));

        return (
            Math.floor(seconds / 60) +
            ":" +
            String(seconds % 60).padStart(2, "0")
        );
    }

    function cloneJSON(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function generateRoomCode() {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        for (let i = 0; i < 6; i++) {
            code +=
                chars[
                    Math.floor(
                        Math.random() * chars.length
                    )
                ];
        }

        return code;
    }

    function getDatabase() {
        if (db) {
            return db;
        }

        if (
            window.GameHub &&
            typeof GameHub.getDatabase === "function"
        ) {
            db = GameHub.getDatabase();
        }

        return db;
    }

    function getAuth() {
        if (auth) {
            return auth;
        }

        if (
            window.GameHub &&
            typeof GameHub.getAuth === "function"
        ) {
            auth = GameHub.getAuth();
        }

        return auth;
    }

    async function ensureUser() {
        if (
            currentUser &&
            currentUser.uid
        ) {
            return currentUser;
        }

        if (
            window.GameHub &&
            GameHub.ready
        ) {
            await GameHub.ready;
        }

        const firebaseAuth = getAuth();

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

    function serverTimestamp() {
        return firebase.database.ServerValue.TIMESTAMP;
    }

    function getCurrentRoom() {
        return roomRef;
    }

    /* =========================
       CLOCK
    ========================= */

    function getOnlineClockValues() {
        if (
            !state ||
            !roomId
        ) {
            return clocks;
        }

        return clocks;
    }

    function calculateOnlineClocks(remoteGame) {
        const base = {
            w:
                Number(
                    remoteGame &&
                    remoteGame.clocks &&
                    remoteGame.clocks.w
                ) || 0,

            b:
                Number(
                    remoteGame &&
                    remoteGame.clocks &&
                    remoteGame.clocks.b
                ) || 0
        };

        if (
            timeLimit === 0 ||
            !remoteGame ||
            !remoteGame.turnStartedAt
        ) {
            return base;
        }

        const started =
            Number(
                remoteGame.turnStartedAt
            );

        if (!Number.isFinite(started)) {
            return base;
        }

        const elapsed =
            Math.max(
                0,
                (Date.now() - started) / 1000
            );

        base[remoteGame.turn] =
            Math.max(
                0,
                base[remoteGame.turn] - elapsed
            );

        return base;
    }

    function startClock() {
        clearInterval(clockTimer);

        if (
            timeLimit === 0
        ) {
            updateClocks();
            return;
        }

        clockTimer =
            setInterval(() => {
                if (
                    !gameStarted ||
                    gameFinished ||
                    !state
                ) {
                    return;
                }

                if (
                    mode === "online"
                ) {
                    updateOnlineClockDisplay();
                    return;
                }

                clocks[state.turn] -= 0.1;

                if (
                    clocks[state.turn] <= 0
                ) {
                    clocks[state.turn] = 0;

                    const winner =
                        opposite(state.turn);

                    if (
                        mode === "online"
                    ) {
                        publishOnlineFinish(
                            "time",
                            winner
                        );
                    } else {
                        finish(
                            "time",
                            winner
                        );
                    }

                    return;
                }

                updateClocks();

            }, 100);
    }

    function updateOnlineClockDisplay() {
        if (
            !state ||
            !roomRef
        ) {
            return;
        }

        const remoteGame =
            window.__chessRemoteGame;

        if (
            !remoteGame
        ) {
            updateClocks();
            return;
        }

        clocks =
            calculateOnlineClocks(
                remoteGame
            );

        updateClocks();

        if (
            timeLimit > 0 &&
            clocks[remoteGame.turn] <= 0 &&
            remoteGame.status === "playing"
        ) {
            claimOnlineTimeout(
                remoteGame
            );
        }
    }

    async function claimOnlineTimeout(remoteGame) {
        if (
            onlineFinishing ||
            !roomRef ||
            remoteGame.status !== "playing"
        ) {
            return;
        }

        onlineFinishing = true;

        try {
            const now = Date.now();

            const started =
                Number(
                    remoteGame.turnStartedAt
                ) || now;

            const elapsed =
                Math.max(
                    0,
                    (now - started) / 1000
                );

            const remaining =
                Math.max(
                    0,
                    Number(
                        remoteGame.clocks &&
                        remoteGame.clocks[
                            remoteGame.turn
                        ]
                    ) - elapsed
                );

            if (
                remaining > 0
            ) {
                return;
            }

            await roomRef
                .child("game")
                .transaction(
                    current => {
                        if (
                            !current ||
                            current.status !== "playing"
                        ) {
                            return;
                        }

                        const currentStarted =
                            Number(
                                current.turnStartedAt
                            ) || Date.now();

                        const currentElapsed =
                            Math.max(
                                0,
                                (
                                    Date.now() -
                                    currentStarted
                                ) / 1000
                            );

                        const currentRemaining =
                            Math.max(
                                0,
                                Number(
                                    current.clocks &&
                                    current.clocks[
                                        current.turn
                                    ]
                                ) -
                                currentElapsed
                            );

                        if (
                            currentRemaining > 0
                        ) {
                            return;
                        }

                        return {
                            ...current,

                            status:
                                "finished",

                            result:
                                "time",

                            winner:
                                opposite(
                                    current.turn
                                ),

                            clocks: {
                                ...(current.clocks || {}),
                                [current.turn]: 0
                            },

                            updatedAt:
                                serverTimestamp()
                        };
                    },
                    {
                        applyLocally: false
                    }
                );

        }
        catch (error) {
            console.warn(
                "Timeout error:",
                error
            );
        }
        finally {
            onlineFinishing = false;
        }
    }

    function updateClocks() {
        if (!state) {
            return;
        }

        $("whiteClock").textContent =
            formatTime(clocks.w);

        $("blackClock").textContent =
            formatTime(clocks.b);

        $("whiteStatus").textContent =
            state.turn === "w"
                ? "Đang đi"
                : "Chờ lượt";

        $("blackStatus").textContent =
            state.turn === "b"
                ? "Đang đi"
                : "Chờ lượt";

        $("turnPill").textContent =
            state.turn === "w"
                ? "Lượt Trắng"
                : "Lượt Đen";
    }

    /* =========================
       MESSAGE
    ========================= */

    function setMessage(text) {
        $("message").textContent = text;
    }

    function setRoomMessage(text) {
        $("roomMessage").textContent = text;
    }

    /* =========================
       RENDER BOARD
    ========================= */

    function render() {
        if (!state) {
            return;
        }

        boardEl.innerHTML = "";

        const legal =
            selected === null
                ? []
                : ChessCore
                    .legalMovesFrom(
                        state,
                        selected
                    )
                    .map(move => move.to);

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
                document.createElement("button");

            square.type = "button";

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
                    index === lastMove.from ||
                    index === lastMove.to
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
                    document.createElement("span");

                span.className = "piece";

                span.textContent =
                    ChessCore.PIECES[
                        piece.c
                    ][
                        piece.t
                    ];

                square.appendChild(span);
            }

            if (
                visual >= 56
            ) {
                const coordinate =
                    document.createElement("span");

                coordinate.className =
                    "coord file";

                coordinate.textContent =
                    FILES[col(index)];

                square.appendChild(
                    coordinate
                );
            }

            if (
                col(visual) === 0
            ) {
                const coordinate =
                    document.createElement("span");

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
                        inset 0 0 0 5px
                        rgba(239,68,68,.7)
                        `;
                }
            }

            square.addEventListener(
                "click",
                () => handleSquare(index)
            );

            boardEl.appendChild(square);
        }

        updateClocks();
        renderMoves();
    }

    /* =========================
       MOVE LIST
    ========================= */

    function renderMoves() {
        const element = $("moves");

        element.innerHTML = "";

        history.forEach(
            (move, index) => {
                const rowElement =
                    document.createElement("div");

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

                    <span>${move}</span>
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

    function moveTextFromState(
        currentState,
        move
    ) {
        const piece =
            currentState.board[move.from];

        const capture =
            currentState.board[move.to] ||
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
                FILES[col(move.from)] +
                "x";
        }
        else if (capture) {
            text += "x";
        }

        text +=
            ChessCore.squareName(move.to);

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
                    move.promotion || "Q"
                ).toUpperCase();
        }

        return text;
    }

    function moveText(move) {
        return moveTextFromState(
            state,
            move
        );
    }

    /* =========================
       GAMEHUB
    ========================= */

    async function trackStart() {
        if (
            analyticsTracked ||
            !window.GameHub
        ) {
            return;
        }

        if (
            GameHub.ready
        ) {
            try {
                await GameHub.ready;
            }
            catch {}
        }

        analyticsTracked = true;

        try {
            GameHub.startRound({
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

        analyticsTracked = false;

        try {
            GameHub.endRound(
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
       START OFFLINE GAME
    ========================= */

    function begin() {
        if (
            mode === "online"
        ) {
            setRoomMessage(
                "Hãy tạo hoặc tham gia phòng trước."
            );
            return;
        }

        clearInterval(clockTimer);

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

        $("onlineGameBar")
            .classList.add("hidden");

        $("resultOverlay")
            .classList.add("hidden");

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

        updatePlayerNames();
        render();
    }

    function updatePlayerNames() {
        if (mode === "ai") {
            $("whiteName").textContent =
                "Bạn";

            $("blackName").textContent =
                "Máy";
        }
        else if (mode === "local") {
            $("whiteName").textContent =
                "Trắng";

            $("blackName").textContent =
                "Đen";
        }
        else {
            $("whiteName").textContent =
                onlineColor === "w"
                    ? "Bạn • Trắng"
                    : "Đối thủ • Trắng";

            $("blackName").textContent =
                onlineColor === "b"
                    ? "Bạn • Đen"
                    : "Đối thủ • Đen";
        }
    }

    /* =========================
       END GAME
    ========================= */

    function finish(
        reason,
        winner
    ) {
        if (gameFinished) {
            return;
        }

        gameFinished = true;

        clearInterval(clockTimer);

        aiThinking = false;

        let title = "";
        let text = "";
        let icon = "♔";
        let result = "draw";

        if (
            reason === "checkmate"
        ) {
            winner =
                winner ||
                opposite(state.turn);

            title = "Chiếu hết!";

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

            if (mode === "ai") {
                result =
                    winner === "w"
                        ? "win"
                        : "loss";
            }
            else {
                result = "draw";
            }
        }
        else if (
            reason === "time"
        ) {
            winner =
                winner ||
                opposite(state.turn);

            title = "Hết giờ!";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng do đối thủ hết thời gian.";

            icon = "⏱️";

            if (mode === "ai") {
                result =
                    winner === "w"
                        ? "win"
                        : "loss";
            }
            else {
                result = "draw";
            }
        }
        else if (
            reason === "resign"
        ) {
            winner =
                winner ||
                opposite(state.turn);

            title = "Đã xin thua";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            icon = "🏳️";

            if (mode === "ai") {
                result =
                    winner === "w"
                        ? "win"
                        : "loss";
            }
            else {
                result = "draw";
            }
        }
        else {
            title = "Hòa cờ";

            text =
                reason === "stalemate"
                    ? "Bí nước — hòa cờ."
                    : "Ván cờ kết thúc hòa.";

            icon = "🤝";
            result = "draw";
        }

        $("resultIcon").textContent =
            icon;

        $("resultTitle").textContent =
            title;

        $("resultText").textContent =
            text;

        $("resultOverlay")
            .classList.remove("hidden");

        trackEnd(
            result,
            winner || null
        );

        render();
    }

    /* =========================
       CHECK END STATE
    ========================= */

    function checkGameEnd() {
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
                return {
                    reason: "checkmate",
                    winner:
                        opposite(state.turn)
                };
            }

            return {
                reason: "stalemate",
                winner: null
            };
        }

        return null;
    }

    /* =========================
       LOCAL MOVE
    ========================= */

    function afterMove(move) {
        const notation =
            moveText(move);

        lastMove = {
            from: move.from,
            to: move.to
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

        soundClick();

        render();

        const result =
            checkGameEnd();

        if (result) {
            finish(
                result.reason,
                result.winner
            );
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
            mode === "online"
        ) {
            handleOnlineSquare(index);
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
                afterMove(move);
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

    /* =========================
       ONLINE BOARD
    ========================= */

    function handleOnlineSquare(index) {
        if (
            !onlineJoined ||
            !onlineColor ||
            !state ||
            gameFinished
        ) {
            return;
        }

        if (
            state.turn !== onlineColor
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
            let move =
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
                if (
                    move.promotion
                ) {
                    const promotions =
                        ChessCore
                            .legalMovesFrom(
                                state,
                                selected
                            )
                            .filter(
                                item =>
                                    item.to === index &&
                                    item.promotion
                            );

                    move =
                        promotions.find(
                            item =>
                                String(
                                    item.promotion
                                ).toUpperCase() === "Q"
                        ) ||
                        promotions[0] ||
                        move;
                }

                makeOnlineMove(move);
                return;
            }
        }

        if (
            piece &&
            piece.c === onlineColor
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

    /* =========================
       ONLINE MOVE
    ========================= */

    async function makeOnlineMove(move) {
        if (
            onlineWriting ||
            !roomRef ||
            !onlineColor ||
            gameFinished
        ) {
            return;
        }

        onlineWriting = true;

        try {
            const result =
                await roomRef
                    .child("game")
                    .transaction(
                        current => {
                            if (
                                !current ||
                                current.status !== "playing"
                            ) {
                                return;
                            }

                            if (
                                current.turn !== onlineColor
                            ) {
                                return;
                            }

                            const currentStarted =
                                Number(
                                    current.turnStartedAt
                                ) || Date.now();

                            let currentClocks = {
                                w:
                                    Number(
                                        current.clocks &&
                                        current.clocks.w
                                    ) || 0,

                                b:
                                    Number(
                                        current.clocks &&
                                        current.clocks.b
                                    ) || 0
                            };

                            if (
                                timeLimit > 0
                            ) {
                                const elapsed =
                                    Math.max(
                                        0,
                                        (
                                            Date.now() -
                                            currentStarted
                                        ) / 1000
                                    );

                                currentClocks[
                                    current.turn
                                ] =
                                    Math.max(
                                        0,
                                        currentClocks[
                                            current.turn
                                        ] -
                                        elapsed
                                    );

                                if (
                                    currentClocks[
                                        current.turn
                                    ] <= 0
                                ) {
                                    return;
                                }
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
                                ChessCore
                                    .legalMovesFrom(
                                        remoteState,
                                        move.from
                                    );

                            const validMove =
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

                            if (!validMove) {
                                return;
                            }

                            const notation =
                                moveTextFromState(
                                    remoteState,
                                    validMove
                                );

                            const next =
                                ChessCore.applyMove(
                                    remoteState,
                                    validMove
                                );

                            const nextHistory =
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
                                getEndState(next);

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
                                        validMove.from,

                                    to:
                                        validMove.to
                                },

                                clocks:
                                    currentClocks,

                                turnStartedAt:
                                    end
                                        ? null
                                        : serverTimestamp(),

                                result:
                                    end
                                        ? end.reason
                                        : null,

                                winner:
                                    end
                                        ? end.winner
                                        : null,

                                updatedAt:
                                    serverTimestamp()
                            };
                        },
                        {
                            applyLocally: false
                        }
                    );

            if (
                !result.committed
            ) {
                setMessage(
                    "Nước đi không hợp lệ hoặc đối thủ vừa đi."
                );
            }
            else {
                selected = null;
                soundClick();
            }
        }
        catch (error) {
            console.error(
                "Online move error:",
                error
            );

            setMessage(
                "Không thể gửi nước đi."
            );
        }
        finally {
            onlineWriting = false;
        }
    }

    function getEndState(currentState) {
        const legal =
            ChessCore.legalMoves(
                currentState
            );

        if (
            legal.length === 0
        ) {
            if (
                ChessCore.inCheck(
                    currentState.board,
                    currentState.turn
                )
            ) {
                return {
                    reason: "checkmate",
                    winner:
                        opposite(
                            currentState.turn
                        )
                };
            }

            return {
                reason: "stalemate",
                winner: null
            };
        }

        return null;
    }

    /* =========================
       ONLINE ROOM
    ========================= */

    async function createRoom() {
        try {
            await ensureUser();

            const database =
                getDatabase();

            if (!database) {
                throw new Error(
                    "Database chưa sẵn sàng."
                );
            }

            setRoomMessage(
                "Đang tạo phòng..."
            );

            let code = null;
            let reference = null;

            for (
                let attempt = 0;
                attempt < 10;
                attempt++
            ) {
                const candidate =
                    generateRoomCode();

                const candidateRef =
                    database.ref(
                        "rooms/" +
                        candidate
                    );

                const snapshot =
                    await candidateRef.once(
                        "value"
                    );

                if (
                    !snapshot.exists()
                ) {
                    code = candidate;
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

            roomId = code;
            roomRef = reference;

            onlineColor = "w";
            onlineJoined = true;

            const firstState =
                initialState();

            clocks = {
                w: timeLimit,
                b: timeLimit
            };

            await roomRef.set({
                gameName: "chess",

                status: "waiting",

                hostUid:
                    currentUser.uid,

                whiteUid:
                    currentUser.uid,

                blackUid:
                    null,

                whiteOnline: true,

                blackOnline: false,

                createdAt:
                    serverTimestamp(),

                game: {
                    status: "waiting",

                    board:
                        firstState.board,

                    turn: "w",

                    castling:
                        firstState.castling,

                    enPassant:
                        firstState.enPassant,

                    history: [],

                    lastMove: null,

                    clocks: {
                        w: timeLimit,
                        b: timeLimit
                    },

                    turnStartedAt:
                        null,

                    result: null,

                    winner: null
                }
            });

            await setupDisconnect();

            setupEl.classList.add(
                "hidden"
            );

            gameEl.classList.add(
                "hidden"
            );

            $("createdRoom")
                .classList.remove(
                    "hidden"
                );

            $("roomCode")
                .textContent =
                roomId;

            setRoomMessage(
                "Đã tạo phòng. Gửi mã cho đối thủ."
            );

            listenToRoom();
        }
        catch (error) {
            console.error(
                "Create room error:",
                error
            );

            setRoomMessage(
                "Không thể tạo phòng: " +
                error.message
            );
        }
    }

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
                    "rooms/" +
                    input
                );

            const result =
                await reference.transaction(
                    room => {
                        if (!room) {
                            return;
                        }

                        if (
                            room.status === "closed"
                        ) {
                            return;
                        }

                        if (
                            room.status === "finished"
                        ) {
                            return;
                        }

                        if (
                            room.whiteUid ===
                            currentUser.uid
                        ) {
                            return room;
                        }

                        if (
                            room.blackUid &&
                            room.blackUid !==
                                currentUser.uid
                        ) {
                            return;
                        }

                        if (
                            !room.whiteUid
                        ) {
                            return;
                        }

                        room.blackUid =
                            currentUser.uid;

                        room.blackOnline =
                            true;

                        room.status =
                            "playing";

                        if (!room.game) {
                            const start =
                                initialState();

                            room.game = {
                                status:
                                    "playing",

                                board:
                                    start.board,

                                turn: "w",

                                castling:
                                    start.castling,

                                enPassant:
                                    null,

                                history: [],

                                lastMove: null,

                                clocks: {
                                    w: timeLimit,
                                    b: timeLimit
                                },

                                turnStartedAt:
                                    serverTimestamp(),

                                result: null,

                                winner: null
                            };
                        }
                        else {
                            room.game.status =
                                "playing";

                            room.game.turnStartedAt =
                                serverTimestamp();
                        }

                        return room;
                    },
                    {
                        applyLocally: false
                    }
                );

            if (
                !result.committed ||
                !result.snapshot.exists()
            ) {
                setRoomMessage(
                    "Không thể vào phòng. Phòng không tồn tại hoặc đã đủ người."
                );
                return;
            }

            roomId = input;
            roomRef = reference;

            onlineColor = "b";
            onlineJoined = true;

            $("roomInput").value = "";

            await setupDisconnect();

            setRoomMessage(
                "Đã tham gia phòng."
            );

            listenToRoom();
        }
        catch (error) {
            console.error(
                "Join room error:",
                error
            );

            setRoomMessage(
                "Không thể tham gia phòng: " +
                error.message
            );
        }
    }

    async function setupDisconnect() {
        if (
            !roomRef ||
            !currentUser ||
            !onlineColor
        ) {
            return;
        }

        try {
            const key =
                onlineColor === "w"
                    ? "whiteOnline"
                    : "blackOnline";

            disconnectRef =
                roomRef.child(key);

            await disconnectRef
                .onDisconnect()
                .set(false);
        }
        catch (error) {
            console.warn(
                "onDisconnect error:",
                error
            );
        }
    }

    async function markOnline() {
        if (
            !roomRef ||
            !onlineColor
        ) {
            return;
        }

        const key =
            onlineColor === "w"
                ? "whiteOnline"
                : "blackOnline";

        try {
            await roomRef
                .child(key)
                .set(true);

            await roomRef
                .child(key)
                .onDisconnect()
                .set(false);
        }
        catch (error) {
            console.warn(
                "Mark online error:",
                error
            );
        }
    }

    function listenToRoom() {
        if (roomListener) {
            roomListener();
            roomListener = null;
        }

        if (!roomRef) {
            return;
        }

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

        roomRef.on(
            "value",
            handler
        );

        roomListener =
            () =>
                roomRef.off(
                    "value",
                    handler
                );
    }

    function updateRoomFromSnapshot(room) {
        if (!currentUser) {
            return;
        }

        const white =
            room.whiteUid ===
            currentUser.uid;

        const black =
            room.blackUid ===
            currentUser.uid;

        if (white) {
            onlineColor = "w";
        }
        else if (black) {
            onlineColor = "b";
        }

        if (!onlineColor) {
            return;
        }

        onlineOpponentUid =
            onlineColor === "w"
                ? room.blackUid
                : room.whiteUid;

        if (
            room.status === "closed"
        ) {
            handleClosedRoom();
            return;
        }

        if (
            room.status === "waiting"
        ) {
            $("createdRoom")
                .classList.remove(
                    "hidden"
                );

            $("roomCode")
                .textContent =
                roomId;

            $("waitingText")
                .textContent =
                "⏳ Đang chờ đối thủ...";

            setRoomMessage(
                "Gửi mã phòng cho người bạn muốn chơi cùng."
            );

            return;
        }

        if (
            room.status === "playing"
        ) {
            if (
                room.game
            ) {
                startOnlineGame(room);
            }

            return;
        }

        if (
            room.status === "finished"
        ) {
            if (
                room.game
            ) {
                startOnlineGame(room);
                applyOnlineState(
                    room.game,
                    false
                );
            }
        }
    }

    function handleClosedRoom() {
        clearInterval(clockTimer);

        gameStarted = false;
        gameFinished = true;

        if (roomListener) {
            roomListener();
            roomListener = null;
        }

        roomRef = null;
        roomId = null;
        onlineColor = null;
        onlineOpponentUid = null;
        onlineJoined = false;

        setupEl.classList.remove(
            "hidden"
        );

        gameEl.classList.add(
            "hidden"
        );

        $("createdRoom")
            .classList.add(
                "hidden"
            );

        $("onlineGameBar")
            .classList.add(
                "hidden"
            );

        setRoomMessage(
            "Phòng đã được đóng."
        );
    }

    function startOnlineGame(room) {
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
            .classList.remove(
                "hidden"
            );

        $("gameRoomCode")
            .textContent =
            roomId;

        $("createdRoom")
            .classList.add(
                "hidden"
            );

        onlineJoined = true;

        markOnline();

        applyOnlineState(
            room.game,
            true
        );
    }

    function applyOnlineState(
        remoteGame,
        allowStart
    ) {
        if (!remoteGame) {
            return;
        }

        window.__chessRemoteGame =
            remoteGame;

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
            calculateOnlineClocks(
                remoteGame
            );

        if (
            !gameStarted &&
            allowStart
        ) {
            gameStarted = true;
            gameFinished = false;
            selected = null;
            aiThinking = false;

            trackStart();

            startClock();
        }

        if (
            remoteGame.status ===
            "finished"
        ) {
            gameFinished = true;

            clearInterval(clockTimer);

            showOnlineResult(
                remoteGame.result,
                remoteGame.winner
            );

            return;
        }

        if (
            remoteGame.status ===
            "playing"
        ) {
            gameFinished = false;

            if (
                allowStart
            ) {
                gameStarted = true;
            }

            if (
                timeLimit > 0
            ) {
                startClock();
            }
        }

        updatePlayerNames();
        updateOnlineMessage();
        render();
    }

    function updateOnlineMessage() {
        if (!state) {
            return;
        }

        if (
            state.turn === onlineColor
        ) {
            setMessage(
                "Đến lượt bạn."
            );
        }
        else {
            setMessage(
                "Đang chờ đối thủ đi..."
            );
        }
    }

    function showOnlineResult(
        reason,
        winner
    ) {
        let title = "";
        let text = "";
        let icon = "♔";
        let result = "draw";

        if (
            reason === "checkmate"
        ) {
            title = "Chiếu hết!";

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
                winner === onlineColor
                    ? "win"
                    : "loss";
        }
        else if (
            reason === "time"
        ) {
            title = "Hết giờ!";

            icon = "⏱️";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng do đối thủ hết thời gian.";

            result =
                winner === onlineColor
                    ? "win"
                    : "loss";
        }
        else if (
            reason === "resign"
        ) {
            title = "Đã xin thua";

            icon = "🏳️";

            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";

            result =
                winner === onlineColor
                    ? "win"
                    : "loss";
        }
        else {
            title = "Hòa cờ";
            icon = "🤝";

            text =
                reason === "stalemate"
                    ? "Bí nước — hòa cờ."
                    : "Ván cờ kết thúc hòa.";

            result = "draw";
        }

        $("resultIcon").textContent =
            icon;

        $("resultTitle").textContent =
            title;

        $("resultText").textContent =
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
            await roomRef
                .child("game")
                .transaction(
                    current => {
                        if (
                            !current ||
                            current.status !== "playing"
                        ) {
                            return;
                        }

                        let currentClocks = {
                            w:
                                Number(
                                    current.clocks &&
                                    current.clocks.w
                                ) || 0,

                            b:
                                Number(
                                    current.clocks &&
                                    current.clocks.b
                                ) || 0
                        };

                        if (
                            timeLimit > 0 &&
                            current.turnStartedAt
                        ) {
                            const elapsed =
                                Math.max(
                                    0,
                                    (
                                        Date.now() -
                                        Number(
                                            current.turnStartedAt
                                        )
                                    ) / 1000
                                );

                            currentClocks[
                                current.turn
                            ] =
                                Math.max(
                                    0,
                                    currentClocks[
                                        current.turn
                                    ] -
                                    elapsed
                                );
                        }

                        return {
                            ...current,

                            status:
                                "finished",

                            result:
                                reason,

                            winner,

                            clocks:
                                currentClocks,

                            turnStartedAt:
                                null,

                            updatedAt:
                                serverTimestamp()
                        };
                    },
                    {
                        applyLocally: false
                    }
                );
        }
        catch (error) {
            console.warn(
                "Online finish error:",
                error
            );
        }
    }

    /* =========================
       LEAVE ROOM
    ========================= */

    async function leaveRoom(
        deleteRoom
    ) {
        clearInterval(clockTimer);

        if (roomListener) {
            roomListener();
            roomListener = null;
        }

        if (
            roomRef &&
            currentUser
        ) {
            try {
                const snapshot =
                    await roomRef.once(
                        "value"
                    );

                const room =
                    snapshot.val();

                if (room) {
                    const isHost =
                        room.hostUid ===
                        currentUser.uid;

                    if (
                        isHost
                    ) {
                        if (deleteRoom) {
                            await roomRef.remove();
                        }
                        else {
                            await roomRef.update({
                                status:
                                    "closed",

                                updatedAt:
                                    serverTimestamp()
                            });
                        }
                    }
                    else {
                        if (
                            room.status ===
                            "playing"
                        ) {
                            await roomRef.update({
                                blackUid:
                                    null,

                                blackOnline:
                                    false,

                                status:
                                    "waiting",

                                game: {
                                    ...(
                                        room.game ||
                                        {}
                                    ),

                                    status:
                                        "waiting",

                                    turnStartedAt:
                                        null
                                },

                                updatedAt:
                                    serverTimestamp()
                            });
                        }
                        else {
                            await roomRef.update({
                                blackUid:
                                    null,

                                blackOnline:
                                    false,

                                status:
                                    "waiting",

                                updatedAt:
                                    serverTimestamp()
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.warn(
                    "Leave room error:",
                    error
                );
            }
        }

        if (disconnectRef) {
            try {
                await disconnectRef
                    .onDisconnect()
                    .cancel();
            }
            catch {}
        }

        disconnectRef = null;
        roomRef = null;
        roomId = null;
        onlineColor = null;
        onlineOpponentUid = null;
        onlineJoined = false;

        gameStarted = false;
        gameFinished = false;
        state = null;

        setupEl.classList.remove(
            "hidden"
        );

        gameEl.classList.add(
            "hidden"
        );

        $("onlineGameBar")
            .classList.add(
                "hidden"
            );

        $("createdRoom")
            .classList.add(
                "hidden"
            );

        $("resultOverlay")
            .classList.add(
                "hidden"
            );

        setRoomMessage(
            "Đã rời phòng."
        );
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
                    aiThinking = false;
                    return;
                }

                const move =
                    chooseAI();

                aiThinking = false;

                if (move) {
                    afterMove(move);
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

        if (!legal.length) {
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

        let best = -Infinity;
        let bestMove = legal[0];

        const shuffled =
            [...legal].sort(
                () =>
                    Math.random() - 0.5
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

        let best = -Infinity;

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

    function evaluate(currentState) {
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
                value += center * 5;
            }

            if (
                piece.t === "n" ||
                piece.t === "b"
            ) {
                value += center * 7;
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
        .querySelectorAll(".mode-btn")
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

                        $("onlinePanel")
                            .classList.toggle(
                                "hidden",
                                mode !== "online"
                            );

                        $("startBtn")
                            .classList.toggle(
                                "hidden",
                                mode === "online"
                            );

                        if (
                            mode === "online"
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
                        .writeText(roomId);

                    setRoomMessage(
                        "✅ Đã copy mã phòng."
                    );
                }
                catch {
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
                        .writeText(roomId);

                    setMessage(
                        "✅ Đã copy mã phòng."
                    );
                }
                catch {
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
            async () => {
                if (
                    mode === "online" &&
                    roomRef
                ) {
                    await leaveRoom(false);
                    return;
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
                    mode === "online"
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
                    mode === "online"
                ) {
                    onlineReplay();
                    return;
                }

                begin();
            }
        );

    /* =========================
       ONLINE REPLAY
    ========================= */

    async function onlineReplay() {
        if (
            !roomRef ||
            !onlineJoined ||
            onlineColor !== "w"
        ) {
            setMessage(
                "Chỉ người cầm Trắng có thể bắt đầu ván mới."
            );
            return;
        }

        try {
            const start =
                initialState();

            await roomRef
                .child("game")
                .set({
                    status: "playing",

                    board:
                        start.board,

                    turn: "w",

                    castling:
                        start.castling,

                    enPassant:
                        null,

                    history: [],

                    lastMove: null,

                    clocks: {
                        w: timeLimit,
                        b: timeLimit
                    },

                    turnStartedAt:
                        serverTimestamp(),

                    result: null,

                    winner: null,

                    updatedAt:
                        serverTimestamp()
                });

            await roomRef.update({
                status: "playing",
                whiteOnline: true,
                blackOnline: true
            });

            $("resultOverlay")
                .classList.add(
                    "hidden"
                );

            gameFinished = false;
            gameStarted = true;

            clocks = {
                w: timeLimit,
                b: timeLimit
            };

            startClock();
        }
        catch (error) {
            console.warn(
                "Online replay error:",
                error
            );
        }
    }

    /* =========================
       FLIP
    ========================= */

    $("flipBtn")
        .addEventListener(
            "click",
            () => {
                flipped = !flipped;

                soundClick();

                render();
            }
        );

    /* =========================
       RESIGN
    ========================= */

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

                    const winner =
                        opposite(
                            onlineColor
                        );

                    await publishOnlineFinish(
                        "resign",
                        winner
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

    /* =========================
       UNDO
    ========================= */

    $("undoBtn")
        .addEventListener(
            "click",
            () => {
                if (
                    mode === "online"
                ) {
                    setMessage(
                        "Không thể hoàn tác trong phòng online."
                    );
                    return;
                }

                if (
                    !gameStarted ||
                    gameFinished ||
                    aiThinking ||
                    history.length === 0
                ) {
                    return;
                }

                if (
                    mode === "ai"
                ) {
                    begin();
                    return;
                }

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
                                ChessCore.algebraicMove(
                                    move.from,
                                    move.to,
                                    move.promotion
                                ) === keep[i]
                        );

                    if (target) {
                        restored =
                            ChessCore.applyMove(
                                restored,
                                target
                            );
                    }
                }

                state = restored;
                history = keep;
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

    /* =========================
       VISIBILITY
    ========================= */

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                if (
                    roomRef &&
                    onlineColor
                ) {
                    markOnline();
                }
            }
        }
    );

    window.addEventListener(
        "focus",
        () => {
            if (
                roomRef &&
                onlineColor
            ) {
                markOnline();
            }
        }
    );

    /* =========================
       INIT
    ========================= */

    async function init() {
        try {
            if (
                window.GameHub &&
                GameHub.ready
            ) {
                await GameHub.ready;
            }

            currentUser =
                await ensureUser();

            console.log(
                "Chess ready:",
                currentUser.uid
            );
        }
        catch (error) {
            console.warn(
                "Chess Firebase init:",
                error
            );
        }
    }

    init();

})();
