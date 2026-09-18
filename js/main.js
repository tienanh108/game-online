document.addEventListener("DOMContentLoaded", () => {
    let selectedMode = "AI";

    const aiButton = document.getElementById("aiModeBtn");
    const pvpButton = document.getElementById("pvpModeBtn");
    const roomInput = document.getElementById("roomInput");

    // =========================
    // CHỌN CHẾ ĐỘ
    // =========================

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


    // =========================
    // CHƠI OFFLINE
    // =========================

    document.getElementById("playButton").addEventListener("click", () => {
        startOfflineGame(selectedMode);
    });


    // =========================
    // VÁN MỚI
    // =========================

    document.getElementById("newGameButton").addEventListener("click", () => {

        if (onlineMode) {

            if (!gameOver) {
                alert("Ván đấu chưa kết thúc.");
                return;
            }

            startNewOnlineGame();
            return;
        }

        startNewOfflineGame();
    });


    // =========================
    // VỀ MENU
    // =========================

    document.getElementById("backMenuButton").addEventListener("click", () => {

        if (onlineMode) {
            leaveOnlineRoom();
        } else {
            showMenu();
        }
    });


    // =========================
    // TẠO PHÒNG
    // =========================

    document.getElementById("createRoomButton").addEventListener("click", () => {
        createOnlineRoom();
    });


    // =========================
    // VÀO PHÒNG
    // =========================

    document.getElementById("joinRoomButton").addEventListener("click", () => {
        joinOnlineRoom(roomInput.value);
    });


    // ==========================================================
    // XỬ LÝ Ô NHẬP MÃ PHÒNG
    // ==========================================================
    //
    // QUAN TRỌNG:
    // Không được lọc ký tự ngay trong lúc người dùng đang gõ
    // tiếng Việt bằng Telex/VNI.
    //
    // Nếu lọc ngay ở "input", ký tự tạm của bộ gõ có thể bị
    // xóa trước khi hoàn thành chữ.
    //
    // Vì vậy:
    // - đang composition -> không đụng vào text
    // - compositionend -> mới chuẩn hóa
    // - paste -> chuẩn hóa
    // - Enter -> chuẩn hóa rồi vào phòng
    // ==========================================================

    let isComposing = false;

    roomInput.addEventListener("compositionstart", () => {
        isComposing = true;
    });

    roomInput.addEventListener("compositionend", () => {
        isComposing = false;
        normalizeRoomInput();
    });

    roomInput.addEventListener("input", () => {
        if (isComposing) return;

        normalizeRoomInput();
    });

    roomInput.addEventListener("paste", () => {
        setTimeout(() => {
            normalizeRoomInput();
        }, 0);
    });

    roomInput.addEventListener("blur", () => {
        normalizeRoomInput();
    });

    roomInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {

            normalizeRoomInput();

            joinOnlineRoom(roomInput.value);
        }
    });


    // =========================
    // COPY MÃ PHÒNG
    // =========================

    document.getElementById("copyRoomButton").addEventListener("click", () => {
        copyRoomCode();
    });


    // =========================
    // COPY LINK
    // =========================

    document.getElementById("copyLinkButton").addEventListener("click", () => {
        copyRoomLink();
    });


    // =========================
    // PLAY AGAIN
    // =========================

    const playAgainButton = document.getElementById("playAgainButton");

    if (playAgainButton) {
        playAgainButton.addEventListener("click", () => {

            if (onlineMode) {

                if (!gameOver) {
                    return;
                }

                startNewOnlineGame();

            } else {
                startNewOfflineGame();
            }
        });
    }


    // =========================
    // EXIT MENU
    // =========================

    const exitMenuButton = document.getElementById("exitMenuButton");

    if (exitMenuButton) {
        exitMenuButton.addEventListener("click", () => {

            if (onlineMode) {
                leaveOnlineRoom();
            } else {
                showMenu();
            }
        });
    }


    // =========================
    // FIREBASE
    // =========================

    if (typeof initFirebase === "function") {
        initFirebase();
    }


    // =========================
    // NẾU LINK CÓ ?room=XXXXXX
    // =========================

    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");

    if (room) {
        roomInput.value = room.toUpperCase().slice(0, 6);
    }
});


// ==========================================================
// CHUẨN HÓA MÃ PHÒNG
// ==========================================================

function normalizeRoomCode(value) {

    if (!value) {
        return "";
    }

    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "D")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
}


// ==========================================================
// CHUẨN HÓA Ô INPUT
// ==========================================================

function normalizeRoomInput() {

    const input = document.getElementById("roomInput");

    if (!input) {
        return;
    }

    const cursorPosition = input.selectionStart;

    const oldValue = input.value;
    const newValue = normalizeRoomCode(oldValue);

    if (oldValue !== newValue) {

        input.value = newValue;

        try {
            const newPosition = Math.min(
                cursorPosition || newValue.length,
                newValue.length
            );

            input.setSelectionRange(
                newPosition,
                newPosition
            );
        } catch (error) {
            // Một số trình duyệt không cho setSelectionRange
        }
    }
}
