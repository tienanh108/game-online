// ========================================
// FIREBASE ONLINE CARO
// ========================================

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",
    authDomain: "caro-3460d.firebaseapp.com",
    databaseURL: "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "caro-3460d",
    storageBucket: "caro-3460d.firebasestorage.app",
    messagingSenderId: "473059233945",
    appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
    measurementId: "G-WXXMSSSN3W"
};

// ========================================
// BIẾN ONLINE
// ========================================

let onlineMode = false;
let onlineRole = "";
let roomId = "";
let roomListener = null;

let firebaseReady = false;
let firebaseStarting = null;


// ========================================
// KHỞI TẠO FIREBASE
// ========================================

function initFirebase() {

    if (firebaseStarting) {
        return firebaseStarting;
    }

    firebaseStarting = new Promise(async (resolve, reject) => {

        try {

            // Firebase đã được khởi tạo rồi
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            db = firebase.database();

            // Nếu đã đăng nhập anonymous rồi
            if (firebase.auth().currentUser) {
                firebaseReady = true;
                console.log("Firebase ready");
                resolve(true);
                return;
            }

            // Đăng nhập anonymous
            await firebase.auth().signInAnonymously();

            if (!firebase.auth().currentUser) {
                throw new Error("Không lấy được Firebase user");
            }

            firebaseReady = true;

            console.log(
                "Firebase ready - UID:",
                firebase.auth().currentUser.uid
            );

            resolve(true);

        } catch (error) {

            console.error("Firebase init error:", error);

            firebaseReady = false;

            alert(
                "Không kết nối được Firebase.\n\n" +
                "Lỗi: " + (error.message || error)
            );

            reject(error);
        }

    });

    return firebaseStarting;
}


// ========================================
// ĐẢM BẢO FIREBASE SẴN SÀNG
// ========================================

async function ensureFirebaseReady() {

    try {
        await initFirebase();

        if (!firebase.auth().currentUser) {
            throw new Error("Chưa đăng nhập Firebase");
        }

        return true;

    } catch (error) {

        console.error(error);

        return false;
    }
}


// ========================================
// TẠO MÃ PHÒNG
// ========================================

function generateRoomCode() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}


// ========================================
// TẠO PHÒNG
// ========================================

async function createOnlineRoom() {

    console.log("createOnlineRoom()");

    const ready = await ensureFirebaseReady();

    if (!ready) {
        return;
    }

    try {

        let code = generateRoomCode();

        let roomRef = db.ref("rooms/" + code);

        // Tránh trường hợp mã phòng trùng
        let snapshot = await roomRef.once("value");

        while (snapshot.exists()) {
            code = generateRoomCode();
            roomRef = db.ref("rooms/" + code);
            snapshot = await roomRef.once("value");
        }

        const initialBoard = Array(boardSize * boardSize).fill("");

        const roomData = {

            board: initialBoard,

            boardSize: boardSize,

            currentPlayer: "X",

            gameStarted: false,

            gameOver: false,

            playerX: firebase.auth().currentUser.uid,

            playerO: "",

            scoreX: 0,

            scoreO: 0,

            round: 1,

            turnStartedAt: Date.now(),

            result: "",

            createdAt: Date.now()
        };

        await roomRef.set(roomData);

        roomId = code;
        onlineRole = "X";
        onlineMode = true;

        console.log("Room created:", roomId);

        openOnlineGame();

        listenToRoom();

    } catch (error) {

        console.error("Create room error:", error);

        alert(
            "Không tạo được phòng.\n\n" +
            "Lỗi: " + (error.message || error)
        );
    }
}


// ========================================
// THAM GIA PHÒNG
// ========================================

