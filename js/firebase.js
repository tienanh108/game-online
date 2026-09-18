/* =====================================================
   CARO 5 - FIREBASE ONLINE
   STABLE VERSION
===================================================== */


/* ================= CONFIG ================= */

const FIREBASE_CONFIG = {

    apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",

    authDomain: "caro-3460d.firebaseapp.com",

    databaseURL:
        "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",

    projectId: "caro-3460d",

    storageBucket:
        "caro-3460d.firebasestorage.app",

    messagingSenderId: "473059233945",

    appId:
        "1:473059233945:web:7bbf037f41a8a8d331e808",

    measurementId: "G-WXXMSSSN3W"
};


/* ================= STATE ================= */

let firebaseReady = false;
let firebaseUser = null;

let onlineMode = false;

let onlineRoomCode = "";
let onlineRole = "";

let onlineRoomRef = null;
let onlineRoomListener = null;

let onlineTimerInterval = null;


/* =====================================================
   FIREBASE INIT
===================================================== */

async function initFirebase() {

    const status =
        document.getElementById("firebaseStatus");

    try {

        console.log("Firebase: bắt đầu khởi tạo...");

        if (typeof firebase === "undefined") {

            throw new Error(
                "Firebase SDK chưa được tải."
            );
        }


        /* Initialize */

        if (!firebase.apps.length) {

            firebase.initializeApp(
                FIREBASE_CONFIG
            );
        }


        /* Auth */

        if (!firebase.auth().currentUser) {

            console.log(
                "Firebase: đang đăng nhập Anonymous..."
            );

            await firebase.auth()
                .signInAnonymously();
        }


        firebaseUser =
            firebase.auth().currentUser;


        if (!firebaseUser) {

            throw new Error(
                "Anonymous Authentication không tạo được user."
            );
        }


        console.log(
            "Firebase Auth OK:",
            firebaseUser.uid
        );


        /* Database */

        const testRef =
            firebase.database()
                .ref(".info/connected");


        testRef.on(
            "value",
            snapshot => {

                console.log(
                    "Firebase Database connected:",
                    snapshot.val()
                );
            }
        );


        firebaseReady = true;


        if (status) {

            status.textContent =
                "● Online đã sẵn sàng";

            status.style.color =
                "#16a34a";
        }


        console.log(
            "Firebase khởi tạo thành công."
        );

    } catch (error) {

        firebaseReady = false;

        console.error(
            "========== FIREBASE INIT ERROR =========="
        );

        console.error(error);

        console.error(
            "code:",
            error.code
        );

        console.error(
            "message:",
            error.message
        );

        console.error(
            "========================================="
        );


        if (status) {

            status.textContent =
                "● Online lỗi";

            status.style.color =
                "#dc2626";
        }
    }
}


/* =====================================================
   ROOM CODE
===================================================== */

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        code += chars[
            Math.floor(
                Math.random() * chars.length
            )
        ];
    }

    return code;
}


/* =====================================================
   CREATE ROOM
===================================================== */

