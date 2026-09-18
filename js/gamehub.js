"use strict";

(() => {
    // =========================================================
    // GAMEHUB - SHARED SYSTEM
    // Analytics + Presence + Session
    // =========================================================

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",
        authDomain: "caro-3460d.firebaseapp.com",
        databaseURL:
            "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "caro-3460d",
        storageBucket:
            "caro-3460d.firebasestorage.app",
        messagingSenderId:
            "473059233945",
        appId:
            "1:473059233945:web:7bbf037f41a8a8d331e808",
        measurementId: "G-WXXMSSSN3W"
    };

    // ---------------------------------------------------------
    // GAME NAME
    // ---------------------------------------------------------

    const body = document.body;

    const game =
        body?.dataset?.game ||
        "unknown";

    // ---------------------------------------------------------
    // SESSION
    // ---------------------------------------------------------

    const sessionId =
        "session_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 10);

    const sessionStart = Date.now();

    // ---------------------------------------------------------
    // FIREBASE
    // ---------------------------------------------------------

    let auth = null;
    let db = null;
    let currentUser = null;

    let initialized = false;
    let started = false;
    let finished = false;

    function log(...args) {
        console.log("[GameHub]", ...args);
    }

    function getDevice() {
        const ua = navigator.userAgent || "";

        if (/iPhone|iPad|iPod/i.test(ua)) {
            return "iOS";
        }

        if (/Android/i.test(ua)) {
            return "Android";
        }

        if (/Macintosh|Mac OS X/i.test(ua)) {
            return "Mac";
        }

        if (/Windows/i.test(ua)) {
            return "Windows";
        }

        if (/Linux/i.test(ua)) {
            return "Linux";
        }

        return "Other";
    }

    function getBrowser() {
        const ua = navigator.userAgent || "";

        if (/Edg\//i.test(ua)) return "Edge";
        if (/Chrome\//i.test(ua)) return "Chrome";
        if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
            return "Safari";
        }
        if (/Firefox\//i.test(ua)) return "Firefox";

        return "Other";
    }

    function getPageUrl() {
        return window.location.pathname || "";
    }

    // ---------------------------------------------------------
    // FIREBASE INIT
    // ---------------------------------------------------------

    function initFirebase() {
        try {
            if (typeof firebase === "undefined") {
                throw new Error("Firebase SDK chưa được tải");
            }

            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            auth = firebase.auth();
            db = firebase.database();

            initialized = true;

            log("Firebase initialized");

            return true;
        } catch (error) {
            console.error(
                "[GameHub] Firebase init error:",
                error
            );

            return false;
        }
    }

    // ---------------------------------------------------------
    // ANONYMOUS AUTH
    // ---------------------------------------------------------

    async function ensureAuth() {
        if (!initialized) {
            const ok = initFirebase();

            if (!ok) {
                return false;
            }
        }

        try {
            if (auth.currentUser) {
                currentUser = auth.currentUser;
                return true;
            }

            const result =
                await auth.signInAnonymously();

            if (!result?.user) {
                throw new Error(
                    "Không lấy được Firebase user"
                );
            }

            currentUser = result.user;

            return true;
        } catch (error) {
            console.error(
                "[GameHub] Anonymous auth error:",
                error
            );

            return false;
        }
    }

    // ---------------------------------------------------------
    // ANALYTICS
    // ---------------------------------------------------------

    async function track(type, extra = {}) {
        if (!db || !currentUser) {
            return;
        }

        try {
            const ref =
                db.ref("analytics/events").push();

            const event = {
                type: type,

                uid: currentUser.uid,

                game: game,

                sessionId: sessionId,

                timestamp:
                    firebase.database.ServerValue.TIMESTAMP,

                device: getDevice(),

                browser: getBrowser(),

                page: getPageUrl(),

                ...extra
            };

            await ref.set(event);

            log("Analytics:", type);
        } catch (error) {
            console.error(
                "[GameHub] Analytics error:",
                error
            );
        }
    }

    // ---------------------------------------------------------
    // GAME START
    // ---------------------------------------------------------

    async function start(details = {}) {
        if (started) {
            return;
        }

        started = true;
        finished = false;

        await track(
            "game_start",
            {
                ...details
            }
        );
    }

    // ---------------------------------------------------------
    // GAME END
    // ---------------------------------------------------------

    async function end(details = {}) {
        if (finished) {
            return;
        }

        finished = true;

        const duration =
            Math.max(
                0,
                Math.round(
                    (Date.now() - sessionStart) /
                    1000
                )
            );

        await track(
            "game_end",
            {
                duration: duration,

                ...details
            }
        );
    }

    // ---------------------------------------------------------
    // WIN
    // ---------------------------------------------------------

    async function win(details = {}) {
        await track(
            "game_win",
            {
                ...details
            }
        );

        await end({
            result: "win",

            ...details
        });
    }

    // ---------------------------------------------------------
    // LOSS
    // ---------------------------------------------------------

    async function loss(details = {}) {
        await track(
            "game_loss",
            {
                ...details
            }
        );

        await end({
            result: "loss",

            ...details
        });
    }

    // ---------------------------------------------------------
    // DRAW
    // ---------------------------------------------------------

    async function draw(details = {}) {
        await track(
            "game_draw",
            {
                ...details
            }
        );

        await end({
            result: "draw",

            ...details
        });
    }

    // ---------------------------------------------------------
    // PRESENCE
    // ---------------------------------------------------------

    let presenceRef = null;
    let heartbeatTimer = null;

    async function startPresence() {
        if (!db || !currentUser) {
            return;
        }

        try {
            const uid = currentUser.uid;

            presenceRef =
                db.ref(
                    "presence/" + uid
                );

            const presenceData = {
                game: game,

                uid: uid,

                sessionId: sessionId,

                lastSeen:
                    firebase.database.ServerValue.TIMESTAMP
            };

            await presenceRef.set(
                presenceData
            );

            await presenceRef
                .onDisconnect()
                .remove();

            log(
                "Presence online:",
                game
            );

            // heartbeat
            heartbeatTimer =
                setInterval(() => {
                    if (!presenceRef) {
                        return;
                    }

                    presenceRef.update({
                        game: game,

                        sessionId: sessionId,

                        lastSeen:
                            firebase.database.ServerValue.TIMESTAMP
                    }).catch(error => {
                        console.error(
                            "[GameHub] Presence heartbeat error:",
                            error
                        );
                    });
                }, 20000);

        } catch (error) {
            console.error(
                "[GameHub] Presence error:",
                error
            );
        }
    }

    // ---------------------------------------------------------
    // STOP PRESENCE
    // ---------------------------------------------------------

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
                console.error(
                    "[GameHub] Presence remove error:",
                    error
                );
            }

            presenceRef = null;
        }
    }

    // ---------------------------------------------------------
    // PAGE LEAVE
    // ---------------------------------------------------------

    window.addEventListener(
        "pagehide",
        () => {
            if (presenceRef) {
                try {
                    presenceRef.remove();
                } catch (_) {}
            }
        }
    );

    // ---------------------------------------------------------
    // AUTO START
    // ---------------------------------------------------------

    async function init() {
        const ok =
            await ensureAuth();

        if (!ok) {
            return;
        }

        await startPresence();

        await start();

        log(
            "GameHub ready:",
            game
        );
    }

    // ---------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------

    window.GameHub = {

        // thông tin
        game: game,

        sessionId: sessionId,

        getUser() {
            return currentUser;
        },

        getDevice,

        // analytics
        track,

        start,

        end,

        win,

        loss,

        draw,

        // presence
        startPresence,

        stopPresence,

        // firebase
        getDatabase() {
            return db;
        },

        getAuth() {
            return auth;
        }
    };

    // ---------------------------------------------------------
    // START
    // ---------------------------------------------------------

    init();

})();
