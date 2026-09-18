// ============================================================
// FIREBASE.JS - CARO ONLINE
// ============================================================

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",
    authDomain: "caro-3460d.firebaseapp.com",
    databaseURL:
        "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "caro-3460d",
    storageBucket: "caro-3460d.firebasestorage.app",
    messagingSenderId: "473059233945",
    appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
    measurementId: "G-WXXMSSSN3W"
};

// ============================================================
// BIẾN FIREBASE
// ============================================================

let firebaseInitialized = false;
let firebaseUser = null;
let onlineRoomCode = "";
let onlineRole = "";
let onlineMode = false;

let onlineRoomListener = null;
let onlineTimerInterval = null;

// Dùng để nhận diện timer của đúng lượt.
// Ngăn timer cũ của ván trước cộng điểm nhầm.
let activeTurnStartedAt = null;


// ============================================================
// KHỞI TẠO FIREBASE
// ============================================================

async function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }

        await new Promise((resolve, reject) => {
            const unsubscribe = firebase.auth().onAuthStateChanged(
                user => {
                    if (user) {
                        firebaseUser = user;
                        unsubscribe();
                        resolve();
                    }
                },
                error => {
                    unsubscribe();
                    reject(error);
                }
            );
        });

        if (!firebaseUser) {
            await firebase.auth().signInAnonymously();
        }

        firebaseUser = firebase.auth().currentUser;

        firebaseInitialized = true;

        console.log("Firebase đã khởi tạo.");
        console.log("User:", firebaseUser ? firebaseUser.uid : "NONE");

        // Kiểm tra kết nối Firebase
        firebase
            .database()
            .ref(".info/connected")
            .on("value", snapshot => {
                console.log(
                    "Firebase connected:",
                    snapshot.val()
                );
            });

    } catch (error) {
        console.error("FIREBASE INIT ERROR:", error);

        alert(
            "Không thể kết nối Firebase.\n\n" +
            (error.message || error)
        );
    }
}


// ============================================================
// TẠO PHÒNG ONLINE
// ============================================================

async function createOnlineRoom(size) {
    if (!firebaseInitialized) {
        await initFirebase();
    }

    try {
        const code = generateRoomCode();

        const roomRef = firebase
            .database()
            .ref("rooms/" + code);

        const emptyBoard = new Array(size * size).fill("");

        const roomData = {
            size: Number(size),

            board: emptyBoard,

            currentPlayer: "X",

            playerX: firebaseUser.uid,
            playerO: null,

            gameStarted: false,
            gameOver: false,
            winner: "",

            scoreX: 0,
            scoreO: 0,

            lastMove: -1,

            turnStartedAt: null,

            createdAt:
                firebase.database.ServerValue.TIMESTAMP
        };

        await roomRef.set(roomData);

        onlineRoomCode = code;
        onlineRole = "X";
        onlineMode = true;

        console.log("Đã tạo phòng:", code);

        listenToRoom(code);

        openOnlineGame(
            code,
            "X",
            roomData
        );

        return code;

    } catch (error) {
        console.error("CREATE ROOM ERROR:", error);

        alert(
            "Không thể tạo phòng.\n\n" +
            (error.message || error)
        );

        return null;
    }
}


// ============================================================
// VÀO PHÒNG ONLINE
// ============================================================

async function joinOnlineRoom(code) {
    if (!firebaseInitialized) {
        await initFirebase();
    }

    code = String(code || "")
        .trim()
        .toUpperCase();

    if (!code) {
        alert("Hãy nhập mã phòng.");
        return false;
    }

    try {
        const roomRef = firebase
            .database()
            .ref("rooms/" + code);

        const snapshot = await roomRef.once("value");

        if (!snapshot.exists()) {
            alert("Không tìm thấy phòng " + code + ".");
            return false;
        }

        const room = snapshot.val();

        if (
            room.playerO &&
            room.playerO !== firebaseUser.uid
        ) {
            alert("Phòng này đã có đủ 2 người.");
            return false;
        }

        // Người tạo phòng không được vào lại dưới O
        if (room.playerX === firebaseUser.uid) {
            onlineRoomCode = code;
            onlineRole = "X";
            onlineMode = true;

            listenToRoom(code);
            openOnlineGame(code, "X", room);

            return true;
        }

        // Người thứ 2 vào phòng
        await roomRef.update({
            playerO: firebaseUser.uid,
            gameStarted: true,
            gameOver: false,
            winner: "",
            currentPlayer: "X",

            turnStartedAt:
                firebase.database.ServerValue.TIMESTAMP
        });

        onlineRoomCode = code;
        onlineRole = "O";
        onlineMode = true;

        console.log("Đã vào phòng:", code);

        listenToRoom(code);

        const updatedSnapshot =
            await roomRef.once("value");

        const updatedRoom =
            updatedSnapshot.val();

        openOnlineGame(
            code,
            "O",
            updatedRoom
        );

        return true;

    } catch (error) {
        console.error("JOIN ROOM ERROR:", error);

        alert(
            "Không thể vào phòng.\n\n" +
            (error.message || error)
        );

        return false;
    }
}