async function createOnlineRoom() {

    try {

        if (!firebaseReady) {

            alert(
                "Firebase chưa sẵn sàng."
            );

            return;
        }


        if (!firebaseUser) {

            firebaseUser =
                firebase.auth().currentUser;
        }


        if (!firebaseUser) {

            alert(
                "Chưa đăng nhập Firebase."
            );

            return;
        }


        const select =
            document.getElementById(
                "boardSizeSelect"
            );


        const size =
            Number(select.value);


        let roomRef = null;
        let code = "";


        /* Tìm mã phòng */

        for (
            let attempt = 0;
            attempt < 20;
            attempt++
        ) {

            code =
                generateRoomCode();


            const ref =
                firebase.database()
                    .ref("rooms")
                    .child(code);


            const snapshot =
                await ref.once("value");


            if (!snapshot.exists()) {

                roomRef = ref;

                break;
            }
        }


        if (!roomRef) {

            throw new Error(
                "Không tạo được mã phòng."
            );
        }


        /* Room */

        const room = {

            playerX:
                firebaseUser.uid,

            playerO: "",

            size:
                size,

            board:
                new Array(
                    size * size
                ).fill(""),

            currentPlayer:
                "X",

            gameStarted:
                false,

            gameOver:
                false,

            winner:
                "",

            turnStartedAt:
                null,

            lastMove:
                -1,

            scoreX:
                0,

            scoreO:
                0
        };


        console.log(
            "Đang tạo phòng:",
            code
        );


        /* WRITE */

        await roomRef.set(room);


        console.log(
            "CREATE WRITE OK:",
            code
        );


        /* Auto delete */

        roomRef
            .onDisconnect()
            .remove();


        onlineMode = true;

        onlineRoomCode =
            code;

        onlineRole =
            "X";

        onlineRoomRef =
            roomRef;


        openOnlineGame(
            code,
            "X",
            room
        );


        listenToRoom(code);


        alert(
            "Tạo phòng thành công!\n\n" +
            "Mã phòng: " +
            code
        );


    } catch (error) {

        console.error(
            "========== CREATE ROOM ERROR =========="
        );

        console.error(error);

        console.error(
            "code:",
            error.code
        );

        console.error(
            "message:",
            error.message
        );

        console.error(
            "========================================"
        );


        let message =
            "Không thể tạo phòng.";


        if (
            error.code ===
            "PERMISSION_DENIED"
        ) {

            message +=
                "\n\nFirebase từ chối quyền ghi.";
        }


        if (
            error.code ===
            "auth/operation-not-allowed"
        ) {

            message +=
                "\n\nAnonymous Authentication chưa được bật.";
        }


        alert(
            message +
            "\n\n" +
            (error.message || "")
        );
    }
}


/* =====================================================
   JOIN ROOM
===================================================== */

async function joinOnlineRoom(code) {

    try {

        if (!firebaseReady) {

            alert(
                "Firebase chưa sẵn sàng."
            );

            return;
        }


        if (!firebaseUser) {

            firebaseUser =
                firebase.auth().currentUser;
        }


        if (!firebaseUser) {

            alert(
                "Chưa đăng nhập Firebase."
            );

            return;
        }


        code =
            String(code)
                .trim()
                .toUpperCase();


        if (!/^[A-Z0-9]{6}$/.test(code)) {

            alert(
                "Mã phòng phải gồm 6 ký tự."
            );

            return;
        }


        console.log(
            "JOIN:",
            code
        );


        const roomRef =
            firebase.database()
                .ref("rooms")
                .child(code);


        /* READ */

        const snapshot =
            await roomRef.once("value");


        if (!snapshot.exists()) {

            alert(
                "Không tìm thấy phòng " +
                code
            );

            return;
        }


        const room =
            snapshot.val();


        console.log(
            "ROOM:",
            room
        );


        /* Chủ phòng */

        if (
            room.playerX ===
            firebaseUser.uid
        ) {

            onlineMode = true;

            onlineRoomCode =
                code;

            onlineRole =
                "X";

            onlineRoomRef =
                roomRef;


            openOnlineGame(
                code,
                "X",
                room
            );


            listenToRoom(code);

            return;
        }


        /* Đã có O */

        if (
            room.playerO &&
            room.playerO !==
            firebaseUser.uid
        ) {

            alert(
                "Phòng đã đủ 2 người."
            );

            return;
        }


        /* =============================================
           JOIN O
        ============================================= */


        const updates = {

            playerO:
                firebaseUser.uid,

            gameStarted:
                true,

            gameOver:
                false,

            winner:
                "",

            currentPlayer:
                "X",

            turnStartedAt:
                firebase.database
                    .ServerValue
                    .TIMESTAMP
        };


        console.log(
            "Đang cập nhật playerO..."
        );


        /*
         * Dùng update thay transaction.
         * Dễ debug hơn và phù hợp Rules hiện tại.
         */

        await roomRef.update(
            updates
        );


        console.log(
            "JOIN UPDATE OK"
        );


        /* Đọc lại */

        const updated =
            await roomRef.once("value");


        const newRoom =
            updated.val();


        if (
            !newRoom ||
            newRoom.playerO !==
            firebaseUser.uid
        ) {

            throw new Error(
                "Firebase không xác nhận người chơi O."
            );
        }


        onlineMode = true;

        onlineRoomCode =
            code;

        onlineRole =
            "O";

        onlineRoomRef =
            roomRef;


        openOnlineGame(
            code,
            "O",
            newRoom
        );


        listenToRoom(code);


        console.log(
            "JOIN ROOM SUCCESS:",
            code
        );


    } catch (error) {

        console.error(
            "========== JOIN ROOM ERROR =========="
        );

        console.error(error);

        console.error(
            "code:",
            error.code
        );

        console.error(
            "message:",
            error.message
        );

        console.error(
            "======================================"
        );


        let message =
            "Không thể vào phòng.";


        if (
            error.code ===
            "PERMISSION_DENIED"
        ) {

            message +=
                "\n\nFirebase đang từ chối quyền cập nhật.";
        }


        alert(
            message +
            "\n\n" +
            (error.message || "")
        );
    }
}


