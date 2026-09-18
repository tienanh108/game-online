/* =========================================================
   CARO 5 - FIREBASE ONLINE
   ========================================================= */

"use strict";

/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2u2J-lHYjNeA40kFoS1-VsCaqhjYszdw",
    authDomain: "caro-3460d.firebaseapp.com",
    databaseURL:
        "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "caro-3460d",
    storageBucket:
        "caro-3460d.firebasestorage.app",
    messagingSenderId: "473059233945",
    appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
    measurementId: "G-WXXMSSSN3W"
};

/* =========================================================
   FIREBASE STATE
   ========================================================= */

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDatabase = null;

let currentUser = null;
let currentRoomId = null;
let currentOnlineRole = null;

let roomListener = null;
let onlineTimerInterval = null;

let firebaseInitialized = false;
let authenticationPromise = null;
let firebaseInitPromise = null;

let lastNoticeTimestamp = 0;
let intentionallyLeavingRoom = false;

/* =========================================================
   DOM
   ========================================================= */

const firebaseStatusElement =
    document.getElementById("firebaseStatus");

const roomInfoElement =
    document.getElementById("roomInfo");

const onlineNoticeElement =
    document.getElementById("onlineNotice");

const copyRoomButton =
    document.getElementById("copyRoomButton");

const copyLinkButton =
    document.getElementById("copyLinkButton");

/* =========================================================
   STATUS
   ========================================================= */

function setFirebaseStatus(message, type) {
    if (!firebaseStatusElement) {
        return;
    }

    firebaseStatusElement.textContent = message;

    firebaseStatusElement.classList.remove(
        "success",
        "error",
        "loading"
    );

    if (type) {
        firebaseStatusElement.classList.add(type);
    }
}

/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

function initFirebase() {
    if (firebaseInitPromise) {
        return firebaseInitPromise;
    }

    firebaseInitPromise = new Promise(function (resolve) {
        if (typeof firebase === "undefined") {
            setFirebaseStatus(
                "Không tải được Firebase.",
                "error"
            );

            resolve(false);
            return;
        }

        if (
            firebaseInitialized &&
            firebaseAuth &&
            firebaseDatabase
        ) {
            resolve(true);
            return;
        }

        try {
            if (
                firebase.apps &&
                firebase.apps.length > 0
            ) {
                firebaseApp = firebase.app();
            } else {
                firebaseApp =
                    firebase.initializeApp(
                        FIREBASE_CONFIG
                    );
            }

            firebaseAuth =
                firebase.auth();

            firebaseDatabase =
                firebase.database();

            firebaseInitialized = true;

            setFirebaseStatus(
                "Đang kết nối...",
                "loading"
            );

            /*
             * Chỉ theo dõi Auth.
             *
             * KHÔNG gọi signInAnonymously()
             * ở đây.
             */
            firebaseAuth.onAuthStateChanged(
                function (user) {
                    if (user) {
                        currentUser = user;

                        setFirebaseStatus(
                            "Đã kết nối Firebase.",
                            "success"
                        );
                    } else {
                        currentUser = null;

                        if (firebaseInitialized) {
                            setFirebaseStatus(
                                "Đang xác thực Firebase...",
                                "loading"
                            );
                        }
                    }
                },
                function (error) {
                    console.error(
                        "Firebase auth state error:",
                        error
                    );

                    setFirebaseStatus(
                        "Lỗi xác thực Firebase.",
                        "error"
                    );
                }
            );

            resolve(true);

        } catch (error) {
            console.error(
                "Firebase init error:",
                error
            );

            setFirebaseStatus(
                "Lỗi kết nối Firebase.",
                "error"
            );

            resolve(false);
        }
    });

    return firebaseInitPromise;
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function ensureAuthenticated() {
    const initialized =
        await initFirebase();

    if (!initialized) {
        throw new Error(
            "Firebase chưa sẵn sàng."
        );
    }

    if (currentUser) {
        return currentUser;
    }

    if (
        firebaseAuth &&
        firebaseAuth.currentUser
    ) {
        currentUser =
            firebaseAuth.currentUser;

        setFirebaseStatus(
            "Đã kết nối Firebase.",
            "success"
        );

        return currentUser;
    }

    if (!firebaseAuth) {
        throw new Error(
            "Firebase Auth chưa sẵn sàng."
        );
    }

    /*
     * Chặn nhiều signInAnonymously()
     * chạy cùng lúc.
     */
    if (authenticationPromise) {
        return authenticationPromise;
    }

    authenticationPromise =
        firebaseAuth
            .signInAnonymously()
            .then(function (result) {
                currentUser =
                    result.user ||
                    firebaseAuth.currentUser;

                if (!currentUser) {
                    throw new Error(
                        "Không nhận được Firebase user."
                    );
                }

                setFirebaseStatus(
                    "Đã kết nối Firebase.",
                    "success"
                );

                return currentUser;
            })
            .catch(function (error) {
                console.error(
                    "Anonymous auth error:",
                    error
                );

                setFirebaseStatus(
                    "Không thể đăng nhập Firebase.",
                    "error"
                );

                throw error;
            })
            .finally(function () {
                authenticationPromise = null;
            });

    return authenticationPromise;
}

/*
 * Cho main.js
 */
window.ensureAuthenticated =
    ensureAuthenticated;

/*
 * Cho analytics.js
 */
window.ensureFirebaseAuthenticated =
    ensureAuthenticated;

/* =========================================================
   ROOM CODE
   ========================================================= */

function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        const index =
            Math.floor(
                Math.random() *
                chars.length
            );

        code += chars[index];
    }

    return code;
}