async function joinOnlineRoom() {

    console.log("joinOnlineRoom()");

    const input = document.getElementById("roomCodeInput");

    if (!input) {
        alert("Không tìm thấy ô nhập mã phòng.");
        return;
    }

    const code = input.value.trim().toUpperCase();

    if (!code) {
        alert("Hãy nhập mã phòng.");
        return;
    }

    const ready = await ensureFirebaseReady();

    if (!ready) {
        return;
    }

    try {

        const roomRef = db.ref("rooms/" + code);

        const snapshot = await roomRef.once("value");

        if (!snapshot.exists()) {
            alert("Không tìm thấy phòng " + code);
            return;
        }

        const room = snapshot.val();

        const uid = firebase.auth().currentUser.uid;

        // Nếu chính người tạo phòng đang mở lại
        if (room.playerX === uid) {

            roomId = code;
            onlineRole = "X";
            onlineMode = true;

            openOnlineGame();
            listenToRoom();

            return;
        }

        // Đã có O và không phải mình
        if (room.playerO && room.playerO !== uid) {

            alert("Phòng này đã có đủ 2 người.");

            return;
        }

        // Gán O
        await roomRef.update({

            playerO: uid,

            gameStarted: true,

            gameOver: false,

            result: "",

            currentPlayer: "X",

            turnStartedAt: Date.now()
        });

        roomId = code;
        onlineRole = "O";
        onlineMode = true;

        console.log("Joined room as O:", roomId);

        openOnlineGame();

        listenToRoom();

    } catch (error) {

        console.error("Join room error:", error);

        alert(
            "Không vào được phòng.\n\n" +
            "Lỗi: " + (error.message || error)
        );
    }
}


// ========================================
// MỞ MÀN HÌNH GAME ONLINE
// ========================================

function openOnlineGame() {

    onlineMode = true;

    const menuScreen = document.getElementById("menuScreen");
    const gameScreen = document.getElementById("gameScreen");

    if (menuScreen) {
        menuScreen.classList.add("hidden");
    }

    if (gameScreen) {
        gameScreen.classList.remove("hidden");
    }

    // Cả X và O đều được phép bấm Ván mới
    const newGameBtn = document.getElementById("newGameBtn");

    if (newGameBtn) {
        newGameBtn.classList.remove("hidden");
        newGameBtn.style.display = "";
    }

    const roomCodeElement = document.getElementById("roomCode");

    if (roomCodeElement) {
        roomCodeElement.textContent = roomId;
    }

    const roleElement = document.getElementById("onlineRole");

    if (roleElement) {
        roleElement.textContent =
            "Bạn là " + onlineRole;
    }

    if (typeof renderBoard === "function") {
        renderBoard();
    }

    if (typeof updateGameInfo === "function") {
        updateGameInfo();
    }
}


// ========================================
// LẮNG NGHE PHÒNG REALTIME
// ========================================

function listenToRoom() {

    if (!roomId) {
        return;
    }

    if (roomListener) {
        roomListener.off();
    }

    roomListener = db.ref("rooms/" + roomId);

    roomListener.on("value", snapshot => {

        if (!snapshot.exists()) {
            return;
        }

        const room = snapshot.val();

        console.log("Room update:", room);

        // Đồng bộ bàn cờ
        if (Array.isArray(room.board)) {
            board = room.board;
        }

        // Đồng bộ kích thước bàn
        if (room.boardSize) {
            boardSize = room.boardSize;
        }

        // Đồng bộ lượt
        if (room.currentPlayer) {
            currentPlayer = room.currentPlayer;
        }

        // Đồng bộ trạng thái
        gameOver = !!room.gameOver;

        // Đồng bộ điểm
        if (typeof room.scoreX === "number") {
            scoreX = room.scoreX;
        }

        if (typeof room.scoreO === "number") {
            scoreO = room.scoreO;
        }

        // Render lại
        if (typeof renderBoard === "function") {
            renderBoard();
        }

        if (typeof updateGameInfo === "function") {
            updateGameInfo();
        }

        updateOnlineInfo(room);

        // Hiển thị kết quả
        if (room.result) {
            showOnlineResult(room.result);
        }

        // Timer
        if (!room.gameOver && room.gameStarted) {
            startOnlineTimer(room);
        } else {
            stopTimer();
        }
    });
}


// ========================================
// HIỂN THỊ THÔNG TIN ONLINE
// ========================================

function updateOnlineInfo(room) {

    const roomCodeElement = document.getElementById("roomCode");

    if (roomCodeElement) {
        roomCodeElement.textContent = roomId;
    }

    const roleElement = document.getElementById("onlineRole");

    if (roleElement) {
        roleElement.textContent =
            "Bạn là " + onlineRole;
    }

    const turnInfo =
        document.getElementById("turnInfo") ||
        document.getElementById("turnText");

    if (turnInfo) {

        if (room.gameOver) {

            turnInfo.textContent = "Ván đấu kết thúc";

        } else if (!room.playerO) {

            turnInfo.textContent =
                "Đang chờ người chơi O...";

        } else if (room.currentPlayer === onlineRole) {

            turnInfo.textContent =
                "Đến lượt bạn (" + onlineRole + ")";

        } else {

            turnInfo.textContent =
                "Đến lượt " + room.currentPlayer;
        }
    }

    const scoreElement = document.getElementById("score");

    if (scoreElement) {

        scoreElement.textContent =
            "X: " + (room.scoreX || 0) +
            "  -  " +
            "O: " + (room.scoreO || 0);
    }
}