/* =====================================================
   OPEN ONLINE GAME
===================================================== */

function openOnlineGame(
    code,
    role,
    room
) {

    boardSize =
        Number(room.size);


    if (Array.isArray(room.board)) {

        board =
            room.board.slice();

    } else {

        board =
            Object.values(
                room.board || {}
            );
    }


    currentPlayer =
        room.currentPlayer || "X";


    gameOver =
        !!room.gameOver;


    lastMoveIndex =
        typeof room.lastMove === "number"
            ? room.lastMove
            : -1;


    scoreX =
        Number(room.scoreX || 0);


    scoreO =
        Number(room.scoreO || 0);


    document.getElementById(
        "menuScreen"
    ).classList.add("hidden");


    document.getElementById(
        "gameScreen"
    ).classList.remove("hidden");


    document.getElementById(
        "roomInfo"
    ).textContent =
        "Phòng " +
        code +
        " • Bạn là " +
        role;


    document.getElementById(
        "copyRoomButton"
    ).classList.remove("hidden");


    document.getElementById(
        "copyLinkButton"
    ).classList.remove("hidden");


    document.getElementById(
        "newGameButton"
    ).classList.toggle(
        "hidden",
        role !== "X"
    );


    document.getElementById(
        "scoreX"
    ).textContent =
        scoreX;


    document.getElementById(
        "scoreO"
    ).textContent =
        scoreO;


    renderBoard();

    updateCells();

    updateOnlineInfo(room);

    updateOnlineTimer(room);
}


/* =====================================================
   LISTEN ROOM
===================================================== */

function listenToRoom(code) {

    if (onlineRoomListener) {

        onlineRoomListener();

        onlineRoomListener = null;
    }


    const roomRef =
        firebase.database()
            .ref("rooms")
            .child(code);


    onlineRoomRef =
        roomRef;


    const listener =
        snapshot => {

            if (!snapshot.exists()) {

                stopOnlineTimer();

                alert(
                    "Phòng đã đóng."
                );


                onlineMode = false;

                onlineRoomCode = "";

                onlineRole = "";

                showMenu();

                return;
            }


            const room =
                snapshot.val();


            boardSize =
                Number(room.size);


            if (Array.isArray(room.board)) {

                board =
                    room.board.slice();

            } else {

                board =
                    Object.values(
                        room.board || {}
                    );
            }


            currentPlayer =
                room.currentPlayer || "X";


            gameOver =
                !!room.gameOver;


            lastMoveIndex =
                typeof room.lastMove === "number"
                    ? room.lastMove
                    : -1;


            scoreX =
                Number(room.scoreX || 0);


            scoreO =
                Number(room.scoreO || 0);


            document.getElementById(
                "scoreX"
            ).textContent =
                scoreX;


            document.getElementById(
                "scoreO"
            ).textContent =
                scoreO;


            updateCells();

            updateOnlineInfo(room);

            updateOnlineTimer(room);


            if (
                room.gameOver &&
                room.winner
            ) {

                showResult(
                    "🎉 " +
                    room.winner +
                    " thắng!"
                );

            } else if (
                room.gameOver
            ) {

                showResult(
                    "🤝 Hòa!"
                );

            } else {

                document.getElementById(
                    "resultBox"
                ).classList.add("hidden");
            }
        };


    roomRef.on(
        "value",
        listener
    );


    onlineRoomListener =
        () => {

            roomRef.off(
                "value",
                listener
            );
        };
}


/* =====================================================
   ONLINE INFO
===================================================== */

