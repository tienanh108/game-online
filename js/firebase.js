/* =====================================================
   CARO 5 - FIREBASE ONLINE
===================================================== */


/* ================= CONFIG ================= */

const FIREBASE_CONFIG = {

    apiKey:
        "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",

    authDomain:
        "caro-3460d.firebaseapp.com",

    databaseURL:
        "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",

    projectId:
        "caro-3460d",

    storageBucket:
        "caro-3460d.firebasestorage.app",

    messagingSenderId:
        "473059233945",

    appId:
        "1:473059233945:web:7bbf037f41a8a8d331e808",

    measurementId:
        "G-WXXMSSSN3W"
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


/* ================= INIT ================= */

async function initFirebase() {

    const status =
        document.getElementById(
            "firebaseStatus"
        );


    try {

        if (
            typeof firebase === "undefined"
        ) {

            throw new Error(
                "Firebase SDK chưa tải"
            );
        }


        if (!firebase.apps.length) {

            firebase.initializeApp(
                FIREBASE_CONFIG
            );
        }


        await firebase
            .auth()
            .signInAnonymously();


        firebaseUser =
            firebase.auth().currentUser;


        if (!firebaseUser) {

            throw new Error(
                "Không lấy được tài khoản"
            );
        }


        firebaseReady = true;


        status.textContent =
            "● Online đã sẵn sàng";

        status.style.color = "#16a34a";


    } catch (error) {

        console.error(
            "Firebase:",
            error
        );


        firebaseReady = false;


        status.textContent =
            "Không kết nối được Online";

        status.style.color = "#dc2626";
    }
}


/* ================= ROOM CODE ================= */

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


/* ================= CREATE ================= */

async function createOnlineRoom() {

    if (!firebaseReady || !firebaseUser) {

        alert(
            "Firebase chưa kết nối. Hãy chờ một chút rồi thử lại."
        );

        return;
    }


    const size =
        Number(
            document.getElementById(
                "boardSizeSelect"
            ).value
        );


    let code = generateRoomCode();

    let roomRef =
        firebase.database()
            .ref("rooms/" + code);


    /* Tránh trùng mã */

    let snapshot =
        await roomRef.once("value");


    while (snapshot.exists()) {

        code = generateRoomCode();

        roomRef =
            firebase.database()
                .ref("rooms/" + code);

        snapshot =
            await roomRef.once("value");
    }


    const room = {

        playerX:
            firebaseUser.uid,

        playerO: "",

        size: size,

        board:
            new Array(size * size).fill(""),

        currentPlayer: "X",

        gameStarted: false,

        gameOver: false,

        winner: "",

        turnStartedAt: null,

        lastMove: -1,

        scoreX: 0,

        scoreO: 0
    };


    await roomRef.set(room);


    /* Xóa phòng nếu chủ phòng mất kết nối */

    roomRef.onDisconnect().remove();


    onlineMode = true;

    onlineRoomCode = code;

    onlineRole = "X";


    openOnlineGame(
        code,
        "X",
        room
    );


    listenToRoom(code);


    alert(
        "Tạo phòng thành công!\n\nMã phòng: " +
        code
    );
}


/* ================= JOIN ================= */

async function joinOnlineRoom(code) {

    if (!firebaseReady || !firebaseUser) {

        alert(
            "Firebase chưa kết nối. Hãy chờ một chút rồi thử lại."
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


    const roomRef =
        firebase.database()
            .ref("rooms/" + code);


    const snapshot =
        await roomRef.once("value");


    if (!snapshot.exists()) {

        alert(
            "Không tìm thấy phòng."
        );

        return;
    }


    const room =
        snapshot.val();


    if (
        room.playerX ===
        firebaseUser.uid
    ) {

        onlineMode = true;

        onlineRoomCode = code;

        onlineRole = "X";

        openOnlineGame(
            code,
            "X",
            room
        );

        listenToRoom(code);

        return;
    }


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


    const result =
        await roomRef.transaction(
            current => {

                if (current === null) {
                    return;
                }


                if (
                    current.playerO &&
                    current.playerO !==
                    firebaseUser.uid
                ) {

                    return;
                }


                current.playerO =
                    firebaseUser.uid;

                current.gameStarted = true;

                current.currentPlayer = "X";

                current.gameOver = false;

                current.winner = "";

                current.turnStartedAt =
                    Date.now();

                return current;
            }
        );


    if (!result.committed) {

        alert(
            "Không thể vào phòng."
        );

        return;
    }


    onlineMode = true;

    onlineRoomCode = code;

    onlineRole = "O";


    const newRoom =
        result.snapshot.val();


    openOnlineGame(
        code,
        "O",
        newRoom
    );


    listenToRoom(code);
}


/* ================= OPEN ONLINE GAME ================= */

function openOnlineGame(
    code,
    role,
    room
) {

    boardSize =
        Number(room.size);


    board =
        Array.isArray(room.board)
            ? room.board
            : Object.values(room.board || {});


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
        "Phòng " + code + " • Bạn là " + role;


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
    ).textContent = scoreX;


    document.getElementById(
        "scoreO"
    ).textContent = scoreO;


    renderBoard();

    updateCells();

    updateOnlineInfo(room);

    updateOnlineTimer(room);
}


/* ================= LISTEN ================= */

function listenToRoom(code) {

    if (onlineRoomListener) {

        onlineRoomListener();
        onlineRoomListener = null;
    }


    const roomRef =
        firebase.database()
            .ref("rooms/" + code);


    onlineRoomRef = roomRef;


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

                board = room.board;

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
            ).textContent = scoreX;


            document.getElementById(
                "scoreO"
            ).textContent = scoreO;


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
                room.gameOver &&
                !room.winner
            ) {

                showResult("🤝 Hòa!");

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
        () => roomRef.off(
            "value",
            listener
        );
}


/* ================= ONLINE INFO ================= */

function updateOnlineInfo(room) {

    const turn =
        document.getElementById(
            "turnText"
        );


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


/* ================= ONLINE TIMER ================= */

function updateOnlineTimer(room) {

    stopOnlineTimer();


    if (
        !room.gameStarted ||
        room.gameOver ||
        !room.turnStartedAt
    ) {

        document.getElementById(
            "timer"
        ).textContent = "30";

        return;
    }


    const update = () => {

        if (
            !onlineMode ||
            gameOver
        ) {

            stopOnlineTimer();

            return;
        }


        const elapsed =
            Math.floor(
                (Date.now() -
                    Number(
                        room.turnStartedAt
                    )) / 1000
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


/* ================= ONLINE TIMEOUT ================= */

async function handleOnlineTimeout(room) {

    if (!onlineMode) {
        return;
    }


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

                return;
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
}


/* ================= ONLINE MOVE ================= */

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
                    ? room.board
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

                room.gameOver = true;

                room.winner =
                    onlineRole;

                room.turnStartedAt =
                    null;


                if (onlineRole === "X") {

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
                    cell => cell !== ""
                )
            ) {

                room.gameOver = true;

                room.winner = "";

                room.turnStartedAt =
                    null;

                return room;
            }


            room.currentPlayer =
                onlineRole === "X"
                    ? "O"
                    : "X";


            room.turnStartedAt =
                Date.now();


            return room;
        }
    );
}


/* ================= ONLINE WIN ================= */

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


    for (const [dr, dc] of directions) {

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

    let r = row + dr;
    let c = col + dc;


    while (
        r >= 0 &&
        r < size &&
        c >= 0 &&
        c < size
    ) {

        const index =
            r * size + c;


        if (
            boardState[index] !==
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


/* ================= NEW ONLINE GAME ================= */

async function startNewOnlineGame() {

    if (
        !onlineMode ||
        onlineRole !== "X"
    ) {
        return;
    }


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


            room.board =
                new Array(
                    Number(room.size) *
                    Number(room.size)
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
                Date.now();


            return room;
        }
    );
}


/* ================= LEAVE ================= */

function leaveOnlineRoom() {

    stopOnlineTimer();


    if (
        onlineRoomListener
    ) {

        onlineRoomListener();

        onlineRoomListener = null;
    }


    if (
        onlineRoomRef
    ) {

        if (onlineRole === "O") {

            onlineRoomRef.update({

                playerO: "",

                gameStarted: false,

                turnStartedAt: null
            });

        }


        if (onlineRole === "X") {

            onlineRoomRef
                .onDisconnect()
                .cancel();

            onlineRoomRef.remove();
        }
    }


    onlineRoomRef = null;

    onlineMode = false;

    onlineRoomCode = "";

    onlineRole = "";
}


/* ================= COPY ROOM ================= */

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


/* ================= COPY LINK ================= */

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


/* ================= COPY ================= */

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

    } catch {

        const textarea =
            document.createElement("textarea");

        textarea.value = text;

        textarea.style.position =
            "fixed";

        textarea.style.opacity = "0";

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();
    }
}
