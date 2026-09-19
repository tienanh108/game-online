/* =========================================================
   GAMEHUB — HUB.JS
   Firebase + Presence + Public Statistics + Music
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
            "AIzaSyA2jU2-lHYjNeA40kFoS1-VsCaqhjYszdw",

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


    /* =====================================================
       HELPERS
    ===================================================== */

    function formatNumber(number) {

        return Number(
            number || 0
        ).toLocaleString("vi-VN");

    }


    function getVietnamDate() {

        const now =
            new Date();


        const vietnam =
            new Date(
                now.toLocaleString(
                    "en-US",
                    {
                        timeZone:
                            "Asia/Ho_Chi_Minh"
                    }
                )
            );


        const year =
            vietnam.getFullYear();


        const month =
            String(
                vietnam.getMonth() + 1
            ).padStart(2, "0");


        const day =
            String(
                vietnam.getDate()
            ).padStart(2, "0");


        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    function getLastSevenDates() {

        const dates = [];

        const now =
            new Date();


        const vietnam =
            new Date(
                now.toLocaleString(
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
                new Date(
                    vietnam
                );


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
       
       QUAN TRỌNG:
       Database KHÔNG chờ Anonymous Auth.
       
       Public statistics có thể đọc ngay.
    ===================================================== */

    async function initFirebaseDatabase() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            console.error(
                "GameHub Firebase: Firebase SDK chưa được tải."
            );

            return false;

        }


        try {

            const APP_NAME =
                "GameHub";


            /*
             * Kiểm tra app GameHub đã tồn tại chưa.
             */

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


            /*
             * Database được khởi tạo độc lập.
             */

            database =
                firebaseApp.database();


            firebaseReady =
                true;


            console.log(
                "================================="
            );

            console.log(
                "GameHub Firebase Database: READY"
            );

            console.log(
                "Database URL:",
                FIREBASE_CONFIG.databaseURL
            );

            console.log(
                "================================="
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
       
       Auth chỉ phục vụ:
       - Presence
       - Các phần cần auth
       
       Không ảnh hưởng public statistics.
    ===================================================== */

    async function setupAnonymousAuth() {

        if (!firebaseApp) {

            return false;

        }


        try {

            auth =
                firebaseApp.auth();


            /*
             * Nếu đã đăng nhập rồi.
             */

            if (
                auth.currentUser
            ) {

                currentUser =
                    auth.currentUser;

            } else {

                /*
                 * Anonymous login.
                 */

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
                "Anonymous UID:",
                currentUser.uid
            );


            return true;

        } catch (error) {

            /*
             * Auth lỗi KHÔNG làm analytics chết.
             */

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
       ONLINE UI
    ===================================================== */

    function updateOnlineUI(
        users
    ) {

        const count =
            users.length;


        const onlineNumber =
            document.querySelector(
                "#onlineNumber"
            );


        const statsOnline =
            document.querySelector(
                "#statsOnline"
            );


        const analyticsOnline =
            document.querySelector(
                "#analyticsOnline"
            );


        if (onlineNumber) {

            onlineNumber.textContent =
                count;

        }


        if (statsOnline) {

            statsOnline.textContent =
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

        const gameCounts = {

            caro5: 0,

            flappy: 0,

            chess: 0

        };


        users.forEach(
            user => {

                if (
                    !user ||
                    !user.game
                ) {

                    return;

                }


                if (
                    gameCounts[
                        user.game
                    ] !== undefined
                ) {

                    gameCounts[
                        user.game
                    ]++;

                }

            }
        );


        Object.keys(
            gameCounts
        ).forEach(
            gameId => {

                const element =
                    document.querySelector(
                        `[data-game-online="${gameId}"]`
                    );


                if (element) {

                    element.textContent =
                        gameCounts[
                            gameId
                        ];

                }

            }
        );

    }


    /* =====================================================
       PRESENCE
    ===================================================== */

    function setupPresenceListener() {

        if (
            !firebaseReady ||
            !authReady
        ) {

            console.warn(
                "Presence: Firebase/Auth chưa sẵn sàng."
            );

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


                const users =
                    Object.values(
                        data
                    ).filter(
                        user => {

                            return (
                                user &&
                                user.game
                            );

                        }
                    );


                updateOnlineUI(
                    users
                );


                updateGameOnlineUI(
                    users
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
       
       Không cần Auth vì analytics đang public-read.
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


        console.log(
            "Reading daily players:",
            playersRef.toString()
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


                const statsPlayers =
                    document.querySelector(
                        "#statsPlayers"
                    );


                const analyticsPlayers =
                    document.querySelector(
                        "#analyticsPlayersToday"
                    );


                if (statsPlayers) {

                    statsPlayers.textContent =
                        formatNumber(
                            count
                        );

                }


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

        if (
            PUBLIC_GAME_CONFIG[
                gameId
            ]
        ) {

            return PUBLIC_GAME_CONFIG[
                gameId
            ].name;

        }


        return gameId || "Game";

    }


    function getGameIcon(
        gameId
    ) {

        if (
            PUBLIC_GAME_CONFIG[
                gameId
            ]
        ) {

            return PUBLIC_GAME_CONFIG[
                gameId
            ].icon;

        }


        return "🎮";

    }


    /* =====================================================
       GET GAME ID FROM PLAY
       
       Hỗ trợ nhiều tên field.
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


        if (
            entries.length ===
            0
        ) {

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
       
       ĐÂY LÀ PHẦN QUAN TRỌNG.
       
       Không cần Anonymous Auth.
    ===================================================== */

    async function setupPublicAnalytics() {

        if (!firebaseReady) {

            console.error(
                "Public Analytics: Firebase Database chưa sẵn sàng."
            );

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

            console.log(
                "================================="
            );

            console.log(
                "GameHub Public Analytics"
            );

            console.log(
                "Reading:",
                database
                    .ref("analytics/daily")
                    .toString()
            );

            console.log(
                "================================="
            );


            /*
             * Đọc toàn bộ analytics/daily.
             *
             * Rules cần:
             *
             * analytics:
             *   .read: true
             */

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


            console.log(
                "Analytics daily data:",
                dailyData
            );


            let totalPlays =
                0;


            const gameCounts =
                {};


            /*
             * Duyệt từng ngày.
             */

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


                    /*
                     * Mỗi node play = 1 lượt chơi.
                     */

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
                                    ] ||
                                    0
                                ) + 1;

                        }
                    );

                }
            );


            /*
             * Tổng lượt chơi.
             */

            if (totalElement) {

                totalElement.textContent =
                    formatNumber(
                        totalPlays
                    );

            }


            /*
             * Game statistics.
             */

            renderAnalyticsGames(
                gameCounts
            );


            /*
             * 7 ngày gần nhất.
             */

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
                "================================="
            );

            console.error(
                "GAMEHUB ANALYTICS ERROR"
            );

            console.error(
                error
            );

            console.error(
                "================================="
            );


            if (chart) {

                chart.innerHTML = `

                    <div class="analytics-error">

                        Không thể tải dữ liệu thống kê.

                        <br><br>

                        Kiểm tra Firebase Rules.

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

        if (
            !firebaseReady ||
            !authReady
        ) {

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
                            "object"
                        ) {

                            if (
                                value.playCount !==
                                undefined
                            ) {

                                card.dataset.playCount =
                                    value.playCount;

                            }

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

        /*
         * -----------------------------------------------
         * STEP 1
         *
         * Database chạy độc lập.
         * -----------------------------------------------
         */

        const databaseSuccess =
            await initFirebaseDatabase();


        if (!databaseSuccess) {

            console.error(
                "GameHub: Firebase Database không khởi tạo được."
            );

            return;

        }


        /*
         * -----------------------------------------------
         * STEP 2
         *
         * Public statistics chạy NGAY.
         * Không chờ Auth.
         * -----------------------------------------------
         */

        setupPublicAnalytics();

        setupDailyPlayersListener();


        /*
         * -----------------------------------------------
         * STEP 3
         *
         * Anonymous Auth chạy riêng.
         * -----------------------------------------------
         */

        const authSuccess =
            await setupAnonymousAuth();


        if (!authSuccess) {

            console.warn(
                "GameHub: Anonymous Auth thất bại."
            );


            /*
             * Analytics vẫn hoạt động.
             */

            return;

        }


        /*
         * -----------------------------------------------
         * STEP 4
         *
         * Các chức năng cần Auth.
         * -----------------------------------------------
         */

        setupPresenceListener();

        setupGameStats();

    }


    /*
     * Bắt đầu Firebase.
     */

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


    function setupHubMusic() {

        hubMusic =
            new Audio(
                HUB_MUSIC_PATH
            );


        hubMusic.loop =
            true;


        hubMusic.volume =
            0.25;


        const soundButton =
            document.querySelector(
                "[data-hub-sound-toggle]"
            );


        if (!soundButton) {

            return;

        }


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
                 * Browser có thể chặn autoplay.
                 */

            }

        }


        soundButton.addEventListener(

            "click",

            async () => {

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

                    hubMusic.pause();

                } else {

                    playMusic();

                }

            }

        );


        window.addEventListener(

            "pagehide",

            () => {

                hubMusic.pause();

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


    /* =====================================================
       LOAD PLAY COUNTS
    ===================================================== */

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

                const image =
                    GAME_IMAGES[
                        gameId
                    ];


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


                /*
                 * Không thêm ảnh nếu đã có.
                 */

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
                    image;


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


    /* =====================================================
       GAME CARD ANALYTICS
    ===================================================== */

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
