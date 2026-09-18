/* =====================================================
   CARO 5 - FIREBASE ONLINE
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

            console.log("Firebase: bắt đầu khởi tạo...");

            if (!firebase.apps.length) {

                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            }

            db = firebase.database();

            /*
             * Đăng nhập Anonymous
             */

            if (!firebase.auth().currentUser) {

                console.log(
                    "Firebase: đăng nhập anonymous..."
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
                "Firebase OK. UID:",
                user.uid
            );

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
                "Firebase INIT ERROR:",
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
            db = firebase.database();
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
                    Math.random() * chars.length
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
            db.ref("rooms/" + code);

        let snapshot =
            await roomRef.once("value");

        while (snapshot.exists()) {

            code =
                generateRoomCode();

            roomRef =
                db.ref("rooms/" + code);

            snapshot =
                await roomRef.once("value");
        }


        const size =
            Number(
                document.getElementById(
                    "boardSizeSelect"
                ).value
            ) || 15;


        const newRoom = {

            board:
                Array(size * size).fill(""),

            boardSize: size,

            currentPlayer: "X",

            gameStarted: false,

            gameOver: false,

            playerX:
                firebase.auth().currentUser.uid,

            playerO: "",

            scoreX: 0,

            scoreO: 0,

            round: 1,

            turnStartedAt: Date.now(),

            result: "",

            createdAt: Date.now()
        };


        console.log(
            "Đang ghi room:",
            code
        );

        await roomRef.set(newRoom);


        roomId = code;
        onlineRole = "X";
        onlineMode = true;


        console.log(
            "TẠO PHÒNG THÀNH CÔNG:",
            roomId
        );


        openOnlineGame();

        listenToRoom();


    } catch (error) {

        console.error(
            "CREATE ROOM ERROR:",
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

async function joinOnlineRoom(codeFromButton = "") {

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
            db.ref("rooms/" + code);

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

        const uid =
            firebase.auth().currentUser.uid;


        /*
         * Nếu đã là X
         */

        if (room.playerX === uid) {

            roomId = code;
            onlineRole = "X";
            onlineMode = true;

            openOnlineGame();
            listenToRoom();

            return;
        }


        /*
         * Phòng đã có O
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
         * Gán người thứ 2 vào O
         */

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


        console.log(
            "VÀO PHÒNG THÀNH CÔNG - O"
        );


        openOnlineGame();

        listenToRoom();


    } catch (error) {

        console.error(
            "JOIN ROOM ERROR:",
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

    onlineMode = true;


    document.getElementById(
        "menuScreen"
    ).classList.add("hidden");


    document.getElementById(
        "gameScreen"
    ).classList.remove("hidden");


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


    /*
     * Cả X và O đều thấy nút Ván mới
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


    if (typeof renderBoard === "function") {
        renderBoard();
    }

    if (typeof updateGameInfo === "function") {
        updateGameInfo();
    }
}


/* =====================================================
   REALTIME ROOM
===================================================== */

function listenToRoom() {

    if (!roomId || !db) {
        return;
    }


    if (roomListener) {

        roomListener.off();

        roomListener = null;
    }


    roomListener =
        db.ref("rooms/" + roomId);


    roomListener.on(
        "value",
        snapshot => {

            if (!snapshot.exists()) {
                return;
            }


            const room =
                snapshot.val();


            /*
             * Đồng bộ board
             */

            if (Array.isArray(room.board)) {

                board =
                    room.board.slice();
            }


            /*
             * Đồng bộ kích thước
             */

            if (room.boardSize) {

                boardSize =
                    Number(room.boardSize);
            }


            /*
             * Đồng bộ lượt
             */

            if (room.currentPlayer) {

                currentPlayer =
                    room.currentPlayer;
            }


            /*
             * Đồng bộ trạng thái
             */

            gameOver =
                !!room.gameOver;


            /*
             * Điểm
             */

            scoreX =
                Number(room.scoreX || 0);

            scoreO =
                Number(room.scoreO || 0);


            /*
             * Render
             */

            if (typeof renderBoard === "function") {
                renderBoard();
            }

            if (typeof updateGameInfo === "function") {
                updateGameInfo();
            }


            updateOnlineInfo(room);


            /*
             * Kết quả
             */

            if (room.result) {

                showOnlineResult(
                    room.result
                );

            } else {

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


            /*
             * Timer
             */

            if (
                room.gameStarted &&
                !room.gameOver
            ) {

                startOnlineTimer(room);

            } else {

                stopTimer();
            }
        }
    );
}


/* =====================================================
   UPDATE INFO
===================================================== */

function updateOnlineInfo(room) {

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


    const turnText =
        document.getElementById(
            "turnText"
        );


    if (turnText) {

        if (room.gameOver) {

            turnText.textContent =
                "Ván đấu kết thúc";

        } else if (!room.playerO) {

            turnText.textContent =
                "Đang chờ người chơi O...";

        } else if (
            room.currentPlayer === onlineRole
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
            Number(room.scoreX || 0);
    }

    if (scoreOElement) {
        scoreOElement.textContent =
            Number(room.scoreO || 0);
    }
}


/* =====================================================
   TIMER
===================================================== */

function startOnlineTimer(room) {

    stopTimer();


    if (!room.turnStartedAt) {
        return;
    }


    timerInterval =
        setInterval(() => {

            if (!onlineMode) {

                stopTimer();

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


            timerSeconds =
                Math.max(
                    0,
                    30 - elapsed
                );


            const timer =
                document.getElementById(
                    "timer"
                );


            if (timer) {

                timer.textContent =
                    timerSeconds;
            }


            if (timerSeconds <= 0) {

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

                if (!room) {
                    return;
                }

                if (room.gameOver) {
                    return;
                }

                if (!room.gameStarted) {
                    return;
                }


                /*
                 * Không xử lý timeout cũ
                 */

                if (
                    room.currentPlayer !==
                    oldRoom.currentPlayer
                ) {
                    return;
                }


                if (
                    Date.now() -
                    Number(
                        room.turnStartedAt || 0
                    ) <
                    29000
                ) {
                    return;
                }


                const loser =
                    room.currentPlayer;

                const winner =
                    loser === "X"
                        ? "O"
                        : "X";


                room.gameOver = true;


                room.result =
                    winner +
                    " thắng do " +
                    loser +
                    " hết giờ!";


                if (winner === "X") {

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
            "TIMEOUT ERROR:",
            error
        );
    }
}


/* =====================================================
   ĐẶT QUÂN ONLINE
===================================================== */

async function makeOnlineMove(index) {

    console.log(
        "ONLINE MOVE",
        index,
        "role:",
        onlineRole,
        "room:",
        roomId
    );


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
         * Lấy trạng thái mới nhất
         */

        const snapshot =
            await roomRef.once(
                "value"
            );


        if (!snapshot.exists()) {
            return;
        }


        const latest =
            snapshot.val();


        if (latest.gameOver) {
            return;
        }


        if (!latest.gameStarted) {
            return;
        }


        /*
         * Chưa đủ 2 người
         */

        if (!latest.playerO) {
            return;
        }


        /*
         * Kiểm tra lượt
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


        if (
            !Array.isArray(
                latest.board
            )
        ) {
            return;
        }


        if (
            latest.board[index] !== ""
        ) {
            return;
        }


        /*
         * Transaction
         */

        const transactionResult =
            await roomRef.transaction(
                room => {

                    if (!room) {
                        return;
                    }

                    if (room.gameOver) {
                        return;
                    }

                    if (!room.gameStarted) {
                        return;
                    }

                    if (
                        room.currentPlayer !==
                        onlineRole
                    ) {
                        return;
                    }

                    if (
                        !Array.isArray(
                            room.board
                        )
                    ) {
                        return;
                    }

                    if (
                        room.board[index] !== ""
                    ) {
                        return;
                    }


                    /*
                     * Đặt quân
                     */

                    room.board[index] =
                        onlineRole;


                    /*
                     * Đồng bộ board tạm
                     * để checkWin dùng được
                     */

                    const oldBoard =
                        board;

                    board =
                        room.board.slice();


                    let won = false;

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


                    board =
                        oldBoard;


                    /*
                     * THẮNG
                     */

                    if (won) {

                        room.gameOver =
                            true;

                        room.result =
                            onlineRole +
                            " thắng!";


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


                        return room;
                    }


                    /*
                     * HÒA
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

                        return room;
                    }


                    /*
                     * Đổi lượt
                     */

                    room.currentPlayer =
                        onlineRole === "X"
                            ? "O"
                            : "X";


                    room.turnStartedAt =
                        Date.now();


                    return room;
                }
            );


        if (
            transactionResult.committed
        ) {

            console.log(
                "ĐẶT QUÂN THÀNH CÔNG",
                onlineRole,
                index
            );

        } else {

            console.log(
                "Không commit move"
            );
        }


    } catch (error) {

        console.error(
            "MAKE ONLINE MOVE ERROR:",
            error
        );
    }
}


/* =====================================================
   VÁN MỚI
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


        await roomRef.transaction(
            room => {

                if (!room) {
                    return;
                }


                const size =
                    Number(
                        room.boardSize ||
                        boardSize
                    );


                room.board =
                    Array(
                        size * size
                    ).fill("");


                /*
                 * Nếu có đủ X + O
                 * thì ván bắt đầu ngay
                 */

                room.gameStarted =
                    !!(
                        room.playerX &&
                        room.playerO
                    );


                room.gameOver =
                    false;


                room.result =
                    "";


                /*
                 * X luôn đi trước
                 */

                room.currentPlayer =
                    "X";


                room.turnStartedAt =
                    Date.now();


                /*
                 * QUAN TRỌNG:
                 * Không cộng điểm ở đây
                 */

                room.scoreX =
                    Number(
                        room.scoreX || 0
                    );

                room.scoreO =
                    Number(
                        room.scoreO || 0
                    );


                room.round =
                    Number(
                        room.round || 1
                    ) + 1;


                return room;
            }
        );


        console.log(
            "VÁN MỚI ONLINE"
        );


    } catch (error) {

        console.error(
            "NEW GAME ERROR:",
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


    if (resultBox) {

        resultBox.classList.remove(
            "hidden"
        );
    }


    if (resultText) {

        resultText.textContent =
            text;
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
   COPY LINK
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

    stopTimer();


    if (roomListener) {

        roomListener.off();

        roomListener = null;
    }


    onlineMode = false;
    onlineRole = "";
    roomId = "";


    console.log(
        "Đã rời phòng"
    );
}


/* =====================================================
   KHỞI ĐỘNG FIREBASE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Firebase script loaded"
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
