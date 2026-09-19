/* =========================================================
   GAMEHUB — HUB.JS
   Firebase + Authentication + Lobby Presence
   + Public Statistics + Music
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       BASIC
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


    /* =====================================================
       LOBBY PRESENCE
    ===================================================== */

    let lobbyPresenceRef = null;

    let lobbyHeartbeat = null;

    let lobbyConnectedRef = null;

    let lobbyConnectedListener = null;


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
       AUTH HELPERS
    ===================================================== */

    function normalizeUsername(
        username
    ) {

        return username
            .trim()
            .toLowerCase();

    }


    function usernameToEmail(
        username
    ) {

        return (
            normalizeUsername(username) +
            "@gamehub.local"
        );

    }


    function isValidUsername(
        username
    ) {

        return /^[a-zA-Z0-9_]{3,20}$/
            .test(username);

    }


    /* =====================================================
       AUTH MODAL
    ===================================================== */

    function openAuthModal() {

        const modal =
            document.querySelector(
                "#authModal"
            );


        if (!modal) {

            return;

        }


        modal.classList.remove(
            "hidden"
        );

        modal.style.display =
            "flex";

    }


    function closeAuthModal() {

        const modal =
            document.querySelector(
                "#authModal"
            );


        if (!modal) {

            return;

        }


        modal.classList.add(
            "hidden"
        );

        modal.style.display =
            "none";

    }


    /* =====================================================
   USER PROFILE
===================================================== */

let profileMenu = null;


/* =====================================================
   TẠO MENU HỒ SƠ
===================================================== */

