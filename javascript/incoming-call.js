/*==================================
        INCOMING-CALL.JS
==================================*/

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/*==================================
        VARIABLES
==================================*/

let currentUser = null;

let activeCallId = null;

let ringtoneContext = null;

let ringtoneTimer = null;

let callListenerStarted = false;


/*==================================
        START
==================================*/

auth.onAuthStateChanged(async user => {

    if(!user){

        stopRingtone();

        return;

    }

    currentUser = user;

    if(callListenerStarted){

        return;

    }

    callListenerStarted = true;

    createIncomingCallUI();

    listenForIncomingCalls();

});


/*==================================
        CREATE UI
==================================*/

function createIncomingCallUI(){

    if(document.getElementById("globalIncomingCall")){

        return;

    }


    const style =
    document.createElement("style");


    style.textContent = `

        #globalIncomingCall{

            position:fixed;

            inset:0;

            background:rgba(0,0,0,.62);

            backdrop-filter:blur(12px);

            -webkit-backdrop-filter:blur(12px);

            display:none;

            align-items:flex-end;

            justify-content:center;

            z-index:999999;

            padding:20px;

        }


        #globalIncomingCall.show{

            display:flex;

            animation:incomingFade .25s ease;

        }


        @keyframes incomingFade{

            from{

                opacity:0;

            }

            to{

                opacity:1;

            }

        }


        .incoming-call-card{

            width:min(100%,520px);

            background:#fff;

            border-radius:32px;

            padding:30px 22px 24px;

            text-align:center;

            box-shadow:0 20px 80px rgba(0,0,0,.35);

            animation:incomingUp .3s ease;

        }


        @keyframes incomingUp{

            from{

                transform:translateY(50px);

                opacity:0;

            }

            to{

                transform:translateY(0);

                opacity:1;

            }

        }


        .incoming-call-type{

            width:62px;

            height:62px;

            margin:0 auto 18px;

            border-radius:50%;

            background:#eef5ff;

            color:#1877f2;

            display:flex;

            align-items:center;

            justify-content:center;

            font-size:27px;

        }


        .incoming-call-photo{

            width:115px;

            height:115px;

            border-radius:50%;

            object-fit:cover;

            border:5px solid #fff;

            box-shadow:

                0 8px 30px rgba(0,0,0,.2);

        }


        .incoming-call-name{

            margin:18px 0 6px;

            font-size:24px;

            font-weight:700;

            color:#222;

        }


        .incoming-call-text{

            margin:0 0 25px;

            color:#777;

            font-size:15px;

        }


        .incoming-call-actions{

            display:flex;

            gap:14px;

        }


        .incoming-call-btn{

            flex:1;

            border:0;

            border-radius:18px;

            min-height:58px;

            font-size:16px;

            font-weight:600;

            cursor:pointer;

        }


        .incoming-decline{

            background:#ffe8e8;

            color:#e53935;

        }


        .incoming-accept{

            background:#1877f2;

            color:#fff;

        }


        .incoming-call-btn:active{

            transform:scale(.97);

        }


        @media(max-width:420px){

            .incoming-call-card{

                border-radius:28px;

                padding:25px 16px 18px;

            }


            .incoming-call-photo{

                width:100px;

                height:100px;

            }

        }

    `;


    document.head.appendChild(style);


    const overlay =
    document.createElement("div");


    overlay.id =
        "globalIncomingCall";


    overlay.innerHTML = `

        <div class="incoming-call-card">

            <div
                id="incomingCallType"
                class="incoming-call-type">

                <i class="fa-solid fa-phone"></i>

            </div>


            <img
                id="incomingCallPhoto"
                class="incoming-call-photo"
                src="assets/avatar.png"
                alt="Caller">


            <h2
                id="incomingCallName"
                class="incoming-call-name">

                Someone

            </h2>


            <p
                id="incomingCallText"
                class="incoming-call-text">

                Incoming call

            </p>


            <div class="incoming-call-actions">

                <button
                    id="incomingDecline"
                    class="incoming-call-btn incoming-decline">

                    <i class="fa-solid fa-phone-slash"></i>

                    &nbsp; Decline

                </button>


                <button
                    id="incomingAccept"
                    class="incoming-call-btn incoming-accept">

                    <i class="fa-solid fa-phone"></i>

                    &nbsp; Accept

                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    document
        .getElementById("incomingDecline")
        ?.addEventListener(
            "click",
            declineCall
        );


    document
        .getElementById("incomingAccept")
        ?.addEventListener(
            "click",
            acceptCall
        );

}


/*==================================
        LISTEN FOR CALLS
==================================*/

function listenForIncomingCalls(){

    const callsRef =
        ref(
            db,
            "calls"
        );


    onValue(

        callsRef,

        async snapshot => {

            if(!snapshot.exists()){

                return;

            }


            const calls =
                snapshot.val();


            const now =
                Date.now();


            for(
                const callId in calls
            ){

                const call =
                    calls[callId];


                /*
                    Only calls directed
                    to this user.
                */

                if(
                    call.receiver !==
                    currentUser.uid
                ){

                    continue;

                }


                /*
                    Only ringing calls.
                */

                if(
                    call.status !==
                    "ringing"
                ){

                    continue;

                }


                /*
                    Ignore calls older
                    than 30 seconds.
                */

                const age =
                    now -
                    Number(
                        call.createdAt || 0
                    );


                if(age > 30000){

                    await update(

                        ref(
                            db,
                            "calls/" +
                            callId
                        ),

                        {

                            status:
                                "missed",

                            endedAt:
                                now

                        }

                    );

                    continue;

                }


                /*
                    Already showing this call.
                */

                if(
                    activeCallId ===
                    callId
                ){

                    continue;

                }


                await showIncomingCall(
                    callId,
                    call
                );

            }

        }

    );

}


/*==================================
        SHOW INCOMING CALL
==================================*/

async function showIncomingCall(
    callId,
    call
){

    activeCallId =
        callId;


    const overlay =
        document.getElementById(
            "globalIncomingCall"
        );


    if(!overlay){

        return;

    }


    const photo =
        document.getElementById(
            "incomingCallPhoto"
        );


    const name =
        document.getElementById(
            "incomingCallName"
        );


    const text =
        document.getElementById(
            "incomingCallText"
        );


    const typeIcon =
        document.getElementById(
            "incomingCallType"
        );


    let callerName =
        "Someone";


    let callerPhoto =
        "assets/avatar.png";


    try{

        const userSnap =
            await get(

                ref(
                    db,
                    "users/" +
                    call.caller
                )

            );


        if(userSnap.exists()){

            const user =
                userSnap.val();


            const info =
                user.personalInformation ||
                {};


            const photos =
                user.photos ||
                {};


            callerName =
                info.fullName ||
                "Someone";


            if(photos.profile){

                callerPhoto =
                    photos.profile;

            }

            else if(
                Array.isArray(photos)
            ){

                callerPhoto =
                    photos[0] ||
                    callerPhoto;

            }

            else{

                const values =
                    Object.values(
                        photos
                    );


                if(values.length){

                    callerPhoto =
                        values[0];

                }

            }

        }

    }

    catch(error){

        console.error(
            "CALLER PROFILE ERROR:",
            error
        );

    }


    photo.src =
        callerPhoto;


    name.textContent =
        callerName;


    if(
        call.type ===
        "video"
    ){

        typeIcon.innerHTML =
            `<i class="fa-solid fa-video"></i>`;

        text.textContent =
            "Incoming video call";

    }

    else{

        typeIcon.innerHTML =
            `<i class="fa-solid fa-phone"></i>`;

        text.textContent =
            "Incoming voice call";

    }


    overlay.classList.add(
        "show"
    );


    startRingtone();

}


/*==================================
            RINGTONE
==================================*/

function startRingtone(){

    stopRingtone();


    try{

        ringtoneContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();


        if(
            ringtoneContext.state ===
            "suspended"
        ){

            ringtoneContext.resume()
                .catch(()=>{});

        }


        playRingTone();


        ringtoneTimer =
            setInterval(

                playRingTone,

                2200

            );

    }

    catch(error){

        console.log(
            "Ringtone unavailable:",
            error
        );

    }

}


/*==================================
        PLAY RINGTONE
==================================*/

function playRingTone(){

    if(!ringtoneContext){

        return;

    }


    const ctx =
        ringtoneContext;


    const now =
        ctx.currentTime;


    const oscillator =
        ctx.createOscillator();


    const gain =
        ctx.createGain();


    oscillator.type =
        "sine";


    oscillator.frequency.setValueAtTime(
        700,
        now
    );


    oscillator.frequency.setValueAtTime(
        900,
        now + .18
    );


    oscillator.frequency.setValueAtTime(
        700,
        now + .36
    );


    gain.gain.setValueAtTime(
        0,
        now
    );


    gain.gain.linearRampToValueAtTime(
        .16,
        now + .03
    );


    gain.gain.setValueAtTime(
        .16,
        now + .30
    );


    gain.gain.linearRampToValueAtTime(
        0,
        now + .40
    );


    oscillator.connect(
        gain
    );


    gain.connect(
        ctx.destination
    );


    oscillator.start(
        now
    );


    oscillator.stop(
        now + .42
    );

}


/*==================================
        STOP RINGTONE
==================================*/

function stopRingtone(){

    if(ringtoneTimer){

        clearInterval(
            ringtoneTimer
        );

        ringtoneTimer =
            null;

    }


    if(ringtoneContext){

        ringtoneContext.close()
            .catch(()=>{});


        ringtoneContext =
            null;

    }

}


/*==================================
            ACCEPT
==================================*/

async function acceptCall(){

    if(!activeCallId){

        return;

    }


    const callId =
        activeCallId;


    stopRingtone();


    const overlay =
        document.getElementById(
            "globalIncomingCall"
        );


    overlay?.classList.remove(
        "show"
    );


    try{

        const snapshot =
            await get(

                ref(
                    db,
                    "calls/" +
                    callId
                )

            );


        if(!snapshot.exists()){

            activeCallId =
                null;

            return;

        }


        const call =
            snapshot.val();


        if(
            call.status !==
            "ringing"
        ){

            activeCallId =
                null;

            return;

        }


        /*
            Mark accepted BEFORE
            opening call.html.

            call.js will then start
            WebRTC on the receiver.
        */

        await update(

            ref(
                db,
                "calls/" +
                callId
            ),

            {

                status:
                    "accepted",

                answeredAt:
                    Date.now()

            }

        );


        activeCallId =
            null;


        /*
            Open the actual
            call interface.
        */

        window.location.href =
            "call.html?callId=" +
            encodeURIComponent(
                callId
            );

    }

    catch(error){

        console.error(
            "ACCEPT CALL ERROR:",
            error
        );

        activeCallId =
            null;

    }

}


/*==================================
            DECLINE
==================================*/

async function declineCall(){

    if(!activeCallId){

        return;

    }


    const callId =
        activeCallId;


    stopRingtone();


    const overlay =
        document.getElementById(
            "globalIncomingCall"
        );


    overlay?.classList.remove(
        "show"
    );


    activeCallId =
        null;


    try{

        await update(

            ref(
                db,
                "calls/" +
                callId
            ),

            {

                status:
                    "declined",

                endedAt:
                    Date.now(),

                endedBy:
                    currentUser.uid

            }

        );

    }

    catch(error){

        console.error(
            "DECLINE CALL ERROR:",
            error
        );

    }

}