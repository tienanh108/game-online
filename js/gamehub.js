(function () {
    "use strict";

    const GAME_NAME =
        document.body?.dataset?.game ||
        document.documentElement.dataset.game ||
        "unknown";

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

    // --------------------------------------------------
    // Firebase
    // --------------------------------------------------

    async function initFirebase() {
        if (typeof firebase === "undefined") {
            throw new Error("Firebase SDK chưa được tải.");
        }

        if (!firebase.initializeApp) {
            throw new Error("Firebase SDK không hợp lệ.");
        }

        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            firebaseApp = firebase.app();
        }

        auth = firebase.auth();
        db = firebase.database();

        await ensureAuth();

        return true;
    }

    async function ensureAuth() {
        if (!auth) {
            throw new Error("Firebase Auth chưa được khởi tạo.");
        }

        if (auth.currentUser) {
            currentUser = auth.currentUser;
            return currentUser;
        }

        return new Promise((resolve, reject) => {
            let finished = false;

            const unsubscribe = auth.onAuthStateChanged(
                async (user) => {
                    if (finished) return;

                    if (user) {
                        finished = true;
                        unsubscribe();

                        currentUser = user;
                        resolve(user);
                        return;
                    }

                    try {
                        const credential =
                            await auth.signInAnonymously();

                        if (finished) return;

                        finished = true;
                        unsubscribe();

                        currentUser = credential.user;
                        resolve(currentUser);
                    } catch (error) {
                        if (finished) return;

                        finished = true;
                        unsubscribe();
                        reject(error);
                    }
                },
                (error) => {
                    if (finished) return;

                    finished = true;
                    unsubscribe();
                    reject(error);
                }
            );
        });
    }

    // --------------------------------------------------
    // Presence
    // --------------------------------------------------

    async function startPresence() {
        if (!db || !currentUser) return;

        const uid = currentUser.uid;

        presenceRef = db.ref(`presence/${uid}`);

        try {
            await presenceRef.onDisconnect().remove();
        } catch (error) {
            console.warn(
                "GameHub: không đăng ký được onDisconnect:",
                error
            );
        }

        await updatePresence();

        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }

        heartbeatTimer = setInterval(() => {
            updatePresence();
        }, 20000);
    }

    async function updatePresence() {
        if (!presenceRef || !currentUser) return;

        try {
            await presenceRef.set({
                game: GAME_NAME,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
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
            clearInterval(heartbeatTimer);
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

    // --------------------------------------------------
    // Analytics
    // --------------------------------------------------

    async function track(type, data = {}) {
        if (!db || !currentUser) {
            console.warn(
                "GameHub: chưa sẵn sàng để ghi analytics."
            );
            return null;
        }

        const eventRef = db.ref("analytics/events").push();

        const payload = {
            uid: currentUser.uid,
            game: GAME_NAME,
            type: type,
            timestamp:
                firebase.database.ServerValue.TIMESTAMP,
            ...data
        };

        try {
            await eventRef.set(payload);
            return eventRef.key;
        } catch (error) {
            console.warn(
                "GameHub: ghi analytics thất bại:",
                error
            );
            return null;
        }
    }

    // --------------------------------------------------
    // Game round
    // --------------------------------------------------

    async function startRound(details = {}) {
        roundStartedAt = Date.now();
        roundFinished = false;

        return track("game_start", {
            ...details
        });
    }

    async function endRound(result, details = {}) {
        if (roundStartedAt === null || roundFinished) {
            return;
        }

        roundFinished = true;

        const duration = Math.max(
            0,
            Math.round(
                (Date.now() - roundStartedAt) / 1000
            )
        );

        let eventType = "game_end";

        if (result === "win") {
            eventType = "game_win";
        } else if (result === "loss") {
            eventType = "game_loss";
        } else if (result === "draw") {
            eventType = "game_draw";
        }

        const commonData = {
            result,
            duration,
            ...details
        };

        // Event kết quả
        await track(eventType, commonData);

        // Event kết thúc để Admin tính duration
        await track("game_end", commonData);

        roundStartedAt = null;
    }

    // --------------------------------------------------
    // Legacy-friendly shortcuts
    // --------------------------------------------------

    async function start(details = {}) {
        return startRound(details);
    }

    async function end(details = {}) {
        return endRound(
            details.result || "end",
            details
        );
    }

    async function win(details = {}) {
        return endRound("win", details);
    }

    async function loss(details = {}) {
        return endRound("loss", details);
    }

    async function draw(details = {}) {
        return endRound("draw", details);
    }

    // --------------------------------------------------
    // Init
    // --------------------------------------------------

    async function init() {
        if (initialized) {
            return ready;
        }

        initialized = true;

        try {
            await initFirebase();
            await startPresence();

            resolveReady(true);

            console.log(
                `GameHub ready: ${GAME_NAME}`
            );
        } catch (error) {
            console.error(
                "GameHub initialization failed:",
                error
            );

            rejectReady(error);
        }

        return ready;
    }

    // --------------------------------------------------
    // Public API
    // --------------------------------------------------

    window.GameHub = {
        ready,

        init,

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

        updatePresence,

        stopPresence,

        track,

        startRound,
        endRound,

        // Compatibility
        start,
        end,
        win,
        loss,
        draw
    };

    // Start automatically.
    // IMPORTANT:
    // Không tự gọi startRound() ở đây.
    // Game chỉ được tính khi main.js thực sự bắt đầu một ván.
    init();

    window.addEventListener("beforeunload", () => {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    });
})();
