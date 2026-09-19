(function () {

    "use strict";


    /* =========================================================
       CHECK CHESS CORE
    ========================================================== */

    if (!window.ChessCore) {

        console.error(
            "❌ ChessCore chưa được tải."
        );

        return;
    }


    const Chess =
        window.ChessCore;


    /* =========================================================
       DOM
    ========================================================== */

    const $ = id =>
        document.getElementById(id);


    /* =========================================================
       FILES
    ========================================================== */

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
       PIECES
    ========================================================== */

    const PIECE_GLYPHS = {

        w: {
            k: "♚︎",
            q: "♛︎",
            r: "♜︎",
            b: "♝︎",
            n: "♞︎",
            p: "♟︎"
        },

        b: {
            k: "♚︎",
            q: "♛︎",
            r: "♜︎",
            b: "♝︎",
            n: "♞︎",
            p: "♟︎"
        }

    };


    /* =========================================================
       STATE
    ========================================================== */

    let state = null;

    let history = [];

    let selected = null;

    let lastMove = null;

    let flipped = false;

    let mode = "ai";

    let difficulty = "medium";

    /*
     * Thời gian mặc định của game bình thường.
     * KHÔNG phải thời gian của ghép ngẫu nhiên.
     */
    let timeLimit = 300;


    let clocks = {

        w: 300,
        b: 300

    };


    let gameStarted = false;

    let gameFinished = false;

    let aiThinking = false;

    let clockTimer = null;


    /* =========================================================
       ONLINE
    ========================================================== */

    let db = null;

    let auth = null;

    let currentUser = null;

    let roomRef = null;

    let roomListener = null;

    let roomId = null;

    let onlineColor = null;

    let onlineJoined = false;

    let onlineMoveBusy = false;

    let drawBusy = false;

    let onlineResultShown = false;

    let onlineTurnStartedAt = null;

    let lastRemoteMoveKey = null;

    let lastDrawKey = null;


    /* =========================================================
       RANDOM MATCHMAKING
    ========================================================== */

    let matchmakingRef = null;

    let matchmakingListener = null;

    let matchmakingDisconnect = null;

    let matching = false;

    let matchingBusy = false;


    /*
     * QUAN TRỌNG:
     *
     * Ghép ngẫu nhiên luôn cố định 10 phút.
     *
     * 600 giây = 10 phút.
     */
    const RANDOM_MATCH_TIME = 600;


    /* =========================================================
       ANALYTICS
    ========================================================== */

    let analyticsTracked = false;


    /* =========================================================
       LOCAL DRAW
    ========================================================== */

    let localDrawPending = false;


    /* =========================================================
       TIME
    ========================================================== */

    function readTimeControl() {

        const select =
            $("timeControl");


        if (!select) {
            return 300;
        }


        const value =
            Number(
                select.value
            );


        if (
            !Number.isFinite(value) ||
            value < 0
        ) {

            return 300;
        }


        return value;
    }


    function formatTime(seconds) {

        if (
            timeLimit === 0
        ) {

            return "∞";
        }


        seconds =
            Number(seconds);


        if (
            !Number.isFinite(seconds)
        ) {

            seconds =
                timeLimit;
        }


        seconds =
            Math.max(
                0,
                Math.ceil(seconds)
            );


        return (

            Math.floor(
                seconds / 60
            )

            +

            ":" +

            String(
                seconds % 60
            ).padStart(
                2,
                "0"
            )

        );
    }


    /* =========================================================
       INITIAL STATE
    ========================================================== */

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
       BASIC UTIL
    ========================================================== */

    function row(index) {

        return Math.floor(
            index / 8
        );
    }


    function col(index) {

        return index % 8;
    }


    function opposite(color) {

        return color === "w"
            ? "b"
            : "w";
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
       MESSAGE
    ========================================================== */

    function setMessage(
        text
    ) {

        const element =
            $("message");


        if (
            element
        ) {

            element.textContent =
                text;
        }
    }


    function setRoomMessage(
        text
    ) {

        const element =
            $("roomMessage");


        if (
            element
        ) {

            element.textContent =
                text;
        }
    }


    /* =========================================================
       RANDOM MATCHMAKING UI
    ========================================================== */

    function setMatchmakingStatus(
        text,
        visible = true
    ) {

        const element =
            $("matchmakingStatus");


        if (!element) {
            return;
        }


        const textElement =
            element.querySelector(
                "span:last-child"
            );


        if (textElement) {

            textElement.textContent =
                text;
        }


        element.classList.toggle(
            "hidden",
            !visible
        );
    }


    function setMatchmakingUI(
        searching
    ) {

        const randomButton =
            $("randomMatchBtn");

        const cancelButton =
            $("cancelMatchBtn");

        const createButton =
            $("createRoomBtn");

        const joinButton =
            $("joinRoomBtn");


        if (randomButton) {

            randomButton.disabled =
                searching;
        }


        if (createButton) {

            createButton.disabled =
                searching;
        }


        if (joinButton) {

            joinButton.disabled =
                searching;
        }


        if (cancelButton) {

            cancelButton.classList.toggle(
                "hidden",
                !searching
            );
        }


        if (searching) {

            setMatchmakingStatus(
                "Đang tìm đối thủ...",
                true
            );

        } else {

            setMatchmakingStatus(
                "",
                false
            );
        }
    }


    function stopMatchmakingListener() {

        if (
            matchmakingListener &&
            matchmakingRef
        ) {

            matchmakingRef.off(
                "value",
                matchmakingListener
            );
        }


        matchmakingListener =
            null;
    }


    async function cleanupMatchmaking(
        removeEntry = true
    ) {

        stopMatchmakingListener();


        if (
            matchmakingDisconnect
        ) {

            try {

                await matchmakingDisconnect
                    .cancel();

            } catch (error) {

                console.warn(
                    "Matchmaking disconnect cancel:",
                    error
                );
            }


            matchmakingDisconnect =
                null;
        }


        if (
            removeEntry &&
            matchmakingRef
        ) {

            try {

                await matchmakingRef.remove();

            } catch (error) {

                console.warn(
                    "Matchmaking cleanup:",
                    error
                );
            }
        }


        matchmakingRef =
            null;


        matching =
            false;


        matchingBusy =
            false;


        setMatchmakingUI(
            false
        );
    }


    /* =========================================================
       AUTO ROOM ID
    ========================================================== */

    function generateAutoRoomId(
        uidA,
        uidB,
        time
    ) {

        const users =
            [
                String(uidA),
                String(uidB)
            ]
            .sort();


        return (
            "auto_" +
            users[0] +
            "_" +
            users[1] +
            "_" +
            String(time)
        );
    }


    /* =========================================================
       RANDOM MATCH
    ========================================================== */

    async function startRandomMatch() {

        /*
         * Nếu đang tìm rồi thì không làm gì.
         */

        if (
            matching ||
            matchingBusy
        ) {

            return;
        }


        /*
         * Đánh dấu NGAY LẬP TỨC.
         *
         * Trước đây code đợi ensureFirebase()
         * xong mới đổi UI nên khi Firebase chậm
         * người dùng tưởng bấm nút không phản hồi.
         */

        matchingBusy =
            true;


        matching =
            true;


        /*
         * Hiện UI ngay.
         */

        setMatchmakingUI(
            true
        );


        setMatchmakingStatus(
            "⏳ Đang kết nối máy chủ...",
            true
        );


        setRoomMessage(
            "🎲 Đang kết nối máy chủ..."
        );


        try {

            /*
             * Kết nối Firebase.
             */

            await ensureFirebase();


            if (
                !currentUser
            ) {

                throw new Error(
                    "Không xác định được người chơi."
                );
            }


            /*
             * QUAN TRỌNG:
             *
             * Ghép ngẫu nhiên KHÔNG lấy
             * thời gian từ #timeControl.
             *
             * Luôn luôn là 600 giây = 10 phút.
             */

            const randomTimeLimit =
                RANDOM_MATCH_TIME;


            /*
             * Gán timeLimit để đồng hồ
             * online dùng đúng 10 phút.
             */

            timeLimit =
                randomTimeLimit;


            setMatchmakingStatus(
                "🔎 Đang tìm đối thủ ...",
                true
            );


            setRoomMessage(
                "🎲 Đang tìm người chơi khác..."
            );


            const uid =
                currentUser.uid;


            /*
             * Entry của chính mình.
             */

            matchmakingRef =
                db.ref(
                    "matchmaking/chess/" +
                    uid
                );


            /*
             * Nếu đóng tab / mất kết nối,
             * Firebase tự xóa entry.
             */

            matchmakingDisconnect =
                matchmakingRef.onDisconnect();


            await matchmakingDisconnect.remove();


            /*
             * Lắng nghe entry của mình.
             */

            matchmakingListener =
                snapshot => {

                    const entry =
                        snapshot.val();


                    if (
                        !entry ||
                        !matching
                    ) {

                        return;
                    }


                    if (
                        entry.status ===
                        "matched"
                    ) {

                        handleRandomMatchFound(
                            entry
                        );
                    }
                };


            matchmakingRef.on(
                "value",
                matchmakingListener
            );


            /*
             * Queue chính.
             *
             * Transaction ở đây cần Firebase
             * cho phép READ + WRITE.
             */

            const queueRef =
                db.ref(
                    "matchmaking/chess"
                );


            const result =
                await queueRef.transaction(

                    current => {

                        const queue =
                            current || {};


                        const now =
                            Date.now();


                        /*
                         * Xóa người chờ quá 2 phút.
                         */

                        Object.keys(queue)
                            .forEach(
                                key => {

                                    const item =
                                        queue[key];


                                    if (
                                        !item
                                    ) {

                                        delete queue[key];

                                        return;
                                    }


                                    if (
                                        item.status ===
                                            "waiting" &&

                                        Number(
                                            item.createdAt
                                        ) <
                                            now - 120000
                                    ) {

                                        delete queue[key];
                                    }
                                }
                            );


                        /*
                         * Nếu mình đã được ghép
                         * thì giữ nguyên.
                         */

                        const mine =
                            queue[uid];


                        if (
                            mine &&
                            mine.status ===
                                "matched"
                        ) {

                            return queue;
                        }


                        /*
                         * Tìm người đang chờ
                         * cùng chế độ 10 phút.
                         */

                        let opponentUid =
                            null;


                        let opponent =
                            null;


                        Object.keys(queue)
                            .forEach(
                                key => {

                                    if (
                                        opponentUid
                                    ) {

                                        return;
                                    }


                                    if (
                                        key === uid
                                    ) {

                                        return;
                                    }


                                    const candidate =
                                        queue[key];


                                    if (
                                        !candidate
                                    ) {

                                        return;
                                    }


                                    if (
                                        candidate.status !==
                                            "waiting"
                                    ) {

                                        return;
                                    }


                                    /*
                                     * Chỉ ghép người
                                     * cũng đang tìm 10 phút.
                                     */

                                    if (
                                        Number(
                                            candidate.timeControl
                                        ) !==
                                        RANDOM_MATCH_TIME
                                    ) {

                                        return;
                                    }


                                    opponentUid =
                                        key;


                                    opponent =
                                        candidate;
                                }
                            );


                        /*
                         * Chưa có đối thủ.
                         * Đưa mình vào queue.
                         */

                        if (
                            !opponentUid
                        ) {

                            queue[uid] = {

                                uid:
                                    uid,

                                status:
                                    "waiting",

                                /*
                                 * Luôn 600.
                                 */

                                timeControl:
                                    RANDOM_MATCH_TIME,

                                createdAt:
                                    now

                            };


                            return queue;
                        }


                        /*
                         * Đã tìm thấy đối thủ.
                         */

                        const roomCode =
                            generateAutoRoomId(
                                uid,
                                opponentUid,
                                RANDOM_MATCH_TIME
                            );


                        const users =
                            [
                                uid,
                                opponentUid
                            ]
                            .sort();


                        const whiteUid =
                            users[0];


                        const blackUid =
                            users[1];


                        queue[uid] = {

                            uid:
                                uid,

                            status:
                                "matched",

                            timeControl:
                                RANDOM_MATCH_TIME,

                            opponentUid:
                                opponentUid,

                            roomId:
                                roomCode,

                            color:
                                uid === whiteUid
                                    ? "w"
                                    : "b"

                        };


                        queue[opponentUid] = {

                            uid:
                                opponentUid,

                            status:
                                "matched",

                            timeControl:
                                RANDOM_MATCH_TIME,

                            opponentUid:
                                uid,

                            roomId:
                                roomCode,

                            color:
                                opponentUid === whiteUid
                                    ? "w"
                                    : "b"

                        };


                        return queue;
                    },

                    undefined,

                    false
                );


            if (
                !result.committed
            ) {

                throw new Error(
                    "Không thể tham gia hàng chờ."
                );
            }


            /*
             * Lấy entry cuối cùng của mình.
             */

            const finalEntry =
                result.snapshot
                    .child(uid)
                    .val();


            if (
                finalEntry &&
                finalEntry.status ===
                    "matched"
            ) {

                await handleRandomMatchFound(
                    finalEntry
                );
            }


        } catch (error) {

            console.error(
                "❌ RANDOM MATCH:",
                error
            );


            await cleanupMatchmaking(
                true
            );


            setRoomMessage(
                "❌ Không thể ghép ngẫu nhiên: " +
                (
                    error?.message ||
                    "Lỗi không xác định"
                )
            );


            setMatchmakingStatus(
                "❌ Không thể ghép trận",
                true
            );


            /*
             * Cho người dùng thấy lỗi một lúc
             * rồi ẩn trạng thái.
             */

            setTimeout(
                () => {

                    if (
                        !matching &&
                        !matchingBusy
                    ) {

                        setMatchmakingStatus(
                            "",
                            false
                        );
                    }

                },
                2500
            );


        } finally {

            matchingBusy =
                false;
        }
    }


    /* =========================================================
       MATCH FOUND
    ========================================================== */

    async function handleRandomMatchFound(
        entry
    ) {

        if (
            !entry ||
            entry.status !==
                "matched"
        ) {

            return;
        }


        if (
            !currentUser
        ) {

            return;
        }


        /*
         * Tránh xử lý nhiều lần.
         */

        if (
            !matching
        ) {

            return;
        }


        matching =
            false;


        /*
         * Ghép ngẫu nhiên luôn 10 phút.
         */

        timeLimit =
            RANDOM_MATCH_TIME;


        setMatchmakingStatus(
            "🎉 Đã tìm thấy đối thủ!",
            true
        );


        setRoomMessage(
            "🎉 Đã tìm thấy đối thủ! Đang vào bàn cờ..."
        );


        const myUid =
            currentUser.uid;


        const opponentUid =
            entry.opponentUid;


        roomId =
            entry.roomId;


        onlineColor =
            entry.color;


        onlineJoined =
            true;


        onlineResultShown =
            false;


        lastRemoteMoveKey =
            null;


        lastDrawKey =
            null;


        analyticsTracked =
            false;


        /*
         * Dừng listener hàng chờ.
         */

        stopMatchmakingListener();


        if (
            matchmakingDisconnect
        ) {

            try {

                await matchmakingDisconnect
                    .cancel();

            } catch (error) {

                console.warn(
                    "Cancel matchmaking disconnect:",
                    error
                );
            }


            matchmakingDisconnect =
                null;
        }


        /*
         * Xóa mình khỏi queue.
         */

        if (
            matchmakingRef
        ) {

            try {

                await matchmakingRef.remove();

            } catch (error) {

                console.warn(
                    "Remove matched queue:",
                    error
                );
            }


            matchmakingRef =
                null;
        }


        setMatchmakingUI(
            false
        );


        updatePlayerNames();


        const reference =
            db.ref(
                "rooms/chess/" +
                roomId
            );


        roomRef =
            reference;


        /*
         * Người Trắng tạo phòng.
         */

        if (
            onlineColor === "w"
        ) {

            await createRandomMatchRoom(
                reference,
                myUid,
                opponentUid,
                RANDOM_MATCH_TIME
            );


            listenRoom();


            return;
        }


        /*
         * Người Đen chờ phòng.
         */

        setRoomMessage(
            "🎉 Đã ghép được đối thủ. Đang vào bàn cờ..."
        );


        const waitForRoom =
            snapshot => {

                const room =
                    snapshot.val();


                if (
                    !room
                ) {

                    return;
                }


                reference.off(
                    "value",
                    waitForRoom
                );


                roomRef =
                    reference;


                listenRoom();
            };


        reference.on(
            "value",
            waitForRoom
        );
    }


    /* =========================================================
       CREATE RANDOM ROOM
    ========================================================== */

    async function createRandomMatchRoom(
        reference,
        whiteUid,
        blackUid,
        time
    ) {

        /*
         * Ghép ngẫu nhiên luôn dùng 600.
         */

        time =
            RANDOM_MATCH_TIME;


        const start =
            initialState();


        await reference.set({

            gameName:
                "chess",

            matchmaking:
                true,

            timeControl:
                time,

            status:
                "playing",

            hostUid:
                whiteUid,

            whiteUid:
                whiteUid,

            blackUid:
                blackUid,

            createdAt:
                firebase
                    .database
                    .ServerValue
                    .TIMESTAMP,

            updatedAt:
                firebase
                    .database
                    .ServerValue
                    .TIMESTAMP,

            game: {

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
                        time,

                    b:
                        time

                },

                turnStartedAt:
                    firebase
                        .database
                        .ServerValue
                        .TIMESTAMP,

                result:
                    null,

                winner:
                    null,

                drawOffer:
                    null
            }
        });


        setRoomMessage(
            "🎉 Đã ghép được đối thủ!"
        );
    }


    /* =========================================================
       CANCEL RANDOM MATCH
    ========================================================== */

    async function cancelRandomMatch() {

        if (
            !matching &&
            !matchingBusy
        ) {

            return;
        }


        matching =
            false;


        matchingBusy =
            false;


        setMatchmakingStatus(
            "",
            false
        );


        await cleanupMatchmaking(
            true
        );


        setRoomMessage(
            "Đã hủy tìm trận."
        );
    }


    /* =========================================================
       SOUND
    ========================================================== */

    function playSound(
        file,
        volume = .6
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
            .4
        );
    }


    function soundMove() {

        playSound(
            "./chess_move.mp3",
            .55
        );
    }


    function soundCapture() {

        playSound(
            "./chess_capture.mp3",
            .6
        );
    }


    function soundCheck() {

        playSound(
            "./chess_check.mp3",
            .6
        );
    }


    function soundCheckmate() {

        playSound(
            "./chess_checkmate.mp3",
            .7
        );
    }


    function soundWin() {

        playSound(
            "./chess_win.mp3",
            .7
        );
    }


    function soundLose() {

        playSound(
            "./chess_lose.mp3",
            .7
        );
    }


    /* =========================================================
       GAMEHUB / FIREBASE
    ========================================================== */

    async function ensureFirebase() {

        if (
            window.GameHub &&
            window.GameHub.ready
        ) {

            try {

                await window.GameHub.ready;

            } catch (error) {

                console.warn(
                    "GameHub ready:",
                    error
                );
            }
        }


        if (
            window.GameHub
        ) {

            auth =
                window.GameHub
                    .getAuth?.();

            db =
                window.GameHub
                    .getDatabase?.();
        }


        if (
            !auth ||
            !db
        ) {

            const app =
                firebase.apps.find(
                    item =>
                        item.name ===
                        "GameHub"
                );


            if (
                app
            ) {

                auth =
                    app.auth();

                db =
                    app.database();
            }
        }


        if (
            !auth ||
            !db
        ) {

            throw new Error(
                "Firebase chưa sẵn sàng."
            );
        }


        if (
            auth.currentUser
        ) {

            currentUser =
                auth.currentUser;

        } else {

            const credential =
                await auth
                    .signInAnonymously();


            currentUser =
                credential.user;
        }


        return currentUser;
    }


    async function trackStart() {

        if (
            analyticsTracked
        ) {
            return;
        }


        analyticsTracked =
            true;


        try {

            await window.GameHub
                ?.startRound?.({

                    mode:
                        mode,

                    timeControl:
                        timeLimit,

                    difficulty:
                        mode === "ai"
                            ? difficulty
                            : null

                });

        } catch (error) {

            console.warn(
                "Analytics start:",
                error
            );
        }
    }


    async function trackEnd(
        result,
        winner
    ) {

        if (
            !analyticsTracked
        ) {
            return;
        }


        analyticsTracked =
            false;


        try {

            await window.GameHub
                ?.endRound?.({

                    result:
                        result,

                    winner:
                        winner || null,

                    mode:
                        mode

                });

        } catch (error) {

            console.warn(
                "Analytics end:",
                error
            );
        }
    }


    /* =========================================================
       CLOCK
    ========================================================== */

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


    function getOnlineRemaining(
        color
    ) {

        if (
            timeLimit === 0
        ) {

            return 0;
        }


        const base =
            Number(
                clocks[color]
            );


        if (
            !Number.isFinite(base)
        ) {

            return 0;
        }


        if (
            !onlineTurnStartedAt ||
            !state ||
            state.turn !== color
        ) {

            return base;
        }


        const elapsed =
            (
                Date.now() -
                Number(
                    onlineTurnStartedAt
                )
            ) / 1000;


        return Math.max(
            0,
            base - elapsed
        );
    }


    function updateClockUI() {

        if (
            !state
        ) {
            return;
        }


        let white =
            Number(
                clocks.w
            );


        let black =
            Number(
                clocks.b
            );


        if (
            mode === "online" &&
            onlineTurnStartedAt
        ) {

            if (
                state.turn === "w"
            ) {

                white =
                    getOnlineRemaining(
                        "w"
                    );

            } else {

                black =
                    getOnlineRemaining(
                        "b"
                    );
            }
        }


        $("whiteClock")
            .textContent =
            formatTime(
                white
            );


        $("blackClock")
            .textContent =
            formatTime(
                black
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


        $("whitePlayer")
            ?.classList
            .toggle(
                "active-clock",
                state.turn === "w"
            );


        $("blackPlayer")
            ?.classList
            .toggle(
                "active-clock",
                state.turn === "b"
            );
    }


    function startClock() {

        stopClock();


        updateClockUI();


        if (
            timeLimit === 0
        ) {
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


                    if (
                        mode === "online"
                    ) {

                        const color =
                            state.turn;


                        const remaining =
                            getOnlineRemaining(
                                color
                            );


                        updateClockUI();


                        if (
                            remaining <= 0 &&
                            onlineColor === color
                        ) {

                            publishOnlineFinish(
                                "time",
                                opposite(
                                    color
                                )
                            );
                        }


                        return;
                    }


                    /*
                     * LOCAL
                     */

                    clocks[
                        state.turn
                    ] -= .1;


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


                        finishLocal(
                            "time",
                            winner
                        );


                        return;
                    }


                    updateClockUI();

                },
                100
            );
    }


    /* =========================================================
       RENDER BOARD
    ========================================================== */

    function render() {

        const board =
            $("board");


        if (
            !board ||
            !state
        ) {
            return;
        }


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


        const king =
            Chess.kingIndex(
                state.board,
                state.turn
            );


        const checkedKing =
            king >= 0 &&
            Chess.inCheck(
                state.board,
                state.turn
            )
                ? king
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


            if (
                piece
            ) {

                const element =
                    document.createElement(
                        "span"
                    );


                element.className =
                    "piece " +
                    (
                        piece.c === "w"
                            ? "white-piece"
                            : "black-piece"
                    );


                element.textContent =
                    PIECE_GLYPHS[
                        piece.c
                    ][
                        piece.t
                    ];


                element.style.setProperty(
                    "opacity",
                    "1",
                    "important"
                );


                element.style.setProperty(
                    "color",
                    piece.c === "w"
                        ? "#ffffff"
                        : "#111111",
                    "important"
                );


                element.style.setProperty(
                    "-webkit-text-fill-color",
                    piece.c === "w"
                        ? "#ffffff"
                        : "#111111",
                    "important"
                );


                element.style.setProperty(
                    "-webkit-text-stroke",
                    piece.c === "w"
                        ? "1.2px #111111"
                        : "1.2px #000000",
                    "important"
                );


                element.style.setProperty(
                    "filter",
                    "none",
                    "important"
                );


                element.style.setProperty(
                    "text-shadow",
                    piece.c === "w"
                        ? "0 2px 3px rgba(0,0,0,.55)"
                        : "0 2px 3px rgba(0,0,0,.45)",
                    "important"
                );


                square.appendChild(
                    element
                );
            }


            /*
             * FILE
             */

            if (
                visual >= 56
            ) {

                const coord =
                    document.createElement(
                        "span"
                    );


                coord.className =
                    "coord file";


                coord.textContent =
                    FILES[
                        col(index)
                    ];


                square.appendChild(
                    coord
                );
            }


            /*
             * RANK
             */

            if (
                col(visual) === 0
            ) {

                const coord =
                    document.createElement(
                        "span"
                    );


                coord.className =
                    "coord rank";


                coord.textContent =
                    8 -
                    row(index);


                square.appendChild(
                    coord
                );
            }


            /*
             * MOVE INDICATOR
             */

            if (
                legalTargets.includes(
                    index
                )
            ) {

                if (
                    state.board[index]
                ) {

                    square.style.boxShadow =
                        "inset 0 0 0 4px rgba(239,68,68,.85)";

                } else {

                    square.style.boxShadow =
                        "inset 0 0 0 7px rgba(250,204,21,.42)";
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


        renderMoves();

        updateClockUI();
    }


    /* =========================================================
       MOVES
    ========================================================== */

    function renderMoves() {

        const element =
            $("moves");


        if (
            !element
        ) {
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


            const numberElement =
                document.createElement(
                    "span"
                );


            numberElement.className =
                "move-no";


            numberElement.textContent =
                number;


            const textElement =
                document.createElement(
                    "span"
                );


            textElement.textContent =
                history[i];


            rowElement.appendChild(
                numberElement
            );


            rowElement.appendChild(
                textElement
            );


            element.appendChild(
                rowElement
            );
        }


        element.scrollTop =
            element.scrollHeight;


        $("moveCount")
            .textContent =
            history.length;
    }


    /* =========================================================
       MOVE TEXT
    ========================================================== */

    function moveText(
        currentState,
        move
    ) {

        const piece =
            currentState.board[
                move.from
            ];


        if (
            !piece
        ) {
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
                    col(
                        move.from
                    )
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
       CHECK END
    ========================================================== */

    function checkEnd(
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
       LOCAL MOVE
    ========================================================== */

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
            checkEnd(
                state
            );


        if (
            end
        ) {

            finishLocal(
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
            state.turn === "b"
        ) {

            aiMove();
        }
    }


    /* =========================================================
       BOARD INPUT
    ========================================================== */

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


            if (
                move
            ) {

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


            render();


            return;
        }


        selected =
            null;


        render();
    }


    /* =========================================================
       START LOCAL GAME
    ========================================================== */

    function startLocalGame() {

        timeLimit =
            readTimeControl();


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


        onlineJoined =
            false;


        onlineColor =
            null;


        onlineTurnStartedAt =
            null;


        analyticsTracked =
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


        $("startBtn")
            .classList
            .remove("hidden");


        updatePlayerNames();

        updateModeText();


        trackStart();


        if (
            mode === "ai"
        ) {

            setMessage(
                "Bạn cầm Trắng. Chọn quân cờ để đi."
            );

        } else {

            setMessage(
                "Trắng đi trước."
            );
        }


        startClock();

        render();
    }


    /* =========================================================
       PLAYER NAMES
    ========================================================== */

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


    function updateModeText() {

        if (
            mode === "ai"
        ) {

            $("sideModeText")
                .textContent =
                "Đấu với máy";

        } else if (
            mode === "local"
        ) {

            $("sideModeText")
                .textContent =
                "2 người";

        } else {

            $("sideModeText")
                .textContent =
                "Chơi online";
        }
    }


    /* =========================================================
       LOCAL DRAW
    ========================================================== */

    function requestLocalDraw() {

        if (
            localDrawPending
        ) {
            return;
        }


        localDrawPending =
            true;


        $("drawOverlay")
            .classList
            .remove("hidden");
    }


    function acceptLocalDraw() {

        localDrawPending =
            false;


        $("drawOverlay")
            .classList
            .add("hidden");


        finishLocal(
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
       CREATE ROOM
    ========================================================== */

    async function createRoom() {

        const button =
            $("createRoomBtn");


        timeLimit =
            readTimeControl();


        try {

            await ensureFirebase();


            button.disabled =
                true;


            setRoomMessage(
                "⏳ Đang tạo phòng..."
            );


            let code =
                null;

            let reference =
                null;


            for (
                let i = 0;
                i < 20;
                i++
            ) {

                const candidate =
                    generateRoomCode();


                const testRef =
                    db.ref(
                        "rooms/chess/" +
                        candidate
                    );


                const snapshot =
                    await testRef.once(
                        "value"
                    );


                if (
                    !snapshot.exists()
                ) {

                    code =
                        candidate;

                    reference =
                        testRef;

                    break;
                }
            }


            if (
                !reference
            ) {

                throw new Error(
                    "Không tạo được mã phòng."
                );
            }


            const start =
                initialState();


            await reference.set({

                gameName:
                    "chess",

                timeControl:
                    timeLimit,

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

                updatedAt:
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

                    turnStartedAt:
                        null,

                    result:
                        null,

                    winner:
                        null,

                    drawOffer:
                        null
                }
            });


            roomId =
                code;


            roomRef =
                reference;


            onlineColor =
                "w";


            onlineJoined =
                true;


            onlineResultShown =
                false;


            $("roomCode")
                .textContent =
                code;


            $("createdRoom")
                .classList
                .remove("hidden");


            $("startBtn")
                .classList
                .add("hidden");


            setRoomMessage(
                "✅ Đã tạo phòng. Gửi mã cho đối thủ."
            );


            listenRoom();


        } catch (error) {

            console.error(
                "CREATE ROOM:",
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
    ========================================================== */

    async function joinRoom() {

        const button =
            $("joinRoomBtn");


        try {

            await ensureFirebase();


            const code =
                $("roomInput")
                    .value
                    .trim()
                    .toUpperCase();


            if (
                !/^[A-Z0-9]{6}$/.test(
                    code
                )
            ) {

                setRoomMessage(
                    "❌ Mã phòng phải gồm 6 ký tự."
                );

                return;
            }


            button.disabled =
                true;


            setRoomMessage(
                "⏳ Đang tìm phòng..."
            );


            const reference =
                db.ref(
                    "rooms/chess/" +
                    code
                );


            const snapshot =
                await reference.once(
                    "value"
                );


            const room =
                snapshot.val();


            console.log(
                "JOIN ROOM:",
                code,
                room
            );


            if (
                !room
            ) {

                setRoomMessage(
                    "❌ Không tìm thấy phòng."
                );

                return;
            }


            if (
                room.status !==
                "waiting"
            ) {

                setRoomMessage(
                    "❌ Phòng đã bắt đầu hoặc đã đóng."
                );

                return;
            }


            if (
                room.hostUid ===
                currentUser.uid
            ) {

                setRoomMessage(
                    "❌ Đây là phòng bạn vừa tạo."
                );

                return;
            }


            if (
                room.blackUid
            ) {

                setRoomMessage(
                    "❌ Phòng đã đủ người."
                );

                return;
            }


            if (
                Number.isFinite(
                    Number(
                        room.timeControl
                    )
                )
            ) {

                timeLimit =
                    Number(
                        room.timeControl
                    );


                $("timeControl")
                    .value =
                    String(
                        timeLimit
                    );
            }


            await reference.update({

                blackUid:
                    currentUser.uid,

                status:
                    "playing",

                "game/status":
                    "playing",

                "game/turnStartedAt":
                    firebase
                        .database
                        .ServerValue
                        .TIMESTAMP,

                "game/clocks/w":
                    timeLimit,

                "game/clocks/b":
                    timeLimit,

                updatedAt:
                    firebase
                        .database
                        .ServerValue
                        .TIMESTAMP
            });


            roomId =
                code;


            roomRef =
                reference;


            onlineColor =
                "b";


            onlineJoined =
                true;


            onlineResultShown =
                false;


            lastRemoteMoveKey =
                null;


            lastDrawKey =
                null;


            setRoomMessage(
                "✅ Đã vào phòng!"
            );


            listenRoom();


        } catch (error) {

            console.error(
                "JOIN ROOM:",
                error
            );


            setRoomMessage(
                "❌ Không thể vào phòng: " +
                error.message
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =========================================================
       LISTEN ROOM
    ========================================================== */

    function listenRoom() {

        if (
            !roomRef
        ) {
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
    ========================================================== */

    function handleRoom(
        room
    ) {

        if (
            !room
        ) {

            setRoomMessage(
                "❌ Phòng không còn tồn tại."
            );

            return;
        }


        if (
            Number.isFinite(
                Number(
                    room.timeControl
                )
            )
        ) {

            timeLimit =
                Number(
                    room.timeControl
                );
        }


        if (
            currentUser
        ) {

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
        }


        updatePlayerNames();


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


            return;
        }


        if (
            room.status ===
            "playing" ||
            room.status ===
            "finished"
        ) {

            openOnlineGame(
                room
            );

            return;
        }


        if (
            room.status ===
            "closed"
        ) {

            setMessage(
                "Phòng đã đóng."
            );
        }
    }


    /* =========================================================
       OPEN ONLINE
    ========================================================== */

    function openOnlineGame(
        room
    ) {

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


        updateModeText();

        updatePlayerNames();


        if (
            room.game
        ) {

            applyOnlineGame(
                room.game
            );
        }
    }


    /* =========================================================
       APPLY ONLINE GAME
    ========================================================== */

    function applyOnlineGame(
        remote
    ) {

        if (
            !remote
        ) {
            return;
        }


        const remoteWhite =
    Number(remote.clocks?.w);

const remoteBlack =
    Number(remote.clocks?.b);


if (
    Number.isFinite(remoteWhite) &&
    Number.isFinite(remoteBlack)
) {

    clocks = {

        w:
            Math.max(
                0,
                remoteWhite
            ),

        b:
            Math.max(
                0,
                remoteBlack
            )

    };

} else {

    console.warn(
        "⚠️ Clock Firebase không hợp lệ:",
        remote.clocks
    );

    return;
}


        const remoteBoard =
    Array.isArray(remote.board)
        ? remote.board
        : Object.keys(remote.board || {})
            .sort(
                (a, b) =>
                    Number(a) - Number(b)
            )
            .map(
                key =>
                    remote.board[key]
            );


if (
    remoteBoard.length !== 64
) {

    console.error(
        "❌ Board Firebase không hợp lệ:",
        remote.board
    );

    return;
}


state = {

    board:
        remoteBoard,

    turn:
        remote.turn === "b"
            ? "b"
            : "w",

    castling:
        remote.castling || {

            wK: false,
            wQ: false,
            bK: false,
            bQ: false

        },

    enPassant:
        remote.enPassant ?? null

};


        history =
            Array.isArray(
                remote.history
            )
                ? remote.history
                : [];


        lastMove =
            remote.lastMove ||
            null;


        onlineTurnStartedAt =
            Number(
                remote.turnStartedAt
            ) || null;


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


        if (
            remote.lastMove
        ) {

            const moveKey =
                history.length +
                ":" +
                remote.lastMove.from +
                ":" +
                remote.lastMove.to;


            if (
                moveKey !==
                lastRemoteMoveKey
            ) {

                lastRemoteMoveKey =
                    moveKey;


                if (
                    history.length > 0
                ) {

                    soundMove();
                }
            }
        }


        processDrawOffer(
            remote.drawOffer
        );


        if (
            remote.status ===
            "finished"
        ) {

            gameFinished =
                true;


            stopClock();


            render();


            showOnlineResult(
                remote.result,
                remote.winner
            );


            return;
        }


        gameFinished =
            false;


        startClock();


        updateOnlineMessage();


        render();
    }


    /* =========================================================
       ONLINE MESSAGE
    ========================================================== */

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
       ONLINE INPUT
    ========================================================== */

    function handleOnlineSquare(
        index
    ) {

        if (
            !onlineJoined ||
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


            if (
                move
            ) {

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


            render();


            return;
        }


        selected =
            null;


        render();
    }


    /* =========================================================
       SEND ONLINE MOVE
    ========================================================== */

    async function sendOnlineMove(
        move
    ) {

        if (
            onlineMoveBusy ||
            !roomRef ||
            !state ||
            gameFinished
        ) {

            return;
        }


        if (
            state.turn !==
            onlineColor
        ) {

            return;
        }


        onlineMoveBusy =
            true;


        try {

            let remaining =
                getOnlineRemaining(
                    state.turn
                );


            if (
                timeLimit > 0 &&
                remaining <= 0
            ) {

                await publishOnlineFinish(
                    "time",
                    opposite(
                        state.turn
                    )
                );

                return;
            }


            const current = {

                board:
                    state.board,

                turn:
                    state.turn,

                castling:
                    state.castling,

                enPassant:
                    state.enPassant

            };


            const legal =
                Chess.legalMovesFrom(
                    current,
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


            if (
                !valid
            ) {
                return;
            }


            const notation =
                moveText(
                    current,
                    valid
                );


            const next =
    Chess.applyMove(
        {
            board: Array.isArray(current.board)
                ? current.board.slice()
                : Object.values(current.board || {}),

            turn:
                current.turn,

            castling:
                {
                    ...current.castling
                },

            enPassant:
                current.enPassant
        },
        valid
    );

if (
    !next ||
    !Array.isArray(next.board) ||
    next.board.length !== 64
) {
    throw new Error(
        "Trạng thái bàn cờ sau nước đi không hợp lệ."
    );
}


            const newHistory =
                [
                    ...history,
                    notation
                ];


            const end =
                checkEnd(
                    next
                );


            const newClocks = {

    w:
        Math.max(
            0,
            Number(clocks.w) || 0
        ),

    b:
        Math.max(
            0,
            Number(clocks.b) || 0
        )

};


            if (
                timeLimit > 0
            ) {

                newClocks[
                    current.turn
                ] =
                    remaining;
            }


            await roomRef
                .child("game")
                .update({

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
                        newHistory,

                    lastMove: {

                        from:
                            valid.from,

                        to:
                            valid.to
                    },

                    clocks:
                        newClocks,

                    turnStartedAt:
                        end
                            ? null
                            : firebase
                                .database
                                .ServerValue
                                .TIMESTAMP,

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
                });


            selected =
                null;


        } catch (error) {

            console.error(
                "ONLINE MOVE:",
                error
            );


            setMessage(
                "❌ Không thể gửi nước đi."
            );

        } finally {

            onlineMoveBusy =
                false;
        }
    }


    /* =========================================================
       DRAW ONLINE
    ========================================================== */

    async function requestOnlineDraw() {

        if (
            !roomRef ||
            !state ||
            gameFinished ||
            drawBusy
        ) {

            return;
        }


        drawBusy =
            true;


        try {

            const snapshot =
                await roomRef
                    .child("game")
                    .once("value");


            const game =
                snapshot.val();


            if (
                !game ||
                game.status !==
                    "playing"
            ) {

                return;
            }


            if (
                game.drawOffer
            ) {

                setMessage(
                    "Đang có yêu cầu hòa."
                );

                return;
            }


            await roomRef
                .child("game/drawOffer")
                .set({

                    uid:
                        currentUser.uid,

                    from:
                        onlineColor,

                    timestamp:
                        firebase
                            .database
                            .ServerValue
                            .TIMESTAMP
                });


            setMessage(
                "🤝 Đã gửi yêu cầu hòa."
            );


        } catch (error) {

            console.error(
                "DRAW:",
                error
            );


            setMessage(
                "❌ Không thể gửi yêu cầu hòa."
            );


        } finally {

            drawBusy =
                false;
        }
    }


    function processDrawOffer(
        offer
    ) {

        if (
            !offer
        ) {

            $("drawOverlay")
                .classList
                .add("hidden");

            return;
        }


        if (
            offer.from ===
            onlineColor
        ) {

            setMessage(
                "🤝 Đang chờ đối thủ trả lời yêu cầu hòa."
            );

            return;
        }


        const key =
            String(
                offer.uid
            ) +
            "-" +
            String(
                offer.timestamp
            );


        if (
            key ===
            lastDrawKey
        ) {

            return;
        }


        lastDrawKey =
            key;


        $("drawOverlay")
            .classList
            .remove("hidden");
    }


    async function respondOnlineDraw(
        accept
    ) {

        if (
            !roomRef ||
            drawBusy
        ) {

            return;
        }


        drawBusy =
            true;


        try {

            const snapshot =
                await roomRef
                    .child("game")
                    .once("value");


            const game =
                snapshot.val();


            if (
                !game ||
                !game.drawOffer
            ) {

                $("drawOverlay")
                    .classList
                    .add("hidden");

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

                await roomRef
                    .child("game")
                    .update({

                        status:
                            "finished",

                        result:
                            "draw",

                        winner:
                            null,

                        drawOffer:
                            null,

                        turnStartedAt:
                            null,

                        updatedAt:
                            firebase
                                .database
                                .ServerValue
                                .TIMESTAMP
                    });

            } else {

                await roomRef
                    .child(
                        "game/drawOffer"
                    )
                    .remove();


                setMessage(
                    "Đã từ chối yêu cầu hòa."
                );
            }


            $("drawOverlay")
                .classList
                .add("hidden");


        } catch (error) {

            console.error(
                "DRAW RESPONSE:",
                error
            );

        } finally {

            drawBusy =
                false;
        }
    }


    /* =========================================================
       ONLINE FINISH
    ========================================================== */

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
                .update({

                    status:
                        "finished",

                    result:
                        reason,

                    winner:
                        winner,

                    drawOffer:
                        null,

                    turnStartedAt:
                        null,

                    updatedAt:
                        firebase
                            .database
                            .ServerValue
                            .TIMESTAMP
                });

        } catch (error) {

            console.error(
                "ONLINE FINISH:",
                error
            );
        }
    }


    /* =========================================================
       ONLINE RESULT
    ========================================================== */

    async function showOnlineResult(
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
            "Ván cờ kết thúc với kết quả hòa.";


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
                "♛";


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
                "Xin thua";


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


        $("drawOverlay")
            .classList
            .add("hidden");


        $("resultOverlay")
            .classList
            .remove("hidden");


        await trackEnd(
            analyticsResult,
            winner
        );
    }


    /* =========================================================
       LOCAL FINISH
    ========================================================== */

    async function finishLocal(
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


        let title =
            "Hòa cờ";


        let text =
            "Ván cờ hòa.";


        let icon =
            "🤝";


        let result =
            "draw";


        if (
            reason ===
            "checkmate"
        ) {

            title =
                "Chiếu hết!";


            icon =
                "♛";


            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";


            if (
                mode === "ai"
            ) {

                result =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                result =
                    "win";
            }


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
                " thắng.";


            if (
                mode === "ai"
            ) {

                result =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                result =
                    "win";
            }


        } else if (
            reason ===
            "resign"
        ) {

            title =
                "Xin thua";


            icon =
                "🏳️";


            text =
                (
                    winner === "w"
                        ? "Trắng"
                        : "Đen"
                ) +
                " thắng.";


            if (
                mode === "ai"
            ) {

                result =
                    winner === "w"
                        ? "win"
                        : "loss";

            } else {

                result =
                    "win";
            }
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


        await trackEnd(
            result,
            winner
        );
    }


    /* =========================================================
       RESIGN ONLINE
    ========================================================== */

    async function resignOnline() {

        if (
            !roomRef ||
            gameFinished
        ) {

            return;
        }


        await publishOnlineFinish(
            "resign",
            opposite(
                onlineColor
            )
        );
    }


    /* =========================================================
       LEAVE ROOM
    ========================================================== */

    async function leaveRoom() {

        if (
            matching ||
            matchingBusy
        ) {

            await cancelRandomMatch();
        }


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


        roomRef =
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

                    if (
                        room.hostUid ===
                        currentUser.uid
                    ) {

                        await reference.update({

                            status:
                                "closed",

                            updatedAt:
                                firebase
                                    .database
                                    .ServerValue
                                    .TIMESTAMP

                        });

                    } else {

                        await reference.update({

                            blackUid:
                                null,

                            status:
                                "waiting",

                            "game/status":
                                "waiting",

                            "game/turnStartedAt":
                                null,

                            "game/drawOffer":
                                null,

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


        roomId =
            null;


        onlineColor =
            null;


        onlineJoined =
            false;


        onlineTurnStartedAt =
            null;


        gameStarted =
            false;


        gameFinished =
            false;


        state =
            null;


        history =
            [];


        selected =
            null;


        lastMove =
            null;


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


        $("resultOverlay")
            .classList
            .add("hidden");


        $("drawOverlay")
            .classList
            .add("hidden");


        $("startBtn")
            .classList
            .remove("hidden");


        setRoomMessage(
            "Đã rời phòng."
        );
    }


    /* =========================================================
       AI
    ========================================================== */

    const VALUES = {

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


                const legal =
                    Chess.legalMoves(
                        state
                    );


                if (
                    legal.length === 0
                ) {

                    aiThinking =
                        false;

                    return;
                }


                let move;


                if (
                    difficulty ===
                    "easy"
                ) {

                    move =
                        legal[
                            Math.floor(
                                Math.random() *
                                legal.length
                            )
                        ];

                } else {

                    move =
                        chooseAIMove(
                            legal
                        );
                }


                aiThinking =
                    false;


                makeLocalMove(
                    move
                );

            },

            difficulty === "hard"
                ? 600
                : 350
        );
    }


    function chooseAIMove(
        legal
    ) {

        let best =
            legal[0];


        let bestScore =
            -Infinity;


        for (
            const move
            of legal
        ) {

            const next =
                Chess.applyMove(
                    state,
                    move
                );


            let score =
                evaluate(
                    next
                );


            const captured =
                state.board[
                    move.to
                ];


            if (
                captured
            ) {

                score +=
                    VALUES[
                        captured.t
                    ] || 0;
            }


            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                best =
                    move;
            }
        }


        return best;
    }


    function evaluate(
        current
    ) {

        let score =
            0;


        for (
            const piece
            of current.board
        ) {

            if (
                !piece
            ) {
                continue;
            }


            const value =
                VALUES[
                    piece.t
                ] || 0;


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


        return score;
    }


    /* =========================================================
       BUTTON EVENTS
    ========================================================== */

    $("startBtn")
        ?.addEventListener(
            "click",
            () => {

                startLocalGame();
            }
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

                        /*
                         * Nếu đang tìm trận mà chuyển
                         * sang chế độ khác thì tự hủy.
                         */

                        if (
                            mode === "online" &&
                            button.dataset.mode !== "online" &&
                            (
                                matching ||
                                matchingBusy
                            )
                        ) {

                            cancelRandomMatch();
                        }


                        mode =
                            button.dataset.mode;


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


                        button.classList
                            .add(
                                "active"
                            );


                        $("difficultyWrap")
                            .classList
                            .toggle(
                                "hidden",
                                mode !== "ai"
                            );


                        $("onlinePanel")
                            .classList
                            .toggle(
                                "hidden",
                                mode !== "online"
                            );


                        $("startBtn")
                            .classList
                            .toggle(
                                "hidden",
                                mode === "online"
                            );


                        updateModeText();
                    }
                );
            }
        );


    $("difficulty")
        ?.addEventListener(
            "change",
            event => {

                difficulty =
                    event.target.value;
            }
        );


    $("timeControl")
        ?.addEventListener(
            "change",
            event => {

                const value =
                    Number(
                        event.target.value
                    );


                timeLimit =
                    Number.isFinite(
                        value
                    )
                        ? Math.max(
                            0,
                            value
                        )
                        : 300;


                console.log(
                    "Chess time:",
                    timeLimit
                );
            }
        );


    $("createRoomBtn")
        ?.addEventListener(
            "click",
            createRoom
        );


    $("joinRoomBtn")
        ?.addEventListener(
            "click",
            joinRoom
        );


    $("randomMatchBtn")
        ?.addEventListener(
            "click",
            startRandomMatch
        );


    $("cancelMatchBtn")
        ?.addEventListener(
            "click",
            cancelRandomMatch
        );


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


    $("roomInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    joinRoom();
                }
            }
        );


    $("copyRoomBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    !roomId
                ) {
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


    $("copyGameRoomBtn")
        ?.addEventListener(
            "click",
            async () => {

                if (
                    !roomId
                ) {
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


    $("leaveWaitingBtn")
        ?.addEventListener(
            "click",
            leaveRoom
        );


    $("leaveOnlineBtn")
        ?.addEventListener(
            "click",
            leaveRoom
        );


    $("drawBtn")
        ?.addEventListener(
            "click",
            () => {

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
                    mode === "local"
                ) {

                    requestLocalDraw();

                } else {

                    requestOnlineDraw();
                }
            }
        );


    $("acceptDrawBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    mode === "online"
                ) {

                    respondOnlineDraw(
                        true
                    );

                } else {

                    acceptLocalDraw();
                }
            }
        );


    $("rejectDrawBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    mode === "online"
                ) {

                    respondOnlineDraw(
                        false
                    );

                } else {

                    rejectLocalDraw();
                }
            }
        );


    $("resignBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    !gameStarted ||
                    gameFinished
                ) {
                    return;
                }


                if (
                    mode === "online"
                ) {

                    resignOnline();

                } else {

                    finishLocal(
                        "resign",
                        opposite(
                            state.turn
                        )
                    );
                }
            }
        );


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


    $("newGameTop")
        ?.addEventListener(
            "click",
            () => {

                if (
                    mode === "online"
                ) {

                    setMessage(
                        "Ván online hiện tại đang trong phòng."
                    );

                    return;
                }


                startLocalGame();
            }
        );


    /* =========================================================
       REPLAY
    ========================================================== */

    $("replayBtn")
        ?.addEventListener(
            "click",
            async () => {

                $("resultOverlay")
                    .classList
                    .add("hidden");


                if (
                    mode !== "online"
                ) {

                    startLocalGame();

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


                if (
                    !roomRef
                ) {
                    return;
                }


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

                        turnStartedAt:
                            firebase
                                .database
                                .ServerValue
                                .TIMESTAMP,

                        result:
                            null,

                        winner:
                            null,

                        drawOffer:
                            null
                    });


                onlineResultShown =
                    false;
            }
        );


    /* =========================================================
       MENU
    ========================================================== */

    async function goMenu() {

        if (
            roomRef
        ) {

            await leaveRoom();
        }


        location.href =
            "../../index.html";
    }


    $("menuBtn")
        ?.addEventListener(
            "click",
            goMenu
        );


    $("backMenuBtn")
        ?.addEventListener(
            "click",
            goMenu
        );


    /* =========================================================
       INIT
    ========================================================== */

    async function init() {

        try {

            await ensureFirebase();


            updatePlayerNames();

            updateModeText();


            timeLimit =
                readTimeControl();


            updateClockUI();


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
                "Time:",
                timeLimit
            );


            console.log(
                "Random Match Time:",
                RANDOM_MATCH_TIME,
                "seconds = 10 minutes"
            );


            console.log(
                "================================"
            );


        } catch (error) {

            console.error(
                "Chess init:",
                error
            );
        }
    }


    init();

})();