function normalizeRoomCode(code) {
    if (
        code === null ||
        code === undefined
    ) {
        return "";
    }

    return String(code)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(
            /[^a-zA-Z0-9]/g,
            ""
        )
        .toUpperCase()
        .slice(0, 6);
}

/* =========================================================
   EMPTY BOARD
   ========================================================= */

function createEmptyBoard(size) {
    const validSize = Number(size);

    if (
        validSize !== 15 &&
        validSize !== 20 &&
        validSize !== 25
    ) {
        return [];
    }

    return new Array(
        validSize * validSize
    ).fill("");
}

/* =========================================================
   ROOM DATA
   ========================================================= */

function createRoomData(size, uid) {
    return {
        boardSize: size,

        board:
            createEmptyBoard(size),

        currentPlayer: "X",

        playerX: {
            uid: uid
        },

        playerO: null,

        scoreX: 0,
        scoreO: 0,

        gameOver: false,

        status: "waiting",

        turnStartedAt: null,

        notice: null,

        createdAt:
            firebase.database
                .ServerValue
                .TIMESTAMP,

        updatedAt:
            firebase.database
                .ServerValue
                .TIMESTAMP
    };
}

/* =========================================================
   CREATE ROOM
   ========================================================= */

async function createOnlineRoom() {
    try {
        const user =
            await ensureAuthenticated();

        if (
            !user ||
            !user.uid
        ) {
            throw new Error(
                "Firebase chưa xác thực người chơi."
            );
        }

        if (currentRoomId) {
            await leaveOnlineRoom();
        }

        let size =
            Number(
                typeof boardSize !==
                    "undefined"
                    ? boardSize
                    : 15
            );

        if (
            size !== 15 &&
            size !== 20 &&
            size !== 25
        ) {
            size = 15;
        }

        let roomId = "";
        let roomExists = true;

        for (
            let attempt = 0;
            attempt < 10;
            attempt++
        ) {
            roomId =
                generateRoomCode();

            const snapshot =
                await firebaseDatabase
                    .ref(
                        `rooms/${roomId}`
                    )
                    .once("value");

            if (!snapshot.exists()) {
                roomExists = false;
                break;
            }
        }

        if (roomExists) {
            throw new Error(
                "Không thể tạo mã phòng. Hãy thử lại."
            );
        }

        const roomData =
            createRoomData(
                size,
                user.uid
            );

        await firebaseDatabase
            .ref(
                `rooms/${roomId}`
            )
            .set(roomData);

        currentRoomId = roomId;
        currentOnlineRole = "X";
        intentionallyLeavingRoom = false;

        isOnlineGame = true;
        boardSize = size;

        listenToRoom(roomId);

        setupDisconnectHandler(
            roomId,
            "X",
            user.uid
        );

        if (
            typeof showGame ===
            "function"
        ) {
            showGame();
        }

        updateRoomInfo();
        showWaitingMessage();
        showOnlineControls();

        setFirebaseStatus(
            "Đã tạo phòng.",
            "success"
        );

        return roomId;

    } catch (error) {
        console.error(
            "Create room error:",
            error
        );

        setFirebaseStatus(
            "Không thể tạo phòng.",
            "error"
        );

        alert(
            error.message ||
            "Không thể tạo phòng."
        );

        return null;
    }
}

