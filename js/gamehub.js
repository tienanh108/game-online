(function () {

    "use strict";

    // =========================================================
    // GAMEHUB
    // Firebase / Auth / Presence / Analytics / Game Round
    // =========================================================


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
    // GAME NAME
    // =========================================================

    /*
     * Không lấy GAME_NAME cố định ngay khi file JS vừa tải.
     *
     * Nếu script nằm trong <head>, lúc đó body có thể chưa tồn tại.
     *
     * Vì vậy dùng function để lấy game name sau khi DOM đã sẵn sàng.
     */

    function getGameName() {

        return (
            document.body?.dataset?.game ||
            document.documentElement?.dataset?.game ||
            "unknown"
        );

    }


    // =========================================================
    // STATE
    // =========================================================

    let firebaseApp = null;

    let auth = null;

    let db = null;

    let currentUser = null;


    // =========================================================
    // PRESENCE
    // =========================================================

    let presenceRef = null;

    let heartbeatTimer = null;

    let connectedRef = null;

    let connectedListener = null;


    const presenceSessionId =
        "session_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10);


    // =========================================================
    // GAME ROUND
    // =========================================================

    let roundStartedAt = null;

    let roundFinished = false;

    let roundStartRecorded = false;


    // =========================================================
    // INIT STATE
    // =========================================================

    let initialized = false;

    let resolveReady;

    let rejectReady;


    const ready =
        new Promise(
            (resolve, reject) => {

                resolveReady = resolve;

                rejectReady = reject;

            }
        );


    // =========================================================
    // DOM READY
    // =========================================================

    function waitForDOM() {

        if (
            document.readyState !==
            "loading"
        ) {

            return Promise.resolve();

        }


        return new Promise(
            resolve => {

                document.addEventListener(
                    "DOMContentLoaded",
                    resolve,
                    {
                        once: true
                    }
                );

            }
        );

    }


    // =========================================================
    // VIETNAM DATE
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
                    app.name === APP_NAME
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


        // -----------------------------------------------------
        // LOCAL AUTH PERSISTENCE
        // -----------------------------------------------------

        await auth.setPersistence(
            firebase.auth.Auth.Persistence.LOCAL
        );


        console.log(
            "GameHub Firebase app:",
            firebaseApp.name
        );


        console.log(
            "GameHub Auth persistence: LOCAL"
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
         * Chờ Firebase khôi phục phiên.
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

                                finished = true;

                                unsubscribe();

                                resolve(user);

                            }
                        );

                }
            );


        // -----------------------------------------------------
        // SESSION RESTORED
        // -----------------------------------------------------

        if (restoredUser) {

            currentUser =
                restoredUser;


            console.log(
                "GameHub AUTH RESTORED:"
            );


            console.log(
                "UID:",
                currentUser.uid
            );


            console.log(
                "TYPE:",
                currentUser.isAnonymous
                    ? "GUEST"
                    : "ACCOUNT"
            );


            return currentUser;

        }


        // -----------------------------------------------------
        // CREATE GUEST
        // -----------------------------------------------------

        console.log(
            "GameHub: Không có phiên đăng nhập → tạo Guest."
        );


        const credential =
            await auth.signInAnonymously();


        currentUser =
            credential.user;


        console.log(
            "GameHub NEW GUEST UID:",
            currentUser.uid
        );


        return currentUser;

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


        const game =
            getGameName();


        presenceRef =
            db.ref(
                `presence/${uid}/${presenceSessionId}`
            );


        console.log(
            "GameHub Presence path:",
            `presence/${uid}/${presenceSessionId}`
        );


        // -----------------------------------------------------
        // ON DISCONNECT
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
        // CONNECTION
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
        // HEARTBEAT
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
        // INITIAL PRESENCE
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
                    getGameName(),

                online:
                    true,

                lastSeen:
                    firebase.database
                        .ServerValue
                        .TIMESTAMP

            });


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


        connectedRef = null;

        connectedListener = null;


        if (presenceRef) {

            try {

                await presenceRef.remove();

            } catch (error) {

                console.warn(
                    "GameHub remove presence lỗi:",
                    error
                );

            }


            presenceRef = null;

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
                                getGameName(),

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
                getGameName(),

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
                getGameName(),
                type
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
                getGameName(),

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

        if (
            roundStartedAt !== null &&
            !roundFinished
        ) {

            console.log(
                "GameHub: round đã bắt đầu."
            );


            return null;

        }


        roundStartedAt =
            Date.now();


        roundFinished =
            false;


        roundStartRecorded =
            false;


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


        await updatePresence();


        console.log(
            "GameHub ROUND START:",
            getGameName(),
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
            roundStartedAt === null ||
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


        if (result === "win") {

            eventType =
                "game_win";

        } else if (result === "loss") {

            eventType =
                "game_loss";

        } else if (result === "draw") {

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


        await track(
            eventType,
            commonData
        );


        await track(
            "game_end",
            commonData
        );


        await updatePresence();


        roundStartedAt =
            null;


        roundFinished =
            false;


        roundStartRecorded =
            false;


        console.log(
            "GameHub ROUND END:",
            getGameName(),
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

            /*
             * Đợi DOM trước.
             *
             * Quan trọng để GAME_NAME luôn đúng.
             */

            await waitForDOM();


            // 1. Firebase

            await initFirebase();


            // 2. Presence

            await startPresence();


            // 3. Daily player

            await trackDailyPlayer();


            console.log(
                "================================"
            );


            console.log(
                "GameHub READY"
            );


            console.log(
                "Game:",
                getGameName()
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



        // =====================================================
        // PANEL
        // =====================================================

        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "gamehubGameChatPanel";


        panel.style.cssText = `
            position:fixed !important;

            right:20px !important;
            bottom:82px !important;

            width:390px !important;

            max-width:
                calc(100vw - 30px) !important;

            height:560px !important;

            max-height:
                calc(100vh - 110px) !important;

            display:flex !important;

            flex-direction:column !important;

            background:#071e30 !important;

            color:#fff !important;

            border:
                1px solid
                rgba(80,210,240,.25) !important;

            border-radius:20px !important;

            box-shadow:
                0 25px 70px
                rgba(0,0,0,.6) !important;

            z-index:2147483646 !important;

            opacity:0 !important;

            visibility:hidden !important;

            pointer-events:none !important;

            transform:
                translateY(15px) !important;

            transition:.2s ease !important;

            overflow:hidden !important;
        `;


        // =====================================================
        // PANEL HTML
        // =====================================================

        panel.innerHTML = `

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;

                padding:16px;

                border-bottom:
                    1px solid
                    rgba(255,255,255,.1);
            ">

                <div>

                    <strong style="
                        display:block;
                        font-size:17px;
                        color:#fff;
                    ">
                        💬 GameHub Chat
                    </strong>

                    <span style="
                        display:block;
                        margin-top:3px;
                        font-size:11px;
                        color:#86aebe;
                    ">
                        ${gameTitle}
                    </span>

                </div>


                <button
                    id="gamehubGameChatClose"
                    type="button"
                    style="
                        width:36px;
                        height:36px;

                        border:0;
                        border-radius:10px;

                        background:
                            rgba(255,255,255,.08);

                        color:#fff;

                        cursor:pointer;

                        font-size:17px;
                    "
                >
                    ✕
                </button>

            </div>


            <!-- TABS -->

            <div style="
                display:grid;

                grid-template-columns:
                    1fr 1fr;

                gap:6px;

                padding:8px;

                background:#061827;
            ">

                <button
                    id="gameChatRoomTab"
                    type="button"
                    style="
                        height:42px;

                        border:
                            1px solid
                            rgba(67,215,255,.35);

                        border-radius:10px;

                        background:#087fa5;

                        color:#fff;

                        font-size:14px;

                        font-weight:800;

                        cursor:pointer;
                    "
                >
                    🎮 Phòng
                </button>


                <button
                    id="gameChatGlobalTab"
                    type="button"
                    style="
                        height:42px;

                        border:
                            1px solid
                            rgba(255,255,255,.08);

                        border-radius:10px;

                        background:#0b2638;

                        color:#8da8b6;

                        font-size:14px;

                        font-weight:700;

                        cursor:pointer;
                    "
                >
                    🌐 Chung
                </button>

            </div>


            <!-- MESSAGES -->

            <div
                id="gamehubGameChatMessages"
                style="
                    flex:1;

                    min-height:0;

                    overflow-y:auto;

                    padding:14px;

                    background:
                        linear-gradient(
                            180deg,
                            #092238,
                            #061b2d
                        );

                    font-size:13px;
                "
            >

                <div
                    id="gamehubGameChatEmpty"
                    style="
                        height:100%;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        text-align:center;

                        color:#91b5c4;
                    "
                >

                    <div>

                        <div style="
                            font-size:34px;
                            margin-bottom:10px;
                        ">
                            💬
                        </div>

                        <strong style="
                            display:block;
                            color:#fff;
                            margin-bottom:5px;
                        ">
                            Chưa có tin nhắn
                        </strong>

                        <span>
                            Hãy bắt đầu trò chuyện.
                        </span>

                    </div>

                </div>

            </div>


            <!-- LIMIT -->

            <div
                id="gamehubGameChatLimit"
                style="
                    display:none;

                    padding:6px 12px;

                    background:
                        rgba(255,170,60,.08);

                    color:#ffc477;

                    font-size:11px;

                    text-align:center;
                "
            ></div>


            <!-- INPUT -->

            <div style="
                display:flex;

                gap:8px;

                padding:10px;

                border-top:
                    1px solid
                    rgba(255,255,255,.1);

                background:#071b2b;
            ">

                <input
                    id="gamehubGameChatInput"

                    type="text"

                    maxlength="300"

                    placeholder="Nhập tin nhắn..."

                    autocomplete="off"

                    style="
                        flex:1;

                        min-width:0;

                        height:40px;

                        padding:0 12px;

                        border:
                            1px solid
                            rgba(100,220,255,.18);

                        border-radius:10px;

                        outline:none;

                        background:
                            rgba(255,255,255,.06);

                        color:#fff;

                        font-family:inherit;

                        font-size:13px;
                    "
                >


                <button
                    id="gamehubGameChatSend"
                    type="button"

                    style="
                        width:42px;

                        height:40px;

                        border:0;

                        border-radius:10px;

                        background:#0b91b9;

                        color:#fff;

                        cursor:pointer;

                        font-size:17px;

                        flex-shrink:0;
                    "
                >
                    ➤
                </button>

            </div>

        `;


        document.body.appendChild(
            panel
        );


        // =====================================================
        // ELEMENTS
        // =====================================================

        const closeButton =
            panel.querySelector(
                "#gamehubGameChatClose"
            );


        const roomTab =
            panel.querySelector(
                "#gameChatRoomTab"
            );


        const globalTab =
            panel.querySelector(
                "#gameChatGlobalTab"
            );


        const messages =
            panel.querySelector(
                "#gamehubGameChatMessages"
            );


        const input =
            panel.querySelector(
                "#gamehubGameChatInput"
            );


        const sendButton =
            panel.querySelector(
                "#gamehubGameChatSend"
            );


        const limitNotice =
            panel.querySelector(
                "#gamehubGameChatLimit"
            );


        // =====================================================
        // OPEN / CLOSE
        // =====================================================

        function openChat() {

            panel.style.setProperty(
                "opacity",
                "1",
                "important"
            );


            panel.style.setProperty(
                "visibility",
                "visible",
                "important"
            );


            panel.style.setProperty(
                "pointer-events",
                "auto",
                "important"
            );


            panel.style.setProperty(
                "transform",
                "translateY(0)",
                "important"
            );


            setTimeout(
                () => {

                    input.focus();

                },
                100
            );

        }


        function closeChat() {

            panel.style.setProperty(
                "opacity",
                "0",
                "important"
            );


            panel.style.setProperty(
                "visibility",
                "hidden",
                "important"
            );


            panel.style.setProperty(
                "pointer-events",
                "none",
                "important"
            );


            panel.style.setProperty(
                "transform",
                "translateY(15px)",
                "important"
            );

        }


        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    panel.style.visibility ===
                    "visible"
                ) {

                    closeChat();

                } else {

                    openChat();

                }

            }
        );


        closeButton.addEventListener(
            "click",
            closeChat
        );


        // =====================================================
        // USER PROFILE
        // =====================================================

        let myName =
            currentUser.displayName ||
            "Người chơi";


        let myAvatar =
            currentUser.photoURL ||
            "";


        db.ref(
            "users/" + uid
        )
        .once("value")
        .then(
            snapshot => {

                const user =
                    snapshot.val();


                if (!user) {
                    return;
                }


                myName =
                    user.name ||
                    user.username ||
                    user.displayName ||
                    myName;


                myAvatar =
                    user.avatar ||
                    user.photoURL ||
                    myAvatar;

            }
        )
        .catch(
            error => {

                console.warn(
                    "GameHub Chat profile load:",
                    error
                );

            }
        );


        // =====================================================
        // PROFILE CLICK
        // =====================================================

        function handleProfileClick(
            event
        ) {

            const target =
                event.target.closest(
                    ".game-chat-profile, .game-chat-name"
                );


            if (!target) {
                return;
            }


            const targetUid =
                target.dataset.uid;


            if (!targetUid) {
                return;
            }


            if (
                typeof window.GameHub
                    ?.openProfile ===
                "function"
            ) {

                window.GameHub
                    .openProfile(
                        targetUid
                    );

            } else {

                console.log(
                    "Profile clicked:",
                    targetUid
                );

            }

        }


        messages.addEventListener(
            "click",
            handleProfileClick
        );


        // =====================================================
        // RENDER MESSAGE
        // =====================================================

        function renderMessage(
            message
        ) {

            if (!message) {
                return;
            }


            const empty =
                messages.querySelector(
                    "#gamehubGameChatEmpty"
                );


            if (empty) {
                empty.remove();
            }


            const messageUid =
                String(
                    message.uid || ""
                );


            const name =
                String(
                    message.name ||
                    "Người chơi"
                )
                .slice(0, 30);


            const text =
                String(
                    message.text ||
                    ""
                )
                .slice(0, 300);


            const avatarUrl =
                String(
                    message.avatar ||
                    ""
                );


            const mine =
                messageUid === uid;


            // -------------------------------------------------
            // ROW
            // -------------------------------------------------

            const row =
                document.createElement(
                    "div"
                );


            row.style.cssText = `
                display:flex;

                align-items:flex-start;

                gap:8px;

                width:100%;

                margin-bottom:13px;

                flex-direction:
                    ${mine
                        ? "row-reverse"
                        : "row"};
            `;


            // -------------------------------------------------
            // AVATAR
            // -------------------------------------------------

            const avatarButton =
                document.createElement(
                    "button"
                );


            avatarButton.type =
                "button";


            avatarButton.className =
                "game-chat-profile";


            avatarButton.dataset.uid =
                messageUid;


            avatarButton.title =
                "Xem profile";


            avatarButton.style.cssText = `
                width:34px;

                height:34px;

                padding:0;

                border:1px solid
                    rgba(67,215,255,.35);

                border-radius:50%;

                overflow:hidden;

                flex-shrink:0;

                cursor:pointer;

                background:#087fa5;

                color:#fff;

                font-weight:900;

                font-size:14px;
            `;


            if (
                avatarUrl &&
                /^https?:\/\//i.test(
                    avatarUrl
                )
            ) {

                const img =
                    document.createElement(
                        "img"
                    );


                img.src =
                    avatarUrl;


                img.alt =
                    "";


                img.style.cssText = `
                    width:100%;
                    height:100%;
                    object-fit:cover;
                `;


                avatarButton.innerHTML =
                    "";


                avatarButton.appendChild(
                    img
                );

            } else {

                avatarButton.textContent =
                    (
                        name
                            .trim()
                            .charAt(0)
                            .toUpperCase()
                    ) || "?";

            }


            // -------------------------------------------------
            // CONTENT
            // -------------------------------------------------

            const content =
                document.createElement(
                    "div"
                );


            content.style.cssText = `
                max-width:75%;

                display:flex;

                flex-direction:column;

                align-items:
                    ${mine
                        ? "flex-end"
                        : "flex-start"};
            `;


            // -------------------------------------------------
            // NAME
            // -------------------------------------------------

            const nameButton =
                document.createElement(
                    "button"
                );


            nameButton.type =
                "button";


            nameButton.className =
                "game-chat-name";


            nameButton.dataset.uid =
                messageUid;


            nameButton.textContent =
                mine
                    ? "Bạn"
                    : name;


            nameButton.style.cssText = `
                border:0;

                background:none;

                padding:0 4px;

                margin-bottom:4px;

                color:
                    ${mine
                        ? "#68ddff"
                        : "#9fc1cf"};

                font-size:11px;

                font-weight:800;

                cursor:pointer;
            `;


            // -------------------------------------------------
            // BUBBLE
            // -------------------------------------------------

            const bubble =
                document.createElement(
                    "div"
                );


            bubble.textContent =
                text;


            bubble.style.cssText = `
                padding:9px 12px;

                border-radius:
                    ${mine
                        ? "14px 14px 3px 14px"
                        : "14px 14px 14px 3px"};

                background:
                    ${mine
                        ? "#0b8faf"
                        : "rgba(255,255,255,.09)"};

                color:#fff;

                font-size:13px;

                line-height:1.45;

                word-break:break-word;

                border:
                    1px solid
                    ${mine
                        ? "rgba(67,215,255,.25)"
                        : "rgba(255,255,255,.07)"};
            `;


            content.appendChild(
                nameButton
            );


            content.appendChild(
                bubble
            );


            row.appendChild(
                avatarButton
            );


            row.appendChild(
                content
            );


            messages.appendChild(
                row
            );


            messages.scrollTop =
                messages.scrollHeight;

        }


        // =====================================================
        // EMPTY STATE
        // =====================================================

        function showEmpty() {

            messages.innerHTML = `

                <div
                    id="gamehubGameChatEmpty"
                    style="
                        height:100%;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        text-align:center;

                        color:#91b5c4;
                    "
                >

                    <div>

                        <div style="
                            font-size:34px;
                            margin-bottom:10px;
                        ">
                            💬
                        </div>

                        <strong style="
                            display:block;
                            color:#fff;
                            margin-bottom:5px;
                        ">
                            Chưa có tin nhắn
                        </strong>

                        <span>
                            Hãy bắt đầu trò chuyện.
                        </span>

                    </div>

                </div>

            `;

        }


        // =====================================================
        // LOAD CHAT
        // =====================================================

        function getChatRef() {

            if (
                currentMode ===
                "global"
            ) {

                return db.ref(
                    "chat/global"
                );

            }


            return db.ref(
                "chat/" + game
            );

        }


        function loadChat() {

            // -----------------------------------------------
            // REMOVE OLD LISTENER
            // -----------------------------------------------

            if (
                activeRef &&
                activeListener
            ) {

                activeRef.off(
                    "child_added",
                    activeListener
                );

            }


            activeRef =
                getChatRef();


            activeListener =
                snapshot => {

                    renderMessage(
                        snapshot.val()
                    );

                };


            showEmpty();


            activeRef
                .limitToLast(100)
                .on(
                    "child_added",
                    activeListener
                );

        }


        // =====================================================
        // TAB STYLE
        // =====================================================

        function updateTabs() {

            const activeStyle = {
                background:
                    "#087fa5",

                color:
                    "#fff",

                borderColor:
                    "rgba(67,215,255,.35)"
            };


            const inactiveStyle = {
                background:
                    "#0b2638",

                color:
                    "#8da8b6",

                borderColor:
                    "rgba(255,255,255,.08)"
            };


            const roomActive =
                currentMode ===
                "room";


            Object.assign(
                roomTab.style,
                roomActive
                    ? activeStyle
                    : inactiveStyle
            );


            Object.assign(
                globalTab.style,
                roomActive
                    ? inactiveStyle
                    : activeStyle
            );

        }


        // =====================================================
        // ROOM TAB
        // =====================================================

        roomTab.addEventListener(
            "click",
            () => {

                if (
                    currentMode ===
                    "room"
                ) {
                    return;
                }


                currentMode =
                    "room";


                updateTabs();

                loadChat();

            }
        );


        // =====================================================
        // GLOBAL TAB
        // =====================================================

        globalTab.addEventListener(
            "click",
            () => {

                if (
                    currentMode ===
                    "global"
                ) {
                    return;
                }


                currentMode =
                    "global";


                updateTabs();

                loadChat();

            }
        );


        // =====================================================
        // RATE LIMIT
        // =====================================================

        function showLimit(
            text
        ) {

            limitNotice.textContent =
                text;


            limitNotice.style.display =
                "block";


            clearTimeout(
                showLimit.timer
            );


            showLimit.timer =
                setTimeout(
                    () => {

                        limitNotice.style.display =
                            "none";

                    },
                    2500
                );

        }


        function canSend() {

            const now =
                Date.now();


            // 1.2 giây / tin

            if (
                now -
                lastMessageTime <
                1200
            ) {

                showLimit(
                    "Bạn đang gửi quá nhanh."
                );


                return false;

            }


            // 10 tin / 60 giây

            sentTimes =
                sentTimes.filter(
                    time =>
                        now - time <
                        60000
                );


            if (
                sentTimes.length >=
                10
            ) {

                showLimit(
                    "Bạn đã gửi quá nhiều tin. Hãy chờ một chút."
                );


                return false;

            }


            return true;

        }


        // =====================================================
        // SEND MESSAGE
        // =====================================================

        async function sendMessage() {

            const text =
                input.value.trim();


            if (!text) {
                return;
            }


            if (
                text.length >
                300
            ) {

                showLimit(
                    "Tin nhắn tối đa 300 ký tự."
                );


                return;

            }


            if (!canSend()) {
                return;
            }


            const cleanText =
                text
                    .replace(
                        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
                        ""
                    )
                    .trim();


            if (!cleanText) {
                return;
            }


            const now =
                Date.now();


            const message = {

                uid:
                    uid,

                name:
                    String(
                        myName ||
                        "Người chơi"
                    ).slice(0, 30),

                avatar:
                    String(
                        myAvatar ||
                        ""
                    ),

                text:
                    cleanText.slice(
                        0,
                        300
                    ),

                createdAt:
                    firebase.database
                        .ServerValue
                        .TIMESTAMP

            };


            try {

                /*
                 * Quan trọng:
                 * gửi vào chat/global hoặc chat/{game}
                 * tùy tab hiện tại.
                 */

                await getChatRef()
                    .push(
                        message
                    );


                lastMessageTime =
                    now;


                sentTimes.push(
                    now
                );


                input.value =
                    "";


                input.focus();


            } catch (error) {

                console.error(
                    "GameHub Chat send error:",
                    error
                );


                if (
                    error?.code ===
                    "PERMISSION_DENIED"
                ) {

                    showLimit(
                        "Firebase Rules chưa cho phép Chat."
                    );

                } else {

                    showLimit(
                        "Không thể gửi tin nhắn."
                    );

                }

            }

        }


        sendButton.addEventListener(
            "click",
            sendMessage
        );


        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );


        // =====================================================
        // CHAT CSS
        // =====================================================

        if (
            !document.getElementById(
                "gamehubGameChatStyle"
            )
        ) {

            const style =
                document.createElement(
                    "style"
                );


            style.id =
                "gamehubGameChatStyle";


            style.textContent = `

                #gamehubGameChatMessages::-webkit-scrollbar {
                    width:5px;
                }


                #gamehubGameChatMessages::-webkit-scrollbar-thumb {
                    background:
                        rgba(67,215,255,.25);

                    border-radius:999px;
                }


                #gamehubGameChatInput::placeholder {
                    color:#7894a2;
                }


                #gamehubGameChatInput:focus {
                    border-color:
                        rgba(67,215,255,.5) !important;

                    box-shadow:
                        0 0 0 2px
                        rgba(67,215,255,.08);
                }


                #gamehubGameChatButton:hover {
                    filter:brightness(1.08);
                    transform:translateY(-1px);
                }


                #gamehubGameChatButton {
                    transition:
                        .15s ease;
                }


                @media (max-width:600px) {

                    #gamehubGameChatPanel {

                        right:8px !important;

                        left:8px !important;

                        bottom:78px !important;

                        width:auto !important;

                        height:
                            calc(100vh - 100px)
                            !important;

                        max-height:none !important;

                        border-radius:
                            18px !important;

                    }


                    #gamehubGameChatButton {

                        right:14px !important;

                        bottom:14px !important;

                    }

                }

            `;


            document.head.appendChild(
                style
            );

        }


        // =====================================================
        // INITIAL LOAD
        // =====================================================

        updateTabs();

        loadChat();


        console.log(
            "GameHub Chat: CREATED",
            game
        );

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

            return getGameName();

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
    // START CHAT AFTER GAMEHUB READY
    // =========================================================

    /*
     * Không gọi Firebase Chat trước khi Auth xong.
     *
     * Đây là một trong những lỗi lớn của file cũ.
     */



    // =========================================================
    // PAGE CLOSE
    // =========================================================

    window.addEventListener(
        "pagehide",
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