function createProfileMenu() {

    if (profileMenu) {
        return profileMenu;
    }


    const profile =
        document.querySelector(
            "#userProfile"
        );


    if (!profile) {
        return null;
    }


    /*
     * Tạo menu bằng JavaScript
     * => không cần sửa index.html
     * => không cần sửa hub.css
     */

    profileMenu =
        document.createElement(
            "div"
        );


    profileMenu.id =
        "gamehubProfileMenu";


    profileMenu.innerHTML = `

        <div class="gamehub-profile-menu-header">

            <div class="gamehub-profile-menu-avatar">
                👤
            </div>

            <div class="gamehub-profile-menu-info">

                <strong
                    id="gamehubProfileMenuName"
                >
                    Người chơi
                </strong>

                <span
                    id="gamehubProfileMenuStatus"
                >
                    🟢 Đang online
                </span>

            </div>

        </div>


        <div class="gamehub-profile-menu-divider"></div>


        <button
            type="button"
            id="gamehubLogoutButton"
            class="gamehub-profile-logout"
        >
            <span>🚪</span>
            <span id="gamehubLogoutText">
                Đăng xuất
            </span>
        </button>

    `;


    /*
     * Style trực tiếp bằng JS.
     * Không cần sửa hub.css.
     */

    Object.assign(
        profileMenu.style,
        {
            position:
                "absolute",

            top:
                "calc(100% + 8px)",

            right:
                "0",

            width:
                "235px",

            padding:
                "10px",

            background:
                "#ffffff",

            border:
                "1px solid #e5e0ef",

            borderRadius:
                "16px",

            boxShadow:
                "0 14px 35px rgba(40, 25, 80, 0.16)",

            zIndex:
                "9999",

            display:
                "none",

            boxSizing:
                "border-box",

            fontFamily:
                "inherit"
        }
    );


    /*
     * Header
     */

    const header =
        profileMenu.querySelector(
            ".gamehub-profile-menu-header"
        );


    Object.assign(
        header.style,
        {
            display:
                "flex",

            alignItems:
                "center",

            gap:
                "10px",

            padding:
                "7px 7px 9px"
        }
    );


    /*
     * Avatar
     */

    const menuAvatar =
        profileMenu.querySelector(
            ".gamehub-profile-menu-avatar"
        );


    Object.assign(
        menuAvatar.style,
        {
            width:
                "38px",

            height:
                "38px",

            minWidth:
                "38px",

            borderRadius:
                "50%",

            background:
                "#f5f2ff",

            border:
                "1px solid #ded8ed",

            display:
                "flex",

            alignItems:
                "center",

            justifyContent:
                "center",

            fontSize:
                "20px"
        }
    );


    /*
     * Thông tin
     */

    const info =
        profileMenu.querySelector(
            ".gamehub-profile-menu-info"
        );


    Object.assign(
        info.style,
        {
            minWidth:
                "0",

            display:
                "flex",

            flexDirection:
                "column",

            gap:
                "4px"
        }
    );


    const menuName =
        profileMenu.querySelector(
            "#gamehubProfileMenuName"
        );


    Object.assign(
        menuName.style,
        {
            color:
                "#211a32",

            fontSize:
                "14px",

            fontWeight:
                "800",

            overflow:
                "hidden",

            textOverflow:
                "ellipsis",

            whiteSpace:
                "nowrap",

            maxWidth:
                "155px"
        }
    );


    const menuStatus =
        profileMenu.querySelector(
            "#gamehubProfileMenuStatus"
        );


    Object.assign(
        menuStatus.style,
        {
            color:
                "#6f6780",

            fontSize:
                "11px",

            fontWeight:
                "600"
        }
    );


    /*
     * Divider
     */

    const divider =
        profileMenu.querySelector(
            ".gamehub-profile-menu-divider"
        );


    Object.assign(
        divider.style,
        {
            height:
                "1px",

            background:
                "#eeeaf5",

            margin:
                "2px 4px 7px"
        }
    );


    /*
     * Nút đăng xuất
     */

    const logoutButton =
        profileMenu.querySelector(
            "#gamehubLogoutButton"
        );


    Object.assign(
        logoutButton.style,
        {
            width:
                "100%",

            height:
                "42px",

            border:
                "none",

            borderRadius:
                "11px",

            background:
                "transparent",

            color:
                "#c0392b",

            display:
                "flex",

            alignItems:
                "center",

            gap:
                "10px",

            padding:
                "0 12px",

            fontSize:
                "13px",

            fontWeight:
                "800",

            cursor:
                "pointer",

            textAlign:
                "left",

            fontFamily:
                "inherit",

            transition:
                "background 0.15s ease"
        }
    );


    logoutButton.addEventListener(
        "mouseenter",
        () => {

            logoutButton.style.background =
                "#fff1ef";

        }
    );


    logoutButton.addEventListener(
        "mouseleave",
        () => {

            logoutButton.style.background =
                "transparent";

        }
    );


    /*
     * Click đăng xuất
     */

    logoutButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            event.stopPropagation();


            await logoutUser();

        }
    );


    /*
     * Quan trọng:
     * profile cần position: relative
     * để menu nằm đúng bên dưới.
     */

    if (
        getComputedStyle(profile).position ===
        "static"
    ) {

        profile.style.position =
            "relative";

    }


    profile.appendChild(
        profileMenu
    );


    return profileMenu;

}


/* =====================================================
   MỞ / ĐÓNG MENU HỒ SƠ
===================================================== */

function toggleProfileMenu() {

    const menu =
        createProfileMenu();


    if (!menu) {
        return;
    }


    const isOpen =
        menu.style.display ===
        "block";


    menu.style.display =
        isOpen
            ? "none"
            : "block";

}


function closeProfileMenu() {

    if (!profileMenu) {
        return;
    }


    profileMenu.style.display =
        "none";

}


/* =====================================================
   ĐĂNG XUẤT
===================================================== */

