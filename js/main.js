/* =====================================================
   CARO 5 - MAIN
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        let selectedMode = "AI";


        /* ================= MODE ================= */

        const aiButton =
            document.getElementById(
                "aiModeBtn"
            );

        const pvpButton =
            document.getElementById(
                "pvpModeBtn"
            );


        aiButton.addEventListener(
            "click",
            () => {

                selectedMode = "AI";

                aiButton.classList.add(
                    "active"
                );

                pvpButton.classList.remove(
                    "active"
                );
            }
        );


        pvpButton.addEventListener(
            "click",
            () => {

                selectedMode = "PVP";

                pvpButton.classList.add(
                    "active"
                );

                aiButton.classList.remove(
                    "active"
                );
            }
        );


        /* ================= PLAY ================= */

        document.getElementById(
            "playButton"
        ).addEventListener(
            "click",
            () => {

                startOfflineGame(
                    selectedMode
                );
            }
        );


        /* ================= NEW GAME ================= */

        document.getElementById(
            "newGameButton"
        ).addEventListener(
            "click",
            () => {

                if (onlineMode) {

                    if (
                        onlineRole === "X"
                    ) {

                        startNewOnlineGame();

                    } else {

                        alert(
                            "Chỉ người chơi X có thể bắt đầu ván mới."
                        );
                    }

                    return;
                }


                startNewOfflineGame();
            }
        );


        /* ================= BACK ================= */

        document.getElementById(
            "backMenuButton"
        ).addEventListener(
            "click",
            () => {

                showMenu();
            }
        );


        /* ================= CREATE ROOM ================= */

        document.getElementById(
            "createRoomButton"
        ).addEventListener(
            "click",
            () => {

                createOnlineRoom();
            }
        );


        /* ================= JOIN ================= */

        const roomInput =
            document.getElementById(
                "roomInput"
            );


        document.getElementById(
            "joinRoomButton"
        ).addEventListener(
            "click",
            () => {

                joinOnlineRoom(
                    roomInput.value
                );
            }
        );


        roomInput.addEventListener(
            "input",
            () => {

                roomInput.value =
                    roomInput.value
                        .toUpperCase()
                        .replace(
                            /[^A-Z0-9]/g,
                            ""
                        )
                        .slice(0, 6);
            }
        );


        roomInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    joinOnlineRoom(
                        roomInput.value
                    );
                }
            }
        );


        /* ================= COPY ================= */

        document.getElementById(
            "copyRoomButton"
        ).addEventListener(
            "click",
            () => {

                copyRoomCode();
            }
        );


        document.getElementById(
            "copyLinkButton"
        ).addEventListener(
            "click",
            () => {

                copyRoomLink();
            }
        );


        /* ================= FIREBASE ================= */

        if (
            typeof initFirebase ===
            "function"
        ) {

            initFirebase();
        }


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
                    .slice(0, 6);
        }

    }
);
