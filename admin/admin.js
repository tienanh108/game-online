"use strict";

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA2j-lHYjNeA40kFoS1-VsCaqhjYszdw",
    authDomain: "caro-3460d.firebaseapp.com",
    databaseURL: "https://caro-3460d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "caro-3460d",
    storageBucket: "caro-3460d.firebasestorage.app",
    messagingSenderId: "473059233945",
    appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
    measurementId: "G-WXXMSSSN3W"
};

firebase.initializeApp(FIREBASE_CONFIG);

const auth = firebase.auth();
const db = firebase.database();

const loginScreen = document.getElementById("loginScreen");
const dashboardContent = document.getElementById("dashboardContent");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

const loginMessage = document.getElementById("loginMessage");

const totalVisits = document.getElementById("totalVisits");
const totalGames = document.getElementById("totalGames");
const totalWins = document.getElementById("totalWins");
const totalTime = document.getElementById("totalTime");

const gamesList = document.getElementById("gamesList");
const deviceList = document.getElementById("deviceList");
const eventsList = document.getElementById("eventsList");

let allEvents = [];

loginButton.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        loginMessage.textContent =
            "Vui lòng nhập email và mật khẩu.";

        return;
    }

    loginMessage.textContent = "Đang đăng nhập...";

    try {

        await auth.signInWithEmailAndPassword(
            email,
            password
        );

        loginMessage.textContent = "";

    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            "Đăng nhập thất bại.";

    }

});

logoutButton.addEventListener("click", async () => {

    await auth.signOut();

});

auth.onAuthStateChanged(user => {

    if (user && user.email) {

        loginScreen.hidden = true;
        dashboardContent.hidden = false;

        loadAnalytics();

    } else {

        loginScreen.hidden = false;
        dashboardContent.hidden = true;

    }

});

function loadAnalytics() {

    db.ref("analytics/events")
        .on("value", snapshot => {

            const data = snapshot.val() || {};

            allEvents = Object.values(data);

            processAnalytics();

        });

}

function processAnalytics() {

    let visits = 0;
    let games = 0;
    let wins = 0;
    let totalSeconds = 0;

    const gameCounts = {};
    const devices = {};

    allEvents.forEach(event => {

        if (event.type === "hub_visit") {
            visits++;
        }

        if (event.type === "game_start") {

            games++;

            const game =
                event.game || "unknown";

            gameCounts[game] =
                (gameCounts[game] || 0) + 1;
        }

        if (event.type === "game_win") {
            wins++;
        }

        if (event.type === "game_end") {

            totalSeconds +=
                Number(event.duration) || 0;
        }

        const device =
            event.platform || "Other";

        devices[device] =
            (devices[device] || 0) + 1;

    });

    totalVisits.textContent =
        visits.toLocaleString("vi-VN");

    totalGames.textContent =
        games.toLocaleString("vi-VN");

    totalWins.textContent =
        wins.toLocaleString("vi-VN");

    totalTime.textContent =
        formatDuration(totalSeconds);

    renderGames(gameCounts);
    renderDevices(devices);
    renderEvents();

}

function formatDuration(seconds) {

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes =
        Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} phút`;
    }

    const hours =
        Math.floor(minutes / 60);

    const remainingMinutes =
        minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
}

function renderGames(gameCounts) {

    gamesList.innerHTML = "";

    const entries =
        Object.entries(gameCounts)
            .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {

        gamesList.innerHTML =
            "<p>Chưa có dữ liệu.</p>";

        return;
    }

    entries.forEach(([game, count]) => {

        const row =
            document.createElement("div");

        row.className = "game-row";

        row.innerHTML = `
            <div class="game-name">
                ${escapeHTML(game)}
            </div>

            <div class="game-count">
                ${count.toLocaleString("vi-VN")}
            </div>
        `;

        gamesList.appendChild(row);

    });

}

function renderDevices(devices) {

    deviceList.innerHTML = "";

    const entries =
        Object.entries(devices)
            .sort((a, b) => b[1] - a[1]);

    const max =
        Math.max(
            ...entries.map(x => x[1]),
            1
        );

    entries.forEach(([device, count]) => {

        const row =
            document.createElement("div");

        row.className = "device-row";

        const percentage =
            Math.round((count / max) * 100);

        row.innerHTML = `
            <div class="device-name">
                ${escapeHTML(device)}
            </div>

            <div class="bar">
                <div
                    class="bar-fill"
                    style="width:${percentage}%"
                ></div>
            </div>

            <div class="device-count">
                ${count}
            </div>
        `;

        deviceList.appendChild(row);

    });

}

function renderEvents() {

    eventsList.innerHTML = "";

    const events =
        [...allEvents]
            .sort(
                (a, b) =>
                    (b.timestamp || 0) -
                    (a.timestamp || 0)
            )
            .slice(0, 30);

    events.forEach(event => {

        const row =
            document.createElement("div");

        row.className = "event";

        const date =
            event.timestamp
                ? new Date(event.timestamp)
                    .toLocaleString("vi-VN")
                : "—";

        row.innerHTML = `
            <div class="event-type">
                ${escapeHTML(event.type || "unknown")}
            </div>

            <div class="event-game">
                ${escapeHTML(event.game || "GameHub")}
            </div>

            <div class="event-date">
                ${date}
            </div>
        `;

        eventsList.appendChild(row);

    });

}

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