/* =========================================================
   JOIN ROOM
   ========================================================= */

async function joinOnlineRoom(rawRoomCode) {
    try {
        const user =
            await ensureAuthenticated();

        const roomId =
            normalizeRoomCode(
                rawRoomCode
            );

        if (
            roomId.length !== 6
        ) {
            alert(
                "Mã phòng phải có 6 ký tự."
            );

            return false;
        }

        if (
            currentRoomId ===
            roomId
        ) {
            return true;
        }

        if (currentRoomId) {
            await leaveOnlineRoom();
        }

        const roomRef =
            firebaseDatabase.ref(
                `rooms/${roomId}`
            );

        const snapshot =
            await roomRef.once(
                "value"
            );

        if (!snapshot.exists()) {
            alert(
                "Không tìm thấy phòng."
            );

            return false;
        }

        const room =
            snapshot.val();

        const size =
            Number(
                room.boardSize
            );

        if (
            size !== 15 &&
            size !== 20 &&
            size !== 25
        ) {
            alert(
                "Phòng có kích thước bàn không hợp lệ."
            );

            return false;
        }

        let role = null;

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
        }

        if (!role) {
            if (!room.playerX) {
                role = "X";
            } else if (!room.playerO) {
                role = "O";
            } else {
                alert(
                    "Phòng đã đầy."
                );

                return false;
            }
        }

        const updates = {};

        updates[
            `rooms/${roomId}/player${role}`
        ] = {
            uid: user.uid
        };

        const otherRole =
            role === "X"
                ? "O"
                : "X";

        const otherPlayer =
            room[
                `player${otherRole}`
            ];

        const isNewPlayer =
            !(
                room[
                    `player${role}`
                ] &&
                room[
                    `player${role}`
                ].uid ===
                    user.uid
            );

        if (
            isNewPlayer &&
            otherPlayer
        ) {
            updates[
                `rooms/${roomId}/board`
            ] =
                createEmptyBoard(
                    size
                );

            updates[
                `rooms/${roomId}/currentPlayer`
            ] = "X";

            updates[
                `rooms/${roomId}/gameOver`
            ] = false;

            updates[
                `rooms/${roomId}/status`
            ] = "playing";

            updates[
                `rooms/${roomId}/turnStartedAt`
            ] =
                firebase.database
                    .ServerValue
                    .TIMESTAMP;

            updates[
                `rooms/${roomId}/notice`
            ] = null;

            updates[
                `rooms/${roomId}/winner`
            ] = null;

        } else if (
            room.playerX &&
            room.playerO
        ) {
            updates[
                `rooms/${roomId}/status`
            ] = "playing";
        }

        updates[
            `rooms/${roomId}/updatedAt`
        ] =
            firebase.database
                .ServerValue
                .TIMESTAMP;

        await firebaseDatabase
            .ref()
            .update(updates);

        currentRoomId = roomId;
        currentOnlineRole = role;
        intentionallyLeavingRoom = false;

        isOnlineGame = true;
        boardSize = size;

        listenToRoom(roomId);

        setupDisconnectHandler(
            roomId,
            role,
            user.uid
        );

        if (
            typeof showGame ===
            "function"
        ) {
            showGame();
        }

        updateRoomInfo();
        showOnlineControls();

        return true;

    } catch (error) {
        console.error(
            "Join room error:",
            error
        );

        setFirebaseStatus(
            "Không thể vào phòng.",
            "error"
        );

        alert(
            error.message ||
            "Không thể vào phòng."
        );

        return false;
    }
}