// ============================================================
// TẠO MÃ PHÒNG
// ============================================================

function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        code += chars.charAt(
            Math.floor(
                Math.random() * chars.length
            )
        );
    }

    return code;
}


// ============================================================
// MỞ GAME ONLINE
// ============================================================

function openOnlineGame(code, role, room) {
    boardSize = Number(room.size);

    if (Array.isArray(room.board)) {
        board = room.board.slice();
    } else {
        board = Object.values(room.board || {});
    }

    currentPlayer =
        room.currentPlayer || "X";

    gameOver = !!room.gameOver;

    lastMoveIndex =
        typeof room.lastMove === "number"
            ? room.lastMove
            : -1;

    scoreX =
        Number(room.scoreX || 0);

    scoreO =
        Number(room.scoreO || 0);

    onlineRoomCode = code;
    onlineRole = role;
    onlineMode = true;

    document
        .getElementById("menuScreen")
        .classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.remove("hidden");

    document
        .getElementById("roomInfo")
        .textContent =
        "Phòng " +
        code +
        " • Bạn là " +
        role;

    document
        .getElementById("copyRoomButton")
        .classList.remove("hidden");

    document
        .getElementById("copyLinkButton")
        .classList.remove("hidden");

    // CHỈ X - chủ phòng - được bấm Ván mới
    document
        .getElementById("newGameButton")
        .classList.toggle(
            "hidden",
            role !== "X"
        );

    document
        .getElementById("scoreX")
        .textContent = scoreX;

    document
        .getElementById("scoreO")
        .textContent = scoreO;

    renderBoard();
    updateCells();

    updateOnlineInfo(room);
    updateOnlineTimer(room);
}


// ============================================================
// LẮNG NGHE ROOM REALTIME
// ============================================================

function listenToRoom(code) {
    if (onlineRoomListener) {
        onlineRoomListener.off();
        onlineRoomListener = null;
    }

    onlineRoomListener =
        firebase
            .database()
            .ref("rooms/" + code);

    onlineRoomListener.on(
        "value",
        snapshot => {
            if (!snapshot.exists()) {
                console.warn(
                    "Phòng không còn tồn tại."
                );
                return;
            }

            const room =
                snapshot.val();

            // Cập nhật bàn
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

            // Cập nhật trạng thái
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

            // Cập nhật timer ID của lượt hiện tại
            activeTurnStartedAt =
                room.turnStartedAt ?? null;

            // Hiển thị điểm
            const scoreXElement =
                document.getElementById("scoreX");

            const scoreOElement =
                document.getElementById("scoreO");

            if (scoreXElement) {
                scoreXElement.textContent =
                    scoreX;
            }

            if (scoreOElement) {
                scoreOElement.textContent =
                    scoreO;
            }

            renderBoard();
            updateCells();

            updateOnlineInfo(room);
            updateOnlineTimer(room);

            // Hiện kết quả nếu ván đã kết thúc
            if (room.gameOver && room.winner) {
                showOnlineResult(
                    room.winner
                );
            }
        }
    );
}


// ============================================================
// HIỂN THỊ THÔNG TIN ONLINE
// ============================================================

function updateOnlineInfo(room) {
    const info =
        document.getElementById(
            "turnInfo"
        );

    if (!info) {
        return;
    }

    if (room.gameOver) {
        if (room.winner === "DRAW") {
            info.textContent =
                "Hòa!";
        } else {
            info.textContent =
                "Người thắng: " +
                room.winner;
        }

        return;
    }

    if (!room.gameStarted) {
        info.textContent =
            "Đang chờ người chơi O...";
        return;
    }

    if (currentPlayer === onlineRole) {
        info.textContent =
            "Đến lượt bạn";
    } else {
        info.textContent =
            "Đến lượt đối thủ";
    }
}


// ============================================================
// TIMER ONLINE
// ============================================================

function stopOnlineTimer() {
    if (onlineTimerInterval) {
        clearInterval(
            onlineTimerInterval
        );

        onlineTimerInterval = null;
    }
}


// ============================================================
// TIMER ONLINE - PHIÊN BẢN CHỐNG TIMER CŨ
// ============================================================

