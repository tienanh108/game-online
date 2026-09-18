"use strict";

(() => {

    // =========================================================
    // GAMEHUB MAIN JS
    // =========================================================

    const gameCountElement =
        document.getElementById("gameCount");

    const yearElement =
        document.getElementById("year");

    const filterButtons =
        document.querySelectorAll(".filter-button");


    // =========================================================
    // YEAR
    // =========================================================

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }


    // =========================================================
    // GAME CONFIG
    // =========================================================

    const GAME_CONFIG = {

        caro5: {
            name: "Caro 5",
            image: "assets/games/caro.jpg"
        },

        flappy: {
            name: "Flappy Bird",
            image: "assets/games/flappy.jpg"
        },

        chess: {
            name: "Cờ vua",
            image: "assets/games/chess.jpg"
        },

        snake: {
            name: "Snake",
            image: "assets/games/snake.jpg"
        },

        ludo: {
            name: "Cờ cá ngựa",
            image: "assets/games/ludo.jpg"
        }

    };


    // =========================================================
    // GET GAME ID FROM CARD
    // =========================================================

    function getGameId(card) {

        if (!card) {
            return null;
        }

        // Nếu sau này bạn thêm data-game-id
        if (card.dataset.gameId) {
            return card.dataset.gameId;
        }

        // Tự nhận diện từ link game
        const link =
            card.querySelector(
                'a[href*="games/"]'
            );

        if (!link) {
            return null;
        }

        const href =
            link.getAttribute("href") || "";

        if (href.includes("caro5")) {
            return "caro5";
        }

        if (href.includes("flappy")) {
            return "flappy";
        }

        if (href.includes("chess")) {
            return "chess";
        }

        if (href.includes("snake")) {
            return "snake";
        }

        if (href.includes("ludo")) {
            return "ludo";
        }

        return null;
    }


    // =========================================================
    // GAME COUNT
    // =========================================================

    function updateGameCount() {

        const availableGames =
            document.querySelectorAll(
                '.game-card[data-game="available"]'
            ).length;

        if (gameCountElement) {
            gameCountElement.textContent =
                availableGames;
        }
    }

    updateGameCount();


    // =========================================================
    // FILTER
    // =========================================================

    function setupFilters() {

        const gameCards =
            document.querySelectorAll(
                ".game-card"
            );

        filterButtons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const filter =
                        button.dataset.filter;

                    filterButtons.forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                    button.classList.add(
                        "active"
                    );


                    gameCards.forEach(card => {

                        const type =
                            card.dataset.game;


                        if (
                            filter === "all"
                        ) {

                            card.classList.remove(
                                "hidden-card"
                            );

                            return;
                        }


                        if (
                            filter === "available" &&
                            type === "available"
                        ) {

                            card.classList.remove(
                                "hidden-card"
                            );

                        } else {

                            card.classList.add(
                                "hidden-card"
                            );

                        }

                    });

                }
            );

        });

    }


    setupFilters();


    // =========================================================
    // CARD TOUCH FEEDBACK
    // =========================================================

    function setupTouchFeedback() {

        const gameCards =
            document.querySelectorAll(
                ".game-card"
            );

        gameCards.forEach(card => {

            card.addEventListener(
                "touchstart",
                () => {
                    card.classList.add(
                        "touching"
                    );
                },
                {
                    passive: true
                }
            );

            card.addEventListener(
                "touchend",
                () => {
                    card.classList.remove(
                        "touching"
                    );
                },
                {
                    passive: true
                }
            );

        });

    }


    setupTouchFeedback();


    // =========================================================
    // PREVENT DOUBLE TAP ZOOM
    // =========================================================

    let lastTouchTime = 0;

    document.addEventListener(
        "touchend",
        event => {

            const now =
                Date.now();

            if (
                now - lastTouchTime < 300 &&
                event.target.closest(
                    ".play-button"
                )
            ) {

                event.preventDefault();

            }

            lastTouchTime = now;

        },
        {
            passive: false
        }
    );


    // =========================================================
    // ADD PLAY COUNT UI
    // =========================================================

    function addPlayCountElement(
        card,
        plays
    ) {

        if (!card) {
            return;
        }

        let element =
            card.querySelector(
                ".game-play-count"
            );

        if (!element) {

            const meta =
                card.querySelector(
                    ".game-meta"
                );

            if (!meta) {
                return;
            }

            element =
                document.createElement(
                    "span"
                );

            element.className =
                "game-play-count";

            meta.appendChild(
                element
            );
        }

        const number =
            Number.isFinite(
                Number(plays)
            )
                ? Number(plays)
                : 0;

        element.textContent =
            "🎮 " +
            number.toLocaleString("vi-VN") +
            " lượt chơi";

    }


    // =========================================================
    // ADD POPULAR BADGE
    // =========================================================

    function updatePopularBadge(
        card,
        rank
    ) {

        if (!card) {
            return;
        }

        let badge =
            card.querySelector(
                ".popular-game-badge"
            );

        // Xóa badge cũ
        if (badge) {
            badge.remove();
        }

        // Chỉ đánh dấu game phổ biến nhất
        if (rank !== 0) {
            return;
        }

        const image =
            card.querySelector(
                ".game-card-image"
            );

        if (!image) {
            return;
        }

        badge =
            document.createElement(
                "div"
            );

        badge.className =
            "popular-game-badge";

        badge.textContent =
            "🔥 PHỔ BIẾN NHẤT";

        image.appendChild(
            badge
        );

    }


    // =========================================================
    // ADD GAME IMAGES
    // =========================================================

    function setupGameImages() {

        const cards =
            document.querySelectorAll(
                ".game-card"
            );

        cards.forEach(card => {

            const gameId =
                getGameId(card);

            if (!gameId) {
                return;
            }

            const config =
                GAME_CONFIG[gameId];

            if (!config) {
                return;
            }

            const imageContainer =
                card.querySelector(
                    ".game-card-image"
                );

            if (!imageContainer) {
                return;
            }

            // Không tạo ảnh nếu đã có ảnh thật
            if (
                imageContainer.querySelector(
                    "img.game-thumbnail"
                )
            ) {
                return;
            }

            const image =
                document.createElement(
                    "img"
                );

            image.className =
                "game-thumbnail";

            image.src =
                config.image;

            image.alt =
                config.name;

            image.loading =
                "lazy";

            image.decoding =
                "async";

            image.onerror =
                () => {

                    image.classList.add(
                        "image-load-error"
                    );

                };

            imageContainer.prepend(
                image
            );

        });

    }


    setupGameImages();


    // =========================================================
    // SORT GAMES BY PLAY COUNT
    // =========================================================

    function sortGames(
        playCounts
    ) {

        const grid =
            document.querySelector(
                ".game-grid"
            );

        if (!grid) {
            return;
        }

        const cards =
            Array.from(
                grid.querySelectorAll(
                    ".game-card"
                )
            );

        const availableCards =
            cards.filter(card => {

                return (
                    card.dataset.game ===
                    "available"
                );

            });

        const soonCards =
            cards.filter(card => {

                return (
                    card.dataset.game !==
                    "available"
                );

            });


        // -----------------------------------------------------
        // Sắp xếp game đang chơi được
        // -----------------------------------------------------

        availableCards.sort(
            (a, b) => {

                const aId =
                    getGameId(a);

                const bId =
                    getGameId(b);

                const aPlays =
                    Number(
                        playCounts[aId] || 0
                    );

                const bPlays =
                    Number(
                        playCounts[bId] || 0
                    );

                return bPlays - aPlays;

            }
        );


        // -----------------------------------------------------
        // Đưa game vào DOM theo thứ tự mới
        // -----------------------------------------------------

        availableCards.forEach(
            card => {

                grid.appendChild(
                    card
                );

            }
        );


        // Game sắp ra mắt nằm sau
        soonCards.forEach(
            card => {

                grid.appendChild(
                    card
                );

            }
        );


        // -----------------------------------------------------
        // Hiển thị lượt chơi
        // -----------------------------------------------------

        availableCards.forEach(
            card => {

                const gameId =
                    getGameId(card);

                const plays =
                    Number(
                        playCounts[gameId] || 0
                    );

                addPlayCountElement(
                    card,
                    plays
                );

            }
        );


        // -----------------------------------------------------
        // Badge game phổ biến nhất
        // -----------------------------------------------------

        availableCards.forEach(
            (card, index) => {

                updatePopularBadge(
                    card,
                    index
                );

            }
        );

    }


    // =========================================================
    // LOAD GAME PLAY COUNTS FROM FIREBASE
    // =========================================================

    function loadGameStatistics() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            console.warn(
                "Firebase chưa được load."
            );

            return;

        }


        if (
            !firebase.database
        ) {

            console.warn(
                "Firebase Database chưa sẵn sàng."
            );

            return;

        }


        try {

            const db =
                firebase.database();


            db.ref(
                "gameStats"
            ).once(
                "value"
            ).then(
                snapshot => {

                    const data =
                        snapshot.val() ||
                        {};

                    const playCounts =
                        {};


                    Object.keys(
                        GAME_CONFIG
                    ).forEach(
                        gameId => {

                            const game =
                                data[gameId];

                            let plays = 0;


                            if (
                                game &&
                                typeof game ===
                                "object"
                            ) {

                                plays =
                                    Number(
                                        game.plays || 0
                                    );

                            }


                            if (
                                !Number.isFinite(
                                    plays
                                )
                            ) {

                                plays = 0;

                            }


                            playCounts[
                                gameId
                            ] = Math.max(
                                0,
                                plays
                            );

                        }
                    );


                    sortGames(
                        playCounts
                    );


                    console.log(
                        "📊 Game statistics:",
                        playCounts
                    );

                }
            ).catch(
                error => {

                    console.error(
                        "Không đọc được gameStats:",
                        error
                    );

                }
            );

        } catch (error) {

            console.error(
                "Game statistics error:",
                error
            );

        }

    }


    // =========================================================
    // ANALYTICS
    // =========================================================

    function setupAnalytics() {

        if (
            window.GameAnalytics
        ) {

            GameAnalytics.trackHubVisit();

        }


        document
            .querySelectorAll(
                "a[href]"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            const href =
                                link.getAttribute(
                                    "href"
                                ) || "";

                            let game =
                                null;


                            if (
                                href.includes(
                                    "caro5"
                                )
                            ) {

                                game =
                                    "caro5";

                            } else if (
                                href.includes(
                                    "flappy"
                                )
                            ) {

                                game =
                                    "flappy";

                            } else if (
                                href.includes(
                                    "chess"
                                )
                            ) {

                                game =
                                    "chess";

                            }


                            if (
                                game &&
                                window.GameAnalytics
                            ) {

                                GameAnalytics.trackClick(
                                    "game_card",
                                    {
                                        game
                                    }
                                );

                            }

                        }
                    );

                }
            );

    }


    // =========================================================
    // INIT
    // =========================================================

    function init() {

        setupAnalytics();

        // Ảnh
        setupGameImages();

        // Lấy số lượt chơi
        loadGameStatistics();

        console.log(
            "🎮 GAMEHUB LOADED"
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