async function logoutUser() {

    if (!auth) {
        return;
    }


    const logoutButton =
        document.querySelector(
            "#gamehubLogoutButton"
        );

    const logoutText =
        document.querySelector(
            "#gamehubLogoutText"
        );


    try {

        if (logoutButton) {

            logoutButton.disabled =
                true;

            logoutButton.style.opacity =
                "0.6";

            logoutButton.style.cursor =
                "wait";

        }


        if (logoutText) {

            logoutText.textContent =
                "Đang đăng xuất...";

        }


        /*
         * Xóa presence ngay lập tức.
         *
         * onDisconnect vẫn được giữ làm
         * phương án dự phòng nếu mất mạng.
         */

        if (lobbyPresenceRef) {

            try {

                await lobbyPresenceRef.remove();

            } catch (error) {

                console.warn(
                    "GameHub logout presence lỗi:",
                    error
                );

            }

        }


        /*
         * Dừng heartbeat.
         */

        if (lobbyHeartbeat) {

            clearInterval(
                lobbyHeartbeat
            );

            lobbyHeartbeat =
                null;

        }


        /*
         * Đăng xuất Firebase.
         */

        await auth.signOut();


        currentUser =
            null;

        authReady =
            false;


        closeProfileMenu();


        console.log(
            "GameHub: Đã đăng xuất."
        );


    } catch (error) {

        console.error(
            "GameHub Logout ERROR:",
            error
        );


        if (logoutText) {

            logoutText.textContent =
                "Đăng xuất";

        }

    } finally {

        if (logoutButton) {

            logoutButton.disabled =
                false;

            logoutButton.style.opacity =
                "1";

            logoutButton.style.cursor =
                "pointer";

        }

    }

}


/* =====================================================
   SETUP PROFILE
===================================================== */