function updateOnlineTimer(room) {
    stopOnlineTimer();

    const timerElement =
        document.getElementById("timer");

    if (!timerElement) {
        return;
    }

    if (
        !room.gameStarted ||
        room.gameOver ||
        !room.turnStartedAt
    ) {
        timerElement.textContent = "30";
        return;
    }

    // Ghi lại đúng timestamp của lượt này.
    // Timer cũ sẽ không thể tác động vào ván mới.
    const expectedTurnStartedAt =
        Number(room.turnStartedAt);

    activeTurnStartedAt =
        expectedTurnStartedAt;

    const update = () => {
        if (!onlineMode) {
            stopOnlineTimer();
            return;
        }

        if (gameOver) {
            stopOnlineTimer();
            return;
        }

        // Nếu realtime đã chuyển sang lượt/ván mới,
        // timer này lập tức tự hủy.
        if (
            activeTurnStartedAt !==
            expectedTurnStartedAt
        ) {
            stopOnlineTimer();
            return;
        }

        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    expectedTurnStartedAt
                ) / 1000
            );

        const remaining =
            Math.max(
                0,
                30 - elapsed
            );

        timerElement.textContent =
            remaining;

        if (remaining <= 0) {
            stopOnlineTimer();

            // Không truyền object room cũ nữa.
            // Hàm timeout sẽ kiểm tra trực tiếp
            // dữ liệu mới nhất trên Firebase.
            handleOnlineTimeout(
                expectedTurnStartedAt
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


// ============================================================
// XỬ LÝ HẾT GIỜ ONLINE
// ============================================================

async function handleOnlineTimeout(
    expectedTurnStartedAt
) {
    if (
        !onlineMode ||
        !onlineRoomCode
    ) {
        return;
    }

    try {
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );

        await roomRef.transaction(
            current => {
                if (!current) {
                    return current;
                }

                if (
                    current.gameOver ||
                    !current.gameStarted
                ) {
                    return current;
                }

                const currentTurnStartedAt =
                    Number(
                        current.turnStartedAt ||
                        0
                    );

                // CỰC KỲ QUAN TRỌNG:
                // Nếu Firebase hiện tại đã sang
                // lượt mới hoặc ván mới thì bỏ qua
                // timeout cũ.
                if (
                    currentTurnStartedAt !==
                    Number(
                        expectedTurnStartedAt
                    )
                ) {
                    return current;
                }

                const elapsed =
                    Date.now() -
                    currentTurnStartedAt;

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


// ============================================================
// ĐÁNH QUÂN ONLINE
// ============================================================

async function makeOnlineMove(index) {
    if (
        !onlineMode ||
        !onlineRoomCode
    ) {
        return;
    }

    if (gameOver) {
        return;
    }

    if (currentPlayer !== onlineRole) {
        return;
    }

    if (
        board[index] &&
        board[index] !== ""
    ) {
        return;
    }

    try {
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );

        await roomRef.transaction(
            current => {
                if (!current) {
                    return current;
                }

                if (
                    current.gameOver ||
                    !current.gameStarted
                ) {
                    return current;
                }

                if (
                    current.currentPlayer !==
                    onlineRole
                ) {
                    return current;
                }

                if (!Array.isArray(current.board)) {
                    return current;
                }

                if (
                    current.board[index] &&
                    current.board[index] !== ""
                ) {
                    return current;
                }

                current.board[index] =
                    onlineRole;

                current.lastMove =
                    index;

                const size =
                    Number(
                        current.size
                    );

                const win =
                    onlineCheckWin(
                        current.board,
                        index,
                        onlineRole,
                        size
                    );

                if (win) {
                    current.gameOver = true;
                    current.winner =
                        onlineRole;
                    current.turnStartedAt =
                        null;

                    if (
                        onlineRole === "X"
                    ) {
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

                const filled =
                    onlineCount(
                        current.board
                    );

                if (
                    filled >=
                    size * size
                ) {
                    current.gameOver = true;
                    current.winner =
                        "DRAW";
                    current.turnStartedAt =
                        null;

                    return current;
                }

                current.currentPlayer =
                    onlineRole === "X"
                        ? "O"
                        : "X";

                current.turnStartedAt =
                    firebase.database
                        .ServerValue
                        .TIMESTAMP;

                return current;
            }
        );

    } catch (error) {
        console.error(
            "ONLINE MOVE ERROR:",
            error
        );
    }
}


// ============================================================
// KIỂM TRA THẮNG ONLINE
// ============================================================

function onlineCheckWin(
    boardData,
    index,
    player,
    size
) {
    const row =
        Math.floor(
            index / size
        );

    const col =
        index % size;

    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    for (const [
        dr,
        dc
    ] of directions) {
        let count = 1;

        count +=
            onlineCountDirection(
                boardData,
                row,
                col,
                dr,
                dc,
                player,
                size
            );

        count +=
            onlineCountDirection(
                boardData,
                row,
                col,
                -dr,
                -dc,
                player,
                size
            );

        if (count >= 5) {
            return true;
        }
    }

    return false;
}


function onlineCountDirection(
    boardData,
    row,
    col,
    dr,
    dc,
    player,
    size
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
            boardData[index] !==
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


function onlineCount(boardData) {
    return boardData.filter(
        cell =>
            cell === "X" ||
            cell === "O"
    ).length;
}


// ============================================================
// VÁN MỚI ONLINE
// CHỈ X ĐƯỢC GỌI
// ============================================================

async function startNewOnlineGame() {
    if (
        !onlineMode ||
        onlineRole !== "X" ||
        !onlineRoomCode
    ) {
        return;
    }

    try {
        // Dừng timer cũ ngay lập tức
        stopOnlineTimer();

        // Vô hiệu hóa timer cũ ở client hiện tại
        activeTurnStartedAt = null;

        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );

        const result =
            await roomRef.transaction(
                room => {
                    if (!room) {
                        return room;
                    }

                    // Không có O thì chưa thể bắt đầu
                    if (!room.playerO) {
                        return room;
                    }

                    const size =
                        Number(
                            room.size
                        );

                    // RESET BÀN
                    room.board =
                        new Array(
                            size * size
                        ).fill("");

                    // X đi trước
                    room.currentPlayer =
                        "X";

                    // VÁN MỚI
                    room.gameStarted =
                        true;

                    room.gameOver =
                        false;

                    room.winner =
                        "";

                    room.lastMove =
                        -1;

                    // QUAN TRỌNG:
                    // KHÔNG reset scoreX / scoreO

                    // Tạo timestamp mới hoàn toàn
                    // để timer của ván trước không
                    // thể cộng điểm vào ván này.
                    room.turnStartedAt =
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;

                    return room;
                }
            );

        if (!result.committed) {
            console.warn(
                "Không thể bắt đầu ván mới."
            );

            return;
        }

        console.log(
            "VÁN MỚI:",
            onlineRoomCode
        );

    } catch (error) {
        console.error(
            "NEW ONLINE GAME ERROR:",
            error
        );

        alert(
            "Không thể bắt đầu ván mới.\n\n" +
            (error.message || error)
        );
    }
}


// ============================================================
// HIỂN THỊ KẾT QUẢ
// ============================================================

function showOnlineResult(
    winner
) {
    const resultElement =
        document.getElementById(
            "result"
        );

    if (!resultElement) {
        return;
    }

    if (winner === "DRAW") {
        resultElement.textContent =
            "Hòa!";
    } else {
        resultElement.textContent =
            "Người thắng: " +
            winner;
    }

    resultElement.classList.remove(
        "hidden"
    );
}


// ============================================================
// RỜI PHÒNG
// ============================================================

async function leaveOnlineRoom() {
    stopOnlineTimer();

    onlineMode = false;
    activeTurnStartedAt = null;

    if (onlineRoomListener) {
        onlineRoomListener.off();
        onlineRoomListener = null;
    }

    onlineRoomCode = "";
    onlineRole = "";

    console.log(
        "Đã rời phòng."
    );
}


// ============================================================
// COPY MÃ PHÒNG
// ============================================================

async function copyRoomCode() {
    if (!onlineRoomCode) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            onlineRoomCode
        );

        alert(
            "Đã copy mã phòng: " +
            onlineRoomCode
        );

    } catch (error) {
        console.error(
            "COPY ROOM ERROR:",
            error
        );

        alert(
            "Mã phòng: " +
            onlineRoomCode
        );
    }
}


// ============================================================
// COPY LINK PHÒNG
// ============================================================

async function copyRoomLink() {
    if (!onlineRoomCode) {
        return;
    }

    const link =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        onlineRoomCode;

    try {
        await navigator.clipboard.writeText(
            link
        );

        alert(
            "Đã copy link phòng!"
        );

    } catch (error) {
        console.error(
            "COPY LINK ERROR:",
            error
        );

        prompt(
            "Copy link này:",
            link
        );
    }
}


// ============================================================
// TỰ ĐỘNG NHẬN ROOM TỪ URL
// Ví dụ:
// index.html?room=ABC123
// ============================================================

function checkRoomFromURL() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const roomCode =
        params.get("room");

    if (!roomCode) {
        return;
    }

    const input =
        document.getElementById(
            "roomCodeInput"
        );

    if (input) {
        input.value =
            roomCode.toUpperCase();
    }
}


// ============================================================
// KHỞI ĐỘNG
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await initFirebase();

        checkRoomFromURL();
    }
);
