/* =========================================================
   GAMEHUB — SEARCH + CATEGORY
   ========================================================= */

const searchInput = document.getElementById("searchInput");
const categoryButtons = document.querySelectorAll(".category");
const gameCards = document.querySelectorAll(".game-card");


/* =========================================================
   FILTER GAME
   ========================================================= */

function filterGames() {

    const keyword = searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    const activeCategory =
        document.querySelector(".category.active");

    const category =
        activeCategory
            ? activeCategory.dataset.category
            : "all";


    gameCards.forEach(card => {

        const name =
            (card.dataset.name || "")
                .toLowerCase();

        const cardCategory =
            card.dataset.category || "";


        const matchesSearch =
            name.includes(keyword);

        const matchesCategory =
            category === "all" ||
            cardCategory === category;


        if (
            matchesSearch &&
            matchesCategory
        ) {
            card.classList.remove("hidden");
        } else {
            card.classList.add("hidden");
        }

    });

}


/* =========================================================
   SEARCH
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        filterGames
    );

}


/* =========================================================
   CATEGORY
   ========================================================= */

categoryButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            categoryButtons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            filterGames();

        }
    );

});


/* =========================================================
   INITIALIZE
   ========================================================= */

filterGames();
