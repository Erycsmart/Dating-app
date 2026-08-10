/*==================================
    FIREBASE MESSAGING SERVICE WORKER
==================================*/

importScripts(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);


/*==================================
        FIREBASE CONFIG
==================================*/

firebase.initializeApp({

    apiKey:
        "AIzaSyCUlxyJ_-zks_5ezhLJxp3Dfhp7vymUGIE",

    authDomain:
        "nansubuga-869c6.firebaseapp.com",

    projectId:
        "nansubuga-869c6",

    storageBucket:
        "nansubuga-869c6.firebasestorage.app",

    messagingSenderId:
        "56571829269",

    appId:
        "1:56571829269:web:1bffe1d71cfe8a97fc821c"

});


const messaging =
    firebase.messaging();


/*==================================
        BACKGROUND CALL
==================================*/

messaging.onBackgroundMessage(

    payload => {

        console.log(
            "BACKGROUND FCM:",
            payload
        );


        const data =
            payload.data || {};


        const callerName =
            data.callerName ||
            "Someone";


        const callType =
            data.callType ||
            "audio";


        const title =
            callType === "video"

                ? "Incoming video call"

                : "Incoming call";


        const options = {

            body:
                callerName +
                " is calling you",

            icon:
                data.callerPhoto ||
                "/assets/avatar.png",

            badge:
                "/assets/avatar.png",

            tag:
                "incoming-call-" +
                (data.callId || Date.now()),

            requireInteraction:
                true,

            vibrate: [

                300,
                150,
                300,
                150,
                600

            ],

            data: {

                callId:
                    data.callId,

                callerId:
                    data.callerId,

                callType:
                    callType

            }

        };


        self.registration.showNotification(

            title,

            options

        );

    }

);


/*==================================
        NOTIFICATION CLICK
==================================*/

self.addEventListener(

    "notificationclick",

    event => {

        event.notification.close();


        const data =
            event.notification.data || {};


        const callId =
            data.callId;


        if(!callId){

            return;

        }


        const callUrl =
            "/call.html?callId=" +
            encodeURIComponent(
                callId
            );


        event.waitUntil(

            clients.matchAll({

                type:
                    "window",

                includeUncontrolled:
                    true

            })

            .then(

                clientList => {

                    for(
                        const client
                        of clientList
                    ){

                        if(
                            "focus"
                            in client
                        ){

                            client.navigate(
                                callUrl
                            );

                            return client.focus();

                        }

                    }


                    if(
                        clients.openWindow
                    ){

                        return clients.openWindow(
                            callUrl
                        );

                    }

                }

            )

        );

    }

);