/* =========================================================
   CARO 5 - MAIN.JS
   ========================================================= */
"use strict";
/* =========================================================
   DOM
   ========================================================= */
const menuScreen =
    document.getElementById(
        "menuScreen"
    );
const gameScreen =
    document.getElementById(
        "gameScreen"
    );
const aiModeButton =
    document.getElementById(
        "aiModeBtn"
    );
const pvpModeButton =
    document.getElementById(
        "pvpModeBtn"
    );
const playButton =
    document.getElementById(
        "playButton"
    );
const boardSizeSelect =
    document.getElementById(
        "boardSizeSelect"
    );
const createRoomButton =
    document.getElementById(
        "createRoomButton"
    );
const joinRoomButton =
    document.getElementById(
        "joinRoomButton"
    );
const roomInput =
    document.getElementById(
        "roomInput"
    );
const backMenuButton =
    document.getElementById(
        "backMenuButton"
    );
const resultBox =
    document.getElementById(
        "resultBox"
    );
const playAgainButton =
    document.getElementById(
        "playAgainButton"
    );
const exitMenuButton =
    document.getElementById(
        "exitMenuButton"
    );
const copyRoomButton =
    document.getElementById(
        "copyRoomButton"
    );
const copyLinkButton =
    document.getElementById(
        "copyLinkButton"
    );
/* =========================================================
   LOCAL UI STATE
   ========================================================= */
let isRoomInputComposing =
    false;
/*
 * Khi đang tự động vào phòng từ ?room=...
 * tránh chạy lại nhiều lần.
 */
let autoJoinHandled =
    false;
/* =========================================================
   SCREEN
   ========================================================= */
function showMenuScreen() {
    if (
        menuScreen
    ) {
        menuScreen.classList.remove(
            "hidden"
        );
    }
    if (
        gameScreen
    ) {
        gameScreen.classList.add(
            "hidden"
        );
    }
}
function showGameScreen() {
    if (
        menuScreen
    ) {
        menuScreen.classList.add(
            "hidden"
        );
    }
    if (
        gameScreen
    ) {
        gameScreen.classList.remove(
            "hidden"
        );
    }
}
/* =========================================================
   MODE
   ========================================================= */
function setGameMode(
    mode
) {
    if (
        mode !== "ai" &&
        mode !== "pvp"
    ) {
        return;
    }
    gameMode =
        mode;
    if (
        aiModeButton
    ) {
        aiModeButton.classList.toggle(
            "active",
            mode === "ai"
        );
    }
    if (
        pvpModeButton
    ) {
        pvpModeButton.classList.toggle(
            "active",
            mode === "pvp"
        );
    }
    /*
     * Hiện/ẩn độ khó AI.
     */
    if (
        typeof updateAIDifficultyVisibility ===
        "function"
    ) {
        updateAIDifficultyVisibility();
    }
}
/* =========================================================
   BOARD SIZE
   ========================================================= */
function getSelectedBoardSize() {
    const value =
        Number(
            boardSizeSelect
                ? boardSizeSelect.value
                : 15
        );
    if (
        value === 15 ||
        value === 20 ||
        value === 25
    ) {
        return value;
    }
    return 15;
}
/* =========================================================
   PLAY OFFLINE
   ========================================================= */
function handlePlayButton() {
    /*
     * Nếu đang còn online room,
     * thoát trước khi chơi offline.
     */
    if (
        typeof currentRoomId !==
            "undefined" &&
        currentRoomId
    ) {
        if (
            typeof leaveOnlineRoom ===
            "function"
        ) {
            leaveOnlineRoom();
        }
    }
    const size =
        getSelectedBoardSize();
    boardSize =
        size;
    isOnlineGame =
        false;
    if (
        typeof startOfflineGame ===
        "function"
    ) {
        startOfflineGame(
            gameMode
        );
    } else {
        console.error(
            "startOfflineGame() không tồn tại."
        );
    }
}
/* =========================================================
   CREATE ROOM
   ========================================================= */
async function handleCreateRoom() {
    /*
     * Lấy kích thước trước khi tạo.
     */
    boardSize =
        getSelectedBoardSize();
    isOnlineGame =
        true;
    if (
        typeof createOnlineRoom !==
        "function"
    ) {
        alert(
            "Firebase chưa sẵn sàng."
        );
        return;
    }
    /*
     * Disable tạm thời để tránh
     * bấm 2 lần tạo 2 phòng.
     */
    if (
        createRoomButton
    ) {
        createRoomButton.disabled =
            true;
    }
    try {
        await createOnlineRoom();
    } finally {
        if (
            createRoomButton
        ) {
            createRoomButton.disabled =
                false;
        }
    }
}
/* =========================================================
   JOIN ROOM
   ========================================================= */
