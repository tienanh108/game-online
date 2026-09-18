// ==========================================================
// FIREBASE CONFIG
// ==========================================================
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
// ==========================================================
// BIẾN FIREBASE
// ==========================================================
let firebaseApp = null;
let firebaseAuth = null;
let database = null;
let currentUser = null;
let onlineMode = false;
let onlineRole = null;
let onlineRoomCode = null;
let roomRef = null;
let roomListener = null;
let firebaseReady = false;
// ==========================================================
// KHỞI TẠO FIREBASE
// ==========================================================
async function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            firebaseApp = firebase.app();
        }
        firebaseAuth = firebase.auth();
        database = firebase.database();
        updateFirebaseStatus("Đang kết nối...");
        firebaseAuth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                firebaseReady = true;
                updateFirebaseStatus("🟢 Online");
                console.log("Firebase UID:", currentUser.uid);
            } else {
                firebaseReady = false;
                currentUser = null;
                updateFirebaseStatus("Đang đăng nhập...");
            }
        });
        if (!firebaseAuth.currentUser) {
            await firebaseAuth.signInAnonymously();
        }
    } catch (error) {
        console.error("Firebase init error:", error);
        firebaseReady = false;
        updateFirebaseStatus(
            "🔴 Firebase lỗi: " + error.message
        );
    }
}
// ==========================================================
// ĐẢM BẢO FIREBASE ĐÃ READY
// ==========================================================
async function ensureFirebaseReady() {
    if (firebaseReady && currentUser) {
        return true;
    }
    if (!firebaseAuth) {
        await initFirebase();
    }
    if (firebaseAuth.currentUser) {
        currentUser = firebaseAuth.currentUser;
        firebaseReady = true;
        return true;
    }
    try {
        const result = await firebaseAuth.signInAnonymously();
        currentUser = result.user;
        firebaseReady = true;
        return true;
    } catch (error) {
        console.error(error);
        alert(
            "Không thể kết nối Firebase.\n\n" +
            error.message
        );
        return false;
    }
}
// ==========================================================
// STATUS FIREBASE
// ==========================================================
function updateFirebaseStatus(text) {
    const status = document.getElementById("firebaseStatus");
    if (status) {
        status.textContent = text;
    }
}
// ==========================================================
// TẠO MÃ PHÒNG
// ==========================================================
function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
// ==========================================================
// TẠO PHÒNG
// ==========================================================
async function createOnlineRoom() {
    const ready = await ensureFirebaseReady();
    if (!ready) {
        return;
    }
    try {
        onlineMode = true;
        onlineRole = "X";
        let roomCode = "";
        let ref = null;
        // Tìm mã phòng chưa tồn tại
        for (let i = 0; i < 10; i++) {
            const candidate = generateRoomCode();
            const candidateRef = database.ref("rooms/" + candidate);
            const snapshot = await candidateRef.once("value");
            if (!snapshot.exists()) {
                roomCode = candidate;
                ref = candidateRef;
                break;
            }
        }
        if (!roomCode || !ref) {
            alert("Không thể tạo mã phòng. Hãy thử lại.");
            onlineMode = false;
            onlineRole = null;
            return;
        }
        onlineRoomCode = roomCode;
        roomRef = ref;
        const initialBoard = Array(225).fill("");
        const roomData = {
            roomCode: roomCode,
            boardSize: parseInt(
                document.getElementById("boardSizeSelect").value
            ),
            board: initialBoard,
            playerX: currentUser.uid,
            playerO: null,
            currentPlayer: "X",
            gameStarted: false,
            gameOver: false,
            result: "",
            scoreX: 0,
            scoreO: 0,
            round: 1,
            turnStartedAt: null,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        await ref.set(roomData);
        console.log("Room created:", roomCode);
        openOnlineGame();
        listenToRoom();
    } catch (error) {
        console.error("Create room error:", error);
        onlineMode = false;
        onlineRole = null;
        onlineRoomCode = null;
        roomRef = null;
        alert(
            "Không thể tạo phòng.\n\n" +
            error.message
        );
    }
}
// ==========================================================
// VÀO PHÒNG
// ==========================================================
async function joinOnlineRoom(inputCode) {
    const ready = await ensureFirebaseReady();
    if (!ready) {
        return;
    }
    const roomCode = normalizeRoomCode(inputCode);
    if (!roomCode || roomCode.length !== 6) {
        alert("Mã phòng phải gồm 6 ký tự.");
        return;
    }
    try {
        const ref = database.ref("rooms/" + roomCode);
        const snapshot = await ref.once("value");
        if (!snapshot.exists()) {
            alert("Không tìm thấy phòng.");
            return;
        }
        const room = snapshot.val();
        // Nếu chính user đang ở phòng này
        if (
            room.playerX === currentUser.uid ||
            room.playerO === currentUser.uid
        ) {
            if (room.playerX === currentUser.uid) {
                onlineRole = "X";
            } else {
                onlineRole = "O";
            }
        }
        // Người chơi X
        else if (!room.playerX) {
            onlineRole = "X";
            await ref.update({
                playerX: currentUser.uid,
                gameStarted: !!room.playerO,
                gameOver: false,
                result: "",
                turnStartedAt: room.playerO
                    ? firebase.database.ServerValue.TIMESTAMP
                    : null
            });
        }
        // Người chơi O
        else if (!room.playerO) {
            onlineRole = "O";
            await ref.update({
                playerO: currentUser.uid,
                gameStarted: true,
                gameOver: false,
                result: "",
                currentPlayer: "X",
                turnStartedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
        // Phòng đầy
        else {
            alert("Phòng đã đủ 2 người chơi.");
            return;
        }
        onlineMode = true;
        onlineRoomCode = roomCode;
        roomRef = ref;
        console.log(
            "Joined room:",
            roomCode,
            "Role:",
            onlineRole
        );
        openOnlineGame();
        listenToRoom();
    } catch (error) {
        console.error("Join room error:", error);
        alert(
            "Không thể vào phòng.\n\n" +
            error.message
        );
    }
}
// ==========================================================
// MỞ GAME ONLINE
// ==========================================================
function openOnlineGame() {
    document.getElementById("menuScreen")
        .classList.add("hidden");
    document.getElementById("gameScreen")
        .classList.remove("hidden");
    const roomInfo = document.getElementById("roomInfo");
    if (roomInfo) {
        roomInfo.textContent =
            "Phòng: " +
            onlineRoomCode +
            " • Bạn: " +
            onlineRole;
    }
    const copyRoomButton =
        document.getElementById("copyRoomButton");
    const copyLinkButton =
        document.getElementById("copyLinkButton");
    const newGameButton =
        document.getElementById("newGameButton");
    if (copyRoomButton) {
        copyRoomButton.classList.remove("hidden");
    }
    if (copyLinkButton) {
        copyLinkButton.classList.remove("hidden");
    }
    if (newGameButton) {
        newGameButton.classList.remove("hidden");
    }
    hideOnlineResult();
}
// ==========================================================
// LẮNG NGHE PHÒNG
// ==========================================================
function listenToRoom() {
    if (!roomRef) {
        return;
    }
    if (roomListener) {
        roomRef.off("value", roomListener);
    }
    roomListener = snapshot => {
        const room = snapshot.val();
        if (!room) {
            showMenu();
            return;
        }
        // ==========================================
        // KIỂM TRA NGƯỜI CHƠI HIỆN TẠI
        // ==========================================
        if (room.playerX === currentUser?.uid) {
            onlineRole = "X";
        } else if (room.playerO === currentUser?.uid) {
            onlineRole = "O";
        }
        // ==========================================
        // NẾU USER ĐÃ BỊ XÓA KHỎI PHÒNG
        // ==========================================
        if (
            onlineRole === "X" &&
            room.playerX !== currentUser?.uid
        ) {
            onlineRole = null;
        }
        if (
            onlineRole === "O" &&
            room.playerO !== currentUser?.uid
        ) {
            onlineRole = null;
        }
        // ==========================================
        // BOARD
        // ==========================================
        if (typeof board !== "undefined") {
            const newBoard =
                room.board || [];
            board = newBoard.slice();
            boardSize =
                parseInt(room.boardSize) || 15;
            renderBoard();
        }
        // ==========================================
        // CURRENT PLAYER
        // ==========================================
        if (typeof currentPlayer !== "undefined") {
            currentPlayer =
                room.currentPlayer || "X";
        }
        // ==========================================
        // SCORE
        // ==========================================
        if (typeof scoreX !== "undefined") {
            scoreX = room.scoreX || 0;
        }
        if (typeof scoreO !== "undefined") {
            scoreO = room.scoreO || 0;
        }
        updateOnlineInfo(room);
        // ==========================================
        // GAME OVER
        // ==========================================
        if (typeof gameOver !== "undefined") {
            gameOver = !!room.gameOver;
        }
        // ==========================================
        // KẾT QUẢ
        // ==========================================
        if (room.result) {
            showOnlineResult(room.result);
        } else {
            hideOnlineResult();
        }
        // ==========================================
        // NGƯỜI CHƠI ĐÃ THOÁT
        // ==========================================
        if (room.notice) {
            const notice = room.notice;
            // Chỉ hiện thông báo nếu notice còn mới
            if (
                notice.createdAt &&
                Date.now() - notice.createdAt < 15000
            ) {
                showOnlineNotice(notice.text);
            }
        }
        // ==========================================
        // TRẠNG THÁI CHỜ NGƯỜI MỚI
        // ==========================================
        const waitingForPlayer =
            !!room.playerX &&
            !room.playerO;
        if (waitingForPlayer) {
            if (onlineRole === "X") {
                updateTurnText(
                    "Đang chờ người chơi O..."
                );
            }
        }
        // ==========================================
        // TIMER
        // ==========================================
        startOnlineTimer(room);
    };
    roomRef.on("value", roomListener);
}
// ==========================================================
// CẬP NHẬT THÔNG TIN ONLINE
// ==========================================================
function updateOnlineInfo(room) {
    const turnText =
        document.getElementById("turnText");
    const scoreXElement =
        document.getElementById("scoreX");
    const scoreOElement =
        document.getElementById("scoreO");
    if (scoreXElement) {
        scoreXElement.textContent =
            room.scoreX || 0;
    }
    if (scoreOElement) {
        scoreOElement.textContent =
            room.scoreO || 0;
    }
    if (!turnText) {
        return;
    }
    if (!room.playerO) {
        if (onlineRole === "X") {
            turnText.textContent =
                "Đang chờ người chơi O...";
        } else {
            turnText.textContent =
                "Đang chờ người chơi...";
        }
        return;
    }
    if (room.gameOver) {
        return;
    }
    if (!room.gameStarted) {
        turnText.textContent =
            "Đang chờ người chơi...";
        return;
    }
    if (room.currentPlayer === onlineRole) {
        turnText.textContent =
            "Lượt của bạn (" +
            onlineRole +
            ")";
    } else {
        turnText.textContent =
            "Lượt của " +
            room.currentPlayer;
    }
}
// ==========================================================
// TIMER ONLINE
// ==========================================================
let onlineTimerInterval = null;
function startOnlineTimer(room) {
    clearInterval(onlineTimerInterval);
    const timerElement =
        document.getElementById("timer");
    if (!timerElement) {
        return;
    }
    if (
        !room.gameStarted ||
        room.gameOver ||
        !room.playerX ||
        !room.playerO ||
        !room.turnStartedAt
    ) {
        timerElement.textContent = "30";
        return;
    }
    function updateTimer() {
        const elapsed =
            Math.floor(
                (Date.now() - room.turnStartedAt) / 1000
            );
        const remaining =
            Math.max(0, 30 - elapsed);
        timerElement.textContent =
            remaining;
        if (remaining <= 0) {
            clearInterval(onlineTimerInterval);
            handleOnlineTimeout(room);
        }
    }
    updateTimer();
    onlineTimerInterval =
        setInterval(updateTimer, 250);
}
// ==========================================================
// XỬ LÝ HẾT GIỜ
// ==========================================================
async function handleOnlineTimeout(room) {
    if (!roomRef || !onlineRole) {
        return;
    }
    try {
        await roomRef.transaction(current => {
            if (!current) {
                return;
            }
            if (
                current.gameOver ||
                !current.gameStarted ||
                !current.playerX ||
                !current.playerO
            ) {
                return;
            }
            if (current.currentPlayer !== onlineRole) {
                return;
            }
            const winner =
                onlineRole === "X"
                    ? "O"
                    : "X";
            const newScoreX =
                winner === "X"
                    ? (current.scoreX || 0) + 1
                    : (current.scoreX || 0);
            const newScoreO =
                winner === "O"
                    ? (current.scoreO || 0) + 1
                    : (current.scoreO || 0);
            return {
                ...current,
                gameOver: true,
                result:
                    winner +
                    " thắng do " +
                    onlineRole +
                    " hết giờ!",
                scoreX: newScoreX,
                scoreO: newScoreO,
                turnStartedAt: null
            };
        });
    } catch (error) {
        console.error(
            "Timeout error:",
            error
        );
    }
}
// ==========================================================
// ĐÁNH QUÂN ONLINE
// ==========================================================
async function makeOnlineMove(index) {
    if (!onlineMode) {
        return;
    }
    if (!onlineRole) {
        return;
    }
    if (!roomRef) {
        return;
    }
    try {
        const snapshot =
            await roomRef.once("value");
        const latestRoom =
            snapshot.val();
        if (!latestRoom) {
            return;
        }
        if (
            latestRoom.gameOver ||
            !latestRoom.gameStarted
        ) {
            return;
        }
        if (
            !latestRoom.playerX ||
            !latestRoom.playerO
        ) {
            return;
        }
        if (
            latestRoom.currentPlayer !==
            onlineRole
        ) {
            alert(
                "Chưa đến lượt bạn."
            );
            return;
        }
        if (
            latestRoom.board &&
            latestRoom.board[index]
        ) {
            return;
        }
        await roomRef.transaction(current => {
            if (!current) {
                return;
            }
            if (current.gameOver) {
                return;
            }
            if (!current.gameStarted) {
                return;
            }
            if (
                !current.playerX ||
                !current.playerO
            ) {
                return;
            }
            if (
                current.currentPlayer !==
                onlineRole
            ) {
                return;
            }
            const newBoard =
                current.board
                    ? current.board.slice()
                    : Array(225).fill("");
            if (newBoard[index]) {
                return;
            }
            newBoard[index] =
                onlineRole;
            // ======================================
            // KIỂM TRA THẮNG
            // ======================================
            const size =
                parseInt(current.boardSize) || 15;
            const hasWon =
                checkWinOnline(
                    newBoard,
                    index,
                    onlineRole,
                    size
                );
            if (hasWon) {
                return {
                    ...current,
                    board: newBoard,
                    gameOver: true,
                    result:
                        onlineRole +
                        " thắng!",
                    scoreX:
                        onlineRole === "X"
                            ? (current.scoreX || 0) + 1
                            : (current.scoreX || 0),
                    scoreO:
                        onlineRole === "O"
                            ? (current.scoreO || 0) + 1
                            : (current.scoreO || 0),
                    turnStartedAt: null
                };
            }
            // ======================================
            // HÒA
            // ======================================
            const isDraw =
                newBoard
                    .slice(0, size * size)
                    .every(cell => cell);
            if (isDraw) {
                return {
                    ...current,
                    board: newBoard,
                    gameOver: true,
                    result: "Hòa!",
                    turnStartedAt: null
                };
            }
            // ======================================
            // ĐỔI LƯỢT
            // ======================================
            const nextPlayer =
                onlineRole === "X"
                    ? "O"
                    : "X";
            return {
                ...current,
                board: newBoard,
                currentPlayer: nextPlayer,
                turnStartedAt:
                    firebase.database.ServerValue.TIMESTAMP
            };
        });
    } catch (error) {
        console.error(
            "Online move error:",
            error
        );
    }
}
// ==========================================================
// KIỂM TRA 5 QUÂN
// ==========================================================
function checkWinOnline(
    gameBoard,
    index,
    player,
    size
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
        count += countDirection(
            gameBoard,
            row,
            col,
            dr,
            dc,
            player,
            size
        );
        count += countDirection(
            gameBoard,
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
function countDirection(
    gameBoard,
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
        if (gameBoard[index] !== player) {
            break;
        }
        count++;
        r += dr;
        c += dc;
    }
    return count;
}
// ==========================================================
// VÁN MỚI ONLINE
// ==========================================================
async function startNewOnlineGame() {
    if (!roomRef) {
        return;
    }
    try {
        await roomRef.transaction(current => {
            if (!current) {
                return;
            }
            // Không cho reset khi ván chưa kết thúc
            if (!current.gameOver) {
                return;
            }
            // Phải có đủ 2 người
            if (
                !current.playerX ||
                !current.playerO
            ) {
                return;
            }
            const size =
                parseInt(current.boardSize) || 15;
            return {
                ...current,
                board:
                    Array(size * size).fill(""),
                currentPlayer: "X",
                gameStarted: true,
                gameOver: false,
                result: "",
                turnStartedAt:
                    firebase.database.ServerValue.TIMESTAMP,
                round:
                    (current.round || 0) + 1
            };
        });
    } catch (error) {
        console.error(
            "New online game error:",
            error
        );
    }
}
// ==========================================================
// HIỂN THỊ KẾT QUẢ
// ==========================================================
function showOnlineResult(text) {
    const resultBox =
        document.getElementById("resultBox");
    const resultText =
        document.getElementById("resultText");
    if (resultText) {
        resultText.textContent = text;
    }
    if (resultBox) {
        resultBox.classList.remove("hidden");
    }
    const turnText =
        document.getElementById("turnText");
    if (turnText) {
        turnText.textContent = "Ván đấu kết thúc";
    }
}
function hideOnlineResult() {
    const resultBox =
        document.getElementById("resultBox");
    if (resultBox) {
        resultBox.classList.add("hidden");
    }
}
// ==========================================================
// THÔNG BÁO NGƯỜI CHƠI THOÁT
// ==========================================================
function showOnlineNotice(text) {
    // Nếu HTML đã có resultText thì dùng luôn
    const resultBox =
        document.getElementById("resultBox");
    const resultText =
        document.getElementById("resultText");
    if (resultText) {
        resultText.textContent = text;
    }
    if (resultBox) {
        resultBox.classList.remove("hidden");
    }
    console.log("ONLINE NOTICE:", text);
}
// ==========================================================
// THAY ĐỔI TURN TEXT
// ==========================================================
function updateTurnText(text) {
    const turnText =
        document.getElementById("turnText");
    if (turnText) {
        turnText.textContent = text;
    }
}
// ==========================================================
// COPY MÃ PHÒNG
// ==========================================================
async function copyRoomCode() {
    if (!onlineRoomCode) {
        return;
    }
    try {
        await navigator.clipboard.writeText(
            onlineRoomCode
        );
        alert(
            "Đã sao chép mã phòng: " +
            onlineRoomCode
        );
    } catch (error) {
        alert(
            "Mã phòng: " +
            onlineRoomCode
        );
    }
}
// ==========================================================
// COPY LINK PHÒNG
// ==========================================================
async function copyRoomLink() {
    if (!onlineRoomCode) {
        return;
    }
    const url =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        onlineRoomCode;
    try {
        await navigator.clipboard.writeText(url);
        alert("Đã sao chép link phòng!");
    } catch (error) {
        prompt(
            "Hãy sao chép link này:",
            url
        );
    }
}
// ==========================================================
// RỜI PHÒNG
// ==========================================================
async function leaveOnlineRoom() {
    if (!roomRef || !onlineRole) {
        resetOnlineState();
        showMenu();
        return;
    }
    try {
        const leavingRole =
            onlineRole;
        const leavingUid =
            currentUser?.uid;
        // ==========================================
        // XÓA NGƯỜI CHƠI KHỎI PHÒNG
        // ==========================================
        await roomRef.transaction(current => {
            if (!current) {
                return;
            }
            // Chỉ xóa nếu đúng người đang rời
            if (
                leavingRole === "X" &&
                current.playerX === leavingUid
            ) {
                return {
                    ...current,
                    playerX: null,
                    // Nếu O vẫn còn
                    // thì kết thúc ván hiện tại
                    gameStarted: false,
                    gameOver: false,
                    result: "",
                    currentPlayer: "X",
                    turnStartedAt: null,
                    notice: {
                        text:
                            "Người chơi X đã thoát phòng. Đang chờ người chơi mới...",
                        createdAt:
                            firebase.database.ServerValue.TIMESTAMP
                    }
                };
            }
            if (
                leavingRole === "O" &&
                current.playerO === leavingUid
            ) {
                return {
                    ...current,
                    playerO: null,
                    gameStarted: false,
                    gameOver: false,
                    result: "",
                    currentPlayer: "X",
                    turnStartedAt: null,
                    notice: {
                        text:
                            "Người chơi O đã thoát phòng. Đang chờ người chơi mới...",
                        createdAt:
                            firebase.database.ServerValue.TIMESTAMP
                    }
                };
            }
            return;
        });
    } catch (error) {
        console.error(
            "Leave room error:",
            error
        );
    } finally {
        resetOnlineState();
        showMenu();
    }
}
// ==========================================================
// RESET TRẠNG THÁI LOCAL
// ==========================================================
function resetOnlineState() {
    clearInterval(onlineTimerInterval);
    onlineTimerInterval = null;
    if (roomRef && roomListener) {
        roomRef.off("value", roomListener);
    }
    roomListener = null;
    roomRef = null;
    onlineMode = false;
    onlineRole = null;
    onlineRoomCode = null;
    hideOnlineResult();
    const copyRoomButton =
        document.getElementById("copyRoomButton");
    const copyLinkButton =
        document.getElementById("copyLinkButton");
    if (copyRoomButton) {
        copyRoomButton.classList.add("hidden");
    }
    if (copyLinkButton) {
        copyLinkButton.classList.add("hidden");
    }
}
// ==========================================================
// VỀ MENU
// ==========================================================
function showMenu() {
    const gameScreen =
        document.getElementById("gameScreen");
    const menuScreen =
        document.getElementById("menuScreen");
    if (gameScreen) {
        gameScreen.classList.add("hidden");
    }
    if (menuScreen) {
        menuScreen.classList.remove("hidden");
    }
    const roomInput =
        document.getElementById("roomInput");
    if (roomInput) {
        roomInput.value = "";
    }
}
// ==========================================================
// AUTO INIT
// ==========================================================
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            initFirebase();
        }
    );
} else {
    initFirebase();
}
