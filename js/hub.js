/* =========================================================
   GAMEHUB — HUB.JS
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

    let auth = null;

    let database = null;

    let firebaseReady = false;

    let currentUser = null;


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
                new Date(vietnam);


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
       FIREBASE INIT
    ===================================================== */

    async function initFirebase() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            console.warn(
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


            auth =
                firebaseApp.auth();


            database =
                firebaseApp.database();


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


            firebaseReady =
                true;


            console.log(
                "GameHub Firebase ready:",
                currentUser.uid
            );


            return true;

        } catch (error) {

            console.error(
                "GameHub Firebase init error:",
                error
            );


            firebaseReady =
                false;


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
                formatNumber(count);

        }

    }


    /* =====================================================
       GAME ONLINE UI
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
                        gameCounts[gameId];

                }

            }
        );

    }


    /* =====================================================
       PRESENCE
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
                        count;

                }


                if (analyticsPlayers) {

                    analyticsPlayers.textContent =
                        formatNumber(count);

                }

            },

            error => {

                console.error(
                    "GameHub daily players error:",
                    error
                );

            }

        );

    }


    /* =====================================================
       PUBLIC ANALYTICS
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


        try {

            /*
             * Đọc toàn bộ analytics/daily.
             *
             * Nhờ vậy:
             * - Tổng lượt chơi = toàn bộ plays
             * - Game count = toàn bộ plays
             * - Chart = 7 ngày gần nhất
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
                                    ] ||
                                    0
                                ) + 1;

                        }
                    );

                }
            );


            const totalElement =
                document.querySelector(
                    "#analyticsTotalPlays"
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


            /*
             * 7 ngày gần nhất
             */

            const lastSevenDates =
                getLastSevenDates();


            const chartData =
                lastSevenDates.map(
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

        } catch (error) {

            console.error(
                "GameHub public analytics error:",
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
                        Không thể tải dữ liệu thống kê.
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
                    "gameStats error:",
                    error
                );

            }

        );

    }


    /* =====================================================
       START FIREBASE
    ===================================================== */

    async function setupFirebaseStats() {

        const success =
            await initFirebase();


        if (!success) {

            return;

        }


        setupPresenceListener();

        setupDailyPlayersListener();

        setupGameStats();

        setupPublicAnalytics();

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
       GOOGLE ANALYTICS / HUB EVENTS
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
       DOUBLE TAP ZOOM
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
