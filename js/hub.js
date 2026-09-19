/* =========================================================
   GAMEHUB — HUB.JS
========================================================= */


/* =========================================================
   BASIC ELEMENTS
========================================================= */

const gameCountElement =
    document.querySelector("#statsGames");

const yearElement =
    document.querySelector("#year");

const filterButtons =
    document.querySelectorAll(".filter-button");


if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}


/* =========================================================
   HUB MUSIC
========================================================= */

const HUB_MUSIC_KEY =
    "gamehub_music_enabled";

const HUB_MUSIC_PATH =
    "./assets/sounds/hub-bgm.mp3";


let hubMusic = null;

let musicEnabled =
    localStorage.getItem(HUB_MUSIC_KEY) !== "false";


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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
            <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>
    `;

}


function setupHubMusic() {

    hubMusic =
        new Audio(HUB_MUSIC_PATH);

    hubMusic.loop = true;

    hubMusic.volume = 0.25;

    const existingButton =
        document.querySelector(
            "[data-hub-sound-toggle]"
        );


    let soundButton =
        existingButton;


    if (!soundButton) {

        const actions =
            document.querySelector(
                ".topbar-actions"
            );

        if (actions) {

            soundButton =
                document.createElement("button");

            soundButton.type = "button";

            soundButton.setAttribute(
                "data-hub-sound-toggle",
                ""
            );

            soundButton.className =
                "hub-sound-toggle";

            soundButton.setAttribute(
                "aria-label",
                "Bật hoặc tắt nhạc"
            );

            actions.appendChild(
                soundButton
            );

        }

    }


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

        if (!musicEnabled) {
            return;
        }

        if (!hubMusic) {
            return;
        }


        try {

            await hubMusic.play();

        } catch (error) {

            /*
                Browser có thể chặn autoplay.
                Người dùng chỉ cần chạm/click một lần
                trên trang là nhạc sẽ bắt đầu.
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
                String(musicEnabled)
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
    ].forEach(eventName => {

        document.addEventListener(
            eventName,
            startAfterInteraction,
            {
                once: true,
                passive: true
            }
        );

    });


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


    /*
        Thử autoplay ngay khi load.
        Nếu browser chặn thì không sao.
    */

    playMusic();

}


document.addEventListener(
    "DOMContentLoaded",
    setupHubMusic
);


/* =========================================================
   GAME CONFIG
========================================================= */

const GAME_CONFIG = {

    caro5: {
        name: "Caro 5",
        url: "./games/caro5/index.html"
    },

    flappy: {
        name: "Flappy Bird",
        url: "./games/flappy/index.html"
    },

    chess: {
        name: "Cờ vua",
        url: "./games/chess/index.html"
    },

    snake: {
        name: "Snake",
        url: "#"
    },

    ludo: {
        name: "Cờ cá ngựa",
        url: "#"
    }

};


/* =========================================================
   GAME ID
========================================================= */

function getGameId(card) {

    return (
        card.dataset.gameId ||
        card.dataset.id ||
        ""
    );

}


/* =========================================================
   FILTER
========================================================= */

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


                        let shouldShow = true;


                        if (
                            filter === "all"
                        ) {

                            shouldShow = true;

                        } else if (
                            filter === "available"
                        ) {

                            shouldShow =
                                status ===
                                "available";

                        } else if (
                            filter === "soon"
                        ) {

                            shouldShow =
                                status ===
                                "soon";

                        }


                        if (shouldShow) {

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


/* =========================================================
   TOUCH FEEDBACK
========================================================= */

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


/* =========================================================
   GAME PLAY COUNT
========================================================= */

const PLAY_COUNT_PREFIX =
    "gamehub_play_count_";


function getPlayCount(gameId) {

    const key =
        PLAY_COUNT_PREFIX +
        gameId;


    return Number(
        localStorage.getItem(key) || 0
    );

}


function increasePlayCount(gameId) {

    const key =
        PLAY_COUNT_PREFIX +
        gameId;


    const current =
        getPlayCount(gameId);


    const next =
        current + 1;


    localStorage.setItem(
        key,
        String(next)
    );


    return next;

}


/* =========================================================
   LOAD PLAY COUNTS
========================================================= */

function loadPlayCounts() {

    const cards =
        document.querySelectorAll(
            ".game-card"
        );


    cards.forEach(
        card => {

            const gameId =
                getGameId(card);


            if (!gameId) {
                return;
            }


            const count =
                getPlayCount(gameId);


            card.dataset.playCount =
                String(count);

        }
    );

}


loadPlayCounts();


/* =========================================================
   PLAY BUTTON TRACKING
========================================================= */

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
            getGameId(card);


        if (!gameId) {
            return;
        }


        increasePlayCount(
            gameId
        );

    }
);


/* =========================================================
   POPULAR BADGE
========================================================= */

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
                Number(b.dataset.playCount || 0) -
                Number(a.dataset.playCount || 0)
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
            mostPlayed.dataset.playCount || 0
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


/* =========================================================
   GAME IMAGE SUPPORT
========================================================= */

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
                GAME_IMAGES[gameId];


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
                GAME_CONFIG[gameId]
                    ? GAME_CONFIG[gameId].name
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


/* =========================================================
   FIREBASE GAME STATS
========================================================= */

function setupGameStats() {

    if (
        typeof firebase ===
        "undefined"
    ) {
        return;
    }


    try {

        const database =
            firebase.database();


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
                            data[gameId];


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

    } catch (error) {

        console.warn(
            "Không thể đọc gameStats:",
            error
        );

    }

}


setupGameStats();


/* =========================================================
   ANALYTICS
========================================================= */

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


/* =========================================================
   GAME CARD ANALYTICS
========================================================= */

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
            getGameId(card);


        if (!gameId) {
            return;
        }


        trackHubEvent(
            "game_click",
            {
                game_id: gameId
            }
        );

    }
);


/* =========================================================
   DOUBLE TAP ZOOM PREVENTION
========================================================= */

let lastTouchEnd = 0;


document.addEventListener(
    "touchend",
    event => {

        const now =
            Date.now();


        if (
            now - lastTouchEnd <= 300
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


/* =========================================================
   INITIALIZATION
========================================================= */

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
