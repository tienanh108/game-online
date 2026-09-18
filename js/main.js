document.addEventListener("DOMContentLoaded", () => {

    let selectedMode = "AI";

    const aiButton = document.getElementById("aiModeBtn");
    const pvpButton = document.getElementById("pvpModeBtn");

    /* =========================
       CHỌN CHẾ ĐỘ
    ========================= */

    aiButton.addEventListener("click", () => {
        selectedMode = "AI";

        aiButton.classList.add("active");
        pvpButton.classList.remove("active");
    });

    pvpButton.addEventListener("click", () => {
        selectedMode = "PVP";

        pvpButton.classList.add("active");
        aiButton.classList.remove("active");
    });


    /* =========================
       CHƠI OFFLINE
    ========================= */

    document.getElementById("playButton").addEventListener("click", () => {
        startOfflineGame(selectedMode);
    });


    /* =========================
       VÁN MỚI
    ========================= */

    document.getElementById("newGameButton").addEventListener("click", () => {

        if (onlineMode) {
            startNewOnlineGame();
            return;
        }

        startNewOfflineGame();
    });


    /* =========================
       CHƠI LẠI SAU KHI THẮNG
    ========================= */

    document.getElementById("playAgainButton").addEventListener("click", () => {

        // Ẩn thông báo kết quả
        const resultBox = document.getElementById("resultBox");

        if (resultBox) {
            resultBox.classList.add("hidden");
        }

        // Online
        if (typeof onlineMode !== "undefined" && onlineMode) {

            if (typeof startNewOnlineGame === "function") {
                startNewOnlineGame();
            }

            return;
        }

        // Offline
        if (typeof startNewOfflineGame === "function") {
            startNewOfflineGame();
        }
    });


    /* =========================
       THOÁT VỀ MENU
    ========================= */

    document.getElementById("exitMenuButton").addEventListener("click", () => {

        // Nếu đang online thì rời phòng
        if (typeof onlineMode !== "undefined" && onlineMode) {

            if (typeof leaveOnlineRoom === "function") {
                leaveOnlineRoom();
            }

            return;
        }

        // Offline
        if (typeof showMenu === "function") {
            showMenu();
        }
    });


    /* =========================
       QUAY LẠI MENU
    ========================= */

    document.getElementById("backMenuButton").addEventListener("click", () => {

        if (typeof onlineMode !== "undefined" && onlineMode) {

            if (typeof leaveOnlineRoom === "function") {
                leaveOnlineRoom();
            }

            return;
        }

        showMenu();
    });


    /* =========================
       TẠO PHÒNG ONLINE
    ========================= */

    document.getElementById("createRoomButton").addEventListener("click", () => {
        createOnlineRoom();
    });


    /* =========================
       VÀO PHÒNG
    ========================= */

    const roomInput = document.getElementById("roomInput");

    document.getElementById("joinRoomButton").addEventListener("click", () => {
        joinOnlineRoom(roomInput.value);
    });


    roomInput.addEventListener("input", () => {

        roomInput.value = roomInput.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6);
    });


    roomInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            joinOnlineRoom(roomInput.value);
        }
    });


    /* =========================
       COPY ROOM CODE
    ========================= */

    document.getElementById("copyRoomButton").addEventListener("click", () => {
        copyRoomCode();
    });


    /* =========================
       COPY ROOM LINK
    ========================= */

    document.getElementById("copyLinkButton").addEventListener("click", () => {
        copyRoomLink();
    });


    /* =========================
       FIREBASE
    ========================= */

    // firebase.js tự khởi tạo Firebase
    if (typeof initFirebase === "function") {
        initFirebase();
    }


    /* =========================
       LINK PHÒNG
    ========================= */

    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");

    if (room) {
        roomInput.value = room
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6);
    }

});