async function handleJoinRoom() {
    if (
        !roomInput
    ) {
        return;
    }
    /*
     * Không xử lý khi bàn phím Telex/VNI
     * vẫn đang composition.
     */
    if (
        isRoomInputComposing
    ) {
        return;
    }
    const code =
        normalizeRoomCode(
            roomInput.value
        );
    if (
        code.length !== 6
    ) {
        alert(
            "Vui lòng nhập mã phòng gồm 6 ký tự."
        );
        roomInput.focus();
        return;
    }
    roomInput.value =
        code;
    if (
        typeof joinOnlineRoom !==
        "function"
    ) {
        alert(
            "Firebase chưa sẵn sàng."
        );
        return;
    }
    if (
        joinRoomButton
    ) {
        joinRoomButton.disabled =
            true;
    }
    try {
        await joinOnlineRoom(
            code
        );
    } finally {
        if (
            joinRoomButton
        ) {
            joinRoomButton.disabled =
                false;
        }
    }
}
/* =========================================================
   ROOM INPUT
   ========================================================= */
/*
 * Quan trọng:
 *
 * Không normalize trong lúc composition
 * vì Telex/VNI có thể tạo chuỗi tạm như:
 *
 * a + a + s
 * o + o + 1
 *
 * Nếu xử lý quá sớm sẽ làm mất ký tự.
 */
function setupRoomInput() {
    if (
        !roomInput
    ) {
        return;
    }
    roomInput.addEventListener(
        "compositionstart",
        function () {
            isRoomInputComposing =
                true;
        }
    );
    roomInput.addEventListener(
        "compositionend",
        function () {
            isRoomInputComposing =
                false;
            /*
             * Chỉ lúc composition kết thúc
             * mới chuẩn hóa.
             */
            setTimeout(
                function () {
                    normalizeRoomInputValue();
                },
                0
            );
        }
    );
    roomInput.addEventListener(
        "input",
        function () {
            if (
                isRoomInputComposing
            ) {
                return;
            }
            normalizeRoomInputValue();
        }
    );
    roomInput.addEventListener(
        "paste",
        function () {
            setTimeout(
                function () {
                    normalizeRoomInputValue();
                },
                0
            );
        }
    );
    roomInput.addEventListener(
        "blur",
        function () {
            if (
                !isRoomInputComposing
            ) {
                normalizeRoomInputValue();
            }
        }
    );
    roomInput.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key ===
                "Enter"
            ) {
                /*
                 * Nếu đang composition,
                 * không join ngay.
                 */
                if (
                    isRoomInputComposing
                ) {
                    return;
                }
                event.preventDefault();
                normalizeRoomInputValue();
                handleJoinRoom();
            }
        }
    );
}
function normalizeRoomInputValue() {
    if (
        !roomInput
    ) {
        return;
    }
    if (
        isRoomInputComposing
    ) {
        return;
    }
    const oldValue =
        roomInput.value;
    const newValue =
        normalizeRoomCode(
            oldValue
        );
    if (
        oldValue !==
        newValue
    ) {
        roomInput.value =
            newValue;
    }
}
/* =========================================================
   COPY ROOM CODE
   ========================================================= */
async function handleCopyRoom() {
    if (
        typeof copyRoomCode ===
        "function"
    ) {
        await copyRoomCode();
    }
}
/* =========================================================
   COPY ROOM LINK
   ========================================================= */
async function handleCopyLink() {
    if (
        typeof copyRoomLink ===
        "function"
    ) {
        await copyRoomLink();
    }
}
/* =========================================================
   BACK TO MENU
   ========================================================= */
async function handleBackToMenu() {
    /*
     * Online:
     * phải báo cho Firebase biết người chơi rời.
     */
    if (
        typeof currentRoomId !==
            "undefined" &&
        currentRoomId
    ) {
        if (
            typeof leaveOnlineRoom ===
            "function"
        ) {
            await leaveOnlineRoom();
        }
    } else {
        /*
         * Offline.
         */
        if (
            typeof stopTimer ===
            "function"
        ) {
            stopTimer();
        }
        isOnlineGame =
            false;
    }
    if (
        typeof showMenu ===
        "function"
    ) {
        /*
         * showMenu() trong game.js
         * xử lý UI chính.
         */
        showMenu();
    } else {
        showMenuScreen();
    }
}
/* =========================================================
   REPLAY
   ========================================================= */
async function handlePlayAgain() {
    /*
     * ONLINE
     */
    if (
        typeof currentRoomId !==
            "undefined" &&
        currentRoomId
    ) {
        if (
            typeof startNewOnlineGame ===
            "function"
        ) {
            await startNewOnlineGame();
        }
        return;
    }
    /*
     * OFFLINE
     */
    if (
        typeof startNewOfflineGame ===
        "function"
    ) {
        startNewOfflineGame();
    }
}
/* =========================================================
   EXIT RESULT TO MENU
   ========================================================= */
async function handleExitMenu() {
    await handleBackToMenu();
}
/* =========================================================
   URL AUTO JOIN
   ========================================================= */