function updateOnlineInfo(room) {

    const turn =
        document.getElementById(
            "turnText"
        );


    if (!turn) {
        return;
    }


    if (room.gameOver) {

        turn.textContent =
            "Ván đã kết thúc";

        return;
    }


    if (!room.gameStarted) {

        turn.textContent =
            "Chờ người chơi O...";

        return;
    }


    if (
        currentPlayer ===
        onlineRole
    ) {

        turn.textContent =
            "Lượt của bạn";

    } else {

        turn.textContent =
            "Lượt của " +
            currentPlayer;
    }
}


/* =====================================================
   ONLINE TIMER
===================================================== */

function updateOnlineTimer(room) {

    stopOnlineTimer();


    if (
        !room.gameStarted ||
        room.gameOver ||
        !room.turnStartedAt
    ) {

        document.getElementById(
            "timer"
        ).textContent =
            "30";

        return;
    }


    const update =
        () => {

            if (
                !onlineMode ||
                gameOver
            ) {

                stopOnlineTimer();

                return;
            }


            const elapsed =
                Math.floor(
                    (
                        Date.now() -
                        Number(
                            room.turnStartedAt
                        )
                    ) / 1000
                );


            const remaining =
                Math.max(
                    0,
                    30 - elapsed
                );


            document.getElementById(
                "timer"
            ).textContent =
                remaining;


            if (remaining <= 0) {

                stopOnlineTimer();

                handleOnlineTimeout(
                    room
                );
            }
        };


    update();


    onlineTimerInterval =
        setInterval(
            update,
            250
        );
}


/* =====================================================
   STOP TIMER
===================================================== */

function stopOnlineTimer() {

    if (
        onlineTimerInterval !== null
    ) {

        clearInterval(
            onlineTimerInterval
        );

        onlineTimerInterval = null;
    }
}


/* =====================================================
   ONLINE TIMEOUT
===================================================== */

async function handleOnlineTimeout(room) {

    if (!onlineMode) {
        return;
    }


    try {

        const roomRef =
            firebase.database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );


        await roomRef.transaction(
            current => {

                if (
                    !current ||
                    current.gameOver ||
                    !current.gameStarted
                ) {

                    return current;
                }


                const elapsed =
                    Date.now() -
                    Number(
                        current.turnStartedAt || 0
                    );


                if (elapsed < 29500) {

                    return current;
                }


                const winner =
                    current.currentPlayer === "X"
                        ? "O"
                        : "X";


                current.gameOver = true;

                current.winner = winner;

                current.turnStartedAt = null;


                if (winner === "X") {

                    current.scoreX =
                        Number(
                            current.scoreX || 0
                        ) + 1;

                } else {

                    current.scoreO =
                        Number(
                            current.scoreO || 0
                        ) + 1;
                }


                return current;
            }
        );

    } catch (error) {

        console.error(
            "TIMEOUT ERROR:",
            error
        );
    }
}


/* =====================================================
   ONLINE MOVE
===================================================== */

async function makeOnlineMove(index) {

    if (!onlineMode) {
        return;
    }


    if (gameOver) {
        return;
    }


    if (
        currentPlayer !==
        onlineRole
    ) {

        return;
    }


    try {

        const roomRef =
            firebase.database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );


        await roomRef.transaction(
            room => {

                if (!room) {
                    return;
                }


                if (
                    room.gameOver ||
                    !room.gameStarted
                ) {

                    return;
                }


                if (
                    room.currentPlayer !==
                    onlineRole
                ) {

                    return;
                }


                const roomBoard =
                    Array.isArray(room.board)
                        ? room.board.slice()
                        : Object.values(
                            room.board || {}
                        );


                if (
                    roomBoard[index] !== ""
                ) {

                    return;
                }


                roomBoard[index] =
                    onlineRole;


                room.board =
                    roomBoard;


                room.lastMove =
                    index;


                if (
                    onlineCheckWin(
                        roomBoard,
                        room.size,
                        index,
                        onlineRole
                    )
                ) {

                    room.gameOver =
                        true;

                    room.winner =
                        onlineRole;

                    room.turnStartedAt =
                        null;


                    if (
                        onlineRole === "X"
                    ) {

                        room.scoreX =
                            Number(
                                room.scoreX || 0
                            ) + 1;

                    } else {

                        room.scoreO =
                            Number(
                                room.scoreO || 0
                            ) + 1;
                    }


                    return room;
                }


                if (
                    roomBoard.every(
                        cell =>
                            cell !== ""
                    )
                ) {

                    room.gameOver =
                        true;

                    room.winner =
                        "";

                    room.turnStartedAt =
                        null;

                    return room;
                }


                room.currentPlayer =
                    onlineRole === "X"
                        ? "O"
                        : "X";


                room.turnStartedAt =
                    firebase.database
                        .ServerValue
                        .TIMESTAMP;


                return room;
            }
        );

    } catch (error) {

        console.error(
            "ONLINE MOVE ERROR:",
            error
        );

        alert(
            "Không thể đánh nước này.\n\n" +
            (error.message || error)
        );
    }
}


