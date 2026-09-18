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
let activeTurnStartedAt = null;
// ============================================================
// KHỞI TẠO FIREBASE
// ============================================================
async function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(
                FIREBASE_CONFIG
            );
        }
        /*
           Nếu đã đăng nhập anonymous rồi
           thì dùng luôn tài khoản hiện tại.
        */
        firebaseUser =
            firebase.auth().currentUser;
        /*
           Nếu chưa có tài khoản,
           đăng nhập Anonymous.
        */
        if (!firebaseUser) {
            firebaseUser =
                await firebase
                    .auth()
                    .signInAnonymously();
        }
        firebaseUser =
            firebase.auth().currentUser;
        if (!firebaseUser) {
            throw new Error(
                "Firebase Authentication không tạo được người dùng."
            );
        }
        firebaseInitialized = true;
        console.log(
            "Firebase đã khởi tạo."
        );
        console.log(
            "Firebase UID:",
            firebaseUser.uid
        );
        /*
           Theo dõi trạng thái kết nối.
        */
        firebase
            .database()
            .ref(".info/connected")
            .on(
                "value",
                snapshot => {
                    console.log(
                        "Firebase connected:",
                        snapshot.val()
                    );
                }
            );
        return true;
    } catch (error) {
        firebaseInitialized = false;
        console.error(
            "FIREBASE INIT ERROR:",
            error
        );
        alert(
            "Không thể kết nối Firebase.\n\n" +
            (
                error.message ||
                error
            )
        );
        return false;
    }
}
// ============================================================
// ĐẢM BẢO FIREBASE SẴN SÀNG
// ============================================================
async function ensureFirebaseReady() {
    if (
        firebaseInitialized &&
        firebaseUser
    ) {
        return true;
    }
    return await initFirebase();
}
// ============================================================
// TẠO PHÒNG ONLINE
// ============================================================
async function createOnlineRoom(size) {
    const ready =
        await ensureFirebaseReady();
    if (!ready) {
        return null;
    }
    try {
        const code =
            generateRoomCode();
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    code
                );
        const boardSizeNumber =
            Number(size);
        const emptyBoard =
            new Array(
                boardSizeNumber *
                boardSizeNumber
            ).fill("");
        const roomData = {
            size:
                boardSizeNumber,
            board:
                emptyBoard,
            currentPlayer:
                "X",
            playerX:
                firebaseUser.uid,
            playerO:
                null,
            gameStarted:
                false,
            gameOver:
                false,
            winner:
                "",
            scoreX:
                0,
            scoreO:
                0,
            lastMove:
                -1,
            turnStartedAt:
                null,
            round:
                1,
            createdAt:
                firebase
                    .database()
                    .ServerValue
                    .TIMESTAMP
        };
        /*
           Tạo phòng.
        */
        await roomRef.set(
            roomData
        );
        onlineRoomCode =
            code;
        onlineRole =
            "X";
        onlineMode =
            true;
        console.log(
            "Đã tạo phòng:",
            code
        );
        listenToRoom(
            code
        );
        openOnlineGame(
            code,
            "X",
            roomData
        );
        return code;
    } catch (error) {
        console.error(
            "CREATE ROOM ERROR:",
            error
        );
        alert(
            "Không thể tạo phòng.\n\n" +
            (
                error.message ||
                error
            )
        );
        return null;
    }
}
// ============================================================
// VÀO PHÒNG ONLINE
// ============================================================
async function joinOnlineRoom(code) {
    const ready =
        await ensureFirebaseReady();
    if (!ready) {
        return false;
    }
    code =
        String(code || "")
            .trim()
            .toUpperCase();
    if (!code) {
        alert(
            "Hãy nhập mã phòng."
        );
        return false;
    }
    try {
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    code
                );
        /*
           Lấy dữ liệu phòng mới nhất.
        */
        const snapshot =
            await roomRef.once(
                "value"
            );
        if (!snapshot.exists()) {
            alert(
                "Không tìm thấy phòng " +
                code +
                "."
            );
            return false;
        }
        const room =
            snapshot.val();
        /*
           Phòng đã có người O khác.
        */
        if (
            room.playerO &&
            room.playerO !==
                firebaseUser.uid
        ) {
            alert(
                "Phòng này đã có đủ 2 người."
            );
            return false;
        }
        /*
           Nếu chính chủ X mở lại link,
           giữ vai X.
        */
        if (
            room.playerX ===
            firebaseUser.uid
        ) {
            onlineRoomCode =
                code;
            onlineRole =
                "X";
            onlineMode =
                true;
            listenToRoom(
                code
            );
            openOnlineGame(
                code,
                "X",
                room
            );
            return true;
        }
        /*
           Người thứ 2 vào phòng.
        */
        await roomRef.update({
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
                Date.now()
        });
        onlineRoomCode =
            code;
        onlineRole =
            "O";
        onlineMode =
            true;
        console.log(
            "Đã vào phòng:",
            code
        );
        console.log(
            "Vai của bạn: O"
        );
        listenToRoom(
            code
        );
        /*
           Lấy lại dữ liệu mới nhất
           sau khi O tham gia.
        */
        const updatedSnapshot =
            await roomRef.once(
                "value"
            );
        const updatedRoom =
            updatedSnapshot.val();
        openOnlineGame(
            code,
            "O",
            updatedRoom
        );
        return true;
    } catch (error) {
        console.error(
            "JOIN ROOM ERROR:",
            error
        );
        alert(
            "Không thể vào phòng.\n\n" +
            (
                error.message ||
                error
            )
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
    for (
        let i = 0;
        i < 6;
        i++
    ) {
        code +=
            chars.charAt(
                Math.floor(
                    Math.random() *
                    chars.length
                )
            );
    }
    return code;
}
// ============================================================
// MỞ GAME ONLINE
// ============================================================
function openOnlineGame(
    code,
    role,
    room
) {
    boardSize =
        Number(
            room.size
        );
    /*
       Firebase thường trả array,
       nhưng nếu trả object thì
       chuyển lại thành array.
    */
    if (
        Array.isArray(
            room.board
        )
    ) {
        board =
            room.board.slice();
    } else {
        board =
            Object.values(
                room.board || {}
            );
    }
    currentPlayer =
        room.currentPlayer ||
        "X";
    gameOver =
        !!room.gameOver;
    lastMoveIndex =
        typeof room.lastMove ===
        "number"
            ? room.lastMove
            : -1;
    scoreX =
        Number(
            room.scoreX || 0
        );
    scoreO =
        Number(
            room.scoreO || 0
        );
    onlineRoomCode =
        code;
    onlineRole =
        role;
    onlineMode =
        true;
    /*
       Hiện màn game.
    */
    const menuScreen =
        document.getElementById(
            "menuScreen"
        );
    if (menuScreen) {
        menuScreen
            .classList
            .add("hidden");
    }
    const gameScreen =
        document.getElementById(
            "gameScreen"
        );
    if (gameScreen) {
        gameScreen
            .classList
            .remove("hidden");
    }
    /*
       Hiển thị phòng + vai.
    */
    const roomInfo =
        document.getElementById(
            "roomInfo"
        );
    if (roomInfo) {
        roomInfo.textContent =
            "Phòng " +
            code +
            " • Bạn là " +
            role;
    }
    /*
       Hiện nút copy.
    */
    const copyRoomButton =
        document.getElementById(
            "copyRoomButton"
        );
    if (copyRoomButton) {
        copyRoomButton
            .classList
            .remove("hidden");
    }
    const copyLinkButton =
        document.getElementById(
            "copyLinkButton"
        );
    if (copyLinkButton) {
        copyLinkButton
            .classList
            .remove("hidden");
    }
    /*
       QUAN TRỌNG:
       CẢ X VÀ O đều có nút Ván mới.
    */
    const newGameButton =
        document.getElementById(
            "newGameButton"
        );
    if (newGameButton) {
        newGameButton
            .classList
            .remove("hidden");
    }
    /*
       Điểm.
    */
    const scoreXElement =
        document.getElementById(
            "scoreX"
        );
    const scoreOElement =
        document.getElementById(
            "scoreO"
        );
    if (scoreXElement) {
        scoreXElement.textContent =
            scoreX;
    }
    if (scoreOElement) {
        scoreOElement.textContent =
            scoreO;
    }
    /*
       Vẽ bàn.
    */
    renderBoard();
    updateCells();
    /*
       Thông tin lượt.
    */
    updateOnlineInfo(
        room
    );
    /*
       Timer.
    */
    updateOnlineTimer(
        room
    );
}
// ============================================================
// LẮNG NGHE ROOM REALTIME
// ============================================================
function listenToRoom(code) {
    /*
       Xóa listener cũ.
    */
    if (
        onlineRoomListener
    ) {
        onlineRoomListener.off();
        onlineRoomListener =
            null;
    }
    onlineRoomListener =
        firebase
            .database()
            .ref(
                "rooms/" +
                code
            );
    onlineRoomListener.on(
        "value",
        snapshot => {
            if (
                !snapshot.exists()
            ) {
                console.warn(
                    "Phòng không còn tồn tại."
                );
                return;
            }
            const room =
                snapshot.val();
            /*
               Cập nhật board.
            */
            boardSize =
                Number(
                    room.size
                );
            if (
                Array.isArray(
                    room.board
                )
            ) {
                board =
                    room.board.slice();
            } else {
                board =
                    Object.values(
                        room.board || {}
                    );
            }
            /*
               Cập nhật lượt.
            */
            currentPlayer =
                room.currentPlayer ||
                "X";
            /*
               Cập nhật game over.
            */
            gameOver =
                !!room.gameOver;
            /*
               Cập nhật nước cuối.
            */
            lastMoveIndex =
                typeof room.lastMove ===
                "number"
                    ? room.lastMove
                    : -1;
            /*
               Cập nhật điểm.
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
               Cập nhật timer.
            */
            activeTurnStartedAt =
                room.turnStartedAt ??
                null;
            /*
               Hiển thị điểm.
            */
            const scoreXElement =
                document.getElementById(
                    "scoreX"
                );
            const scoreOElement =
                document.getElementById(
                    "scoreO"
                );
            if (scoreXElement) {
                scoreXElement.textContent =
                    scoreX;
            }
            if (scoreOElement) {
                scoreOElement.textContent =
                    scoreO;
            }
            /*
               Cập nhật bàn.
            */
            renderBoard();
            updateCells();
            /*
               Cập nhật thông tin.
            */
            updateOnlineInfo(
                room
            );
            /*
               Cập nhật timer.
            */
            updateOnlineTimer(
                room
            );
            /*
               Kết quả.
            */
            if (
                room.gameOver &&
                room.winner
            ) {
                showOnlineResult(
                    room.winner
                );
            } else {
                hideOnlineResult();
            }
        }
    );
}
// ============================================================
// THÔNG TIN LƯỢT ONLINE
// ============================================================
function updateOnlineInfo(room) {
    /*
       Một số HTML dùng turnInfo,
       một số bản cũ dùng turnText.
       Hỗ trợ cả hai.
    */
    const info =
        document.getElementById(
            "turnInfo"
        );
    const turnText =
        document.getElementById(
            "turnText"
        );
    if (
        room.gameOver
    ) {
        let text = "";
        if (
            room.winner ===
            "DRAW"
        ) {
            text =
                "Hòa!";
        } else {
            text =
                "Người thắng: " +
                room.winner;
        }
        if (info) {
            info.textContent =
                text;
        }
        if (turnText) {
            turnText.textContent =
                text;
        }
        return;
    }
    if (
        !room.gameStarted
    ) {
        const text =
            "Đang chờ người chơi O...";
        if (info) {
            info.textContent =
                text;
        }
        if (turnText) {
            turnText.textContent =
                text;
        }
        return;
    }
    let text = "";
    if (
        currentPlayer ===
        onlineRole
    ) {
        text =
            "Đến lượt bạn (" +
            onlineRole +
            ")";
    } else {
        text =
            "Đến lượt đối thủ (" +
            currentPlayer +
            ")";
    }
    if (info) {
        info.textContent =
            text;
    }
    if (turnText) {
        turnText.textContent =
            text;
    }
}
// ============================================================
// DỪNG TIMER ONLINE
// ============================================================
function stopOnlineTimer() {
    if (
        onlineTimerInterval
    ) {
        clearInterval(
            onlineTimerInterval
        );
        onlineTimerInterval =
            null;
    }
}
// ============================================================
// TIMER ONLINE
// ============================================================
function updateOnlineTimer(
    room
) {
    stopOnlineTimer();
    const timerElement =
        document.getElementById(
            "timer"
        );
    if (!timerElement) {
        return;
    }
    if (
        !room.gameStarted ||
        room.gameOver ||
        !room.turnStartedAt
    ) {
        timerElement.textContent =
            "30";
        return;
    }
    const expectedTurnStartedAt =
        Number(
            room.turnStartedAt
        );
    if (
        !expectedTurnStartedAt
    ) {
        timerElement.textContent =
            "30";
        return;
    }
    activeTurnStartedAt =
        expectedTurnStartedAt;
    const update =
        () => {
            if (!onlineMode) {
                stopOnlineTimer();
                return;
            }
            if (gameOver) {
                stopOnlineTimer();
                return;
            }
            /*
               Nếu lượt đã thay đổi,
               timer cũ tự hủy.
            */
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
            if (
                remaining <= 0
            ) {
                stopOnlineTimer();
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
// HẾT GIỜ ONLINE
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
                /*
                   Timer cũ không được
                   xử lý lượt mới.
                */
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
                /*
                   Chỉ xử lý sau khoảng
                   gần 30 giây thực tế.
                */
                if (
                    elapsed < 29500
                ) {
                    return current;
                }
                const winner =
                    current.currentPlayer ===
                    "X"
                        ? "O"
                        : "X";
                current.gameOver =
                    true;
                current.winner =
                    winner;
                current.turnStartedAt =
                    null;
                /*
                   Cộng đúng 1 điểm.
                */
                if (
                    winner === "X"
                ) {
                    current.scoreX =
                        Number(
                            current.scoreX ||
                            0
                        ) + 1;
                } else {
                    current.scoreO =
                        Number(
                            current.scoreO ||
                            0
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
async function makeOnlineMove(
    index
) {
    /*
       Kiểm tra cơ bản.
    */
    if (
        !onlineMode ||
        !onlineRoomCode
    ) {
        console.warn(
            "ONLINE MOVE: Chưa ở trong phòng."
        );
        return;
    }
    if (
        !onlineRole
    ) {
        console.warn(
            "ONLINE MOVE: Không xác định được X/O."
        );
        return;
    }
    /*
       Không dùng currentPlayer
       trên client để chặn ngay ở đây.
       Vì client có thể đang giữ dữ liệu
       cũ vài mili-giây.
       Firebase transaction bên dưới
       mới là nơi quyết định chính xác.
    */
    try {
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );
        /*
           Lấy trạng thái Firebase mới nhất
           trước khi đánh.
           Đây là phần quan trọng để
           tránh O bị kẹt do currentPlayer
           trên iPhone chưa cập nhật.
        */
        const latestSnapshot =
            await roomRef.once(
                "value"
            );
        if (
            !latestSnapshot.exists()
        ) {
            console.warn(
                "ONLINE MOVE: Phòng không tồn tại."
            );
            return;
        }
        const latestRoom =
            latestSnapshot.val();
        if (
            latestRoom.gameOver
        ) {
            return;
        }
        if (
            !latestRoom.gameStarted
        ) {
            return;
        }
        /*
           Kiểm tra đúng lượt từ Firebase.
        */
        if (
            latestRoom.currentPlayer !==
            onlineRole
        ) {
            console.log(
                "ONLINE MOVE: Chưa tới lượt.",
                {
                    banThan:
                        onlineRole,
                    luotHienTai:
                        latestRoom.currentPlayer
                }
            );
            return;
        }
        /*
           Kiểm tra index.
        */
        const size =
            Number(
                latestRoom.size
            );
        if (
            index < 0 ||
            index >=
                size * size
        ) {
            return;
        }
        /*
           Kiểm tra board.
        */
        let latestBoard;
        if (
            Array.isArray(
                latestRoom.board
            )
        ) {
            latestBoard =
                latestRoom.board.slice();
        } else {
            latestBoard =
                Object.values(
                    latestRoom.board || {}
                );
        }
        if (
            latestBoard[index] &&
            latestBoard[index] !== ""
        ) {
            return;
        }
        /*
           TRANSACTION
           Đây mới là thao tác đánh thực tế.
        */
        const result =
            await roomRef.transaction(
                current => {
                    if (!current) {
                        return current;
                    }
                    /*
                       Ván đã kết thúc.
                    */
                    if (
                        current.gameOver
                    ) {
                        return current;
                    }
                    /*
                       Chưa có đủ 2 người.
                    */
                    if (
                        !current.gameStarted ||
                        !current.playerX ||
                        !current.playerO
                    ) {
                        return current;
                    }
                    /*
                       KIỂM TRA LƯỢT TRỰC TIẾP
                       TRÊN FIREBASE.
                    */
                    if (
                        current.currentPlayer !==
                        onlineRole
                    ) {
                        return current;
                    }
                    /*
                       Đảm bảo board là array.
                    */
                    if (
                        !Array.isArray(
                            current.board
                        )
                    ) {
                        current.board =
                            Object.values(
                                current.board ||
                                {}
                            );
                    }
                    /*
                       Ô đã có quân.
                    */
                    if (
                        current.board[index] &&
                        current.board[index] !== ""
                    ) {
                        return current;
                    }
                    /*
                       ĐẶT QUÂN.
                    */
                    current.board[index] =
                        onlineRole;
                    current.lastMove =
                        index;
                    /*
                       Kiểm tra thắng.
                    */
                    const currentSize =
                        Number(
                            current.size
                        );
                    const win =
                        onlineCheckWin(
                            current.board,
                            index,
                            onlineRole,
                            currentSize
                        );
                    if (win) {
                        current.gameOver =
                            true;
                        current.winner =
                            onlineRole;
                        current.turnStartedAt =
                            null;
                        if (
                            onlineRole ===
                            "X"
                        ) {
                            current.scoreX =
                                Number(
                                    current.scoreX ||
                                    0
                                ) + 1;
                        } else {
                            current.scoreO =
                                Number(
                                    current.scoreO ||
                                    0
                                ) + 1;
                        }
                        return current;
                    }
                    /*
                       Kiểm tra hòa.
                    */
                    const filled =
                        onlineCount(
                            current.board
                        );
                    if (
                        filled >=
                        currentSize *
                        currentSize
                    ) {
                        current.gameOver =
                            true;
                        current.winner =
                            "DRAW";
                        current.turnStartedAt =
                            null;
                        return current;
                    }
                    /*
                       Đổi lượt.
                    */
                    current.currentPlayer =
                        onlineRole === "X"
                            ? "O"
                            : "X";
                    /*
                       Timestamp mới.
                    */
                    current.turnStartedAt =
                        Date.now();
                    return current;
                }
            );
        if (
            result.committed
        ) {
            console.log(
                "ONLINE MOVE THÀNH CÔNG:",
                onlineRole,
                index
            );
        } else {
            console.log(
                "ONLINE MOVE KHÔNG ĐƯỢC COMMIT:",
                onlineRole,
                index
            );
        }
    } catch (error) {
        console.error(
            "ONLINE MOVE ERROR:",
            error
        );
        alert(
            "Không thể đánh quân.\n\n" +
            (
                error.message ||
                error
            )
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
    for (
        const [
            dr,
            dc
        ]
        of directions
    ) {
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
        if (
            count >= 5
        ) {
            return true;
        }
    }
    return false;
}
// ============================================================
// ĐẾM QUÂN THEO HƯỚNG
// ============================================================
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
            r * size +
            c;
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
// ============================================================
// ĐẾM SỐ Ô ĐÃ ĐÁNH
// ============================================================
function onlineCount(
    boardData
) {
    return boardData.filter(
        cell =>
            cell === "X" ||
            cell === "O"
    ).length;
}
// ============================================================
// VÁN MỚI ONLINE
// X VÀ O ĐỀU ĐƯỢC BẤM
// ============================================================
async function startNewOnlineGame() {
    if (
        !onlineMode ||
        !onlineRoomCode
    ) {
        return;
    }
    try {
        /*
           Dừng timer hiện tại.
        */
        stopOnlineTimer();
        activeTurnStartedAt =
            null;
        const roomRef =
            firebase
                .database()
                .ref(
                    "rooms/" +
                    onlineRoomCode
                );
        /*
           Reset trực tiếp trên Firebase.
           Cả X và O đều thấy bàn mới.
        */
        const result =
            await roomRef.transaction(
                room => {
                    if (!room) {
                        return room;
                    }
                    /*
                       Phải đủ X và O.
                    */
                    if (
                        !room.playerX ||
                        !room.playerO
                    ) {
                        return room;
                    }
                    const size =
                        Number(
                            room.size
                        );
                    /*
                       Bàn trống.
                    */
                    room.board =
                        new Array(
                            size *
                            size
                        ).fill("");
                    /*
                       X đi trước.
                    */
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
                    /*
                       GIỮ NGUYÊN ĐIỂM.
                       Không cộng điểm.
                       Không reset điểm.
                    */
                    room.scoreX =
                        Number(
                            room.scoreX ||
                            0
                        );
                    room.scoreO =
                        Number(
                            room.scoreO ||
                            0
                        );
                    /*
                       Tăng số ván.
                    */
                    room.round =
                        Number(
                            room.round ||
                            0
                        ) + 1;
                    /*
                       Timer hoàn toàn mới.
                    */
                    room.turnStartedAt =
                        Date.now();
                    return room;
                }
            );
        if (
            !result.committed
        ) {
            console.warn(
                "Không thể bắt đầu ván mới."
            );
            return;
        }
        console.log(
            "Đã bắt đầu ván mới:",
            onlineRoomCode,
            "bởi:",
            onlineRole
        );
    } catch (error) {
        console.error(
            "NEW ONLINE GAME ERROR:",
            error
        );
        alert(
            "Không thể bắt đầu ván mới.\n\n" +
            (
                error.message ||
                error
            )
        );
    }
}
// ============================================================
// HIỂN THỊ KẾT QUẢ ONLINE
// ============================================================
function showOnlineResult(
    winner
) {
    /*
       Hỗ trợ cả result và resultBox.
    */
    const resultElement =
        document.getElementById(
            "result"
        );
    if (resultElement) {
        if (
            winner ===
            "DRAW"
        ) {
            resultElement.textContent =
                "Hòa!";
        } else {
            resultElement.textContent =
                "Người thắng: " +
                winner;
        }
        resultElement
            .classList
            .remove("hidden");
    }
    const resultBox =
        document.getElementById(
            "resultBox"
        );
    const resultText =
        document.getElementById(
            "resultText"
        );
    if (
        resultBox &&
        resultText
    ) {
        if (
            winner ===
            "DRAW"
        ) {
            resultText.textContent =
                "🤝 Hòa!";
        } else {
            resultText.textContent =
                "🎉 " +
                winner +
                " thắng!";
        }
        resultBox
            .classList
            .remove("hidden");
    }
}
// ============================================================
// ẨN KẾT QUẢ
// ============================================================
function hideOnlineResult() {
    const resultElement =
        document.getElementById(
            "result"
        );
    if (resultElement) {
        resultElement
            .classList
            .add("hidden");
    }
    const resultBox =
        document.getElementById(
            "resultBox"
        );
    if (resultBox) {
        resultBox
            .classList
            .add("hidden");
    }
}
// ============================================================
// RỜI PHÒNG
// ============================================================
async function leaveOnlineRoom() {
    stopOnlineTimer();
    onlineMode =
        false;
    activeTurnStartedAt =
        null;
    if (
        onlineRoomListener
    ) {
        onlineRoomListener.off();
        onlineRoomListener =
            null;
    }
    onlineRoomCode =
        "";
    onlineRole =
        "";
    console.log(
        "Đã rời phòng."
    );
}
// ============================================================
// COPY MÃ PHÒNG
// ============================================================
async function copyRoomCode() {
    if (
        !onlineRoomCode
    ) {
        return;
    }
    try {
        await navigator
            .clipboard
            .writeText(
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
    if (
        !onlineRoomCode
    ) {
        return;
    }
    const link =
        window.location.origin +
        window.location.pathname +
        "?room=" +
        onlineRoomCode;
    try {
        await navigator
            .clipboard
            .writeText(
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
// ============================================================
function checkRoomFromURL() {
    const params =
        new URLSearchParams(
            window.location.search
        );
    const roomCode =
        params.get(
            "room"
        );
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