/* =========================================================
   LISTEN ROOM
   ========================================================= */

function listenToRoom(roomId) {
    if (roomListener) {
        roomListener.off();
        roomListener = null;
    }

    roomListener =
        firebaseDatabase.ref(
            `rooms/${roomId}`
        );

    roomListener.on(
        "value",
        handleRoomUpdate,
        function (error) {
            console.error(
                "Room listener error:",
                error
            );
        }
    );
}

/* =========================================================
   ROOM UPDATE
   ========================================================= */

function handleRoomUpdate(snapshot) {
    if (!snapshot.exists()) {
        resetOnlineState();

        if (
            typeof showMenu ===
            "function"
        ) {
            showMenu();
        }

        alert(
            "Phòng không còn tồn tại."
        );

        return;
    }

    const room =
        snapshot.val();

    const size =
        Number(
            room.boardSize
        );

    if (
        size === 15 ||
        size === 20 ||
        size === 25
    ) {
        boardSize = size;
    }

    if (currentUser) {
        if (
            room.playerX &&
            room.playerX.uid ===
                currentUser.uid
        ) {
            currentOnlineRole = "X";

        } else if (
            room.playerO &&
            room.playerO.uid ===
                currentUser.uid
        ) {
            currentOnlineRole = "O";

        } else {
            currentOnlineRole = null;
        }
    }

    if (!currentOnlineRole) {
        isOnlineGame = false;

        stopOnlineTimer();

        showOnlineNotice(
            "Bạn đã rời khỏi phòng."
        );

        return;
    }

    isOnlineGame = true;

    const newBoard =
        Array.isArray(room.board)
            ? room.board
            : createEmptyBoard(
                  boardSize
              );

    board =
        normalizeOnlineBoard(
            newBoard,
            boardSize
        );

    currentPlayer =
        room.currentPlayer ||
        "X";

    gameOver =
        room.gameOver === true;

    scoreX =
        Number(
            room.scoreX || 0
        );

    scoreO =
        Number(
            room.scoreO || 0
        );

    const hasX =
        !!room.playerX;

    const hasO =
        !!room.playerO;

    const bothPlayers =
        hasX && hasO;

    lastMoveIndex =
        findLastMove(board);

    if (
        typeof renderBoard ===
        "function"
    ) {
        renderBoard();
    }

    updateOnlineScore();
    updateRoomInfo();

    handleRoomNotice(
        room.notice
    );

    if (!bothPlayers) {
        gameOver = false;

        stopOnlineTimer();

        if (
            typeof updateTurnDisplay ===
            "function"
        ) {
            turnText.textContent =
                "Đang chờ người chơi...";
        }

        if (
            typeof updateTimerDisplay ===
            "function"
        ) {
            timer = 30;
            updateTimerDisplay();
        }

        showWaitingMessage();

        return;
    }

    hideWaitingMessage();

    if (gameOver) {
        stopOnlineTimer();
        return;
    }

    updateOnlineTurnDisplay(
        currentPlayer
    );

    startOnlineTimer(
        room.turnStartedAt
    );
}

/* =========================================================
   NORMALIZE BOARD
   ========================================================= */

function normalizeOnlineBoard(
    source,
    size
) {
    const result =
        createEmptyBoard(size);

    for (
        let i = 0;
        i < result.length;
        i++
    ) {
        const value =
            source[i];

        if (
            value === "X" ||
            value === "O"
        ) {
            result[i] = value;
        }
    }

    return result;
}

/* =========================================================
   FIND LAST MOVE
   ========================================================= */