// ========================================
// TIMER ONLINE
// ========================================

function startOnlineTimer(room) {

    stopTimer();

    if (!room.turnStartedAt) {
        return;
    }

    timerInterval = setInterval(() => {

        if (!onlineMode) {
            stopTimer();
            return;
        }

        const elapsed =
            Math.floor((Date.now() - room.turnStartedAt) / 1000);

        const remaining =
            Math.max(0, 30 - elapsed);

        timerSeconds = remaining;

        updateTimerDisplay();

        if (remaining <= 0) {

            stopTimer();

            handleOnlineTimeout(room);
        }

    }, 250);
}


// ========================================
// HIỂN THỊ TIMER
// ========================================

function updateTimerDisplay() {

    const timerElement =
        document.getElementById("timer") ||
        document.getElementById("timerText");

    if (timerElement) {
        timerElement.textContent =
            timerSeconds + "s";
    }
}


// ========================================
// XỬ LÝ HẾT GIỜ
// ========================================

async function handleOnlineTimeout(roomAtStart) {

    if (!onlineMode || !roomId) {
        return;
    }

    try {

        const roomRef = db.ref("rooms/" + roomId);

        await roomRef.transaction(room => {

            if (!room) {
                return;
            }

            if (room.gameOver) {
                return;
            }

            if (!room.gameStarted) {
                return;
            }

            // Chỉ xử lý nếu vẫn đúng lượt đã hết giờ
            if (room.currentPlayer !== roomAtStart.currentPlayer) {
                return;
            }

            const started =
                Number(room.turnStartedAt || 0);

            if (Date.now() - started < 29000) {
                return;
            }

            const loser = room.currentPlayer;

            const winner =
                loser === "X" ? "O" : "X";

            room.gameOver = true;

            room.result =
                winner + " thắng do " +
                loser + " hết giờ!";

            if (winner === "X") {
                room.scoreX =
                    Number(room.scoreX || 0) + 1;
            } else {
                room.scoreO =
                    Number(room.scoreO || 0) + 1;
            }

            return room;
        });

    } catch (error) {

        console.error("Timeout error:", error);
    }
}


// ========================================
// ĐẶT QUÂN ONLINE
// ========================================

async function makeOnlineMove(index) {

    console.log(
        "ONLINE MOVE:",
        index,
        "role:",
        onlineRole,
        "room:",
        roomId
    );

    if (!onlineMode) {
        console.log("Không ở online mode");
        return;
    }

    if (!onlineRole) {
        console.log("Không có onlineRole");
        return;
    }

    if (!roomId) {
        console.log("Không có roomId");
        return;
    }

    try {

        const roomRef =
            db.ref("rooms/" + roomId);

        // Lấy trạng thái Firebase mới nhất
        const snapshot =
            await roomRef.once("value");

        if (!snapshot.exists()) {
            alert("Phòng không còn tồn tại.");
            return;
        }

        const latest = snapshot.val();

        console.log("Latest Firebase room:", latest);

        // Phải có người chơi O
        if (!latest.playerO) {

            console.log("Chưa có người chơi O");

            return;
        }

        if (latest.gameOver) {
            return;
        }

        if (!latest.gameStarted) {
            return;
        }

        // Kiểm tra đúng lượt
        if (latest.currentPlayer !== onlineRole) {

            console.log(
                "Chưa tới lượt.",
                "Firebase:",
                latest.currentPlayer,
                "Bạn:",
                onlineRole
            );

            return;
        }

        if (!Array.isArray(latest.board)) {
            return;
        }

        if (latest.board[index] !== "") {
            return;
        }

        // Transaction để tránh 2 người cùng ghi một ô
        const result =
            await roomRef.transaction(room => {

                if (!room) {
                    return;
                }

                if (room.gameOver) {
                    return;
                }

                if (!room.gameStarted) {
                    return;
                }

                if (room.currentPlayer !== onlineRole) {
                    return;
                }

                if (!Array.isArray(room.board)) {
                    return;
                }

                if (room.board[index] !== "") {
                    return;
                }

                // Đặt quân
                room.board[index] = onlineRole;

                // Kiểm tra thắng
                if (
                    typeof checkWin === "function" &&
                    checkWin(index, onlineRole)
                ) {

                    room.gameOver = true;

                    room.result =
                        onlineRole + " thắng!";

                    if (onlineRole === "X") {

                        room.scoreX =
                            Number(room.scoreX || 0) + 1;

                    } else {

                        room.scoreO =
                            Number(room.scoreO || 0) + 1;
                    }

                    return room;
                }

                // Kiểm tra hòa
                let full = true;

                for (let i = 0; i < room.board.length; i++) {

                    if (room.board[i] === "") {
                        full = false;
                        break;
                    }
                }

                if (full) {

                    room.gameOver = true;

                    room.result = "Hòa!";

                    return room;
                }

                // Đổi lượt
                room.currentPlayer =
                    onlineRole === "X" ? "O" : "X";

                room.turnStartedAt = Date.now();

                return room;
            });

        if (result.committed) {

            console.log(
                "Đặt quân thành công:",
                onlineRole,
                index
            );

        } else {

            console.log(
                "Transaction không commit."
            );
        }

    } catch (error) {

        console.error(
            "makeOnlineMove error:",
            error
        );
    }
}