function getRoomCodeFromURL() {
    try {
        const url =
            new URL(
                window.location.href
            );
        const code =
            url.searchParams.get(
                "room"
            );
        if (
            !code
        ) {
            return "";
        }
        return normalizeRoomCode(
            code
        );
    } catch (error) {
        return "";
    }
}
async function handleAutoJoinRoom() {
    if (
        autoJoinHandled
    ) {
        return;
    }
    const code =
        getRoomCodeFromURL();
    if (
        code.length !== 6
    ) {
        return;
    }
    autoJoinHandled =
        true;
    /*
     * Điền mã vào input.
     */
    if (
        roomInput
    ) {
        roomInput.value =
            code;
    }
    /*
     * Đợi Firebase auth.
     */
    let attempts =
        0;
    while (
        attempts < 30
    ) {
        if (
            typeof currentUser !==
                "undefined" &&
            currentUser
        ) {
            break;
        }
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    200
                )
        );
        attempts++;
    }
    /*
     * Nếu Firebase đã sẵn sàng,
     * tự vào phòng.
     */
    if (
        typeof joinOnlineRoom ===
        "function"
    ) {
        await joinOnlineRoom(
            code
        );
    }
}
/* =========================================================
   REMOVE ROOM PARAMETER
   ========================================================= */
function removeRoomParameterFromURL() {
    try {
        const url =
            new URL(
                window.location.href
            );
        if (
            !url.searchParams.has(
                "room"
            )
        ) {
            return;
        }
        url.searchParams.delete(
            "room"
        );
        window.history.replaceState(
            {},
            document.title,
            url.pathname +
                url.search +
                url.hash
        );
    } catch (error) {
        console.warn(
            "Không thể xóa room parameter:",
            error
        );
    }
}
/* =========================================================
   BUTTON EVENTS
   ========================================================= */
function setupButtonEvents() {
    /*
     * Mode.
     */
    if (
        aiModeButton
    ) {
        aiModeButton.addEventListener(
            "click",
            function () {
                setGameMode(
                    "ai"
                );
            }
        );
    }
    if (
        pvpModeButton
    ) {
        pvpModeButton.addEventListener(
            "click",
            function () {
                setGameMode(
                    "pvp"
                );
            }
        );
    }
    /*
     * Play.
     */
    if (
        playButton
    ) {
        playButton.addEventListener(
            "click",
            handlePlayButton
        );
    }
    /*
     * Create room.
     */
    if (
        createRoomButton
    ) {
        createRoomButton.addEventListener(
            "click",
            handleCreateRoom
        );
    }
    /*
     * Join room.
     */
    if (
        joinRoomButton
    ) {
        joinRoomButton.addEventListener(
            "click",
            handleJoinRoom
        );
    }
    /*
     * Back.
     */
    if (
        backMenuButton
    ) {
        backMenuButton.addEventListener(
            "click",
            handleBackToMenu
        );
    }
    /*
     * Replay.
     */
    if (
        playAgainButton
    ) {
        playAgainButton.addEventListener(
            "click",
            handlePlayAgain
        );
    }
    /*
     * Exit.
     */
    if (
        exitMenuButton
    ) {
        exitMenuButton.addEventListener(
            "click",
            handleExitMenu
        );
    }
    /*
     * Copy.
     */
    if (
        copyRoomButton
    ) {
        copyRoomButton.addEventListener(
            "click",
            handleCopyRoom
        );
    }
    if (
        copyLinkButton
    ) {
        copyLinkButton.addEventListener(
            "click",
            handleCopyLink
        );
    }
}
/* =========================================================
   BOARD SIZE CHANGE
   ========================================================= */
function setupBoardSizeSelector() {
    if (
        !boardSizeSelect
    ) {
        return;
    }
    boardSizeSelect.addEventListener(
        "change",
        function () {
            const size =
                getSelectedBoardSize();
            boardSize =
                size;
        }
    );
}
/* =========================================================
   INITIAL STATE
   ========================================================= */
function initializeMain() {
    /*
     * Mặc định.
     */
    setGameMode(
        "ai"
    );
    /*
     * Đồng bộ board size.
     */
    if (
        boardSizeSelect
    ) {
        const size =
            Number(
                boardSizeSelect.value
            );
        if (
            size === 15 ||
            size === 20 ||
            size === 25
        ) {
            boardSize =
                size;
        }
    }
    setupRoomInput();
    setupButtonEvents();
    setupBoardSizeSelector();
    /*
     * Đảm bảo menu hiện lúc đầu.
     */
    showMenuScreen();
}
/* =========================================================
   START
   ========================================================= */
if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        async function () {
            initializeMain();
            /*
             * Firebase.js cũng tự init,
             * nên chỉ cần đợi một chút
             * rồi xử lý ?room=...
             */
            setTimeout(
                handleAutoJoinRoom,
                500
            );
        }
    );
} else {
    initializeMain();
    setTimeout(
        handleAutoJoinRoom,
        500
    );
}
/* =========================================================
   GLOBALS
   ========================================================= */
window.showMenuScreen =
    showMenuScreen;
window.showGameScreen =
    showGameScreen;
window.handlePlayButton =
    handlePlayButton;
window.handleJoinRoom =
    handleJoinRoom;
window.handleCreateRoom =
    handleCreateRoom;
