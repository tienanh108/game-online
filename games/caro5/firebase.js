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
        messagingSenderId: "473059233945",
        appId: "1:473059233945:web:7bbf037f41a8a8d331e808",
        measurementId: "G-WXXMSSSN3W"
    };

    let firebaseAuth = null;
    let firebaseDB = null;
    let initialized = false;

    function status(text) {
        const el = document.getElementById("firebaseStatus");

        if (el) {
            el.textContent = text;
        }

        console.log(text);
    }

    function initFirebase() {
        try {
            status("🟡 Đang khởi tạo Firebase...");

            if (typeof firebase === "undefined") {
                throw new Error(
                    "Firebase SDK chưa được tải"
                );
            }

            if (!firebase.apps.length) {
                firebase.initializeApp(
                    FIREBASE_CONFIG
                );
            }

            firebaseAuth = firebase.auth();
            firebaseDB = firebase.database();

            initialized = true;

            status(
                "🟢 Firebase đã khởi tạo"
            );

            return true;

        } catch (error) {
            console.error(
                "FIREBASE ERROR:",
                error
            );

            status(
                "🔴 Firebase lỗi: " +
                String(error)
            );

            return false;
        }
    }

    async function ensureAuthenticated() {
        if (!initialized) {
            const ok = initFirebase();

            if (!ok) {
                return false;
            }
        }

        try {
            if (firebaseAuth.currentUser) {
                status(
                    "🟢 Firebase đã đăng nhập"
                );

                return true;
            }

            status(
                "🟡 Đang đăng nhập..."
            );

            const result =
                await firebaseAuth
                    .signInAnonymously();

            if (!result || !result.user) {
                throw new Error(
                    "Firebase không trả về user"
                );
            }

            status(
                "🟢 Firebase đã đăng nhập"
            );

            return true;

        } catch (error) {
            console.error(
                "FIREBASE AUTH ERROR:",
                error
            );

            status(
                "🔴 Firebase đăng nhập lỗi: " +
                String(error)
            );

            return false;
        }
    }

    function getFirebaseUser() {
        return firebaseAuth
            ? firebaseAuth.currentUser
            : null;
    }

    function getFirebaseAuth() {
        return firebaseAuth;
    }

    function getFirebaseDatabase() {
        return firebaseDB;
    }

    function isFirebaseReady() {
        return initialized;
    }

    window.initFirebase =
        initFirebase;

    window.ensureAuthenticated =
        ensureAuthenticated;

    window.ensureFirebaseAuthenticated =
        ensureAuthenticated;

    window.getFirebaseUser =
        getFirebaseUser;

    window.getFirebaseAuth =
        getFirebaseAuth;

    window.getFirebaseDatabase =
        getFirebaseDatabase;

    window.isFirebaseReady =
        isFirebaseReady;

    initFirebase();
})();
