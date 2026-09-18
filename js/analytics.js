"use strict";

(() => {
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2u2J-lHYjNeA40kFoS1-VsCaqhjYszdw",
        authDomain: "caro-3460d.firebaseapp.com",
        databaseURL:
            "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "caro-3460d",
        storageBucket:
            "caro-3460d.firebasestorage.app",
        messagingSenderId: "473059233945",
        appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
        measurementId: "G-WXXMSSSN3W"
    };

    let db = null;
    let auth = null;
    let user = null;
    let initialized = false;
    let initPromise = null;

    let sessionStart = Date.now();

    const SESSION_ID =
        "session_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10);

    function getDevice() {
        const width = window.innerWidth;

        if (width <= 600) {
            return "mobile";
        }

        if (width <= 1024) {
            return "tablet";
        }

        return "desktop";
    }

    function getBrowser() {
        const ua = navigator.userAgent;

        if (/iPhone|iPad|iPod/i.test(ua)) {
            return "iOS";
        }

        if (/Android/i.test(ua)) {
            return "Android";
        }

        if (/Macintosh/i.test(ua)) {
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

    function getToday() {
        const d = new Date();

        const year = d.getFullYear();
        const month = String(
            d.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            d.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function safeString(
        value,
        fallback = ""
    ) {
        if (
            value === undefined ||
            value === null
        ) {
            return fallback;
        }

        return String(value).slice(
            0,
            100
        );
    }

    async function init() {
        if (initialized) {
            return true;
        }

        if (initPromise) {
            return initPromise;
        }

        initPromise =
            (async () => {
                if (
                    typeof firebase ===
                    "undefined"
                ) {
                    console.warn(
                        "GameAnalytics: Firebase chưa được tải."
                    );

                    return false;
                }

                try {
                    /*
                     * Dùng Firebase app đã có nếu
                     * firebase.js đã khởi tạo trước.
                     */
                    if (
                        !firebase.apps.length
                    ) {
                        firebase.initializeApp(
                            FIREBASE_CONFIG
                        );
                    }

                    auth =
                        firebase.auth();

                    db =
                        firebase.database();

                    /*
                     * QUAN TRỌNG:
                     *
                     * Không tự gọi
                     * signInAnonymously().
                     *
                     * Nếu firebase.js tồn tại thì
                     * dùng Authentication chung.
                     */
                    if (
                        typeof window
                            .ensureFirebaseAuthenticated ===
                        "function"
                    ) {
                        user =
                            await window.ensureFirebaseAuthenticated();

                    } else if (
                        typeof window
                            .ensureAuthenticated ===
                        "function"
                    ) {
                        user =
                            await window.ensureAuthenticated();

                    } else {
                        /*
                         * Fallback cho GameHub nếu
                         * analytics.js chạy độc lập.
                         */
                        if (
                            !auth.currentUser
                        ) {
                            await auth.signInAnonymously();
                        }

                        user =
                            auth.currentUser;
                    }

                    if (!user) {
                        console.warn(
                            "GameAnalytics: Không có Firebase user."
                        );

                        return false;
                    }

                    initialized = true;

                    return true;

                } catch (error) {
                    console.warn(
                        "GameAnalytics init error:",
                        error
                    );

                    return false;
                } finally {
                    initPromise = null;
                }
            })();

        return initPromise;
    }

    async function trackEvent(
        type,
        data = {}
    ) {
        if (!initialized) {
            const ok =
                await init();

            if (!ok) {
                return;
            }
        }

        /*
         * Nếu firebase.js vừa cập nhật user,
         * lấy lại user hiện tại.
         */
        if (
            auth &&
            auth.currentUser
        ) {
            user =
                auth.currentUser;
        }

        if (
            !user ||
            !db
        ) {
            return;
        }

        const safeData = {
            ...data
        };

        /*
         * Không cho dữ liệu game
         * ghi đè UID thật.
         */
        delete safeData.uid;

        const event = {
            type:
                safeString(type),

            timestamp:
                firebase.database
                    .ServerValue
                    .TIMESTAMP,

            date:
                getToday(),

            uid:
                user.uid,

            sessionId:
                SESSION_ID,

            device:
                getDevice(),

            platform:
                getBrowser(),

            ...safeData
        };

        try {
            await db
                .ref(
                    "analytics/events"
                )
                .push(event);

        } catch (error) {
            console.warn(
                "GameAnalytics event error:",
                error
            );
        }
    }

    async function trackHubVisit() {
        await trackEvent(
            "hub_visit"
        );
    }

    async function trackGameStart(
        game,
        modeOrExtra = {},
        boardSize = null
    ) {
        sessionStart =
            Date.now();

        let extra = {};

        if (
            modeOrExtra !== null &&
            typeof modeOrExtra ===
                "object"
        ) {
            extra = {
                ...modeOrExtra
            };

        } else {
            extra = {
                mode:
                    safeString(
                        modeOrExtra
                    )
            };

            if (
                boardSize !== null
            ) {
                extra.boardSize =
                    boardSize;
            }
        }

        await trackEvent(
            "game_start",
            {
                game:
                    safeString(game),

                ...extra
            }
        );
    }

    async function trackGameEnd(
        game,
        modeOrResult = "unknown",
        durationOrExtra = null,
        result = "unknown",
        winner = null
    ) {
        let mode = "";
        let duration = null;
        let finalResult =
            "unknown";

        let extra = {};

        /*
         * Dạng:
         *
         * trackGameEnd(
         *     game,
         *     result,
         *     extra
         * )
         */
        if (
            typeof durationOrExtra ===
                "object" &&
            durationOrExtra !== null
        ) {
            finalResult =
                safeString(
                    modeOrResult,
                    "unknown"
                );

            extra = {
                ...durationOrExtra
            };

            duration =
                Math.max(
                    0,
                    Math.round(
                        (
                            Date.now() -
                            sessionStart
                        ) / 1000
                    )
                );

        } else {
            /*
             * Dạng main.js:
             *
             * game,
             * mode,
             * duration,
             * result,
             * winner
             */
            mode =
                safeString(
                    modeOrResult
                );

            duration =
                Math.max(
                    0,
                    Number(
                        durationOrExtra
                    ) || 0
                );

            finalResult =
                safeString(
                    result,
                    "unknown"
                );

            if (
                winner !== null
            ) {
                extra.winner =
                    safeString(
                        winner
                    );
            }

            if (mode) {
                extra.mode =
                    mode;
            }
        }

        await trackEvent(
            "game_end",
            {
                game:
                    safeString(game),

                result:
                    finalResult,

                duration,

                ...extra
            }
        );
    }

    async function trackWin(
        game,
        modeOrExtra = {},
        winner = null
    ) {
        let extra = {};

        if (
            modeOrExtra !== null &&
            typeof modeOrExtra ===
                "object"
        ) {
            extra = {
                ...modeOrExtra
            };

        } else {
            extra.mode =
                safeString(
                    modeOrExtra
                );

            if (
                winner !== null
            ) {
                extra.winner =
                    safeString(
                        winner
                    );
            }
        }

        await trackEvent(
            "game_win",
            {
                game:
                    safeString(game),

                ...extra
            }
        );
    }

    async function trackLoss(
        game,
        modeOrExtra = {},
        winner = null
    ) {
        let extra = {};

        if (
            modeOrExtra !== null &&
            typeof modeOrExtra ===
                "object"
        ) {
            extra = {
                ...modeOrExtra
            };

        } else {
            extra.mode =
                safeString(
                    modeOrExtra
                );

            if (
                winner !== null
            ) {
                extra.winner =
                    safeString(
                        winner
                    );
            }
        }

        await trackEvent(
            "game_loss",
            {
                game:
                    safeString(game),

                ...extra
            }
        );
    }

    async function trackDraw(
        game,
        modeOrExtra = {}
    ) {
        let extra = {};

        if (
            modeOrExtra !== null &&
            typeof modeOrExtra ===
                "object"
        ) {
            extra = {
                ...modeOrExtra
            };

        } else {
            extra.mode =
                safeString(
                    modeOrExtra
                );
        }

        await trackEvent(
            "game_draw",
            {
                game:
                    safeString(game),

                ...extra
            }
        );
    }

    async function trackClick(
        target,
        extra = {}
    ) {
        await trackEvent(
            "click",
            {
                target:
                    safeString(
                        target
                    ),

                ...extra
            }
        );
    }

    window.GameAnalytics = {
        init,
        trackEvent,
        trackHubVisit,
        trackGameStart,
        trackGameEnd,
        trackWin,
        trackLoss,
        trackDraw,
        trackClick
    };

    /*
     * Khởi động nhẹ.
     * Không chặn GameHub.
     */
    init();

})();
