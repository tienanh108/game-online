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

    let sessionStart = Date.now();

    let analyticsInitPromise = null;

    const SESSION_ID =
        "session_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2, 10);

    /* =====================================================
       DEVICE
       ===================================================== */

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

    /* =====================================================
       PLATFORM
       ===================================================== */

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

    /* =====================================================
       DATE
       ===================================================== */

    function getToday() {
        const d = new Date();

        const year = d.getFullYear();

        const month =
            String(
                d.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                d.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    /* =====================================================
       SAFE STRING
       ===================================================== */

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

    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function init() {

        if (
            initialized
        ) {
            return true;
        }

        /*
         * Nếu init đang chạy thì chờ Promise hiện tại.
         */
        if (
            analyticsInitPromise
        ) {
            return analyticsInitPromise;
        }

        analyticsInitPromise =
            (async function () {

                /*
                 * Firebase SDK chưa tải.
                 */
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
                     * Dùng Firebase app hiện có.
                     *
                     * Trên Caro:
                     * firebase.js đã khởi tạo app trước.
                     *
                     * Trên GameHub:
                     * analytics.js tự khởi tạo app.
                     */
                    if (
                        firebase.apps &&
                        firebase.apps.length > 0
                    ) {
                        /*
                         * App đã tồn tại.
                         */
                    } else {

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
                     * Nếu firebase.js đã cung cấp
                     * ensureFirebaseAuthenticated(),
                     * dùng chung Authentication đó.
                     *
                     * Không tự signInAnonymously()
                     * thêm một lần nữa.
                     */
                    if (
                        typeof window.ensureFirebaseAuthenticated ===
                        "function"
                    ) {

                        user =
                            await window.ensureFirebaseAuthenticated();

                    } else {

                        /*
                         * Trường hợp chạy Analytics
                         * độc lập trên GameHub.
                         */
                        if (
                            auth.currentUser
                        ) {

                            user =
                                auth.currentUser;

                        } else {

                            /*
                             * Chỉ khi không có
                             * firebase.js quản lý Auth
                             * mới tự đăng nhập.
                             */
                            user =
                                (
                                    await auth.signInAnonymously()
                                ).user;
                        }
                    }

                    /*
                     * Lấy user hiện tại nếu cần.
                     */
                    if (
                        !user &&
                        auth.currentUser
                    ) {
                        user =
                            auth.currentUser;
                    }

                    if (
                        !user
                    ) {

                        console.warn(
                            "GameAnalytics: Không có Firebase user."
                        );

                        return false;
                    }

                    initialized =
                        true;

                    return true;

                } catch (error) {

                    console.warn(
                        "GameAnalytics init error:",
                        error
                    );

                    return false;
                }

            })();

        try {

            return await analyticsInitPromise;

        } finally {

            analyticsInitPromise =
                null;
        }
    }

    /* =====================================================
       TRACK EVENT
       ===================================================== */

    async function trackEvent(
        type,
        data = {}
    ) {

        if (
            !initialized
        ) {

            const ok =
                await init();

            if (
                !ok
            ) {
                return;
            }
        }

        /*
         * Đồng bộ lại user nếu Firebase
         * vừa xác thực xong.
         */
        if (
            !user &&
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

        /*
         * Không cho data ghi đè uid.
         */
        const safeData = {
            ...data
        };

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

    /* =====================================================
       HUB VISIT
       ===================================================== */

    async function trackHubVisit() {

        await trackEvent(
            "hub_visit"
        );
    }

    /* =====================================================
       GAME START
       ===================================================== */

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

    /* =====================================================
       GAME END
       ===================================================== */

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
             * main.js:
             *
             * trackGameEnd(
             *   game,
             *   mode,
             *   duration,
             *   result,
             *   winner
             * )
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

            if (
                mode
            ) {

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

    /* =====================================================
       WIN
       ===================================================== */

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

    /* =====================================================
       LOSS
       ===================================================== */

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

    /* =====================================================
       DRAW
       ===================================================== */

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

    /* =====================================================
       CLICK
       ===================================================== */

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

    /* =====================================================
       GLOBAL API
       ===================================================== */

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

    /* =====================================================
       AUTO INIT
       ===================================================== */

    init();

})();