/* =====================================================
   CHECK WIN
===================================================== */

function onlineCheckWin(
    boardState,
    size,
    index,
    player
) {

    const row =
        Math.floor(index / size);

    const col =
        index % size;


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


        count += onlineCount(
            boardState,
            size,
            row,
            col,
            dr,
            dc,
            player
        );


        count += onlineCount(
            boardState,
            size,
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


/* =====================================================
   COUNT
===================================================== */

function onlineCount(
    boardState,
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
            boardState[index] !== player
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
   NEW ONLINE GAME
===================================================== */

async function startNewOnlineGame() {

    if (
        !onlineMode ||
        onlineRole !== "X"
    ) {

        return;
    }


    try {

        const roomRef =
            firebase.database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );


        await roomRef.transaction(
            room => {

                if (!room) {
                    return;
                }


                if (!room.playerO) {
                    return;
                }


                const size =
                    Number(room.size);


                room.board =
                    new Array(
                        size * size
                    ).fill("");


                room.currentPlayer =
                    "X";


                room.gameStarted =
                    true;


                room.gameOver =
                    false;


                room.winner =
                    "";


                room.lastMove =
                    -1;


                room.turnStartedAt =
                    firebase.database
                        .ServerValue
                        .TIMESTAMP;


                return room;
            }
        );

    } catch (error) {

        console.error(
            "NEW GAME ERROR:",
            error
        );
    }
}


/* =====================================================
   LEAVE ROOM
===================================================== */

function leaveOnlineRoom() {

    stopOnlineTimer();


    if (onlineRoomListener) {

        onlineRoomListener();

        onlineRoomListener = null;
    }


    if (onlineRoomRef) {

        if (
            onlineRole === "O"
        ) {

            onlineRoomRef.update({

                playerO: "",

                gameStarted: false,

                turnStartedAt: null

            }).catch(
                error =>
                    console.error(
                        "LEAVE O ERROR:",
                        error
                    )
            );
        }


        if (
            onlineRole === "X"
        ) {

            onlineRoomRef
                .onDisconnect()
                .cancel();


            onlineRoomRef
                .remove()
                .catch(
                    error =>
                        console.error(
                            "REMOVE ROOM ERROR:",
                            error
                        )
                );
        }
    }


    onlineRoomRef = null;

    onlineMode = false;

    onlineRoomCode = "";

    onlineRole = "";
}


/* =====================================================
   COPY ROOM
===================================================== */

async function copyRoomCode() {

    if (!onlineRoomCode) {
        return;
    }


    await copyText(
        onlineRoomCode
    );


    alert(
        "Đã sao chép mã phòng: " +
        onlineRoomCode
    );
}


/* =====================================================
   COPY LINK
===================================================== */

async function copyRoomLink() {

    if (!onlineRoomCode) {
        return;
    }


    const link =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        onlineRoomCode;


    await copyText(link);


    alert(
        "Đã sao chép link phòng!"
    );
}


/* =====================================================
   COPY TEXT
===================================================== */

async function copyText(text) {

    try {

        await navigator.clipboard
            .writeText(text);

    } catch {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            text;


        textarea.style.position =
            "fixed";


        textarea.style.opacity =
            "0";


        document.body.appendChild(
            textarea
        );


        textarea.select();


        document.execCommand(
            "copy"
        );


        textarea.remove();
    }
}