function findLastMove(currentBoard) {
    /*
     * Không có lastMove trong dữ liệu
     * phòng hiện tại nên giữ -1.
     */
    return -1;
}

/* =========================================================
   MAKE ONLINE MOVE
   ========================================================= */

async function makeOnlineMove(index) {
    if (
        !currentRoomId ||
        !currentOnlineRole ||
        !currentUser ||
        !firebaseDatabase
    ) {
        return false;
    }

    if (gameOver) {
        return false;
    }

    if (
        currentPlayer !==
        currentOnlineRole
    ) {
        return false;
    }

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= board.length
    ) {
        return false;
    }

    if (board[index] !== "") {
        return false;
    }

    try {
        const roomRef =
            firebaseDatabase.ref(
                `rooms/${currentRoomId}`
            );

        const result =
            await roomRef.transaction(
                function (room) {
                    if (!room) {
                        return;
                    }

                    const player =
                        room[
                            `player${currentOnlineRole}`
                        ];

                    if (
                        !player ||
                        player.uid !==
                            currentUser.uid
                    ) {
                        return;
                    }

                    if (
                        room.gameOver ===
                        true
                    ) {
                        return;
                    }

                    if (
                        room.currentPlayer !==
                        currentOnlineRole
                    ) {
                        return;
                    }

                    const size =
                        Number(
                            room.boardSize
                        );

                    const expected =
                        size * size;

                    if (
                        !Array.isArray(
                            room.board
                        ) ||
                        room.board.length !==
                            expected
                    ) {
                        room.board =
                            createEmptyBoard(
                                size
                            );
                    }

                    if (
                        room.board[index] !==
                        ""
                    ) {
                        return;
                    }

                    room.board[index] =
                        currentOnlineRole;

                    const row =
                        Math.floor(
                            index / size
                        );

                    const col =
                        index % size;

                    const won =
                        checkOnlineWin(
                            room.board,
                            row,
                            col,
                            currentOnlineRole,
                            size
                        );

                    if (won) {
                        room.gameOver =
                            true;

                        room.status =
                            "finished";

                        if (
                            currentOnlineRole ===
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

                        room.turnStartedAt =
                            null;

                        room.winner =
                            currentOnlineRole;

                        room.updatedAt =
                            firebase.database
                                .ServerValue
                                .TIMESTAMP;

                        return room;
                    }

                    const isDraw =
                        room.board.every(
                            function (cell) {
                                return (
                                    cell !== ""
                                );
                            }
                        );

                    if (isDraw) {
                        room.gameOver =
                            true;

                        room.status =
                            "finished";

                        room.winner =
                            "draw";

                        room.turnStartedAt =
                            null;

                        room.updatedAt =
                            firebase.database
                                .ServerValue
                                .TIMESTAMP;

                        return room;
                    }

                    room.currentPlayer =
                        currentOnlineRole ===
                        "X"
                            ? "O"
                            : "X";

                    room.turnStartedAt =
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;

                    room.status =
                        "playing";

                    room.updatedAt =
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;

                    return room;
                }
            );

        return result.committed;

    } catch (error) {
        console.error(
            "Online move error:",
            error
        );

        return false;
    }
}

/* =========================================================
   CHECK ONLINE WIN
   ========================================================= */

function checkOnlineWin(
    currentBoard,
    row,
    col,
    player,
    size
) {
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

        let r = row + dr;
        let c = col + dc;

        while (
            r >= 0 &&
            r < size &&
            c >= 0 &&
            c < size &&
            currentBoard[
                r * size + c
            ] === player
        ) {
            count++;

            r += dr;
            c += dc;
        }

        r = row - dr;
        c = col - dc;

        while (
            r >= 0 &&
            r < size &&
            c >= 0 &&
            c < size &&
            currentBoard[
                r * size + c
            ] === player
        ) {
            count++;

            r -= dr;
            c -= dc;
        }

        if (count >= 5) {
            return true;
        }
    }

    return false;
}

/* =========================================================
   ONLINE REPLAY
   ========================================================= */

