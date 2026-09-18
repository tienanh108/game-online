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

    const gameCards =
        document.querySelectorAll(".game-card");


    // =========================================================
    // YEAR
    // =========================================================

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
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

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            const filter =
                button.dataset.filter;

            filterButtons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");


            gameCards.forEach(card => {

                const type =
                    card.dataset.game;

                if (filter === "all") {

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

        });

    });


    // =========================================================
    // CARD TOUCH FEEDBACK
    // =========================================================

    gameCards.forEach(card => {

        card.addEventListener(
            "touchstart",
            () => {
                card.classList.add("touching");
            },
            {
                passive: true
            }
        );

        card.addEventListener(
            "touchend",
            () => {
                card.classList.remove("touching");
            },
            {
                passive: true
            }
        );

    });


    // =========================================================
    // PREVENT DOUBLE TAP ZOOM ON GAME BUTTONS
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
    // CONSOLE
    // =========================================================

    console.log(
        "🎮 GAMEHUB LOADED"
    );

})();
// ================================
// GAME ANALYTICS
// ================================

document.addEventListener("DOMContentLoaded", () => {

    // Thống kê lượt vào GameHub
    if (window.GameAnalytics) {
        GameAnalytics.trackHubVisit();
    }

    // Theo dõi click vào game
    document.querySelectorAll("a[href]").forEach(link => {

        link.addEventListener("click", () => {

            const href = link.getAttribute("href") || "";

            let game = null;

            if (href.includes("caro5")) {
                game = "caro5";
            } else if (href.includes("flappy")) {
                game = "flappy";
            }

            if (game && window.GameAnalytics) {
                GameAnalytics.trackClick("game_card", {
                    game
                });
            }
        });

    });

});
