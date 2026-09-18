"use strict";

(() => {

    // Kiểm tra Firebase SDK
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

    let heartbeatTimer = null;
    let started = false;


    // ==========================================
    // BẮT ĐẦU PRESENCE
    // ==========================================

    function startPresence(user) {

        if (started || !user) {
            return;
        }

        started = true;

        const uid = user.uid;

        const presenceRef =
            db.ref("presence/" + uid);


        // ==========================================
        // TỰ XOÁ KHI MẤT KẾT NỐI
        // ==========================================

        presenceRef
            .onDisconnect()
            .remove()
            .then(() => {

                console.log(
                    "Presence: onDisconnect OK"
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
                        "Presence: online",
                        currentGame
                    );

                })
                .catch(error => {

                    console.error(
                        "Presence write error:",
                        error
                    );

                });

        }


        // Ghi lần đầu
        updatePresence();


        // ==========================================
        // HEARTBEAT
        // ==========================================

        heartbeatTimer =
            setInterval(() => {

                updatePresence();

            }, 20000);


        // ==========================================
        // KHI QUAY LẠI TAB
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
    // CHỜ FIREBASE AUTH
    // ==========================================

    auth.onAuthStateChanged(user => {

        if (user) {

            startPresence(user);

            return;
        }


        // Nếu chưa đăng nhập thì đăng nhập Anonymous

        auth.signInAnonymously()
            .catch(error => {

                console.error(
                    "Presence anonymous auth error:",
                    error
                );

            });

    });

})();
