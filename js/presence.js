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
            "1:473059233945:web:7bbf037f41a8a8d331e808"
    };


    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }


    const auth = firebase.auth();
    const db = firebase.database();


    /*
        Đọc game hiện tại từ HTML.

        Ví dụ:

        <body data-game="caro5">

        hoặc:

        <body data-game="flappy-bird">
    */

    const currentGame =
        document.body.dataset.game || "GameHub";


    let heartbeatTimer = null;


    auth.signInAnonymously()
        .then(user => {

            const uid = user.uid;

            const presenceRef =
                db.ref("presence/" + uid);


            /*
                Khi mất kết nối:
                Firebase tự động xoá người chơi.
            */

            presenceRef.onDisconnect().remove();


            /*
                Ghi trạng thái online.
            */

            function updatePresence() {

                return presenceRef.set({

                    game: currentGame,

                    lastSeen:
                        firebase.database.ServerValue.TIMESTAMP

                });

            }


            updatePresence();


            /*
                Heartbeat mỗi 20 giây.
            */

            heartbeatTimer =
                setInterval(
                    updatePresence,
                    20000
                );


            /*
                Khi chuyển tab:
                vẫn giữ online nhưng cập nhật lại.
            */

            document.addEventListener(
                "visibilitychange",
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        updatePresence();

                    }

                }
            );

        })
        .catch(error => {

            console.error(
                "Presence auth error:",
                error
            );

        });


    /*
        Không cố tự remove bằng beforeunload.

        onDisconnect của Firebase đáng tin cậy
        hơn cho trường hợp đóng tab,
        mất mạng hoặc tắt trình duyệt.
    */

})();
