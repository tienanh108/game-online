(function () {
    "use strict";

    // =========================================================
    // GAMEHUB
    // Firebase / Presence / Analytics
    // =========================================================

    const GAME_NAME =
        document.body?.dataset?.game ||
        document.documentElement.dataset.game ||
        "unknown";

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",

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

    let presenceRef = null;
    let heartbeatTimer = null;

    let roundStartedAt = null;
    let roundFinished = false;

    let initialized = false;

    let resolveReady;
    let rejectReady;

    const ready = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });


    // =========================================================
    // DATE
    // Việt Nam UTC+7
    // =========================================================

    function getVietnamDate() {
        const now = new Date();

        const vietnamTime = new Date(
            now.toLocaleString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh"
            })
        );

        const year = vietnamTime.getFullYear();
        const month = String(
            vietnamTime.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            vietnamTime.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    // =========================================================
    // FIREBASE
    // =========================================================

    async function initFirebase() {

        if (typeof firebase === "undefined") {
            throw new Error(
                "Firebase SDK chưa được tải."
            );
        }

        if (!firebase.initializeApp) {
            throw new Error(
                "Firebase SDK không hợp lệ."
            );
        }


        // -----------------------------------------
        // Initialize app
        // -----------------------------------------

        if (!firebase.apps.length) {

            firebaseApp =
                firebase.initializeApp(
                    FIREBASE_CONFIG
                );

        } else {

            firebaseApp =
                firebase.app();
        }


        auth = firebase.auth();

        db = firebase.database();


        // -----------------------------------------
        // Anonymous login
        // -----------------------------------------

        await ensureAuth();

        return true;
    }


    async function ensureAuth() {

        if (!auth) {
            throw new Error(
                "Firebase Auth chưa được khởi tạo."
            );
        }


        // Đã đăng nhập
        if (auth.currentUser) {

            currentUser =
                auth.currentUser;

            return currentUser;
        }


        // Chờ Auth hoặc tạo Anonymous User
        return new Promise(
            (resolve, reject) => {

                let finished = false;

                const unsubscribe =
                    auth.onAuthStateChanged(
                        async (user) => {

                            if (finished) {
                                return;
                            }


                            // --------------------------------
                            // Đã có user
                            // --------------------------------

                            if (user) {

                                finished = true;

                                unsubscribe();

                                currentUser =
                                    user;

                                resolve(user);

                                return;
                            }


                            // --------------------------------
                            // Chưa có user
                            // → Anonymous Auth
                            // --------------------------------

                            try {

                                const credential =
                                    await auth
                                        .signInAnonymously();


                                if (finished) {
                                    return;
                                }


                                finished = true;

                                unsubscribe();

                                currentUser =
                                    credential.user;

                                resolve(
                                    currentUser
                                );

                            } catch (error) {

                                if (finished) {
                                    return;
                                }

                                finished = true;

                                unsubscribe();

                                reject(error);
                            }
                        },


                        (error) => {

                            if (finished) {
                                return;
                            }

                            finished = true;

                            unsubscribe();

                            reject(error);
                        }
                    );
            }
        );
    }


    // =========================================================
    // PRESENCE
    // =========================================================

    async function startPresence() {

        if (!db || !currentUser) {
            return;
        }


        const uid =
            currentUser.uid;


        // -----------------------------------------
        // Một user = một presence
        // -----------------------------------------

        presenceRef =
            db.ref(
                `presence/${uid}`
            );


        // -----------------------------------------
        // Khi mất kết nối
        // Firebase tự xoá
        // -----------------------------------------

        try {

            await presenceRef
                .onDisconnect()
                .remove();

        } catch (error) {

            console.warn(
                "GameHub: không đăng ký được onDisconnect:",
                error
            );
        }


        // -----------------------------------------
        // Ghi trạng thái online
        // -----------------------------------------

        await updatePresence();


        // -----------------------------------------
        // Heartbeat
        // -----------------------------------------

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
    }


    async function updatePresence() {

        if (!presenceRef || !currentUser) {
            return;
        }


        try {

            await presenceRef.set({

                uid:
                    currentUser.uid,

                game:
                    GAME_NAME,

                online:
                    true,

                lastSeen:
                    firebase.database
                        .ServerValue
                        .TIMESTAMP

            });

        } catch (error) {

            console.warn(
                "GameHub: cập nhật presence thất bại:",
                error
            );
        }
    }


    async function stopPresence() {

        if (heartbeatTimer) {

            clearInterval(
                heartbeatTimer
            );

            heartbeatTimer = null;
        }


        if (presenceRef) {

            try {

                await presenceRef.remove();

            } catch (error) {

                console.warn(
                    "GameHub: xóa presence thất bại:",
                    error
                );
            }


            presenceRef = null;
        }
    }


    // =========================================================
    // DAILY PLAYER
    // =========================================================

    async function trackDailyPlayer() {

        if (!db || !currentUser) {
            return null;
        }


        const date =
            getVietnamDate();

        const uid =
            currentUser.uid;


        /*
         * Cấu trúc:
         *
         * analytics/
         *   daily/
         *     2026-09-19/
         *       players/
         *         UID/
         *           uid
         *           firstSeen
         *           lastSeen
         *
         * Mỗi UID chỉ có 1 node.
         *
         * Vì vậy:
         *
         * 100 lần reload
         * = vẫn chỉ tính 1 người.
         */


        const playerRef =
            db.ref(
                `analytics/daily/${date}/players/${uid}`
            );


        try {

            await playerRef.update({

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

            });


            return true;

        } catch (error) {

            console.warn(
                "GameHub: ghi daily player thất bại:",
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

        if (!db || !currentUser) {
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

            return eventRef.key;

        } catch (error) {

            console.warn(
                "GameHub: ghi daily play thất bại:",
                error
            );

            return null;
        }
    }


    // =========================================================
    // ANALYTICS EVENTS
    // =========================================================

    async function track(
        type,
        data = {}
    ) {

        if (!db || !currentUser) {

            console.warn(
                "GameHub: chưa sẵn sàng để ghi analytics."
            );

            return null;
        }


        // -----------------------------------------
        // Event cũ
        // -----------------------------------------

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


            // -------------------------------------
            // Nếu là game_start
            // ghi thêm daily play
            // -------------------------------------

            if (type === "game_start") {

                await trackDailyPlay(
                    "game_start",
                    data
                );
            }


            return eventRef.key;

        } catch (error) {

            console.warn(
                "GameHub: ghi analytics thất bại:",
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

        roundStartedAt =
            Date.now();

        roundFinished =
            false;


        return track(
            "game_start",
            {
                ...details
            }
        );
    }


    async function endRound(
        result,
        details = {}
    ) {

        if (
            roundStartedAt === null ||
            roundFinished
        ) {
            return;
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


        if (result === "win") {

            eventType =
                "game_win";

        } else if (
            result === "loss"
        ) {

            eventType =
                "game_loss";

        } else if (
            result === "draw"
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


        // -----------------------------------------
        // Kết quả
        // -----------------------------------------

        await track(
            eventType,
            commonData
        );


        // -----------------------------------------
        // Kết thúc
        // -----------------------------------------

        await track(
            "game_end",
            commonData
        );


        roundStartedAt =
            null;
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
            details.result || "end",
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

            // -------------------------------------
            // Firebase
            // -------------------------------------

            await initFirebase();


            // -------------------------------------
            // Presence
            // -------------------------------------

            await startPresence();


            // -------------------------------------
            // Daily unique player
            // -------------------------------------

            await trackDailyPlayer();


            // -------------------------------------
            // Ready
            // -------------------------------------

            resolveReady(
                true
            );


            console.log(
                `GameHub ready: ${GAME_NAME}`
            );


            console.log(
                "GameHub UID:",
                currentUser?.uid
            );


            console.log(
                "GameHub date:",
                getVietnamDate()
            );


        } catch (error) {

            console.error(
                "GameHub initialization failed:",
                error
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


        // -----------------------------------------
        // Firebase
        // -----------------------------------------

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


        // -----------------------------------------
        // Presence
        // -----------------------------------------

        updatePresence,

        stopPresence,


        // -----------------------------------------
        // Analytics
        // -----------------------------------------

        track,


        trackDailyPlayer,

        trackDailyPlay,


        // -----------------------------------------
        // Game
        // -----------------------------------------

        startRound,

        endRound,


        // -----------------------------------------
        // Compatibility
        // -----------------------------------------

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
        "beforeunload",
        () => {

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
