"use strict";

(() => {

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA2uJ2-lHYjNeA40kFoS1-VsCaqhjYszdw",

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


    let auth = null;
    let db = null;

    let allEvents = [];
    let filteredEvents = [];


    const $ = (id) =>
        document.getElementById(id);


    function setStatus(message) {

        const status = $("status");

        if (status) {
            status.textContent = message;
        }
    }


    function formatNumber(value) {

        return Number(value || 0)
            .toLocaleString("vi-VN");
    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function formatDate(timestamp) {

        if (!timestamp) {
            return "-";
        }

        const date =
            new Date(Number(timestamp));

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    function formatDuration(seconds) {

        seconds =
            Math.max(
                0,
                Number(seconds) || 0
            );

        const hours =
            Math.floor(seconds / 3600);

        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );

        const remainingSeconds =
            Math.floor(seconds % 60);


        if (hours > 0) {

            return `${hours}h ${minutes}m`;
        }


        if (minutes > 0) {

            return `${minutes}m ${remainingSeconds}s`;
        }


        return `${remainingSeconds}s`;
    }


    function getDateValue(event) {

        if (event.date) {
            return String(event.date);
        }

        if (event.timestamp) {

            const date =
                new Date(
                    Number(event.timestamp)
                );

            if (!Number.isNaN(date.getTime())) {

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

                return `${year}-${month}-${day}`;
            }
        }

        return "";
    }


    function uniqueValues(field) {

        return [
            ...new Set(
                allEvents
                    .map(event =>
                        event[field]
                    )
                    .filter(Boolean)
                    .map(String)
            )
        ].sort();
    }


    function populateFilters() {

        const game =
            $("gameFilter");

        const device =
            $("deviceFilter");

        const mode =
            $("modeFilter");


        game.innerHTML =
            `<option value="all">Tất cả</option>`;

        device.innerHTML =
            `<option value="all">Tất cả</option>`;

        mode.innerHTML =
            `<option value="all">Tất cả</option>`;


        uniqueValues("game")
            .forEach(value => {

                game.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(value)}">
                        ${escapeHTML(value)}
                    </option>
                    `
                );
            });


        uniqueValues("device")
            .forEach(value => {

                device.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(value)}">
                        ${escapeHTML(value)}
                    </option>
                    `
                );
            });


        uniqueValues("mode")
            .forEach(value => {

                mode.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(value)}">
                        ${escapeHTML(value)}
                    </option>
                    `
                );
            });
    }


    function applyFilters() {

        const from =
            $("dateFrom").value;

        const to =
            $("dateTo").value;

        const game =
            $("gameFilter").value;

        const device =
            $("deviceFilter").value;

        const mode =
            $("modeFilter").value;


        filteredEvents =
            allEvents.filter(event => {

                const date =
                    getDateValue(event);


                if (
                    from &&
                    date &&
                    date < from
                ) {
                    return false;
                }


                if (
                    to &&
                    date &&
                    date > to
                ) {
                    return false;
                }


                if (
                    game !== "all" &&
                    String(event.game || "") !== game
                ) {
                    return false;
                }


                if (
                    device !== "all" &&
                    String(event.device || "") !== device
                ) {
                    return false;
                }


                if (
                    mode !== "all" &&
                    String(event.mode || "") !== mode
                ) {
                    return false;
                }


                return true;
            });


        renderDashboard();
    }


    function countBy(field) {

        const result = {};


        filteredEvents.forEach(event => {

            const value =
                String(
                    event[field] ||
                    "unknown"
                );

            result[value] =
                (result[value] || 0) + 1;
        });


        return result;
    }


    /*
     * Tính thời gian chơi.
     *
     * Ưu tiên:
     * 1. game_end.duration
     * 2. game_start -> game_win/loss/draw
     */
    function calculateTotalDuration() {

        let total = 0;


        const events =
            [...filteredEvents]
                .filter(event =>
                    event &&
                    event.timestamp
                )
                .sort(
                    (a, b) =>
                        Number(a.timestamp) -
                        Number(b.timestamp)
                );


        /*
         * Các game_start đang chờ kết thúc.
         *
         * Key:
         * sessionId + game
         */
        const activeGames = new Map();


        events.forEach(event => {

            const type =
                String(
                    event.type || ""
                );


            const session =
                String(
                    event.sessionId ||
                    event.uid ||
                    "unknown"
                );


            const game =
                String(
                    event.game ||
                    "unknown"
                );


            const key =
                `${session}__${game}`;


            /*
             * Bắt đầu ván.
             */
            if (type === "game_start") {

                activeGames.set(
                    key,
                    {
                        timestamp:
                            Number(
                                event.timestamp
                            )
                    }
                );

                return;
            }


            /*
             * Nếu có game_end và có duration,
             * dùng duration chính xác do Analytics ghi.
             */
            if (type === "game_end") {

                const duration =
                    Number(
                        event.duration
                    );


                if (
                    Number.isFinite(duration) &&
                    duration > 0
                ) {

                    total += duration;

                } else {

                    /*
                     * Không có duration:
                     * tính từ game_start -> game_end.
                     */
                    const start =
                        activeGames.get(key);


                    if (start) {

                        const end =
                            Number(
                                event.timestamp
                            );


                        const seconds =
                            Math.max(
                                0,
                                (end -
                                    start.timestamp) /
                                1000
                            );


                        total += seconds;

                        activeGames.delete(key);
                    }
                }

                return;
            }


            /*
             * Nếu không có game_end,
             * dùng game_win / loss / draw
             * làm điểm kết thúc.
             */
            if (
                type === "game_win" ||
                type === "game_loss" ||
                type === "game_draw"
            ) {

                const start =
                    activeGames.get(key);


                if (start) {

                    const end =
                        Number(
                            event.timestamp
                        );


                    const seconds =
                        Math.max(
                            0,
                            (end -
                                start.timestamp) /
                            1000
                        );


                    total += seconds;

                    activeGames.delete(key);
                }
            }
        });


        return Math.round(total);
    }


    function renderStats() {

        const users =
            new Set(
                filteredEvents
                    .map(event => event.uid)
                    .filter(Boolean)
            );


        const starts =
            filteredEvents.filter(
                event =>
                    event.type === "game_start"
            ).length;


        const wins =
            filteredEvents.filter(
                event =>
                    event.type === "game_win"
            ).length;


        const losses =
            filteredEvents.filter(
                event =>
                    event.type === "game_loss"
            ).length;


        const draws =
            filteredEvents.filter(
                event =>
                    event.type === "game_draw"
            ).length;


        const duration =
            calculateTotalDuration();


        $("totalPlayers").textContent =
            formatNumber(users.size);


        $("totalGames").textContent =
            formatNumber(starts);


        $("totalWins").textContent =
            formatNumber(wins);


        $("totalLosses").textContent =
            formatNumber(losses);


        $("totalDraws").textContent =
            formatNumber(draws);


        $("totalDuration").textContent =
            formatDuration(duration);
    }


    function renderBarChart(
        elementId,
        data
    ) {

        const container =
            $(elementId);

        const entries =
            Object.entries(data)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );


        if (!entries.length) {

            container.innerHTML =
                `
                <div class="empty-chart">
                    Chưa có dữ liệu
                </div>
                `;

            return;
        }


        const max =
            Math.max(
                ...entries.map(
                    entry => entry[1]
                ),
                1
            );


        container.innerHTML =
            entries
                .slice(0, 10)
                .map(
                    ([label, value]) => {

                        const width =
                            Math.max(
                                2,
                                (value / max) * 100
                            );


                        return `
                            <div class="bar-row">

                                <div
                                    class="bar-label"
                                    title="${escapeHTML(label)}"
                                >
                                    ${escapeHTML(label)}
                                </div>

                                <div class="bar-track">

                                    <div
                                        class="bar-fill"
                                        style="width:${width}%"
                                    ></div>

                                </div>

                                <div class="bar-value">
                                    ${formatNumber(value)}
                                </div>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    function renderCharts() {

        renderBarChart(
            "gameChart",
            countBy("game")
        );


        renderBarChart(
            "deviceChart",
            countBy("device")
        );


        renderBarChart(
            "boardChart",
            countBy("boardSize")
        );


        renderBarChart(
            "modeChart",
            countBy("mode")
        );
    }


    function getEventDetails(event) {

        const ignored = new Set([
            "type",
            "timestamp",
            "date",
            "uid",
            "sessionId",
            "device",
            "platform"
        ]);


        const details = [];


        Object.entries(event)
            .forEach(
                ([key, value]) => {

                    if (
                        ignored.has(key) ||
                        value === null ||
                        value === undefined ||
                        value === ""
                    ) {
                        return;
                    }


                    let text =
                        value;


                    if (
                        typeof value ===
                        "object"
                    ) {
                        try {
                            text =
                                JSON.stringify(
                                    value
                                );
                        } catch {
                            text =
                                String(value);
                        }
                    }


                    details.push(
                        `${key}: ${text}`
                    );
                }
            );


        return details.join(" • ");
    }


    function renderEvents() {

        const tbody =
            $("eventsTable");


        const events =
            [...filteredEvents]
                .sort(
                    (a, b) =>
                        Number(b.timestamp || 0) -
                        Number(a.timestamp || 0)
                )
                .slice(0, 100);


        $("eventCount").textContent =
            `${formatNumber(filteredEvents.length)} events`;


        if (!events.length) {

            tbody.innerHTML =
                `
                <tr>
                    <td
                        colspan="6"
                        style="text-align:center;color:#9298a8;padding:35px"
                    >
                        Chưa có event
                    </td>
                </tr>
                `;

            return;
        }


        tbody.innerHTML =
            events
                .map(event => {

                    const details =
                        getEventDetails(event);

                    return `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    formatDate(
                                        event.timestamp
                                    )
                                )}
                            </td>

                            <td>
                                <span class="event-type">
                                    ${escapeHTML(
                                        event.type ||
                                        "unknown"
                                    )}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(
                                    event.game ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    event.mode ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    event.device ||
                                    event.platform ||
                                    "-"
                                )}
                            </td>

                            <td
                                class="detail"
                                title="${escapeHTML(details)}"
                            >
                                ${escapeHTML(
                                    details ||
                                    "-"
                                )}
                            </td>

                        </tr>
                    `;
                })
                .join("");
    }


    function renderDashboard() {

        renderStats();

        renderCharts();

        renderEvents();


        setStatus(
            `Đang hiển thị ${formatNumber(
                filteredEvents.length
            )} / ${formatNumber(
                allEvents.length
            )} events`
        );
    }


    async function loadEvents() {

        if (!db) {

            setStatus(
                "❌ Firebase Database chưa sẵn sàng"
            );

            return;
        }


        setStatus(
            "🔄 Đang tải Analytics..."
        );


        try {

            const currentUser =
                auth.currentUser;


            if (!currentUser) {

                setStatus(
                    "❌ Chưa đăng nhập Admin"
                );

                return;
            }


            const snapshot =
                await db
                    .ref("analytics/events")
                    .once("value");


            const data =
                snapshot.val() || {};


            allEvents =
                Object.values(data)
                    .filter(
                        event =>
                            event &&
                            typeof event ===
                            "object"
                    );


            allEvents.sort(
                (a, b) =>
                    Number(b.timestamp || 0) -
                    Number(a.timestamp || 0)
            );


            populateFilters();

            applyFilters();


        } catch (error) {

            console.error(
                "Analytics error:",
                error
            );


            if (
                error &&
                error.code ===
                "PERMISSION_DENIED"
            ) {

                setStatus(
                    "❌ Firebase từ chối quyền đọc Analytics."
                );


                alert(
                    "Không thể đọc Analytics.\n\n" +
                    "Tài khoản đang đăng nhập:\n" +
                    "Email: " +
                    (
                        auth.currentUser?.email ||
                        "Không có email"
                    ) +
                    "\n\nUID:\n" +
                    (
                        auth.currentUser?.uid ||
                        "Không có UID"
                    )
                );


                return;
            }


            setStatus(
                "❌ Không thể đọc Analytics: " +
                (
                    error.message ||
                    String(error)
                )
            );
        }
    }


    async function login(
        email,
        password
    ) {

        $("loginError").textContent = "";

        $("loginButton").disabled = true;

        $("loginButton").textContent =
            "Đang đăng nhập...";


        try {

            const result =
                await auth.signInWithEmailAndPassword(
                    email,
                    password
                );


            if (
                !result ||
                !result.user
            ) {

                throw new Error(
                    "Firebase không trả về tài khoản."
                );
            }


            const user =
                result.user;


            alert(
                "✅ Đăng nhập thành công!\n\n" +
                "Email:\n" +
                (
                    user.email ||
                    "Không có email"
                ) +
                "\n\nUID:\n" +
                (
                    user.uid ||
                    "Không có UID"
                )
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            $("loginError").textContent =
                error.message ||
                "Đăng nhập thất bại";


            $("loginButton").disabled = false;

            $("loginButton").textContent =
                "Đăng nhập";
        }
    }


    function logout() {

        if (auth) {
            auth.signOut();
        }
    }


    function showDashboard(user) {

        $("loginScreen")
            .classList
            .add("hidden");

        $("dashboard")
            .classList
            .remove("hidden");


        $("adminEmail").textContent =
            user.email || "";


        loadEvents();
    }


    function showLogin() {

        $("dashboard")
            .classList
            .add("hidden");

        $("loginScreen")
            .classList
            .remove("hidden");


        $("loginButton").disabled = false;

        $("loginButton").textContent =
            "Đăng nhập";
    }


    function initFirebase() {

        try {

            if (!firebase.apps.length) {

                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            }


            auth =
                firebase.auth();

            db =
                firebase.database();


            auth.onAuthStateChanged(
                user => {

                    if (user) {

                        showDashboard(user);

                    } else {

                        showLogin();

                    }
                }
            );


        } catch (error) {

            console.error(
                "Firebase init error:",
                error
            );


            setStatus(
                "❌ Firebase lỗi: " +
                (
                    error.message ||
                    String(error)
                )
            );
        }
    }


    $("loginForm")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                login(
                    $("email").value.trim(),
                    $("password").value
                );
            }
        );


    $("logoutButton")
        .addEventListener(
            "click",
            logout
        );


    $("refreshButton")
        .addEventListener(
            "click",
            loadEvents
        );


    $("applyFilter")
        .addEventListener(
            "click",
            applyFilters
        );


    initFirebase();

})();