function setupUserProfile() {

    const profile =
        document.querySelector(
            "#userProfile"
        );


    if (!profile) {
        return;
    }


    createProfileMenu();


    /*
     * Bấm vào avatar / username
     */

    profile.addEventListener(
        "click",
        event => {

            /*
             * Nếu click vào nút đăng xuất
             * thì không toggle menu.
             */

            if (
                event.target.closest(
                    "#gamehubLogoutButton"
                )
            ) {

                return;

            }


            event.preventDefault();

            event.stopPropagation();


            toggleProfileMenu();

        }
    );


    /*
     * Bấm ra ngoài => đóng menu
     */

    document.addEventListener(
        "click",
        event => {

            if (
                !profile.contains(
                    event.target
                )
            ) {

                closeProfileMenu();

            }

        }
    );


    /*
     * ESC => đóng menu
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeProfileMenu();

            }

        }
    );

}


/* =====================================================
   CẬP NHẬT HỒ SƠ
===================================================== */

function updateUserProfile(
    user
) {

    const profile =
        document.querySelector(
            "#userProfile"
        );

    const avatar =
        document.querySelector(
            "#userAvatar"
        );

    const displayName =
        document.querySelector(
            "#userDisplayName"
        );


    if (
        !profile ||
        !avatar ||
        !displayName
    ) {

        return;

    }


    /*
     * Chưa đăng nhập
     */

    if (!user) {

        profile.classList.add(
            "hidden"
        );

        closeProfileMenu();

        return;

    }


    /*
     * Avatar
     */

    avatar.innerHTML =
        "👤";


    /*
     * Guest
     */

    if (user.isAnonymous) {

        displayName.textContent =
            "Khách";


        profile.classList.remove(
            "hidden"
        );


        createProfileMenu();


        const menuName =
            document.querySelector(
                "#gamehubProfileMenuName"
            );

        const menuStatus =
            document.querySelector(
                "#gamehubProfileMenuStatus"
            );

        const logoutText =
            document.querySelector(
                "#gamehubLogoutText"
            );


        if (menuName) {

            menuName.textContent =
                "Khách";

        }


        if (menuStatus) {

            menuStatus.textContent =
                "🟢 Chơi với tư cách khách";

        }


        if (logoutText) {

            logoutText.textContent =
                "Thoát khách";

        }


        return;

    }


    /*
     * Tài khoản thật
     */

    profile.classList.remove(
        "hidden"
    );


    displayName.textContent =
        "Đang tải...";


    createProfileMenu();


    const menuName =
        document.querySelector(
            "#gamehubProfileMenuName"
        );

    const menuStatus =
        document.querySelector(
            "#gamehubProfileMenuStatus"
        );

    const logoutText =
        document.querySelector(
            "#gamehubLogoutText"
        );


    if (menuName) {

        menuName.textContent =
            "Đang tải...";

    }


    if (menuStatus) {

        menuStatus.textContent =
            "🟢 Đang online";

    }


    if (logoutText) {

        logoutText.textContent =
            "Đăng xuất";

    }


    if (!database) {

        displayName.textContent =
            "Người chơi";

        if (menuName) {

            menuName.textContent =
                "Người chơi";

        }

        return;

    }


    database
        .ref(
            `users/${user.uid}/username`
        )
        .once("value")
        .then(
            snapshot => {

                /*
                 * Nếu trong lúc tải username
                 * người dùng đã đổi tài khoản
                 * thì bỏ qua kết quả cũ.
                 */

                if (
                    !currentUser ||
                    currentUser.uid !==
                    user.uid
                ) {

                    return;

                }


                const username =
                    snapshot.val() ||
                    "Người chơi";


                displayName.textContent =
                    username;


                if (menuName) {

                    menuName.textContent =
                        username;

                }

            }
        )
        .catch(
            error => {

                console.warn(
                    "GameHub username lỗi:",
                    error
                );


                displayName.textContent =
                    "Người chơi";


                if (menuName) {

                    menuName.textContent =
                        "Người chơi";

                }

            }
        );

}


    /* =====================================================
       AUTH UI
    ===================================================== */

    function setupAuthUI() {

        const authModal =
            document.querySelector(
                "#authModal"
            );

        const loginPanel =
            document.querySelector(
                "#loginPanel"
            );

        const registerPanel =
            document.querySelector(
                "#registerPanel"
            );

        const showRegisterButton =
            document.querySelector(
                "#showRegisterButton"
            );

        const backToLoginButton =
            document.querySelector(
                "#backToLoginButton"
            );

        const loginButton =
            document.querySelector(
                "#loginButton"
            );

        const registerButton =
            document.querySelector(
                "#registerButton"
            );

        const guestButton =
            document.querySelector(
                "#guestButton"
            );

        const closeButton =
            document.querySelector(
                "#closeAuthButton"
            );


        if (
            !authModal ||
            !loginPanel ||
            !registerPanel
        ) {

            console.warn(
                "GameHub Auth UI: Không tìm thấy modal."
            );

            return;

        }


        function showLoginPanel() {

            loginPanel.classList.remove(
                "hidden"
            );

            registerPanel.classList.add(
                "hidden"
            );

            loginPanel.style.display =
                "block";

            registerPanel.style.display =
                "none";

        }


        function showRegisterPanel() {

            loginPanel.classList.add(
                "hidden"
            );

            registerPanel.classList.remove(
                "hidden"
            );

            loginPanel.style.display =
                "none";

            registerPanel.style.display =
                "block";

        }


        showLoginPanel();


        /* =================================================
           ĐĂNG KÝ PANEL
        ================================================= */

        if (showRegisterButton) {

            showRegisterButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showRegisterPanel();

                }
            );

        }


        /* =================================================
           QUAY LẠI LOGIN
        ================================================= */

        if (backToLoginButton) {

            backToLoginButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showLoginPanel();

                }
            );

        }


        /* =================================================
           GUEST
        ================================================= */

        async function enterAsGuest() {

            const message =
                document.querySelector(
                    "#loginMessage"
                );


            try {

                if (!auth) {

                    if (message) {

                        message.textContent =
                            "Firebase Auth chưa sẵn sàng.";

                    }

                    return;

                }


                if (guestButton) {

                    guestButton.disabled =
                        true;

                    guestButton.textContent =
                        "Đang vào...";

                }


                if (closeButton) {

                    closeButton.disabled =
                        true;

                }


                /*
                 * Nếu đang là tài khoản thật,
                 * không tự biến thành Guest.
                 */

                if (
                    auth.currentUser &&
                    !auth.currentUser.isAnonymous
                ) {

                    currentUser =
                        auth.currentUser;

                } else if (
                    !auth.currentUser
                ) {

                    const credential =
                        await auth
                            .signInAnonymously();

                    currentUser =
                        credential.user;

                } else {

                    currentUser =
                        auth.currentUser;

                }


                authReady =
                    true;


                updateUserProfile(
                    currentUser
                );


                await setupLobbyPresence();


                closeAuthModal();


            } catch (error) {

                console.error(
                    "GameHub Guest ERROR:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Không thể vào khách: " +
                        (
                            error.message ||
                            "Lỗi không xác định."
                        );

                }

            } finally {

                if (guestButton) {

                    guestButton.disabled =
                        false;

                    guestButton.textContent =
                        "👤 Chơi khách";

                }


                if (closeButton) {

                    closeButton.disabled =
                        false;

                }

            }

        }


        if (guestButton) {

            guestButton.addEventListener(
                "click",
                enterAsGuest
            );

        }


        /*
         * X = Guest
         */

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                enterAsGuest
            );

        }


        /* =================================================
           ĐĂNG NHẬP
        ================================================= */

        if (loginButton) {

            loginButton.addEventListener(
                "click",
                async () => {

                    const username =
                        document
                            .querySelector(
                                "#loginUsername"
                            )
                            ?.value
                            .trim();

                    const password =
                        document
                            .querySelector(
                                "#loginPassword"
                            )
                            ?.value;

                    const message =
                        document.querySelector(
                            "#loginMessage"
                        );


                    if (
                        !username ||
                        !password
                    ) {

                        if (message) {

                            message.textContent =
                                "Vui lòng nhập tên người dùng và mật khẩu.";

                        }

                        return;

                    }


                    try {

                        loginButton.disabled =
                            true;

                        loginButton.textContent =
                            "Đang đăng nhập...";


                        const email =
                            usernameToEmail(
                                username
                            );


                        const credential =
                            await auth
                                .signInWithEmailAndPassword(
                                    email,
                                    password
                                );


                        currentUser =
                            credential.user;

                        authReady =
                            true;


                        updateUserProfile(
                            currentUser
                        );


                        await setupLobbyPresence();


                        closeAuthModal();


                    } catch (error) {

                        console.error(
                            "GameHub Login ERROR:",
                            error
                        );


                        if (message) {

                            if (
                                error.code ===
                                "auth/invalid-credential" ||
                                error.code ===
                                "auth/user-not-found" ||
                                error.code ===
                                "auth/wrong-password"
                            ) {

                                message.textContent =
                                    "Tên người dùng hoặc mật khẩu không đúng.";

                            } else {

                                message.textContent =
                                    error.message ||
                                    "Đăng nhập thất bại.";

                            }

                        }

                    } finally {

                        loginButton.disabled =
                            false;

                        loginButton.textContent =
                            "Đăng nhập";

                    }

                }
            );

        }


        /* =================================================
           ĐĂNG KÝ
        ================================================= */

        if (registerButton) {

            registerButton.addEventListener(
                "click",
                async () => {

                    const username =
                        document
                            .querySelector(
                                "#registerUsername"
                            )
                            ?.value
                            .trim();

                    const password =
                        document
                            .querySelector(
                                "#registerPassword"
                            )
                            ?.value;

                    const confirmPassword =
                        document
                            .querySelector(
                                "#registerPasswordConfirm"
                            )
                            ?.value;

                    const message =
                        document.querySelector(
                            "#registerMessage"
                        );


                    if (
                        !isValidUsername(
                            username
                        )
                    ) {

                        if (message) {

                            message.textContent =
                                "Tên người dùng phải có 3–20 ký tự, chỉ gồm chữ, số và _.";

                        }

                        return;

                    }


                    if (
                        password.length < 6
                    ) {

                        if (message) {

                            message.textContent =
                                "Mật khẩu phải có ít nhất 6 ký tự.";

                        }

                        return;

                    }


                    if (
                        password !==
                        confirmPassword
                    ) {

                        if (message) {

                            message.textContent =
                                "Mật khẩu xác nhận không khớp.";

                        }

                        return;

                    }


                    try {

                        registerButton.disabled =
                            true;

                        registerButton.textContent =
                            "Đang tạo tài khoản...";


                        const normalized =
                            normalizeUsername(
                                username
                            );


                        const email =
                            usernameToEmail(
                                username
                            );


                        const credential =
                            await auth
                                .createUserWithEmailAndPassword(
                                    email,
                                    password
                                );


                        const user =
                            credential.user;


                        const usernameRef =
                            database.ref(
                                `usernames/${normalized}`
                            );


                        const transaction =
                            await usernameRef.transaction(
                                currentValue => {

                                    if (
                                        currentValue !==
                                        null
                                    ) {

                                        return;

                                    }


                                    return user.uid;

                                }
                            );


                        if (
                            !transaction.committed ||
                            transaction.snapshot.val() !==
                            user.uid
                        ) {

                            await user.delete();


                            throw new Error(
                                "Tên người dùng này đã được sử dụng."
                            );

                        }


                        await database
                            .ref(
                                `users/${user.uid}`
                            )
                            .set({

                                username:
                                    username,

                                usernameNormalized:
                                    normalized,

                                createdAt:
                                    firebase
                                        .database
                                        .ServerValue
                                        .TIMESTAMP

                            });


                        currentUser =
                            user;

                        authReady =
                            true;


                        updateUserProfile(
                            currentUser
                        );


                        await setupLobbyPresence();


                        closeAuthModal();


                    } catch (error) {

                        console.error(
                            "GameHub Register ERROR:",
                            error
                        );


                        if (message) {

                            if (
                                error.code ===
                                "auth/email-already-in-use"
                            ) {

                                message.textContent =
                                    "Tên người dùng này đã được sử dụng.";

                            } else {

                                message.textContent =
                                    error.message ||
                                    "Đăng ký thất bại.";

                            }

                        }

                    } finally {

                        registerButton.disabled =
                            false;

                        registerButton.textContent =
                            "Đăng ký";

                    }

                }
            );

        }


        window.GameHubAuthUI = {

            showLogin:
                showLoginPanel,

            showRegister:
                showRegisterPanel,

            open:
                openAuthModal,

            close:
                closeAuthModal

        };

    }


    /* =====================================================
       FIREBASE INIT
    ===================================================== */

    async function initFirebaseDatabase() {

        if (
            typeof firebase ===
            "undefined"
        ) {

            console.error(
                "GameHub: Firebase SDK chưa tải."
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

            auth =
                firebaseApp.auth();

            firebaseReady =
                true;


            console.log(
                "GameHub Firebase: READY"
            );


            return true;

        } catch (error) {

            console.error(
                "GameHub Firebase ERROR:",
                error
            );


            return false;

        }

    }


    /* =====================================================
       AUTH STATE
    ===================================================== */

    function setupAuth() {

        if (
            !firebaseApp ||
            !auth
        ) {

            return false;

        }


        /*
         * QUAN TRỌNG:
         *
         * KHÔNG signOut anonymous ở đây.
         *
         * Firebase sẽ giữ phiên đăng nhập
         * khi chuyển:
         *
         * Hub -> Game -> Hub
         */

        auth.onAuthStateChanged(
            async user => {

                currentUser =
                    user;

                authReady =
                    !!user;


                if (user) {

                    console.log(
                        "GameHub Auth:",
                        user.isAnonymous
                            ? "GUEST"
                            : "ACCOUNT"
                    );

                    console.log(
                        "GameHub UID:",
                        user.uid
                    );


                    /*
                     * Đã có tài khoản / Guest
                     * => đóng modal.
                     */

                    closeAuthModal();


                    /*
                     * Hiện avatar + username.
                     */

                    updateUserProfile(
                        user
                    );


                    /*
                     * Presence Hub.
                     */

                    await setupLobbyPresence();

                } else {

                    currentUser =
                        null;

                    authReady =
                        false;


                    updateUserProfile(
                        null
                    );


                    /*
                     * Chưa đăng nhập
                     * => mở modal.
                     */

                    openAuthModal();

                }

            }
        );


        /*
         * Nếu Firebase đã có user từ trước,
         * không được bắt đăng nhập lại.
         */

        if (auth.currentUser) {

            currentUser =
                auth.currentUser;

            authReady =
                true;

            closeAuthModal();

            updateUserProfile(
                currentUser
            );

        } else {

            openAuthModal();

        }


        return true;

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

        } catch (error) {

            console.warn(
                "GameHub presence update lỗi:",
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


        if (lobbyHeartbeat) {

            clearInterval(
                lobbyHeartbeat
            );

            lobbyHeartbeat =
                null;

        }


        const uid =
            currentUser.uid;


        lobbyPresenceRef =
            database.ref(
                `presence/${uid}/${lobbySessionId}`
            );


        try {

            await lobbyPresenceRef
                .onDisconnect()
                .remove();

        } catch (error) {

            console.warn(
                "GameHub onDisconnect lỗi:",
                error
            );

        }


        if (!lobbyConnectedRef) {

            lobbyConnectedRef =
                database.ref(
                    ".info/connected"
                );

        }


        if (!lobbyConnectedListener) {

            lobbyConnectedListener =
                lobbyConnectedRef.on(
                    "value",
                    async snapshot => {

                        if (
                            snapshot.val() !==
                            true
                        ) {

                            return;

                        }


                        if (
                            !lobbyPresenceRef ||
                            !currentUser
                        ) {

                            return;

                        }


                        try {

                            await lobbyPresenceRef
                                .onDisconnect()
                                .remove();

                            await updateLobbyPresence();

                        } catch (error) {

                            console.warn(
                                "GameHub reconnect lỗi:",
                                error
                            );

                        }

                    }
                );

        }


        lobbyHeartbeat =
            setInterval(
                updateLobbyPresence,
                20000
            );


        await updateLobbyPresence();

    }


    /* =====================================================
       ONLINE UI
    ===================================================== */

    function updateOnlineUI(
        users
    ) {

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
       GAME ONLINE
    ===================================================== */

    function updateGameOnlineUI(
        users
    ) {

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
                    gameUsers[user.game]
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


                if (element) {

                    element.textContent =
                        gameUsers[
                            gameId
                        ].size;

                }

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


                Object.keys(
                    data
                ).forEach(
                    uid => {

                        const sessions =
                            data[uid];


                        if (
                            !sessions ||
                            typeof sessions !==
                            "object"
                        ) {

                            return;

                        }


                        /*
                         * Hỗ trợ dữ liệu cũ.
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

                                    uid,

                                    sessionId:
                                        "legacy",

                                    game:
                                        sessions.game ||
                                        "unknown",

                                    online:
                                        true

                                });

                            }


                            return;

                        }


                        /*
                         * Session mới.
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

                                    uid,

                                    sessionId,

                                    game:
                                        session.game ||
                                        "unknown",

                                    online:
                                        true

                                });

                            }
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


        database
            .ref(
                `analytics/daily/${date}/players`
            )
            .on(
                "value",
                snapshot => {

                    const data =
                        snapshot.val() || {};

                    const count =
                        Object.keys(
                            data
                        ).length;


                    const element =
                        document.querySelector(
                            "#analyticsPlayersToday"
                        );


                    if (element) {

                        element.textContent =
                            formatNumber(
                                count
                            );

                    }

                }
            );

    }


    /* =====================================================
       GAME CONFIG
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
       ANALYTICS HELPERS
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


                bar.style.height =
                    Math.max(
                        4,
                        Math.round(
                            (
                                item.plays /
                                max
                            ) * 150
                        )
                    ) + "px";


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
                        dailyData[date] || {};

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


            const dates =
                getLastSevenDates();


            renderAnalyticsChart(
                dates.map(
                    date => {

                        const plays =
                            (
                                dailyData[
                                    date
                                ] || {}
                            ).plays || {};


                        return {

                            date,

                            plays:
                                Object.keys(
                                    plays
                                ).length

                        };

                    }
                )
            );

        } catch (error) {

            console.error(
                "GameHub Analytics ERROR:",
                error
            );

            const chart =
                document.querySelector(
                    "#analyticsChart"
                );


            const games =
                document.querySelector(
                    "#analyticsGames"
                );


            if (chart) {

                chart.innerHTML = `
                    <div class="analytics-error">
                        Không thể tải dữ liệu thống kê.
                    </div>
                `;

            }


            if (games) {

                games.innerHTML = `
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


        database
            .ref(
                "gameStats"
            )
            .on(
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

                }
            );

    }


    /* =====================================================
       FIREBASE START
    ===================================================== */

    async function setupFirebaseStats() {

        const success =
            await initFirebaseDatabase();


        if (!success) {

            return;

        }


        setupPublicAnalytics();

        setupDailyPlayersListener();

        setupAuth();

        setupPresenceListener();

        setupGameStats();

    }


    /* =====================================================
       MUSIC
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
                <polygon
                    points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                ></polygon>

                <line x1="23" y1="9" x2="17" y2="15"></line>

                <line x1="17" y1="9" x2="23" y2="15"></line>
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

                /* Safari/iPhone chặn autoplay */

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
                        once:
                            true,

                        passive:
                            true
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


                    document
                        .querySelectorAll(
                            ".game-card"
                        )
                        .forEach(
                            card => {

                                const status =
                                    card.dataset.game;


                                let show =
                                    true;


                                if (
                                    filter ===
                                    "available"
                                ) {

                                    show =
                                        status ===
                                        "available";

                                } else if (
                                    filter ===
                                    "soon"
                                ) {

                                    show =
                                        status ===
                                        "soon";

                                }


                                card.classList.toggle(
                                    "hidden",
                                    !show
                                );

                            }
                        );

                }
            );

        }
    );


    /* =====================================================
       LOCAL PLAY COUNT
    ===================================================== */

    const PLAY_COUNT_PREFIX =
        "gamehub_play_count_";


    function getGameId(
        card
    ) {

        return (
            card.dataset.gameId ||
            card.dataset.id ||
            ""
        );

    }


    function getPlayCount(
        gameId
    ) {

        return Number(
            localStorage.getItem(
                PLAY_COUNT_PREFIX +
                gameId
            ) || 0
        );

    }


    function increasePlayCount(
        gameId
    ) {

        const next =
            getPlayCount(
                gameId
            ) + 1;


        localStorage.setItem(
            PLAY_COUNT_PREFIX +
            gameId,
            String(next)
        );


        return next;

    }


    function loadPlayCounts() {

        document
            .querySelectorAll(
                ".game-card"
            )
            .forEach(
                card => {

                    const gameId =
                        getGameId(
                            card
                        );


                    if (!gameId) {

                        return;

                    }


                    card.dataset.playCount =
                        String(
                            getPlayCount(
                                gameId
                            )
                        );

                }
            );

    }


    /* =====================================================
       POPULAR
    ===================================================== */

    function updatePopularBadge() {

        const cards =
            [
                ...document.querySelectorAll(
                    ".game-card[data-game-id]"
                )
            ];


        cards.forEach(
            card => {

                const old =
                    card.querySelector(
                        ".popular-badge"
                    );


                if (old) {

                    old.remove();

                }

            }
        );


        cards.sort(
            (a, b) =>
                Number(
                    b.dataset.playCount || 0
                ) -
                Number(
                    a.dataset.playCount || 0
                )
        );


        const card =
            cards[0];


        if (!card) {

            return;

        }


        const count =
            Number(
                card.dataset.playCount || 0
            );


        if (count <= 0) {

            return;

        }


        const wrapper =
            card.querySelector(
                ".game-thumbnail-wrap"
            );


        if (!wrapper) {

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


        wrapper.appendChild(
            badge
        );

    }


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
                    () => img.remove()
                );


                wrapper.insertBefore(
                    img,
                    wrapper.firstChild
                );

            }
        );

    }


    /* =====================================================
       GOOGLE ANALYTICS
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
       TOUCH
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
            passive:
                false
        }
    );


    /* =====================================================
       INIT
    ===================================================== */

    function initGameHub() {

        setupAuthUI();
        setupUserProfile();

        loadPlayCounts();

        updatePopularBadge();

        loadGameImages();

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


    /* =====================================================
       START FIREBASE
    ===================================================== */

    setupFirebaseStats();


})();
