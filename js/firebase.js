/* =====================================================
   CARO 5 - FIREBASE ONLINE
   BẢN HOÀN CHỈNH
===================================================== */
/* =====================================================
   BIẾN TOÀN CỤC
===================================================== */
let db = null;
let onlineMode = false;
let onlineRole = "";
let roomId = "";
let roomListener = null;
let firebaseReady = false;
let firebaseStarting = null;
/* =====================================================
   FIREBASE CONFIG
===================================================== */
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
/* =====================================================
   INIT FIREBASE
===================================================== */
function initFirebase() {
    if (firebaseReady) {
        return Promise.resolve(true);
    }
    if (firebaseStarting) {
        return firebaseStarting;
    }
    firebaseStarting = (async () => {
        try {
            console.log(
                "🔥 Firebase: bắt đầu khởi tạo..."
            );
            /*
             * Khởi tạo Firebase
             */
            if (!firebase.apps.length) {
                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            }
            /*
             * Database
             */
            db = firebase.database();
            /*
             * Anonymous Authentication
             */
            if (!firebase.auth().currentUser) {
                console.log(
                    "Firebase: đăng nhập Anonymous..."
                );
                await firebase.auth()
                    .signInAnonymously();
            }
            const user =
                firebase.auth().currentUser;
            if (!user) {
                throw new Error(
                    "Không lấy được tài khoản Firebase."
                );
            }
            firebaseReady = true;
            console.log(
                "✅ Firebase OK. UID:",
                user.uid
            );
            /*
             * Status trên menu
             */
            const status =
                document.getElementById(
                    "firebaseStatus"
                );
            if (status) {
                status.textContent =
                    "🟢 Đã kết nối Firebase";
            }
            return true;
        } catch (error) {
            console.error(
                "❌ FIREBASE INIT ERROR:",
                error
            );
            firebaseReady = false;
            const status =
                document.getElementById(
                    "firebaseStatus"
                );
            if (status) {
                status.textContent =
                    "🔴 Firebase chưa kết nối";
            }
            alert(
                "Không kết nối được Firebase.\n\n" +
                error.message
            );
            throw error;
        }
    })();
    return firebaseStarting;
}
/* =====================================================
   ĐẢM BẢO FIREBASE SẴN SÀNG
===================================================== */
async function ensureFirebaseReady() {
    try {
        await initFirebase();
        if (!db) {
            db =
                firebase.database();
        }
        if (!firebase.auth().currentUser) {
            await firebase.auth()
                .signInAnonymously();
        }
        return true;
    } catch (error) {
        console.error(
            "Firebase chưa sẵn sàng:",
            error
        );
        return false;
    }
}
/* =====================================================
   TẠO MÃ PHÒNG
===================================================== */
function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];
    }
    return code;
}
/* =====================================================
   TẠO PHÒNG
===================================================== */
async function createOnlineRoom() {
    console.log(
        "========== CREATE ROOM =========="
    );
    const ready =
        await ensureFirebaseReady();
    if (!ready) {
        return;
    }
    try {
        let code =
            generateRoomCode();
        let roomRef =
            db.ref(
                "rooms/" +
                code
            );
        let snapshot =
            await roomRef.once(
                "value"
            );
        /*
         * Tránh trùng mã phòng
         */
        while (snapshot.exists()) {
            code =
                generateRoomCode();
            roomRef =
                db.ref(
                    "rooms/" +
                    code
                );
            snapshot =
                await roomRef.once(
                    "value"
                );
        }
        /*
         * Kích thước bàn
         */
        const size =
            Number(
                document.getElementById(
                    "boardSizeSelect"
                ).value
            ) || 15;
        /*
         * Tạo room
         */
        const now =
            Date.now();
        const newRoom = {
            board:
                Array(
                    size * size
                ).fill(""),
            boardSize:
                size,
            currentPlayer:
                "X",
            gameStarted:
                false,
            gameOver:
                false,
            playerX:
                firebase.auth()
                    .currentUser
                    .uid,
            playerO:
                "",
            scoreX:
                0,
            scoreO:
                0,
            round:
                1,
            turnStartedAt:
                now,
            result:
                "",
            createdAt:
                now
        };
        console.log(
            "Đang tạo phòng:",
            code
        );
        await roomRef.set(
            newRoom
        );
        /*
         * Thiết lập máy X
         */
        roomId =
            code;
        onlineRole =
            "X";
        onlineMode =
            true;
        console.log(
            "✅ TẠO PHÒNG THÀNH CÔNG:",
            roomId
        );
        openOnlineGame();
        listenToRoom();
    } catch (error) {
        console.error(
            "❌ CREATE ROOM ERROR:",
            error
        );
        alert(
            "Không tạo được phòng.\n\n" +
            "Lỗi Firebase:\n" +
            error.message
        );
    }
}
/* =====================================================
   THAM GIA PHÒNG
===================================================== */
async function joinOnlineRoom(
    codeFromButton = ""
) {
    console.log(
        "========== JOIN ROOM =========="
    );
    const input =
        document.getElementById(
            "roomInput"
        );
    const code =
        (
            codeFromButton ||
            (input ? input.value : "")
        )
        .trim()
        .toUpperCase();
    if (!code) {
        alert(
            "Hãy nhập mã phòng."
        );
        return;
    }
    const ready =
        await ensureFirebaseReady();
    if (!ready) {
        return;
    }
    try {
        const roomRef =
            db.ref(
                "rooms/" +
                code
            );
        const snapshot =
            await roomRef.once(
                "value"
            );
        if (!snapshot.exists()) {
            alert(
                "Không tìm thấy phòng " +
                code
            );
            return;
        }
        const room =
            snapshot.val();
        const uid =
            firebase.auth()
                .currentUser
                .uid;
        /*
         * Nếu chính người tạo
         * mở lại phòng
         */
        if (room.playerX === uid) {
            roomId =
                code;
            onlineRole =
                "X";
            onlineMode =
                true;
            openOnlineGame();
            listenToRoom();
            return;
        }
        /*
         * Phòng đã có người O khác
         */
        if (
            room.playerO &&
            room.playerO !== uid
        ) {
            alert(
                "Phòng này đã đủ 2 người."
            );
            return;
        }
        /*
         * Gán người này vào O
         */
        await roomRef.update({
            playerO:
                uid,
            gameStarted:
                true,
            gameOver:
                false,
            result:
                "",
            currentPlayer:
                "X",
            turnStartedAt:
                Date.now()
        });
        roomId =
            code;
        onlineRole =
            "O";
        onlineMode =
            true;
        console.log(
            "✅ VÀO PHÒNG THÀNH CÔNG - O"
        );
        openOnlineGame();
        listenToRoom();
    } catch (error) {
        console.error(
            "❌ JOIN ROOM ERROR:",
            error
        );
        alert(
            "Không vào được phòng.\n\n" +
            "Lỗi Firebase:\n" +
            error.message
        );
    }
}
/* =====================================================
   MỞ GAME ONLINE
===================================================== */
function openOnlineGame() {
    onlineMode =
        true;
    const menuScreen =
        document.getElementById(
            "menuScreen"
        );
    const gameScreen =
        document.getElementById(
            "gameScreen"
        );
    if (menuScreen) {
        menuScreen.classList.add(
            "hidden"
        );
    }
    if (gameScreen) {
        gameScreen.classList.remove(
            "hidden"
        );
    }
    /*
     * Thông tin phòng
     */
    updateRoomInfo();
    /*
     * Cả X và O đều có nút Ván mới
     */
    const newGameButton =
        document.getElementById(
            "newGameButton"
        );
    if (newGameButton) {
        newGameButton.classList.remove(
            "hidden"
        );
        newGameButton.style.display =
            "";
    }
    /*
     * Hiện nút sao chép mã
     */
    const copyRoomButton =
        document.getElementById(
            "copyRoomButton"
        );
    if (copyRoomButton) {
        copyRoomButton.classList.remove(
            "hidden"
        );
        copyRoomButton.style.display =
            "";
    }
    /*
     * Hiện nút sao chép link
     */
    const copyLinkButton =
        document.getElementById(
            "copyLinkButton"
        );
    if (copyLinkButton) {
        copyLinkButton.classList.remove(
            "hidden"
        );
        copyLinkButton.style.display =
            "";
    }
    /*
     * Render
     */
    if (
        typeof renderBoard ===
        "function"
    ) {
        renderBoard();
    }
    if (
        typeof updateGameInfo ===
        "function"
    ) {
        updateGameInfo();
    }
}
/* =====================================================
   UPDATE ROOM INFO
===================================================== */
function updateRoomInfo() {
    const roomInfo =
        document.getElementById(
            "roomInfo"
        );
    if (roomInfo) {
        roomInfo.textContent =
            "Phòng: " +
            roomId +
            " • Bạn: " +
            onlineRole;
    }
}
/* =====================================================
   LẮNG NGHE ROOM REALTIME
===================================================== */
function listenToRoom() {
    if (
        !roomId ||
        !db
    ) {
        return;
    }
    /*
     * Hủy listener cũ
     */
    if (roomListener) {
        roomListener.off();
        roomListener =
            null;
    }
    roomListener =
        db.ref(
            "rooms/" +
            roomId
        );
    roomListener.on(
        "value",
        snapshot => {
            if (!snapshot.exists()) {
                return;
            }
            const room =
                snapshot.val();
            /*
             * BOARD
             */
            if (
                Array.isArray(
                    room.board
                )
            ) {
                board =
                    room.board.slice();
            }
            /*
             * BOARD SIZE
             */
            if (room.boardSize) {
                boardSize =
                    Number(
                        room.boardSize
                    );
            }
            /*
             * CURRENT PLAYER
             */
            if (
                room.currentPlayer
            ) {
                currentPlayer =
                    room.currentPlayer;
            }
            /*
             * GAME OVER
             */
            gameOver =
                !!room.gameOver;
            /*
             * SCORE
             */
            scoreX =
                Number(
                    room.scoreX || 0
                );
            scoreO =
                Number(
                    room.scoreO || 0
                );
            /*
             * Render board
             */
            if (
                typeof renderBoard ===
                "function"
            ) {
                renderBoard();
            }
            /*
             * Update game info
             */
            if (
                typeof updateGameInfo ===
                "function"
            ) {
                updateGameInfo();
            }
            /*
             * Update online info
             */
            updateOnlineInfo(
                room
            );
            /*
             * =========================
             * KẾT QUẢ
             * =========================
             */
            if (
                room.gameOver === true &&
                room.result
            ) {
                showOnlineResult(
                    room.result
                );
            } else {
                hideOnlineResult();
            }
            /*
             * =========================
             * TIMER
             * =========================
             */
            if (
                room.gameStarted === true &&
                room.gameOver !== true
            ) {
                startOnlineTimer(
                    room
                );
            } else {
                stopTimer();
            }
        }
    );
}
/* =====================================================
   UPDATE INFO ONLINE
===================================================== */
function updateOnlineInfo(room) {
    updateRoomInfo();
    /*
     * Turn
     */
    const turnText =
        document.getElementById(
            "turnText"
        );
    if (turnText) {
        if (
            room.gameOver
        ) {
            turnText.textContent =
                "Ván đấu kết thúc";
        } else if (
            !room.playerO
        ) {
            turnText.textContent =
                "Đang chờ người chơi O...";
        } else if (
            room.currentPlayer ===
            onlineRole
        ) {
            turnText.textContent =
                "Đến lượt bạn (" +
                onlineRole +
                ")";
        } else {
            turnText.textContent =
                "Lượt của " +
                room.currentPlayer;
        }
    }
    /*
     * Score X
     */
    const scoreXElement =
        document.getElementById(
            "scoreX"
        );
    if (scoreXElement) {
        scoreXElement.textContent =
            Number(
                room.scoreX || 0
            );
    }
    /*
     * Score O
     */
    const scoreOElement =
        document.getElementById(
            "scoreO"
        );
    if (scoreOElement) {
        scoreOElement.textContent =
            Number(
                room.scoreO || 0
            );
    }
}
/* =====================================================
   TIMER ONLINE
===================================================== */
function startOnlineTimer(room) {
    stopTimer();
    if (
        !room.turnStartedAt
    ) {
        return;
    }
    timerInterval =
        setInterval(() => {
            if (!onlineMode) {
                stopTimer();
                return;
            }
            /*
             * Tính thời gian
             */
            const elapsed =
                Math.floor(
                    (
                        Date.now() -
                        Number(
                            room.turnStartedAt
                        )
                    ) / 1000
                );
            timerSeconds =
                Math.max(
                    0,
                    30 - elapsed
                );
            /*
             * Hiện timer
             */
            const timer =
                document.getElementById(
                    "timer"
                );
            if (timer) {
                timer.textContent =
                    timerSeconds;
            }
            /*
             * Hết giờ
             */
            if (
                timerSeconds <= 0
            ) {
                stopTimer();
                handleOnlineTimeout(
                    room
                );
            }
        }, 250);
}
/* =====================================================
   TIMEOUT
===================================================== */
async function handleOnlineTimeout(
    oldRoom
) {
    if (
        !onlineMode ||
        !roomId
    ) {
        return;
    }
    try {
        const roomRef =
            db.ref(
                "rooms/" +
                roomId
            );
        await roomRef.transaction(
            room => {
                /*
                 * Không có room
                 */
                if (!room) {
                    return;
                }
                /*
                 * Đã kết thúc
                 */
                if (
                    room.gameOver === true
                ) {
                    return;
                }
                /*
                 * Chưa bắt đầu
                 */
                if (
                    room.gameStarted !== true
                ) {
                    return;
                }
                /*
                 * Chống timeout cũ
                 */
                if (
                    room.currentPlayer !==
                    oldRoom.currentPlayer
                ) {
                    return;
                }
                /*
                 * Chưa đủ 30 giây
                 */
                if (
                    Date.now() -
                    Number(
                        room.turnStartedAt || 0
                    ) <
                    29000
                ) {
                    return;
                }
                /*
                 * Người hết giờ
                 */
                const loser =
                    room.currentPlayer;
                const winner =
                    loser === "X"
                        ? "O"
                        : "X";
                /*
                 * Kết thúc ván
                 */
                room.gameOver =
                    true;
                room.result =
                    winner +
                    " đã thắng do " +
                    loser +
                    " hết giờ!";
                /*
                 * CỘNG ĐIỂM ĐÚNG 1 LẦN
                 */
                if (
                    winner === "X"
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
        );
    } catch (error) {
        console.error(
            "❌ TIMEOUT ERROR:",
            error
        );
    }
}
/* =====================================================
   ĐẶT QUÂN ONLINE
===================================================== */
async function makeOnlineMove(index) {
    console.log(
        "========== ONLINE MOVE ==========",
        "index:",
        index,
        "role:",
        onlineRole,
        "room:",
        roomId
    );
    /*
     * Kiểm tra cơ bản
     */
    if (!onlineMode) {
        return;
    }
    if (!onlineRole) {
        return;
    }
    if (!roomId) {
        return;
    }
    try {
        const roomRef =
            db.ref(
                "rooms/" +
                roomId
            );
        /*
         * Lấy dữ liệu mới nhất
         */
        const snapshot =
            await roomRef.once(
                "value"
            );
        if (
            !snapshot.exists()
        ) {
            return;
        }
        const latest =
            snapshot.val();
        /*
         * Ván đã kết thúc
         */
        if (
            latest.gameOver === true
        ) {
            return;
        }
        /*
         * Ván chưa bắt đầu
         */
        if (
            latest.gameStarted !== true
        ) {
            return;
        }
        /*
         * Chưa đủ 2 người
         */
        if (
            !latest.playerO
        ) {
            return;
        }
        /*
         * Không phải lượt mình
         */
        if (
            latest.currentPlayer !==
            onlineRole
        ) {
            console.log(
                "Chưa tới lượt:",
                latest.currentPlayer
            );
            return;
        }
        /*
         * Kiểm tra board
         */
        if (
            !Array.isArray(
                latest.board
            )
        ) {
            return;
        }
        /*
         * Ô đã có quân
         */
        if (
            latest.board[index] !== ""
        ) {
            return;
        }
        /*
         * TRANSACTION
         */
        const transactionResult =
            await roomRef.transaction(
                room => {
                    /*
                     * Không có room
                     */
                    if (!room) {
                        return;
                    }
                    /*
                     * Đã game over
                     */
                    if (
                        room.gameOver === true
                    ) {
                        return;
                    }
                    /*
                     * Chưa bắt đầu
                     */
                    if (
                        room.gameStarted !== true
                    ) {
                        return;
                    }
                    /*
                     * Kiểm tra lượt
                     */
                    if (
                        room.currentPlayer !==
                        onlineRole
                    ) {
                        return;
                    }
                    /*
                     * Board lỗi
                     */
                    if (
                        !Array.isArray(
                            room.board
                        )
                    ) {
                        return;
                    }
                    /*
                     * Ô đã được người khác
                     * đánh trước đó
                     */
                    if (
                        room.board[index] !== ""
                    ) {
                        return;
                    }
                    /*
                     * =========================
                     * ĐẶT QUÂN
                     * =========================
                     */
                    room.board[index] =
                        onlineRole;
                    /*
                     * =========================
                     * CHECK THẮNG
                     * =========================
                     */
                    const oldBoard =
                        board;
                    board =
                        room.board.slice();
                    let won =
                        false;
                    if (
                        typeof checkWin ===
                        "function"
                    ) {
                        won =
                            checkWin(
                                index,
                                onlineRole
                            );
                    }
                    /*
                     * Trả board local lại
                     */
                    board =
                        oldBoard;
                    /*
                     * =========================
                     * THẮNG
                     * =========================
                     */
                    if (won) {
                        room.gameOver =
                            true;
                        room.result =
                            onlineRole +
                            " đã thắng!";
                        /*
                         * CỘNG ĐIỂM
                         * CHỈ Ở ĐÂY
                         */
                        if (
                            onlineRole ===
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
                        /*
                         * Không đổi lượt
                         */
                        return room;
                    }
                    /*
                     * =========================
                     * HÒA
                     * =========================
                     */
                    const full =
                        room.board.every(
                            cell =>
                                cell !== ""
                        );
                    if (full) {
                        room.gameOver =
                            true;
                        room.result =
                            "Hòa!";
                        /*
                         * Hòa không cộng điểm
                         */
                        return room;
                    }
                    /*
                     * =========================
                     * ĐỔI LƯỢT
                     * =========================
                     */
                    room.currentPlayer =
                        onlineRole === "X"
                            ? "O"
                            : "X";
                    /*
                     * Reset timer
                     */
                    room.turnStartedAt =
                        Date.now();
                    return room;
                }
            );
        if (
            transactionResult.committed
        ) {
            console.log(
                "✅ ĐẶT QUÂN THÀNH CÔNG:",
                onlineRole,
                index
            );
        } else {
            console.log(
                "⚠️ Move không được commit."
            );
        }
    } catch (error) {
        console.error(
            "❌ MAKE ONLINE MOVE ERROR:",
            error
        );
    }
}
/* =====================================================
   CHƠI LẠI ONLINE
===================================================== */
async function startNewOnlineGame() {
    if (
        !onlineMode ||
        !roomId
    ) {
        return;
    }
    try {
        const roomRef =
            db.ref(
                "rooms/" +
                roomId
            );
        /*
         * TRANSACTION
         *
         * Điểm quan trọng:
         *
         * Chỉ người đầu tiên thực hiện
         * transaction khi gameOver = true
         * mới được reset.
         *
         * Sau khi reset:
         *
         * gameOver = false
         *
         * nên người thứ hai bấm cùng lúc
         * sẽ KHÔNG reset lần nữa.
         */
        const result =
            await roomRef.transaction(
                room => {
                    /*
                     * Không có phòng
                     */
                    if (!room) {
                        return;
                    }
                    /*
                     * VÁN CHƯA KẾT THÚC
                     *
                     * Không cho reset.
                     */
                    if (
                        room.gameOver !== true
                    ) {
                        return;
                    }
                    /*
                     * Phải đủ X và O
                     */
                    if (
                        !room.playerX ||
                        !room.playerO
                    ) {
                        return;
                    }
                    /*
                     * Kích thước bàn
                     */
                    const size =
                        Number(
                            room.boardSize ||
                            15
                        );
                    /*
                     * =========================
                     * RESET BOARD
                     * =========================
                     */
                    room.board =
                        Array(
                            size * size
                        ).fill("");
                    /*
                     * =========================
                     * TRẠNG THÁI VÁN MỚI
                     * =========================
                     */
                    room.gameStarted =
                        true;
                    room.gameOver =
                        false;
                    room.result =
                        "";
                    /*
                     * X đi trước
                     */
                    room.currentPlayer =
                        "X";
                    /*
                     * Reset timer
                     */
                    room.turnStartedAt =
                        Date.now();
                    /*
                     * =========================
                     * GIỮ NGUYÊN ĐIỂM
                     * =========================
                     */
                    room.scoreX =
                        Number(
                            room.scoreX || 0
                        );
                    room.scoreO =
                        Number(
                            room.scoreO || 0
                        );
                    /*
                     * =========================
                     * TĂNG SỐ VÁN
                     * =========================
                     */
                    room.round =
                        Number(
                            room.round || 0
                        ) + 1;
                    /*
                     * TUYỆT ĐỐI KHÔNG
                     * CỘNG SCORE Ở ĐÂY
                     */
                    return room;
                }
            );
        if (
            result.committed
        ) {
            console.log(
                "✅ VÁN MỚI ĐÃ BẮT ĐẦU"
            );
        } else {
            console.log(
                "⚠️ VÁN MỚI KHÔNG THỰC HIỆN"
            );
        }
    } catch (error) {
        console.error(
            "❌ NEW GAME ERROR:",
            error
        );
    }
}
/* =====================================================
   HIỂN THỊ KẾT QUẢ
===================================================== */
function showOnlineResult(text) {
    const resultBox =
        document.getElementById(
            "resultBox"
        );
    const resultText =
        document.getElementById(
            "resultText"
        );
    if (resultText) {
        resultText.textContent =
            text;
    }
    if (resultBox) {
        resultBox.classList.remove(
            "hidden"
        );
    }
}
/* =====================================================
   ẨN KẾT QUẢ
===================================================== */
function hideOnlineResult() {
    const resultBox =
        document.getElementById(
            "resultBox"
        );
    if (resultBox) {
        resultBox.classList.add(
            "hidden"
        );
    }
}
/* =====================================================
   COPY MÃ PHÒNG
===================================================== */
async function copyRoomCode() {
    if (!roomId) {
        return;
    }
    try {
        await navigator.clipboard.writeText(
            roomId
        );
        alert(
            "Đã sao chép mã phòng: " +
            roomId
        );
    } catch (error) {
        prompt(
            "Sao chép mã phòng:",
            roomId
        );
    }
}
/* =====================================================
   COPY LINK PHÒNG
===================================================== */
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
        await navigator.clipboard.writeText(
            url
        );
        alert(
            "Đã sao chép link phòng!"
        );
    } catch (error) {
        prompt(
            "Sao chép link:",
            url
        );
    }
}
/* =====================================================
   RỜI PHÒNG
===================================================== */
function leaveOnlineRoom() {
    /*
     * Dừng timer
     */
    stopTimer();
    /*
     * Hủy realtime listener
     */
    if (roomListener) {
        roomListener.off();
        roomListener =
            null;
    }
    /*
     * Reset trạng thái online
     */
    onlineMode =
        false;
    onlineRole =
        "";
    roomId =
        "";
    /*
     * Ẩn kết quả
     */
    hideOnlineResult();
    /*
     * Ẩn nút copy
     */
    const copyRoomButton =
        document.getElementById(
            "copyRoomButton"
        );
    const copyLinkButton =
        document.getElementById(
            "copyLinkButton"
        );
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
    /*
     * Quay về menu
     */
    const gameScreen =
        document.getElementById(
            "gameScreen"
        );
    const menuScreen =
        document.getElementById(
            "menuScreen"
        );
    if (gameScreen) {
        gameScreen.classList.add(
            "hidden"
        );
    }
    if (menuScreen) {
        menuScreen.classList.remove(
            "hidden"
        );
    }
    console.log(
        "🏠 Đã rời phòng và quay về menu."
    );
}
/* =====================================================
   NÚT CHƠI LẠI / THOÁT
   Firebase tự gắn thêm để tránh lỗi nếu main.js
   chưa có listener tương ứng.
===================================================== */
document.addEventListener(
    "DOMContentLoaded",
    () => {
        /*
         * Chơi lại
         */
        const playAgainButton =
            document.getElementById(
                "playAgainButton"
            );
        if (
            playAgainButton &&
            !playAgainButton.dataset.firebaseBound
        ) {
            playAgainButton.dataset.firebaseBound =
                "true";
            playAgainButton.addEventListener(
                "click",
                () => {
                    if (
                        onlineMode
                    ) {
                        startNewOnlineGame();
                    } else {
                        if (
                            typeof startNewOfflineGame ===
                            "function"
                        ) {
                            startNewOfflineGame();
                        }
                    }
                }
            );
        }
        /*
         * Thoát menu
         */
        const exitMenuButton =
            document.getElementById(
                "exitMenuButton"
            );
        if (
            exitMenuButton &&
            !exitMenuButton.dataset.firebaseBound
        ) {
            exitMenuButton.dataset.firebaseBound =
                "true";
            exitMenuButton.addEventListener(
                "click",
                () => {
                    if (
                        onlineMode
                    ) {
                        leaveOnlineRoom();
                    } else {
                        if (
                            typeof showMenu ===
                            "function"
                        ) {
                            showMenu();
                        }
                    }
                }
            );
        }
    }
);
/* =====================================================
   KHỞI ĐỘNG FIREBASE
===================================================== */
document.addEventListener(
    "DOMContentLoaded",
    () => {
        console.log(
            "🔥 Firebase script loaded"
        );
        initFirebase()
            .catch(error => {
                console.error(
                    "Firebase startup:",
                    error
                );
            });
    }
);