async function startNewOnlineGame() {
    if (
        !currentRoomId ||
        !currentUser ||
        !currentOnlineRole
    ) {
        return false;
    }

    try {
        const roomRef =
            firebaseDatabase.ref(
                `rooms/${currentRoomId}`
            );

        const result =
            await roomRef.transaction(
                function (room) {
                    if (!room) {
                        return;
                    }

                    const player =
                        room[
                            `player${currentOnlineRole}`
                        ];

                    if (
                        !player ||
                        player.uid !==
                            currentUser.uid
                    ) {
                        return;
                    }

                    if (
                        !room.playerX ||
                        !room.playerO
                    ) {
                        return;
                    }

                    const size =
                        Number(
                            room.boardSize
                        );

                    room.board =
                        createEmptyBoard(
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
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;

                    room.notice =
                        null;

                    room.updatedAt =
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;

                    return room;
                }
            );

        if (result.committed) {
            hideResultBox();
            return true;
        }

        return false;

    } catch (error) {
        console.error(
            "Online replay error:",
            error
        );

        return false;
    }
}

/* =========================================================
   LEAVE ONLINE ROOM
   ========================================================= */

async function leaveOnlineRoom() {
    if (
        !currentRoomId ||
        !currentOnlineRole ||
        !currentUser ||
        !firebaseDatabase
    ) {
        resetOnlineState();
        return;
    }

    const roomId =
        currentRoomId;

    const role =
        currentOnlineRole;

    const uid =
        currentUser.uid;

    intentionallyLeavingRoom = true;

    stopOnlineTimer();

    try {
        const roomRef =
            firebaseDatabase.ref(
                `rooms/${roomId}`
            );

        const snapshot =
            await roomRef.once(
                "value"
            );

        if (snapshot.exists()) {
            const room =
                snapshot.val();

            const player =
                room[
                    `player${role}`
                ];

            if (
                player &&
                player.uid === uid
            ) {
                const otherRole =
                    role === "X"
                        ? "O"
                        : "X";

                const otherPlayer =
                    room[
                        `player${otherRole}`
                    ];

                const updates = {};

                updates[
                    `rooms/${roomId}/player${role}`
                ] = null;

                updates[
                    `rooms/${roomId}/board`
                ] =
                    createEmptyBoard(
                        Number(
                            room.boardSize
                        )
                    );

                updates[
                    `rooms/${roomId}/currentPlayer`
                ] = "X";

                updates[
                    `rooms/${roomId}/gameOver`
                ] = false;

                updates[
                    `rooms/${roomId}/status`
                ] = "waiting";

                updates[
                    `rooms/${roomId}/turnStartedAt`
                ] = null;

                if (otherPlayer) {
                    updates[
                        `rooms/${roomId}/notice`
                    ] = {
                        text:
                            `${role} đã rời phòng. Đang chờ người chơi mới...`,

                        timestamp:
                            firebase.database
                                .ServerValue
                                .TIMESTAMP
                    };
                } else {
                    updates[
                        `rooms/${roomId}/notice`
                    ] = null;
                }

                updates[
                    `rooms/${roomId}/updatedAt`
                ] =
                    firebase.database
                        .ServerValue
                        .TIMESTAMP;

                await firebaseDatabase
                    .ref()
                    .update(updates);
            }
        }

    } catch (error) {
        console.error(
            "Leave room error:",
            error
        );
    }

    resetOnlineState();
}

/* =========================================================
   DISCONNECT HANDLER
   ========================================================= */

function setupDisconnectHandler(
    roomId,
    role,
    uid
) {
    if (!firebaseDatabase) {
        return;
    }

    const playerRef =
        firebaseDatabase.ref(
            `rooms/${roomId}/player${role}`
        );

    playerRef
        .onDisconnect()
        .remove()
        .catch(function (error) {
            console.error(
                "Disconnect handler error:",
                error
            );
        });
}

/* =========================================================
   RESET ONLINE STATE
   ========================================================= */

function resetOnlineState() {
    stopOnlineTimer();

    if (roomListener) {
        roomListener.off();
        roomListener = null;
    }

    currentRoomId = null;
    currentOnlineRole = null;

    isOnlineGame = false;

    intentionallyLeavingRoom = false;

    lastNoticeTimestamp = 0;

    hideOnlineControls();

    if (roomInfoElement) {
        roomInfoElement.textContent = "";
    }
}

/* =========================================================
   ONLINE TIMER
   ========================================================= */

function startOnlineTimer(
    turnStartedAt
) {
    stopOnlineTimer();

    if (
        gameOver ||
        !turnStartedAt
    ) {
        return;
    }

    updateOnlineTimer(
        turnStartedAt
    );

    onlineTimerInterval =
        window.setInterval(
            function () {
                updateOnlineTimer(
                    turnStartedAt
                );
            },
            250
        );
}

function updateOnlineTimer(
    turnStartedAt
) {
    if (gameOver) {
        stopOnlineTimer();
        return;
    }

    const start =
        Number(
            turnStartedAt
        );

    if (
        !Number.isFinite(start)
    ) {
        return;
    }

    const elapsed =
        Math.floor(
            (Date.now() - start) /
                1000
        );

    const remaining =
        Math.max(
            0,
            30 - elapsed
        );

    timer =
        remaining;

    if (
        typeof updateTimerDisplay ===
        "function"
    ) {
        updateTimerDisplay();
    }

    if (remaining <= 0) {
        stopOnlineTimer();
        handleOnlineTimeout();
    }
}

function stopOnlineTimer() {
    if (
        onlineTimerInterval !==
        null
    ) {
        window.clearInterval(
            onlineTimerInterval
        );

        onlineTimerInterval = null;
    }
}

/* =========================================================
   ONLINE TIMEOUT
   ========================================================= */

async function handleOnlineTimeout() {
    if (
        !currentRoomId ||
        !currentOnlineRole ||
        !currentUser
    ) {
        return;
    }

    try {
        const roomRef =
            firebaseDatabase.ref(
                `rooms/${currentRoomId}`
            );

        await roomRef.transaction(
            function (room) {
                if (!room) {
                    return;
                }

                if (
                    room.gameOver ===
                    true
                ) {
                    return;
                }

                if (
                    room.currentPlayer !==
                    currentOnlineRole
                ) {
                    return;
                }

                const player =
                    room[
                        `player${currentOnlineRole}`
                    ];

                if (
                    !player ||
                    player.uid !==
                        currentUser.uid
                ) {
                    return;
                }

                const winner =
                    currentOnlineRole ===
                    "X"
                        ? "O"
                        : "X";

                room.gameOver =
                    true;

                room.status =
                    "finished";

                room.winner =
                    winner;

                room.turnStartedAt =
                    null;

                if (winner === "X") {
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

                room.updatedAt =
                    firebase.database
                        .ServerValue
                        .TIMESTAMP;

                return room;
            }
        );

    } catch (error) {
        console.error(
            "Online timeout error:",
            error
        );
    }
}

/* =========================================================
   ONLINE TURN UI
   ========================================================= */

function updateOnlineTurnDisplay(
    player
) {
    if (!turnText) {
        return;
    }

    if (
        player ===
        currentOnlineRole
    ) {
        turnText.textContent =
            `Lượt của bạn (${player})`;
    } else {
        turnText.textContent =
            `Lượt của ${player}`;
    }
}

/* =========================================================
   ONLINE SCORE
   ========================================================= */

function updateOnlineScore() {
    if (
        typeof updateScoreDisplay ===
        "function"
    ) {
        updateScoreDisplay();
    }
}

/* =========================================================
   ROOM INFO
   ========================================================= */

function updateRoomInfo() {
    if (!roomInfoElement) {
        return;
    }

    if (currentRoomId) {
        roomInfoElement.textContent =
            `Phòng ${currentRoomId} · ${currentOnlineRole || "?"}`;
    } else {
        roomInfoElement.textContent = "";
    }
}

/* =========================================================
   WAITING UI
   ========================================================= */

function showWaitingMessage() {
    if (!turnText) {
        return;
    }

    turnText.textContent =
        "Đang chờ người chơi...";
}

function hideWaitingMessage() {
    if (!turnText) {
        return;
    }

    if (currentOnlineRole) {
        updateOnlineTurnDisplay(
            currentPlayer
        );
    }
}

/* =========================================================
   NOTICE
   ========================================================= */

function showOnlineNotice(message) {
    if (!onlineNoticeElement) {
        return;
    }

    onlineNoticeElement.textContent =
        message;

    onlineNoticeElement.classList.remove(
        "hidden"
    );
}

function hideOnlineNotice() {
    if (!onlineNoticeElement) {
        return;
    }

    onlineNoticeElement.classList.add(
        "hidden"
    );

    onlineNoticeElement.textContent =
        "";
}

function handleRoomNotice(notice) {
    if (!notice) {
        return;
    }

    const timestamp =
        Number(
            notice.timestamp || 0
        );

    if (
        timestamp &&
        timestamp <=
            lastNoticeTimestamp
    ) {
        return;
    }

    if (timestamp) {
        lastNoticeTimestamp =
            timestamp;
    }

    if (
        typeof notice.text ===
        "string"
    ) {
        showOnlineNotice(
            notice.text
        );
    }
}

/* =========================================================
   ONLINE CONTROLS
   ========================================================= */

function showOnlineControls() {
    if (copyRoomButton) {
        copyRoomButton.classList.remove(
            "hidden"
        );
    }

    if (copyLinkButton) {
        copyLinkButton.classList.remove(
            "hidden"
        );
    }
}

function hideOnlineControls() {
    if (copyRoomButton) {
        copyRoomButton.classList.add(
            "hidden"
        );
    }

    if (copyLinkButton) {
        copyLinkButton.classList.add(
            "hidden"
        );
    }

    hideOnlineNotice();
}

/* =========================================================
   COPY ROOM CODE
   ========================================================= */

async function copyRoomCode() {
    if (!currentRoomId) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            currentRoomId
        );

        showOnlineNotice(
            `Đã sao chép mã phòng: ${currentRoomId}`
        );

    } catch (error) {
        const input =
            document.createElement(
                "input"
            );

        input.value =
            currentRoomId;

        document.body.appendChild(
            input
        );

        input.select();

        try {
            document.execCommand(
                "copy"
            );

            showOnlineNotice(
                `Đã sao chép mã phòng: ${currentRoomId}`
            );

        } catch (copyError) {
            alert(
                `Mã phòng: ${currentRoomId}`
            );
        }

        input.remove();
    }
}