// ========================================
// VÁN MỚI ONLINE
// ========================================

async function startNewOnlineGame() {

    if (!onlineMode || !roomId) {
        return;
    }

    try {

        const roomRef =
            db.ref("rooms/" + roomId);

        await roomRef.transaction(room => {

            if (!room) {
                return;
            }

            const size =
                Number(room.boardSize || boardSize);

            room.board =
                Array(size * size).fill("");

            room.gameStarted =
                !!room.playerO;

            room.gameOver = false;

            room.result = "";

            // Mỗi ván X đi trước
            room.currentPlayer = "X";

            room.turnStartedAt =
                Date.now();

            // Giữ nguyên score
            room.scoreX =
                Number(room.scoreX || 0);

            room.scoreO =
                Number(room.scoreO || 0);

            room.round =
                Number(room.round || 1) + 1;

            return room;
        });

        console.log("New online game started");

    } catch (error) {

        console.error(
            "New online game error:",
            error
        );
    }
}


// ========================================
// NÚT VÁN MỚI
// ========================================

function startNewGame() {

    if (onlineMode) {

        startNewOnlineGame();

        return;
    }

    if (typeof startNewOfflineGame === "function") {
        startNewOfflineGame();
    }
}


// ========================================
// HIỂN THỊ KẾT QUẢ ONLINE
// ========================================

function showOnlineResult(text) {

    const resultBox =
        document.getElementById("resultBox");

    if (!resultBox) {
        return;
    }

    resultBox.textContent = text;

    resultBox.classList.remove("hidden");
}


// ========================================
// RỜI PHÒNG
// ========================================

async function leaveOnlineRoom() {

    stopTimer();

    if (roomListener) {

        roomListener.off();

        roomListener = null;
    }

    onlineMode = false;
    onlineRole = "";
    roomId = "";

    console.log("Left online room");
}


// ========================================
// COPY MÃ PHÒNG
// ========================================

async function copyRoomCode() {

    if (!roomId) {
        return;
    }

    try {

        await navigator.clipboard.writeText(roomId);

        alert("Đã copy mã phòng: " + roomId);

    } catch (error) {

        prompt(
            "Copy mã phòng:",
            roomId
        );
    }
}


// ========================================
// COPY LINK PHÒNG
// ========================================

async function copyRoomLink() {

    if (!roomId) {
        return;
    }

    const url =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        roomId;

    try {

        await navigator.clipboard.writeText(url);

        alert("Đã copy link phòng!");

    } catch (error) {

        prompt(
            "Copy link phòng:",
            url
        );
    }
}


// ========================================
// TỰ ĐỘNG VÀO PHÒNG TỪ URL
// ========================================

async function checkRoomFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const room =
        params.get("room");

    if (!room) {
        return;
    }

    const input =
        document.getElementById("roomCodeInput");

    if (input) {
        input.value =
            room.toUpperCase();
    }

    // Không tự join nếu người dùng đang ở game
    // Chỉ điền mã phòng vào ô nhập
}


// ========================================
// KHỞI ĐỘNG
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Firebase script loaded"
        );

        initFirebase()
            .then(() => {

                console.log(
                    "Firebase authentication ready"
                );

                checkRoomFromURL();

            })
            .catch(error => {

                console.error(
                    "Firebase startup error:",
                    error
                );
            });
    }
);
