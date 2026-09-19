(function () {

    "use strict";


    // =========================================================
    // GAMEHUB
    // Firebase / Presence / Analytics
    // =========================================================


    const GAME_NAME =
        document.body?.dataset?.game ||
        document.documentElement?.dataset?.game ||
        "unknown";


    // =========================================================
    // FIREBASE CONFIG
    // =========================================================

    const FIREBASE_CONFIG = {

        apiKey:
            "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",

        authDomain:
            "caro-3460d.firebaseapp.com",

        databaseURL:
            "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",

        projectId:
            "caro-3460d",

        storageBucket:
            "caro-3460d.firebasestorage.app",

        messagingSenderId:
            "473059233945",

        appId:
            "1:473059233945:web:7bbf037f41a8a8d331e808",

        measurementId:
            "G-WXXMSSSN3W"

    };


    // =========================================================
    // STATE
    // =========================================================

    let firebaseApp = null;

    let auth = null;

    let db = null;

    let currentUser = null;


    // ---------------------------------------------------------
    // Presence
    // ---------------------------------------------------------

    let presenceRef = null;

    let heartbeatTimer = null;

    let connectedRef = null;

    let connectedListener = null;


    // ---------------------------------------------------------
    // Game round
    // ---------------------------------------------------------

    let roundStartedAt = null;

    let roundFinished = false;

    let roundStartRecorded = false;


    // ---------------------------------------------------------
    // Init
    // ---------------------------------------------------------

    let initialized = false;

    let resolveReady;

    let rejectReady;


    const ready =
        new Promise(
            (resolve, reject) => {

                resolveReady =
                    resolve;

                rejectReady =
                    reject;

            }
        );


    // =========================================================
    // UNIQUE SESSION
    // =========================================================

    /*
     * Mỗi tab / trang game có session riêng.
     *
     * Ví dụ:
     *
     * presence/
     *   UID123/
     *     session_abc/
     *       game: "flappy"
     *
     *   UID123/
     *     session_xyz/
     *       game: "hub"
     *
     * Như vậy Hub không thể ghi đè Flappy.
     */

    const presenceSessionId =
        "session_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10);


    // =========================================================
    // DATE - VIETNAM
    // =========================================================

    function getVietnamDate() {

        const formatter =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        "Asia/Ho_Chi_Minh",

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit"
                }
            );


        return formatter.format(
            new Date()
        );

    }


    // =========================================================
    // FIREBASE INIT
    // =========================================================

    async function initFirebase() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            throw new Error(
                "Firebase SDK chưa được tải."
            );

        }


        if (
            typeof firebase.initializeApp !==
            "function"
        ) {

            throw new Error(
                "Firebase SDK không hợp lệ."
            );

        }


        const APP_NAME =
            "GameHub";


        const existingApp =
            firebase.apps.find(
                app =>
                    app.name ===
                    APP_NAME
            );


        if (existingApp) {

            firebaseApp =
                existingApp;

        } else {

            firebaseApp =
                firebase.initializeApp(
                    FIREBASE_CONFIG,
                    APP_NAME
                );

        }


        auth =
            firebaseApp.auth();


        db =
            firebaseApp.database();


        console.log(
            "GameHub Firebase app:",
            firebaseApp.name
        );


        console.log(
            "GameHub Firebase database:",
            db.ref().toString()
        );


        await ensureAuth();


        return true;

    }


    // =========================================================
    // AUTH
    // =========================================================

    async function ensureAuth() {

    if (!auth) {

        throw new Error(
            "Firebase Auth chưa được khởi tạo."
        );

    }


    /*
     * Firebase cần một khoảng thời gian để
     * khôi phục phiên đăng nhập đã lưu.
     *
     * Không được kiểm tra auth.currentUser
     * ngay lập tức rồi tạo Guest.
     */

    const restoredUser =
        await new Promise(
            resolve => {

                let finished = false;


                const unsubscribe =
                    auth.onAuthStateChanged(
                        user => {

                            if (finished) {
                                return;
                            }


                            finished =
                                true;


                            unsubscribe();


                            resolve(user);

                        }
                    );

            }
        );


    /*
     * Có tài khoản / Guest đã tồn tại.
     *
     * Giữ nguyên phiên đó.
     */

    if (restoredUser) {

        currentUser =
            restoredUser;


        console.log(
            "GameHub restored UID:",
            currentUser.uid
        );


        console.log(
            "GameHub restored account:",
            currentUser.isAnonymous
                ? "GUEST"
                : "ACCOUNT"
        );


        return currentUser;

    }


    /*
     * Không có phiên nào được lưu.
     *
     * Khi đó mới tạo Guest.
     */

    try {

        const credential =
            await auth.signInAnonymously();


        currentUser =
            credential.user;


        console.log(
            "GameHub new Guest UID:",
            currentUser.uid
        );


        return currentUser;

    } catch (error) {

        console.error(
            "GameHub Anonymous Auth lỗi:",
            error
        );


        throw error;

    }

}


    // =========================================================
    // PRESENCE
    // =========================================================

    async function startPresence() {

        if (
            !db ||
            !currentUser
        ) {

            console.warn(
                "GameHub: chưa có DB hoặc user."
            );

            return;

        }


        const uid =
            currentUser.uid;


        /*
         * QUAN TRỌNG
         *
         * Trước:
         *
         * presence/{uid}
         *
         * Bây giờ:
         *
         * presence/{uid}/{sessionId}
         */

        presenceRef =
            db.ref(
                `presence/${uid}/${presenceSessionId}`
            );


        console.log(
            "GameHub Presence path:",
            `presence/${uid}/${presenceSessionId}`
        );


        // -----------------------------------------------------
        // onDisconnect
        // -----------------------------------------------------

        try {

            await presenceRef
                .onDisconnect()
                .remove();


            console.log(
                "GameHub: onDisconnect OK"
            );

        } catch (error) {

            console.error(
                "GameHub: onDisconnect lỗi:",
                error
            );

        }


        // -----------------------------------------------------
        // Firebase connection
        // -----------------------------------------------------

        connectedRef =
            db.ref(
                ".info/connected"
            );


        connectedListener =
            connectedRef.on(
                "value",
                async snapshot => {

                    const connected =
                        snapshot.val() === true;


                    console.log(
                        "GameHub RTDB connected:",
                        connected
                    );


                    if (!connected) {

                        return;

                    }


                    try {

                        /*
                         * Mỗi lần reconnect phải
                         * đăng ký onDisconnect lại.
                         */

                        await presenceRef
                            .onDisconnect()
                            .remove();


                        await updatePresence();

                    } catch (error) {

                        console.error(
                            "GameHub presence reconnect lỗi:",
                            error
                        );

                    }

                }
            );


        // -----------------------------------------------------
        // Heartbeat
        // -----------------------------------------------------

        if (heartbeatTimer) {

            clearInterval(
                heartbeatTimer
            );

        }


        heartbeatTimer =
            setInterval(
                () => {

                    updatePresence();

                },
                20000
            );


        // -----------------------------------------------------
        // Ghi Presence ngay
        // -----------------------------------------------------

        await updatePresence();

    }


    // =========================================================
    // UPDATE PRESENCE
    // =========================================================

    async function updatePresence() {

        if (
            !presenceRef ||
            !currentUser
        ) {

            return;

        }


        try {

            await presenceRef.set({

                uid:
                    currentUser.uid,

                sessionId:
                    presenceSessionId,

                game:
                    GAME_NAME,

                online:
                    true,

                lastSeen:
                    firebase.database
                        .ServerValue
                        .TIMESTAMP

            });


            console.log(
                "GameHub presence ONLINE:",
                GAME_NAME,
                presenceSessionId
            );

        } catch (error) {

            console.error(
                "GameHub updatePresence lỗi:",
                error
            );

        }

    }


    // =========================================================
    // STOP PRESENCE
    // =========================================================

    async function stopPresence() {

        if (heartbeatTimer) {

            clearInterval(
                heartbeatTimer
            );

            heartbeatTimer =
                null;

        }


        if (
            connectedRef &&
            connectedListener
        ) {

            try {

                connectedRef.off(
                    "value",
                    connectedListener
                );

            } catch (error) {

                console.warn(
                    error
                );

            }

        }


        connectedRef =
            null;

        connectedListener =
            null;


        if (presenceRef) {

            try {

                await presenceRef.remove();

                console.log(
                    "GameHub presence removed."
                );

            } catch (error) {

                console.warn(
                    "GameHub remove presence lỗi:",
                    error
                );

            }

            presenceRef =
                null;

        }

    }


    // =========================================================
    // DAILY UNIQUE PLAYER
    // =========================================================

    async function trackDailyPlayer() {

        if (
            !db ||
            !currentUser
        ) {

            return null;

        }


        const date =
            getVietnamDate();


        const uid =
            currentUser.uid;


        const playerRef =
            db.ref(
                `analytics/daily/${date}/players/${uid}`
            );


        try {

            /*
             * Dùng transaction để không tạo
             * nhiều player cho cùng UID trong ngày.
             */

            await playerRef.transaction(
                current => {

                    if (
                        current ===
                        null
                    ) {

                        return {

                            uid:
                                uid,

                            game:
                                GAME_NAME,

                            firstSeen:
                                firebase.database
                                    .ServerValue
                                    .TIMESTAMP,

                            lastSeen:
                                firebase.database
                                    .ServerValue
                                    .TIMESTAMP

                        };

                    }


                    current.lastSeen =
                        firebase.database
                            .ServerValue
                            .TIMESTAMP;


                    /*
                     * Không đổi game cũ ở đây.
                     * Daily player chỉ đại diện cho
                     * người dùng trong ngày.
                     */

                    return current;

                }
            );


            console.log(
                "GameHub daily player:",
                date,
                uid
            );


            return true;

        } catch (error) {

            console.error(
                "GameHub daily player lỗi:",
                error
            );


            return false;

        }

    }


    // =========================================================
    // DAILY GAME PLAY
    // =========================================================

    async function trackDailyPlay(
        type,
        data = {}
    ) {

        if (
            !db ||
            !currentUser
        ) {

            console.warn(
                "GameHub: trackDailyPlay chưa sẵn sàng."
            );

            return null;

        }


        const date =
            getVietnamDate();


        const eventRef =
            db.ref(
                `analytics/daily/${date}/plays`
            ).push();


        const payload = {

            uid:
                currentUser.uid,

            game:
                GAME_NAME,

            type:
                type,

            timestamp:
                firebase.database
                    .ServerValue
                    .TIMESTAMP,

            ...data

        };


        try {

            await eventRef.set(
                payload
            );


            console.log(
                "GameHub daily play:",
                GAME_NAME,
                type,
                eventRef.key
            );


            return eventRef.key;

        } catch (error) {

            console.error(
                "GameHub daily play lỗi:",
                error
            );


            return null;

        }

    }


    // =========================================================
    // ANALYTICS
    // =========================================================

    async function track(
        type,
        data = {}
    ) {

        if (
            !db ||
            !currentUser
        ) {

            console.warn(
                "GameHub: analytics chưa sẵn sàng."
            );

            return null;

        }


        const eventRef =
            db.ref(
                "analytics/events"
            ).push();


        const payload = {

            uid:
                currentUser.uid,

            game:
                GAME_NAME,

            type:
                type,

            timestamp:
                firebase.database
                    .ServerValue
                    .TIMESTAMP,

            ...data

        };


        try {

            await eventRef.set(
                payload
            );


            console.log(
                "GameHub analytics:",
                type,
                eventRef.key
            );


            /*
             * game_start được tính là
             * một lượt chơi.
             */

            if (
                type ===
                "game_start"
            ) {

                await trackDailyPlay(
                    "game_start",
                    data
                );

            }


            return eventRef.key;

        } catch (error) {

            console.error(
                "GameHub analytics lỗi:",
                error
            );


            return null;

        }

    }


    // =========================================================
    // GAME ROUND
    // =========================================================

    async function startRound(
        details = {}
    ) {

        /*
         * Nếu round đang chạy thì không
         * ghi thêm một lượt chơi.
         */

        if (
            roundStartedAt !==
                null &&
            !roundFinished
        ) {

            console.log(
                "GameHub: round đã bắt đầu, bỏ qua startRound."
            );


            return null;

        }


        roundStartedAt =
            Date.now();


        roundFinished =
            false;


        roundStartRecorded =
            false;


        /*
         * Ghi game_start.
         *
         * Đây là lượt chơi được dùng
         * cho phần thống kê.
         */

        const eventKey =
            await track(
                "game_start",
                {
                    ...details
                }
            );


        if (eventKey) {

            roundStartRecorded =
                true;

        }


        /*
         * Update presence ngay khi bắt đầu chơi.
         */

        await updatePresence();


        console.log(
            "GameHub ROUND START:",
            GAME_NAME,
            details
        );


        return eventKey;

    }


    // =========================================================
    // END ROUND
    // =========================================================

    async function endRound(
        result,
        details = {}
    ) {

        if (
            roundStartedAt ===
                null ||
            roundFinished
        ) {

            console.log(
                "GameHub: không có round đang chạy."
            );


            return null;

        }


        roundFinished =
            true;


        const duration =
            Math.max(
                0,
                Math.round(
                    (
                        Date.now() -
                        roundStartedAt
                    ) / 1000
                )
            );


        let eventType =
            "game_end";


        if (
            result ===
            "win"
        ) {

            eventType =
                "game_win";

        } else if (
            result ===
            "loss"
        ) {

            eventType =
                "game_loss";

        } else if (
            result ===
            "draw"
        ) {

            eventType =
                "game_draw";

        }


        const commonData = {

            result:
                result,

            duration:
                duration,

            ...details

        };


        /*
         * Ghi kết quả.
         */

        await track(
            eventType,
            commonData
        );


        /*
         * Ghi game_end.
         */

        await track(
            "game_end",
            commonData
        );


        /*
         * Vẫn giữ Presence vì người chơi
         * có thể đang ở màn Game Over.
         */

        await updatePresence();


        roundStartedAt =
            null;


        roundFinished =
            false;


        roundStartRecorded =
            false;


        console.log(
            "GameHub ROUND END:",
            GAME_NAME,
            result,
            duration + "s"
        );

    }


    // =========================================================
    // SHORTCUTS
    // =========================================================

    async function start(
        details = {}
    ) {

        return startRound(
            details
        );

    }


    async function end(
        details = {}
    ) {

        return endRound(
            details.result ||
            "end",

            details
        );

    }


    async function win(
        details = {}
    ) {

        return endRound(
            "win",
            details
        );

    }


    async function loss(
        details = {}
    ) {

        return endRound(
            "loss",
            details
        );

    }


    async function draw(
        details = {}
    ) {

        return endRound(
            "draw",
            details
        );

    }


    // =========================================================
    // INIT
    // =========================================================

    async function init() {

        if (initialized) {

            return ready;

        }


        initialized =
            true;


        try {

            /*
             * 1. Firebase
             */

            await initFirebase();


            /*
             * 2. Presence
             */

            await startPresence();


            /*
             * 3. Daily unique player
             */

            await trackDailyPlayer();


            console.log(
                "================================"
            );


            console.log(
                "GameHub READY"
            );


            console.log(
                "Game:",
                GAME_NAME
            );


            console.log(
                "UID:",
                currentUser?.uid
            );


            console.log(
                "Session:",
                presenceSessionId
            );


            console.log(
                "Date:",
                getVietnamDate()
            );


            console.log(
                "================================"
            );


            resolveReady(
                true
            );


        } catch (error) {

            console.error(
                "================================"
            );


            console.error(
                "GameHub initialization FAILED"
            );


            console.error(
                error
            );


            console.error(
                "================================"
            );


            rejectReady(
                error
            );

        }


        return ready;

    }


    // =========================================================
    // PUBLIC API
    // =========================================================

    window.GameHub = {

        ready,

        init,


        // -----------------------------------------------------
        // Firebase
        // -----------------------------------------------------

        getUser() {

            return currentUser;

        },


        getAuth() {

            return auth;

        },


        getDatabase() {

            return db;

        },


        getFirebaseApp() {

            return firebaseApp;

        },


        getGameName() {

            return GAME_NAME;

        },


        // -----------------------------------------------------
        // Presence
        // -----------------------------------------------------

        updatePresence,

        stopPresence,


        // -----------------------------------------------------
        // Analytics
        // -----------------------------------------------------

        track,

        trackDailyPlayer,

        trackDailyPlay,


        // -----------------------------------------------------
        // Game
        // -----------------------------------------------------

        startRound,

        endRound,


        // -----------------------------------------------------
        // Compatibility
        // -----------------------------------------------------

        start,

        end,

        win,

        loss,

        draw

    };


    // =========================================================
    // AUTO INIT
    // =========================================================

    init();


    // =========================================================
    // PAGE CLOSE
    // =========================================================

    window.addEventListener(
        "pagehide",
        () => {

            /*
             * Không remove trực tiếp ở đây vì
             * trình duyệt có thể kill JavaScript
             * trước khi Firebase gửi request.
             *
             * onDisconnect() phía Firebase server
             * sẽ tự xoá Presence.
             */

            if (heartbeatTimer) {

                clearInterval(
                    heartbeatTimer
                );

                heartbeatTimer =
                    null;

            }

        }
    );


})();
