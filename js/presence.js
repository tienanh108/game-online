"use strict";

(() => {

    console.log("PRESENCE: bắt đầu");

    // Kiểm tra firebase.js đã chạy chưa
    if (
        typeof window.getFirebaseAuth !== "function" ||
        typeof window.getFirebaseDatabase !== "function"
    ) {
        console.error(
            "PRESENCE: không tìm thấy firebase.js"
        );
        return;
    }

    const auth = window.getFirebaseAuth();
    const db = window.getFirebaseDatabase();

    if (!auth || !db) {
        console.error(
            "PRESENCE: Firebase Auth/Database chưa sẵn sàng"
        );
        return;
    }

    const currentGame =
        document.body.dataset.game || "GameHub";

    let presenceRef = null;
    let heartbeatTimer = null;


    // ==========================================
    // BẮT ĐẦU PRESENCE
    // ==========================================

    function startPresence(user) {

        if (!user) {
            console.error(
                "PRESENCE: không có Firebase user"
            );
            return;
        }

        const uid = user.uid;

        console.log(
            "PRESENCE: UID =",
            uid
        );

        console.log(
            "PRESENCE: GAME =",
            currentGame
        );


        presenceRef =
            db.ref("presence/" + uid);


        // ==========================================
        // TỰ XOÁ KHI MẤT KẾT NỐI
        // ==========================================

        presenceRef
            .onDisconnect()
            .remove()
            .then(() => {

                console.log(
                    "PRESENCE: onDisconnect OK"
                );

            })
            .catch(error => {

                console.error(
                    "PRESENCE: onDisconnect lỗi:",
                    error
                );

            });


        // ==========================================
        // GHI ONLINE
        // ==========================================

        function updatePresence() {

            const data = {

                game: currentGame,

                lastSeen:
                    firebase.database.ServerValue.TIMESTAMP

            };

            return presenceRef
                .set(data)
                .then(() => {

                    console.log(
                        "PRESENCE: ĐÃ GHI ONLINE"
                    );

                    const status =
                        document.getElementById(
                            "firebaseStatus"
                        );

                    if (status) {

                        status.textContent =
                            "🟢 Online • " +
                            currentGame;

                    }

                })
                .catch(error => {

                    console.error(
                        "PRESENCE: GHI LỖI:",
                        error
                    );

                    const status =
                        document.getElementById(
                            "firebaseStatus"
                        );

                    if (status) {

                        status.textContent =
                            "🔴 Presence lỗi: " +
                            error.message;

                    }

                });

        }


        // Ghi ngay lập tức
        updatePresence();


        // ==========================================
        // HEARTBEAT 20 GIÂY
        // ==========================================

        if (heartbeatTimer) {

            clearInterval(
                heartbeatTimer
            );

        }

        heartbeatTimer =
            setInterval(
                updatePresence,
                20000
            );


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
    // DÙNG USER ĐÃ CÓ
    // ==========================================

    if (auth.currentUser) {

        console.log(
            "PRESENCE: Firebase user đã có sẵn"
        );

        startPresence(
            auth.currentUser
        );

    } else {

        console.log(
            "PRESENCE: đang chờ Firebase Auth..."
        );

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
