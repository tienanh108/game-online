"use strict";

(() => {

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",
        authDomain: "caro-3460d.firebaseapp.com",
        databaseURL:
            "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "caro-3460d",
        storageBucket:
            "caro-3460d.firebasestorage.app",
        messagingSenderId:
            "473059233945",
        appId:
            "1:473059233945:web:7bbf037f41a8a8d331e808",
        measurementId:
            "G-WXXMSSSN3W"
    };


    /* =========================
       FIREBASE
    ========================= */

    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    const auth = firebase.auth();
    const db = firebase.database();


    const onlineTotal = document.getElementById("onlineTotal");
    const onlineCount = document.getElementById("onlineCount");
    const activeGames = document.getElementById("activeGames");
    const topGame = document.getElementById("topGame");
    const topGameCount = document.getElementById("topGameCount");
    const gameList = document.getElementById("gameList");
    const gameBars = document.getElementById("gameBars");
    const lastUpdate = document.getElementById("lastUpdate");


    /* =========================
       GAME NAME
    ========================= */

    function prettyGameName(game) {

        const names = {
            caro5: "Caro5",
            "flappy-bird": "Flappy Bird",
            flappybird: "Flappy Bird",
            GameHub: "GameHub"
        };

        return names[game] || game || "Không xác định";
    }


    /* =========================
       FORMAT
    ========================= */

    function formatNumber(number) {

        return Number(number || 0).toLocaleString("vi-VN");
    }


    /* =========================
       RENDER
    ========================= */

    function renderPresence(data) {

        const players = [];

        if (data) {

            Object.entries(data).forEach(([uid, player]) => {

                if (!player || typeof player !== "object") {
                    return;
                }

                players.push({
                    uid,
                    game: player.game || "GameHub",
                    lastSeen: Number(player.lastSeen || 0)
                });

            });

        }


        /* =========================
           TOTAL ONLINE
        ========================= */

        const total = players.length;

        onlineTotal.textContent = formatNumber(total);
        onlineCount.textContent = formatNumber(total);


        /* =========================
           COUNT BY GAME
        ========================= */

        const gameCounts = {};

        players.forEach(player => {

            const game = player.game || "GameHub";

            if (!gameCounts[game]) {
                gameCounts[game] = 0;
            }

            gameCounts[game]++;

        });


        const games = Object.entries(gameCounts)
            .sort((a, b) => b[1] - a[1]);


        activeGames.textContent = formatNumber(games.length);


        /* =========================
           TOP GAME
        ========================= */

        if (games.length > 0) {

            const [game, count] = games[0];

            topGame.textContent = prettyGameName(game);
            topGameCount.textContent =
                `${formatNumber(count)} người`;

        } else {

            topGame.textContent = "—";
            topGameCount.textContent = "0 người";

        }


        /* =========================
           LIST
        ========================= */

        if (games.length === 0) {

            gameList.innerHTML = `
                <div class="empty">
                    <div class="empty-icon">🌙</div>
                    <p>Hiện chưa có ai đang chơi.</p>
                </div>
            `;

        } else {

            gameList.innerHTML = games
                .map(([game, count], index) => {

                    const name = prettyGameName(game);

                    return `
                        <div class="game-row">

                            <div class="game-number">
                                #${index + 1}
                            </div>

                            <div class="game-name">
                                <strong>${escapeHtml(name)}</strong>
                                <span>Đang hoạt động</span>
                            </div>

                            <div class="game-count">
                                <strong>${formatNumber(count)}</strong>
                                <span>người chơi</span>
                            </div>

                        </div>
                    `;

                })
                .join("");

        }


        /* =========================
           BARS
        ========================= */

        if (games.length === 0) {

            gameBars.innerHTML = `
                <div class="empty">
                    Chưa có dữ liệu người chơi.
                </div>
            `;

        } else {

            const max = games[0][1];

            gameBars.innerHTML = games
                .map(([game, count]) => {

                    const percent =
                        max > 0
                            ? Math.max(3, (count / max) * 100)
                            : 0;

                    return `
                        <div class="bar-row">

                            <div class="bar-label">
                                ${escapeHtml(prettyGameName(game))}
                            </div>

                            <div class="bar-track">
                                <div
                                    class="bar-fill"
                                    style="width:${percent}%"
                                ></div>
                            </div>

                            <div class="bar-value">
                                ${formatNumber(count)}
                            </div>

                        </div>
                    `;

                })
                .join("");

        }


        lastUpdate.textContent =
            "Cập nhật " +
            new Date().toLocaleTimeString("vi-VN");

    }


    /* =========================
       HTML SAFETY
    ========================= */

    function escapeHtml(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* =========================
       ANONYMOUS LOGIN
    ========================= */

    auth.signInAnonymously()
        .then(() => {

            startRealtimeStats();

        })
        .catch(error => {

            console.error("Firebase Auth error:", error);

            lastUpdate.textContent =
                "Không thể kết nối Firebase";

        });


    /* =========================
       REALTIME
    ========================= */

    function startRealtimeStats() {

        const presenceRef = db.ref("presence");

        presenceRef.on(
            "value",
            snapshot => {

                renderPresence(snapshot.val());

            },
            error => {

                console.error(
                    "Presence read error:",
                    error
                );

                lastUpdate.textContent =
                    "Lỗi tải dữ liệu";

            }
        );

    }

})();
