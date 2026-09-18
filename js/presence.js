"use strict";

(() => {

    if (
        typeof firebase === "undefined" ||
        !firebase.apps ||
        !firebase.database ||
        !firebase.auth
    ) {
        console.error("Presence: Firebase SDK chưa được tải.");
        return;
    }

    const auth = firebase.auth();
    const db = firebase.database();

    const currentGame =
        document.body.dataset.game || "GameHub";

    let presenceRef = null;
    let heartbeatTimer = null;
    let started = false;


    // ==========================================
    // HIỂN THỊ SỐ NGƯỜI ONLINE
    // ==========================================

    function updateOnlineUI(snapshot) {

        const data = snapshot.val() || {};

        let totalOnline = 0;
        const gameCounts = {};

        Object.keys(data).forEach(uid => {

            const player = data[uid];

            if (
                !player ||
                typeof player !== "object"
            ) {
                return;
            }

            totalOnline++;

            const game =
                player.game || "Unknown";

            gameCounts[game] =
                (gameCounts[game] || 0) + 1;

        });


        // ==========================================
        // TỔNG ONLINE
        // ==========================================

        const onlineNumber =
            document.getElementById(
                "onlineNumber"
            );

        if (onlineNumber) {

            onlineNumber.textContent =
                totalOnline;

        }


        // ==========================================
        // CARO
        // ==========================================

        const caroPlayers =
            gameCounts["caro5"] || 0;

        const caroOnline =
            document.getElementById(
                "caroOnline"
            );

        if (caroOnline) {

            caroOnline.textContent =
                caroPlayers +
                (
                    caroPlayers === 1
                        ? " người đang chơi"
                        : " người đang chơi"
                );

        }


        // ==========================================
        // ACTIVE GAMES
        // Không tính GameHub
        // ==========================================

        let activeGames = 0;

        Object.keys(gameCounts).forEach(game => {

            if (
                game !== "GameHub" &&
                gameCounts[game] > 0
            ) {

                activeGames++;

            }

        });


        const activeGamesEl =
            document.getElementById(
                "activeGames"
            );

        if (activeGamesEl) {

            activeGamesEl.textContent =
                activeGames;

        }


        // ==========================================
        // GAME CÓ NHIỀU NGƯỜI NHẤT
        // ==========================================

        let topGame = "Chưa có";

        let topCount = 0;

        Object.keys(gameCounts).forEach(game => {

            if (
                game !== "GameHub" &&
                gameCounts[game] > topCount
            ) {

                topGame = game;
                topCount = gameCounts[game];

            }

        });


        const topGameEl =
            document.getElementById(
                "topGame"
            );

        if (topGameEl) {

            if (topCount > 0) {

                if (topGame === "caro5") {
                    topGameEl.textContent =
                        "Caro 5";
                } else {
                    topGameEl.textContent =
                        topGame;
                }

            } else {

                topGameEl.textContent =
                    "Chưa có";

            }

        }

    }


    // ==========================================
    // BẮT ĐẦU PRESENCE
    // ==========================================

    function startPresence(user) {

        if (
            started ||
            !user
        ) {
            return;
        }

        started = true;

        const uid = user.uid;

        console.log(
            "Presence UID:",
            uid
        );

        console.log(
            "Presence game:",
            currentGame
        );


        presenceRef =
            db.ref(
                "presence/" + uid
            );


        // ==========================================
        // TỰ XOÁ KHI MẤT KẾT NỐI
        // ==========================================

        presenceRef
            .onDisconnect()
            .remove()
            .then(() => {

                console.log(
                    "Presence onDisconnect OK"
                );

            })
            .catch(error => {

                console.error(
                    "Presence onDisconnect error:",
                    error
                );

            });


        // ==========================================
        // GHI ONLINE
        // ==========================================

        function updatePresence() {

            return presenceRef
                .set({

                    game: currentGame,

                    lastSeen:
                        firebase.database.ServerValue.TIMESTAMP

                })
                .then(() => {

                    console.log(
                        "Presence: online"
                    );

                })
                .catch(error => {

                    console.error(
                        "Presence write error:",
                        error
                    );

                });

        }


        updatePresence();


        // ==========================================
        // HEARTBEAT
        // ==========================================

        heartbeatTimer =
            setInterval(
                updatePresence,
                20000
            );


        // ==========================================
        // THEO DÕI TẤT CẢ NGƯỜI ONLINE
        // ==========================================

        db.ref("presence")
            .on(
                "value",
                updateOnlineUI
            );


        // ==========================================
        // QUAY LẠI TAB
        // ==========================================

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    updatePresence();

                }

            }
        );

    }


    // ==========================================
    // DÙNG FIREBASE USER HIỆN TẠI
    // ==========================================

    if (auth.currentUser) {

        startPresence(
            auth.currentUser
        );

    } else {

        auth.onAuthStateChanged(
            user => {

                if (user) {

                    startPresence(
                        user
                    );

                }

            }
        );

    }

})();