/* =========================================================
   COPY ROOM LINK
   ========================================================= */

async function copyRoomLink() {
    if (!currentRoomId) {
        return;
    }

    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        "room",
        currentRoomId
    );

    const link =
        url.toString();

    try {
        await navigator.clipboard.writeText(
            link
        );

        showOnlineNotice(
            "Đã sao chép link phòng."
        );

    } catch (error) {
        alert(link);
    }
}

/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.initFirebase =
    initFirebase;

window.ensureAuthenticated =
    ensureAuthenticated;

window.ensureFirebaseAuthenticated =
    ensureAuthenticated;

window.createOnlineRoom =
    createOnlineRoom;

window.joinOnlineRoom =
    joinOnlineRoom;

window.leaveOnlineRoom =
    leaveOnlineRoom;

window.resetOnlineState =
    resetOnlineState;

window.makeOnlineMove =
    makeOnlineMove;

window.startNewOnlineGame =
    startNewOnlineGame;

window.showOnlineNotice =
    showOnlineNotice;

window.hideOnlineNotice =
    hideOnlineNotice;

window.copyRoomCode =
    copyRoomCode;

window.copyRoomLink =
    copyRoomLink;

window.normalizeRoomCode =
    normalizeRoomCode;

/* =========================================================
   AUTO INIT
   ========================================================= */

initFirebase();
