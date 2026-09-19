/* =========================================================
   GAMEHUB — HUB.JS
   Firebase + Lobby Presence + Public Statistics + Music
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       BASIC ELEMENTS
    ===================================================== */

    const yearElement =
        document.querySelector("#year");

    const filterButtons =
        document.querySelectorAll(".filter-button");


    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }


    /* =====================================================
       FIREBASE CONFIG
    ===================================================== */

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


    /* =====================================================
       FIREBASE STATE
    ===================================================== */

    let firebaseApp = null;
    let database = null;
    let auth = null;
    let currentUser = null;

    let firebaseReady = false;
    let authReady = false;

    let lobbyPresenceRef = null;
    let lobbyHeartbeat = null;

    let lobbyConnectedRef = null;
    let lobbyConnectedListener = null;


    /*
     * Mỗi tab GameHub có một session riêng.
     *
     * Ví dụ:
     *
     * presence/
     *   UID/
     *     hub_xxxxx/
     *       game: "hub"
     *
     * Nhờ vậy GameHub không ghi đè
     * presence của Flappy / Chess / Caro.
     */

    const lobbySessionId =
        "hub_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10);


    /* =====================================================
       HELPERS
    ===================================================== */

    function formatNumber(number) {

        return Number(
            number || 0
        ).toLocaleString("vi-VN");

    }


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


    function getLastSevenDates() {

        const dates = [];

        const now =
            new Date(
                new Date().toLocaleString(
                    "en-US",
                    {
                        timeZone:
                            "Asia/Ho_Chi_Minh"
                    }
                )
            );


        for (
            let i = 6;
            i >= 0;
            i--
        ) {

            const date =
                new Date(now);


            date.setDate(
                date.getDate() - i
            );


            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");


            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");


            dates.push(
                `${year}-${month}-${day}`
            );

        }


        return dates;

    }


    function formatShortDate(
        dateString
    ) {

        const parts =
            dateString.split("-");


        if (
            parts.length !== 3
        ) {

            return dateString;

        }


        return (
            parts[2] +
            "/" +
            parts[1]
        );

    }


    /* =====================================================
       FIREBASE DATABASE INIT
    ===================================================== */

    async function initFirebaseDatabase() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            console.error(
                "GameHub: Firebase SDK chưa được tải."
            );

            return false;

        }


        try {

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


            database =
                firebaseApp.database();


            firebaseReady =
                true;


            console.log(
                "GameHub Firebase Database: READY"
            );


            return true;

        } catch (error) {

            console.error(
                "GameHub Firebase Database ERROR:",
                error
            );


            firebaseReady =
                false;


            return false;

        }

    }


    /* =====================================================
       ANONYMOUS AUTH
    ===================================================== */

    async function setupAnonymousAuth() {

        if (!firebaseApp) {
            return false;
        }


        try {

            auth =
                firebaseApp.auth();


            if (
                auth.currentUser
            ) {

                currentUser =
                    auth.currentUser;

            } else {

                const credential =
                    await auth.signInAnonymously();


                currentUser =
                    credential.user;

            }


            authReady =
                true;


            console.log(
                "GameHub Anonymous Auth: READY"
            );


            console.log(
                "GameHub UID:",
                currentUser.uid
            );


            return true;

        } catch (error) {

            authReady =
                false;


            console.warn(
                "GameHub Anonymous Auth ERROR:",
                error
            );


            return false;

        }

    }


    /* =====================================================
       LOBBY PRESENCE
    ===================================================== */

    async function updateLobbyPresence() {

        if (
            !lobbyPresenceRef ||
            !currentUser
        ) {

            return;

        }


        try {

            await lobbyPresenceRef.set({

                uid:
                    currentUser.uid,

                sessionId:
                    lobbySessionId,

                game:
                    "hub",

                online:
                    true,

                lastSeen:
                    firebase.database
                        .ServerValue
                        .TIMESTAMP

            });


            console.log(
                "GameHub lobby presence: ONLINE",
                lobbySessionId
            );

        } catch (error) {

            console.warn(
                "GameHub lobby presence update lỗi:",
                error
            );

        }

    }


    async function setupLobbyPresence() {

        if (
            !firebaseReady ||
            !authReady ||
            !currentUser
        ) {

            return;

        }


        const uid =
            currentUser.uid;


        /*
         * QUAN TRỌNG:
         *
         * Không còn:
         *
         * presence/{uid}
         *
         * Mà dùng:
         *
         * presence/{uid}/{sessionId}
         */

        lobbyPresenceRef =
            database.ref(
                `presence/${uid}/${lobbySessionId}`
            );


        /*
         * Đăng ký onDisconnect trước
         * khi set online.
         */

        try {

            await lobbyPresenceRef
                .onDisconnect()
                .remove();


            console.log(
                "GameHub lobby onDisconnect: OK"
            );

        } catch (error) {

            console.warn(
                "GameHub lobby onDisconnect lỗi:",
                error
            );

        }


        /*
         * Theo dõi kết nối Firebase.
         */

        lobbyConnectedRef =
            database.ref(
                ".info/connected"
            );


        lobbyConnectedListener =
            lobbyConnectedRef.on(
                "value",
                async snapshot => {

                    const connected =
                        snapshot.val() === true;


                    if (!connected) {

                        return;

                    }


                    try {

                        await lobbyPresenceRef
                            .onDisconnect()
                            .remove();


                        await updateLobbyPresence();

                    } catch (error) {

                        console.warn(
                            "GameHub lobby reconnect lỗi:",
                            error
                        );

                    }

                }
            );


        /*
         * Heartbeat mỗi 20 giây.
         */

        if (lobbyHeartbeat) {

            clearInterval(
                lobbyHeartbeat
            );

        }


        lobbyHeartbeat =
            setInterval(
                () => {

                    updateLobbyPresence();

                },
                20000
            );


        /*
         * Ghi presence ngay.
         */

        await updateLobbyPresence();

    }


    /* =====================================================
       ONLINE UI
    ===================================================== */

    function updateOnlineUI(
        users
    ) {

        /*
         * users ở đây là danh sách
         * các session đang online.
         *
         * Một UID có thể có nhiều session,
         * nhưng tổng người sẽ được tính
         * theo UID duy nhất.
         */

        const uniqueUsers =
            new Set();


        users.forEach(
            user => {

                if (
                    user &&
                    user.uid
                ) {

                    uniqueUsers.add(
                        user.uid
                    );

                }

            }
        );


        const count =
            uniqueUsers.size;


        const onlineNumber =
            document.querySelector(
                "#onlineNumber"
            );


        const analyticsOnline =
            document.querySelector(
                "#analyticsOnline"
            );


        if (onlineNumber) {

            onlineNumber.textContent =
                count;

        }


        if (analyticsOnline) {

            analyticsOnline.textContent =
                formatNumber(
                    count
                );

        }

    }


    /* =====================================================
       GAME ONLINE COUNTS
    ===================================================== */

    function updateGameOnlineUI(
        users
    ) {

        /*
         * Dùng Set để một UID chỉ được
         * tính một lần cho mỗi game.
         *
         * Ví dụ:
         *
         * UID A
         * ├── Flappy tab 1
         * └── Flappy tab 2
         *
         * => Flappy = 1 người
         */

        const gameUsers = {

            caro5:
                new Set(),

            flappy:
                new Set(),

            chess:
                new Set()

        };


        users.forEach(
            user => {

                if (
                    !user ||
                    !user.game ||
                    !user.uid
                ) {

                    return;

                }


                if (
                    gameUsers[
                        user.game
                    ]
                ) {

                    gameUsers[
                        user.game
                    ].add(
                        user.uid
                    );

                }

            }
        );


        Object.keys(
            gameUsers
        ).forEach(
            gameId => {

                const element =
                    document.querySelector(
                        `[data-game-online="${gameId}"]`
                    );


                if (!element) {

                    return;

                }


                element.textContent =
                    gameUsers[
                        gameId
                    ].size;

            }
        );

    }


    /* =====================================================
       PRESENCE LISTENER
    ===================================================== */

    function setupPresenceListener() {

        if (!firebaseReady) {

            return;

        }


        const presenceRef =
            database.ref(
                "presence"
            );


        presenceRef.on(

            "value",

            snapshot => {

                const data =
                    snapshot.val() || {};


                const users = [];


                /*
                 * Cấu trúc Presence mới:
                 *
                 * presence
                 *   └── uid
                 *       └── sessionId
                 *           ├── uid
                 *           ├── game
                 *           ├── online
                 *           └── lastSeen
                 *
                 */


                Object.keys(
                    data
                ).forEach(
                    uid => {

                        const sessions =
                            data[
                                uid
                            ];


                        if (
                            !sessions ||
                            typeof sessions !==
                            "object"
                        ) {

                            return;

                        }


                        /*
                         * Hỗ trợ cả dữ liệu cũ:
                         *
                         * presence/{uid}
                         *
                         * Nếu node trực tiếp có
                         * game/online thì xử lý
                         * như một session cũ.
                         */

                        if (
                            sessions.game ||
                            sessions.online !==
                            undefined
                        ) {

                            if (
                                sessions.online === true ||
                                sessions.game
                            ) {

                                users.push({

                                    uid:
                                        uid,

                                    sessionId:
                                        "legacy",

                                    game:
                                        sessions.game ||
                                        "unknown",

                                    online:
                                        true,

                                    lastSeen:
                                        sessions.lastSeen ||
                                        0

                                });

                            }


                            return;

                        }


                        /*
                         * Cấu trúc session mới.
                         */

                        Object.keys(
                            sessions
                        ).forEach(
                            sessionId => {

                                const session =
                                    sessions[
                                        sessionId
                                    ];


                                if (
                                    !session ||
                                    typeof session !==
                                    "object"
                                ) {

                                    return;

                                }


                                if (
                                    session.online !==
                                    true
                                ) {

                                    return;

                                }


                                users.push({

                                    uid:
                                        uid,

                                    sessionId:
                                        sessionId,

                                    game:
                                        session.game ||
                                        "unknown",

                                    online:
                                        true,

                                    lastSeen:
                                        session.lastSeen ||
                                        0

                                });

                            }
                        );

                    }
                );


                /*
                 * Tổng người online.
                 */

                updateOnlineUI(
                    users
                );


                /*
                 * Người đang chơi từng game.
                 */

                updateGameOnlineUI(
                    users
                );


                console.log(
                    "GameHub online sessions:",
                    users.length
                );


                console.log(
                    "GameHub online users:",
                    [
                        ...new Set(
                            users.map(
                                user =>
                                    user.uid
                            )
                        )
                    ].length
                );


                console.log(
                    "GameHub online games:",
                    users.map(
                        user =>
                            `${user.game} (${user.uid})`
                    )
                );

            },

            error => {

                console.error(
                    "GameHub presence error:",
                    error
                );

            }

        );

    }


    /* =====================================================
       DAILY PLAYERS
    ===================================================== */

    function setupDailyPlayersListener() {

        if (!firebaseReady) {
            return;
        }


        const date =
            getVietnamDate();


        const playersRef =
            database.ref(
                `analytics/daily/${date}/players`
            );


        playersRef.on(

            "value",

            snapshot => {

                const data =
                    snapshot.val() || {};


                const count =
                    Object.keys(
                        data
                    ).length;


                const analyticsPlayers =
                    document.querySelector(
                        "#analyticsPlayersToday"
                    );


                if (analyticsPlayers) {

                    analyticsPlayers.textContent =
                        formatNumber(
                            count
                        );

                }


                console.log(
                    "GameHub players today:",
                    count
                );

            },

            error => {

                console.error(
                    "GameHub daily players ERROR:",
                    error
                );

            }

        );

    }


    /* =====================================================
       PUBLIC GAME CONFIG
    ===================================================== */

    const PUBLIC_GAME_CONFIG = {

        caro5: {

            name:
                "Caro 5",

            icon:
                "✕"

        },

        flappy: {

            name:
                "Flappy Bird",

            icon:
                "🐦"

        },

        chess: {

            name:
                "Cờ vua",

            icon:
                "♞"

        },

        snake: {

            name:
                "Snake",

            icon:
                "🐍"

        },

        ludo: {

            name:
                "Cờ cá ngựa",

            icon:
                "🎲"

        }

    };


    function getGameName(
        gameId
    ) {

        return PUBLIC_GAME_CONFIG[
            gameId
        ]
            ? PUBLIC_GAME_CONFIG[
                gameId
            ].name
            : gameId || "Game";

    }


    function getGameIcon(
        gameId
    ) {

        return PUBLIC_GAME_CONFIG[
            gameId
        ]
            ? PUBLIC_GAME_CONFIG[
                gameId
            ].icon
            : "🎮";

    }


    /* =====================================================
       GET GAME ID FROM PLAY
    ===================================================== */

    function getPlayGameId(
        play
    ) {

        if (!play) {
            return "";
        }


        return (
            play.gameId ||
            play.game_id ||
            play.game ||
            play.gameID ||
            ""
        );

    }


    /* =====================================================
       RENDER GAME STATISTICS
    ===================================================== */

    function renderAnalyticsGames(
        gameCounts
    ) {

        const container =
            document.querySelector(
                "#analyticsGames"
            );


        if (!container) {
            return;
        }


        const entries =
            Object.entries(
                gameCounts
            );


        entries.sort(
            (a, b) =>
                b[1] - a[1]
        );


        if (!entries.length) {

            container.innerHTML = `

                <div class="analytics-loading">
                    Chưa có lượt chơi nào.
                </div>

            `;

            return;

        }


        container.innerHTML =
            "";


        entries.forEach(
            ([gameId, count]) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "analytics-game-row";


                row.innerHTML = `

                    <div class="analytics-game-icon">
                        ${getGameIcon(gameId)}
                    </div>

                    <div class="analytics-game-name">

                        <strong>
                            ${getGameName(gameId)}
                        </strong>

                        <span>
                            Lượt chơi đã ghi nhận
                        </span>

                    </div>

                    <strong class="analytics-game-count">
                        ${formatNumber(count)}
                    </strong>

                `;


                container.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       RENDER 7 DAY CHART
    ===================================================== */

    function renderAnalyticsChart(
        dailyResults
    ) {

        const chart =
            document.querySelector(
                "#analyticsChart"
            );


        if (!chart) {
            return;
        }


        const max =
            Math.max(
                ...dailyResults.map(
                    item =>
                        item.plays
                ),
                1
            );


        chart.innerHTML =
            "";


        dailyResults.forEach(
            item => {

                const column =
                    document.createElement(
                        "div"
                    );


                column.className =
                    "analytics-bar-column";


                const value =
                    document.createElement(
                        "span"
                    );


                value.className =
                    "analytics-bar-value";


                value.textContent =
                    formatNumber(
                        item.plays
                    );


                const bar =
                    document.createElement(
                        "div"
                    );


                bar.className =
                    "analytics-bar";


                const height =
                    Math.max(
                        4,
                        Math.round(
                            (
                                item.plays /
                                max
                            ) * 150
                        )
                    );


                bar.style.height =
                    `${height}px`;


                const date =
                    document.createElement(
                        "span"
                    );


                date.className =
                    "analytics-bar-date";


                date.textContent =
                    formatShortDate(
                        item.date
                    );


                column.appendChild(
                    value
                );

                column.appendChild(
                    bar
                );

                column.appendChild(
                    date
                );


                chart.appendChild(
                    column
                );

            }
        );

    }


    /* =====================================================
       PUBLIC ANALYTICS
    ===================================================== */

    async function setupPublicAnalytics() {

        if (!firebaseReady) {

            return;

        }


        const chart =
            document.querySelector(
                "#analyticsChart"
            );


        const gamesContainer =
            document.querySelector(
                "#analyticsGames"
            );


        const totalElement =
            document.querySelector(
                "#analyticsTotalPlays"
            );


        try {

            const snapshot =
                await database
                    .ref(
                        "analytics/daily"
                    )
                    .once(
                        "value"
                    );


            const dailyData =
                snapshot.val() || {};


            let totalPlays =
                0;


            const gameCounts =
                {};


            Object.keys(
                dailyData
            ).forEach(
                date => {

                    const day =
                        dailyData[
                            date
                        ] || {};


                    const plays =
                        day.plays || {};


                    Object.values(
                        plays
                    ).forEach(
                        play => {

                            totalPlays++;


                            const gameId =
                                getPlayGameId(
                                    play
                                );


                            if (!gameId) {
                                return;
                            }


                            gameCounts[
                                gameId
                            ] =
                                (
                                    gameCounts[
                                        gameId
                                    ] || 0
                                ) + 1;

                        }
                    );

                }
            );


            if (totalElement) {

                totalElement.textContent =
                    formatNumber(
                        totalPlays
                    );

            }


            renderAnalyticsGames(
                gameCounts
            );


            const dates =
                getLastSevenDates();


            const chartData =
                dates.map(
                    date => {

                        const day =
                            dailyData[
                                date
                            ] || {};


                        const plays =
                            day.plays || {};


                        return {

                            date,

                            plays:
                                Object.keys(
                                    plays
                                ).length

                        };

                    }
                );


            renderAnalyticsChart(
                chartData
            );


            const status =
                document.querySelector(
                    ".analytics-live"
                );


            if (status) {

                status.innerHTML = `

                    <span class="analytics-live-dot"></span>
                    DỮ LIỆU TRỰC TIẾP

                `;

            }


            console.log(
                "GameHub total plays:",
                totalPlays
            );


            console.log(
                "GameHub game counts:",
                gameCounts
            );

        } catch (error) {

            console.error(
                "GameHub Analytics ERROR:",
                error
            );


            if (chart) {

                chart.innerHTML = `

                    <div class="analytics-error">
                        Không thể tải dữ liệu thống kê.
                    </div>

                `;

            }


            if (gamesContainer) {

                gamesContainer.innerHTML = `

                    <div class="analytics-error">
                        Không thể tải dữ liệu Firebase.
                    </div>

                `;

            }

        }

    }


    /* =====================================================
       GAME STATS
    ===================================================== */

    function setupGameStats() {

        if (!firebaseReady) {
            return;
        }


        const statsRef =
            database.ref(
                "gameStats"
            );


        statsRef.on(

            "value",

            snapshot => {

                const data =
                    snapshot.val() || {};


                Object.keys(
                    data
                ).forEach(
                    gameId => {

                        const card =
                            document.querySelector(
                                `.game-card[data-game-id="${gameId}"]`
                            );


                        if (!card) {
                            return;
                        }


                        const value =
                            data[
                                gameId
                            ];


                        if (
                            typeof value ===
                            "object" &&
                            value.playCount !==
                            undefined
                        ) {

                            card.dataset.playCount =
                                value.playCount;

                        }

                    }
                );


                updatePopularBadge();

            },

            error => {

                console.warn(
                    "GameStats error:",
                    error
                );

            }

        );

    }


    /* =====================================================
       START FIREBASE
    ===================================================== */

    async function setupFirebaseStats() {

        const databaseSuccess =
            await initFirebaseDatabase();


        if (!databaseSuccess) {
            return;
        }


        setupPublicAnalytics();

        setupDailyPlayersListener();


        const authSuccess =
            await setupAnonymousAuth();


        if (!authSuccess) {

            console.warn(
                "GameHub: Anonymous Auth thất bại."
            );

            return;

        }


        await setupLobbyPresence();


        setupPresenceListener();


        setupGameStats();

    }


    setupFirebaseStats();


    /* =====================================================
       HUB MUSIC
    ===================================================== */

    const HUB_MUSIC_KEY =
        "gamehub_music_enabled";


    const HUB_MUSIC_PATH =
        "./assets/sounds/hub-bgm.mp3";


    let hubMusic = null;


    let musicEnabled =
        localStorage.getItem(
            HUB_MUSIC_KEY
        ) !== "false";


    function speakerOnSVG() {

        return `

            <svg
                class="hub-sound-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >

                <polygon
                    points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                ></polygon>

                <path
                    d="M15.5 8.5a5 5 0 0 1 0 7"
                ></path>

                <path
                    d="M18.5 5.5a9 9 0 0 1 0 13"
                ></path>

            </svg>

        `;

    }


    function speakerOffSVG() {

        return `

            <svg
                class="hub-sound-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >

                <polygon
                    points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                ></polygon>

                <line
                    x1="23"
                    y1="9"
                    x2="17"
                    y2="15"
                ></line>

                <line
                    x1="17"
                    y1="9"
                    x2="23"
                    y2="15"
                ></line>

            </svg>

        `;

    }


    function createSoundButtonIfNeeded() {

        let button =
            document.querySelector(
                "[data-hub-sound-toggle]"
            );


        if (button) {
            return button;
        }


        const actions =
            document.querySelector(
                ".topbar-actions"
            );


        if (!actions) {
            return null;
        }


        button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "hub-sound-toggle";


        button.setAttribute(
            "data-hub-sound-toggle",
            ""
        );


        button.setAttribute(
            "aria-label",
            "Bật hoặc tắt nhạc"
        );


        button.title =
            "Bật / tắt nhạc";


        actions.appendChild(
            button
        );


        return button;

    }


    function setupHubMusic() {

        const soundButton =
            createSoundButtonIfNeeded();


        if (!soundButton) {

            console.warn(
                "GameHub: Không tìm thấy topbar-actions."
            );

            return;

        }


        hubMusic =
            new Audio(
                HUB_MUSIC_PATH
            );


        hubMusic.loop =
            true;


        hubMusic.volume =
            0.25;


        function updateSoundButton() {

            if (musicEnabled) {

                soundButton.innerHTML =
                    speakerOnSVG();


                soundButton.classList.add(
                    "sound-on"
                );


                soundButton.classList.remove(
                    "sound-off"
                );


                soundButton.setAttribute(
                    "aria-label",
                    "Tắt nhạc"
                );


                soundButton.title =
                    "Tắt nhạc";

            } else {

                soundButton.innerHTML =
                    speakerOffSVG();


                soundButton.classList.add(
                    "sound-off"
                );


                soundButton.classList.remove(
                    "sound-on"
                );


                soundButton.setAttribute(
                    "aria-label",
                    "Bật nhạc"
                );


                soundButton.title =
                    "Bật nhạc";

            }

        }


        async function playMusic() {

            if (
                !musicEnabled ||
                !hubMusic
            ) {

                return;

            }


            try {

                await hubMusic.play();

            } catch (error) {

                /*
                 * Safari/iPhone có thể chặn autoplay.
                 */

            }

        }


        soundButton.addEventListener(

            "click",

            async event => {

                event.preventDefault();
                event.stopPropagation();


                musicEnabled =
                    !musicEnabled;


                localStorage.setItem(
                    HUB_MUSIC_KEY,
                    String(
                        musicEnabled
                    )
                );


                updateSoundButton();


                if (musicEnabled) {

                    await playMusic();

                } else {

                    hubMusic.pause();

                }

            }

        );


        const startAfterInteraction =
            async () => {

                if (musicEnabled) {

                    await playMusic();

                }

            };


        [
            "pointerdown",
            "touchstart",
            "keydown"
        ].forEach(
            eventName => {

                document.addEventListener(
                    eventName,
                    startAfterInteraction,
                    {
                        once: true,
                        passive: true
                    }
                );

            }
        );


        document.addEventListener(

            "visibilitychange",

            () => {

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    if (hubMusic) {
                        hubMusic.pause();
                    }

                } else {

                    playMusic();

                }

            }

        );


        window.addEventListener(

            "pagehide",

            () => {

                if (hubMusic) {
                    hubMusic.pause();
                }

            }

        );


        updateSoundButton();

        playMusic();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            setupHubMusic
        );

    } else {

        setupHubMusic();

    }


    /* =====================================================
       GAME CONFIG
    ===================================================== */

    const GAME_CONFIG = {

        caro5: {

            name:
                "Caro 5",

            url:
                "./games/caro5/index.html"

        },

        flappy: {

            name:
                "Flappy Bird",

            url:
                "./games/flappy/index.html"

        },

        chess: {

            name:
                "Cờ vua",

            url:
                "./games/chess/index.html"

        },

        snake: {

            name:
                "Snake",

            url:
                "#"

        },

        ludo: {

            name:
                "Cờ cá ngựa",

            url:
                "#"

        }

    };


    /* =====================================================
       GAME ID
    ===================================================== */

    function getGameId(
        card
    ) {

        return (
            card.dataset.gameId ||
            card.dataset.id ||
            ""
        );

    }


    /* =====================================================
       FILTER
    ===================================================== */

    filterButtons.forEach(

        button => {

            button.addEventListener(

                "click",

                () => {

                    filterButtons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    const filter =
                        button.dataset.filter;


                    const cards =
                        document.querySelectorAll(
                            ".game-card"
                        );


                    cards.forEach(
                        card => {

                            const status =
                                card.dataset.game;


                            let shouldShow =
                                true;


                            if (
                                filter ===
                                "all"
                            ) {

                                shouldShow =
                                    true;

                            } else if (
                                filter ===
                                "available"
                            ) {

                                shouldShow =
                                    status ===
                                    "available";

                            } else if (
                                filter ===
                                "soon"
                            ) {

                                shouldShow =
                                    status ===
                                    "soon";

                            }


                            if (
                                shouldShow
                            ) {

                                card.classList.remove(
                                    "hidden"
                                );

                            } else {

                                card.classList.add(
                                    "hidden"
                                );

                            }

                        }
                    );

                }

            );

        }

    );


    /* =====================================================
       TOUCH FEEDBACK
    ===================================================== */

    document.addEventListener(

        "pointerdown",

        event => {

            const target =
                event.target.closest(
                    "a, button"
                );


            if (!target) {
                return;
            }


            target.classList.add(
                "pressed"
            );


            setTimeout(
                () => {

                    target.classList.remove(
                        "pressed"
                    );

                },
                120
            );

        }

    );


    /* =====================================================
       LOCAL PLAY COUNT
    ===================================================== */

    const PLAY_COUNT_PREFIX =
        "gamehub_play_count_";


    function getPlayCount(
        gameId
    ) {

        const key =
            PLAY_COUNT_PREFIX +
            gameId;


        return Number(
            localStorage.getItem(
                key
            ) || 0
        );

    }


    function increasePlayCount(
        gameId
    ) {

        const key =
            PLAY_COUNT_PREFIX +
            gameId;


        const current =
            getPlayCount(
                gameId
            );


        const next =
            current + 1;


        localStorage.setItem(
            key,
            String(next)
        );


        return next;

    }


    function loadPlayCounts() {

        const cards =
            document.querySelectorAll(
                ".game-card"
            );


        cards.forEach(
            card => {

                const gameId =
                    getGameId(
                        card
                    );


                if (!gameId) {
                    return;
                }


                const count =
                    getPlayCount(
                        gameId
                    );


                card.dataset.playCount =
                    String(
                        count
                    );

            }
        );

    }


    loadPlayCounts();


    /* =====================================================
       PLAY BUTTON TRACKING
    ===================================================== */

    document.addEventListener(

        "click",

        event => {

            const link =
                event.target.closest(
                    "a"
                );


            if (!link) {
                return;
            }


            const card =
                link.closest(
                    ".game-card"
                );


            if (!card) {
                return;
            }


            const gameId =
                getGameId(
                    card
                );


            if (!gameId) {
                return;
            }


            increasePlayCount(
                gameId
            );


            card.dataset.playCount =
                String(
                    getPlayCount(
                        gameId
                    )
                );


            updatePopularBadge();

        }

    );


    /* =====================================================
       POPULAR BADGE
    ===================================================== */

    function updatePopularBadge() {

        const cards =
            [
                ...document.querySelectorAll(
                    ".game-card[data-game-id]"
                )
            ];


        if (!cards.length) {
            return;
        }


        cards.forEach(
            card => {

                const oldBadge =
                    card.querySelector(
                        ".popular-badge"
                    );


                if (oldBadge) {
                    oldBadge.remove();
                }

            }
        );


        cards.sort(
            (a, b) => {

                return (
                    Number(
                        b.dataset.playCount ||
                        0
                    ) -
                    Number(
                        a.dataset.playCount ||
                        0
                    )
                );

            }
        );


        const mostPlayed =
            cards[0];


        if (!mostPlayed) {
            return;
        }


        const count =
            Number(
                mostPlayed.dataset.playCount ||
                0
            );


        if (count <= 0) {
            return;
        }


        const thumbnail =
            mostPlayed.querySelector(
                ".game-thumbnail-wrap"
            );


        if (!thumbnail) {
            return;
        }


        const badge =
            document.createElement(
                "div"
            );


        badge.className =
            "popular-badge";


        badge.textContent =
            "🔥 PHỔ BIẾN";


        thumbnail.appendChild(
            badge
        );

    }


    updatePopularBadge();


    /* =====================================================
       GAME IMAGES
    ===================================================== */

    const GAME_IMAGES = {

        caro5:
            "./assets/games/caro5.jpg",

        flappy:
            "./assets/games/flappy.jpg",

        chess:
            "./assets/games/chess.jpg",

        snake:
            "./assets/games/snake.jpg",

        ludo:
            "./assets/games/ludo.jpg"

    };


    function loadGameImages() {

        Object.keys(
            GAME_IMAGES
        ).forEach(
            gameId => {

                const card =
                    document.querySelector(
                        `.game-card[data-game-id="${gameId}"]`
                    );


                if (!card) {
                    return;
                }


                const wrapper =
                    card.querySelector(
                        ".game-thumbnail-wrap"
                    );


                if (!wrapper) {
                    return;
                }


                if (
                    wrapper.querySelector(
                        ".game-thumbnail"
                    )
                ) {

                    return;

                }


                const img =
                    document.createElement(
                        "img"
                    );


                img.className =
                    "game-thumbnail";


                img.src =
                    GAME_IMAGES[
                        gameId
                    ];


                img.alt =
                    GAME_CONFIG[
                        gameId
                    ]
                        ? GAME_CONFIG[
                            gameId
                        ].name
                        : gameId;


                img.addEventListener(
                    "error",
                    () => {
                        img.remove();
                    }
                );


                wrapper.insertBefore(
                    img,
                    wrapper.firstChild
                );

            }
        );

    }


    loadGameImages();


    /* =====================================================
       GOOGLE ANALYTICS EVENT
    ===================================================== */

    function trackHubEvent(
        eventName,
        data = {}
    ) {

        try {

            if (
                typeof window.gtag ===
                "function"
            ) {

                window.gtag(
                    "event",
                    eventName,
                    data
                );

            }

        } catch (error) {

            console.warn(
                "Analytics error:",
                error
            );

        }

    }


    document.addEventListener(

        "click",

        event => {

            const card =
                event.target.closest(
                    ".game-card"
                );


            if (!card) {
                return;
            }


            const gameId =
                getGameId(
                    card
                );


            if (!gameId) {
                return;
            }


            trackHubEvent(
                "game_click",
                {
                    game_id:
                        gameId
                }
            );

        }

    );


    /* =====================================================
       DOUBLE TAP ZOOM PREVENTION
    ===================================================== */

    let lastTouchEnd =
        0;


    document.addEventListener(

        "touchend",

        event => {

            const now =
                Date.now();


            if (
                now -
                lastTouchEnd <=
                300
            ) {

                event.preventDefault();

            }


            lastTouchEnd =
                now;

        },

        {
            passive: false
        }

    );


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initGameHub() {

        loadPlayCounts();

        updatePopularBadge();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initGameHub
        );

    } else {

        initGameHub();

    }


})();
