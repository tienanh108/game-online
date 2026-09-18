/* =====================================================
   CARO 5 - MAIN
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    let selectedMode = "AI";

    /* ================= MODE ================= */

    const aiButton = document.getElementById("aiModeBtn");
    const pvpButton = document.getElementById("pvpModeBtn");

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


    /* ================= PLAY ================= */

    document.getElementById("playButton")
        .addEventListener("click", () => {

            startOfflineGame(selectedMode);
        });


    /* ================= NEW GAME ================= */

    document.getElementById("newGameButton")
        .addEventListener("click", () => {

            if (onlineMode) {

                // CẢ X VÀ O đều được bấm Ván mới
                startNewOnlineGame();

                return;
            }

            startNewOfflineGame();
        });


    /* ================= BACK ================= */

    document.getElementById("backMenuButton")
        .addEventListener("click", () => {

            showMenu();
        });


    /* ================= CREATE ROOM ================= */

    document.getElementById("createRoomButton")
        .addEventListener("click", async () => {

            console.log("CLICK: Tạo phòng");

            await createOnlineRoom();
        });


    /* ================= JOIN ROOM ================= */

    const roomInput =
        document.getElementById("roomInput");

    document.getElementById("joinRoomButton")
        .addEventListener("click", async () => {

            console.log(
                "CLICK: Vào phòng",
                roomInput.value
            );

            await joinOnlineRoom(
                roomInput.value
            );
        });


    roomInput.addEventListener("input", () => {

        roomInput.value =
            roomInput.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);
    });


    roomInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            document.getElementById(
                "joinRoomButton"
            ).click();
        }
    });


    /* ================= COPY ROOM ================= */

    document.getElementById("copyRoomButton")
        .addEventListener("click", () => {

            copyRoomCode();
        });


    /* ================= COPY LINK ================= */

    document.getElementById("copyLinkButton")
        .addEventListener("click", () => {

            copyRoomLink();
        });


    /* ================= FIREBASE ================= */

    // firebase.js tự khởi tạo Firebase.
    // Không gọi initFirebase() lần thứ hai ở đây.


    /* ================= URL ROOM ================= */

    const params =
        new URLSearchParams(
            window.location.search
        );

    const room =
        params.get("room");

    if (room) {

        roomInput.value =
            room
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);
    }

});
