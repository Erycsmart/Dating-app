/*==================================
            CALL.JS
==================================*/

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    set,
    update,
    push,
    onValue,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/*==================================
            DOM
==================================*/

const callPhoto =
document.getElementById("callPhoto");

const callName =
document.getElementById("callName");

const callStatus =
document.getElementById("callStatus");

const callTimer =
document.getElementById("callTimer");

const remoteVideo =
document.getElementById("remoteVideo");

const localVideo =
document.getElementById("localVideo");

const muteBtn =
document.getElementById("muteBtn");

const speakerBtn =
document.getElementById("speakerBtn");

const cameraBtn =
document.getElementById("cameraBtn");

const switchCameraBtn =
document.getElementById("switchCameraBtn");

const endCallBtn =
document.getElementById("endCallBtn");


/*==================================
        VARIABLES
==================================*/

let currentUser = null;

let localStream = null;

let peerConnection = null;

let seconds = 0;

let timer = null;

let audioMuted = false;

let cameraEnabled = true;

let currentUserIsCaller = false;

let otherUid = null;

let missedCallTimer = null;

let pendingIceCandidates = [];

/*==================================
        CALL PARAMETERS
==================================*/

const params =
new URLSearchParams(
    window.location.search
);

const callId =
params.get("callId");

let callType = "audio";


/*==================================
        WEBRTC CONFIG
==================================*/

const rtcConfig = {

    iceServers: [

        {
            urls:
            "stun:stun.l.google.com:19302"
        },

        {
            urls:
            "stun:stun1.l.google.com:19302"
        }

    ]

};


/*==================================
            AUTH
==================================*/

auth.onAuthStateChanged(

    async user=>{

        if(!user){

            location.href =
                "login.html";

            return;

        }

        currentUser = user;


        const loaded =
        await loadCall();

        if(!loaded){

            return;

        }

await startMedia();

await setupWebRTC();

startMissedCallTimer();
    }

);


/*==================================
            LOAD CALL
==================================*/

async function loadCall(){

    if(!callId){

        callStatus.textContent =
            "Call not found.";

        return false;

    }


    try{

        const snapshot =
        await get(

            ref(
                db,
                "calls/" + callId
            )

        );


        if(!snapshot.exists()){

            callStatus.textContent =
                "Call no longer exists.";

            return false;

        }


        const call =
        snapshot.val();


        callType =
        call.type || "audio";


        /* DETERMINE OTHER USER */

        if(
            call.caller ===
            currentUser.uid
        ){

            currentUserIsCaller =
            true;

            otherUid =
            call.receiver;

        }

        else{

            currentUserIsCaller =
            false;

            otherUid =
            call.caller;

        }


        console.log(
            "CALL:",
            call
        );

        console.log(
            "CALLER:",
            call.caller
        );

        console.log(
            "RECEIVER:",
            call.receiver
        );

        console.log(
            "I AM CALLER:",
            currentUserIsCaller
        );


        await loadUser();


        return true;

    }

    catch(error){

        console.error(
            "LOAD CALL ERROR:",
            error
        );

        callStatus.textContent =
            "Unable to load call.";

        return false;

    }

}


/*==================================
        LOAD OTHER USER
==================================*/

async function loadUser(){

    if(!otherUid){

        return;

    }


    try{

        const snapshot =
        await get(

            ref(
                db,
                "users/" + otherUid
            )

        );


        if(!snapshot.exists()){

            callName.textContent =
                "Member";

            callPhoto.src =
                "assets/avatar.png";

            return;

        }


        const user =
        snapshot.val();


        const info =
        user.personalInformation || {};


        const photos =
        user.photos || {};


        let photo =
        "assets/avatar.png";


        if(photos.profile){

            photo =
            photos.profile;

        }

        else if(
            Array.isArray(photos)
        ){

            photo =
            photos[0] ||
            photo;

        }

        else{

            const values =
            Object.values(photos);

            if(values.length){

                photo =
                values[0];

            }

        }


        callPhoto.src =
        photo;


        callName.textContent =
        info.fullName ||
        "Member";


        if(callType === "video"){

            callStatus.textContent =
                currentUserIsCaller
                ? "Calling..."
                : "Connecting...";

        }

        else{

            callStatus.textContent =
                currentUserIsCaller
                ? "Calling..."
                : "Connecting...";

        }

    }

    catch(error){

        console.error(
            "LOAD USER ERROR:",
            error
        );

    }

}
/*==================================
        START MEDIA
==================================*/

async function startMedia(){

    try{

        if(
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ){

            callStatus.textContent =
                "Camera and microphone are not supported.";

            return false;

        }


        localStream =
        await navigator.mediaDevices.getUserMedia({

            audio:true,

            video:
            callType === "video"

        });


        /* VIDEO CALL */

        if(callType === "video"){

            localVideo.srcObject =
                localStream;

            localVideo.muted =
                true;

            localVideo.playsInline =
                true;

            localVideo.autoplay =
                true;

            localVideo.style.display =
                "block";

            remoteVideo.style.display =
                "block";

        }

        else{

            localVideo.style.display =
                "none";

            remoteVideo.style.display =
                "none";

        }


        return true;

    }

    catch(error){

        console.error(
            "MEDIA ERROR:",
            error.name,
            error.message
        );


        if(
            error.name ===
            "NotAllowedError"
        ){

            callStatus.textContent =
                "Camera or microphone permission denied.";

        }

        else if(
            error.name ===
            "NotFoundError"
        ){

            callStatus.textContent =
                "Camera or microphone not found.";

        }

        else if(
            error.name ===
            "NotReadableError"
        ){

            callStatus.textContent =
                "Camera or microphone is already in use.";

        }

        else{

            callStatus.textContent =
                "Unable to access camera or microphone.";

        }

   

        if(
            error.name ===
            "NotAllowedError"
        ){

            callStatus.textContent =
                "Camera or microphone permission denied.";

        }

        else if(
            error.name ===
            "NotFoundError"
        ){

            callStatus.textContent =
                "Camera or microphone not found.";

        }

        else if(
            error.name ===
            "NotReadableError"
        ){

            callStatus.textContent =
                "Camera or microphone is already in use.";

        }

        else{

            callStatus.textContent =
                "Unable to access camera or microphone.";

        }


        return false;

    }

}


/*==================================
        CREATE PEER CONNECTION
==================================*/

function createPeerConnection(){

    if(peerConnection){

        return;

    }


    peerConnection =
    new RTCPeerConnection(
        rtcConfig
    );


    /* ADD LOCAL TRACKS */

    if(localStream){

        localStream
        .getTracks()
        .forEach(track=>{

            peerConnection.addTrack(

                track,

                localStream

            );

        });

    }


    /*==================================
        RECEIVE REMOTE STREAM
    ==================================*/

    peerConnection.ontrack =
    event=>{

        console.log(
            "REMOTE TRACK:",
            event.streams
        );


        if(
            event.streams &&
            event.streams[0]
        ){

            remoteVideo.srcObject =
            event.streams[0];


            remoteVideo.autoplay =
            true;

            remoteVideo.playsInline =
            true;


            remoteVideo.style.display =
            "block";


            remoteVideo.play()
            .catch(error=>{

                console.log(
                    "Remote video autoplay:",
                    error
                );

            });


            callStatus.textContent =
                "Connected";

        }

    };


    /*==================================
        ICE CANDIDATES
    ==================================*/

    peerConnection.onicecandidate =
    async event=>{

        if(!event.candidate){

            return;

        }


        const candidatePath =
        currentUserIsCaller

        ? "callerCandidates"

        : "receiverCandidates";


        await push(

            ref(

                db,

                "calls/" +
                callId +
                "/" +
                candidatePath

            )

        ).then(candidateRef=>{

            return set(

                candidateRef,

                event.candidate.toJSON()

            );

        });

    };


    /*==================================
        CONNECTION STATE
    ==================================*/

    peerConnection.onconnectionstatechange =
    ()=>{

        console.log(
            "Connection state:",
            peerConnection.connectionState
        );


        switch(
            peerConnection.connectionState
        ){
case "connected":

    callStatus.textContent =
        "Connected";


    /*
        Start the timer only after
        both phones are actually connected.
    */

    startTimer();


    /*
        Tell Firebase the call
        is really connected.
    */

    update(

        ref(
            db,
            "calls/" +
            callId
        ),

        {

            status:
                "connected",

            answeredAt:
                Date.now()

        }

    )
    .catch(error=>{

        console.error(
            "CALL STATUS UPDATE ERROR:",
            error
        );

    });

    break;


            case "connecting":

                callStatus.textContent =
                    "Connecting...";

                break;


            case "disconnected":

                callStatus.textContent =
                    "Connection interrupted";

                break;


            case "failed":

                callStatus.textContent =
                    "Connection failed";

                break;


            case "closed":

                callStatus.textContent =
                    "Call ended";

                break;

        }

    };


    /*==================================
        ICE CONNECTION STATE
    ==================================*/

    peerConnection.oniceconnectionstatechange =
    ()=>{

        console.log(
            "ICE:",
            peerConnection.iceConnectionState
        );

    };

}

/*==================================
        WEBRTC SETUP
==================================*/

async function setupWebRTC(){

    createPeerConnection();


    /*==================================
            LISTEN FOR ICE
    ==================================*/

    listenForCandidates();


    /*==================================
            CALLER
    ==================================*/

    if(currentUserIsCaller){

        await createOffer();

        listenForAnswer();

    }


    /*==================================
            RECEIVER
    ==================================*/

    else{

        listenForOffer();

    }

}

    /*==================================
        LISTEN FOR ANSWER
    ==================================*/

    if(currentUserIsCaller){

        listenForAnswer();

    }

/*==================================
        LISTEN FOR ICE
==================================*/

function listenForCandidates(){

    const path =
        currentUserIsCaller
        ? "receiverCandidates"
        : "callerCandidates";


    const candidatesRef =
        ref(
            db,
            "calls/" +
            callId +
            "/" +
            path
        );


    onChildAdded(

        candidatesRef,

        async snapshot=>{

            try{

                const candidate =
                    snapshot.val();


                if(!candidate){

                    return;

                }


                const iceCandidate =
                    new RTCIceCandidate(
                        candidate
                    );


                /*
                    Remote description is ready.
                    Add ICE immediately.
                */

                if(
                    peerConnection &&
                    peerConnection.remoteDescription
                ){

                    await peerConnection.addIceCandidate(
                        iceCandidate
                    );

                    console.log(
                        "ICE candidate added"
                    );

                }

                /*
                    Remote description isn't ready yet.
                    Save it temporarily.
                */

                else{

                    pendingIceCandidates.push(
                        iceCandidate
                    );

                    console.log(
                        "ICE candidate queued"
                    );

                }

            }

            catch(error){

                console.error(
                    "ICE ERROR:",
                    error
                );

            }

        }

    );

}
/*==================================
        FLUSH ICE CANDIDATES
==================================*/

async function flushPendingIceCandidates(){

    if(
        !peerConnection ||
        !peerConnection.remoteDescription
    ){

        return;

    }


    while(
        pendingIceCandidates.length > 0
    ){

        const candidate =
            pendingIceCandidates.shift();


        try{

            await peerConnection.addIceCandidate(
                candidate
            );

            console.log(
                "Queued ICE candidate added"
            );

        }

        catch(error){

            console.error(
                "QUEUED ICE ERROR:",
                error
            );

        }

    }

}

/*==================================
        CREATE OFFER
==================================*/

async function createOffer(){

    try{

        callStatus.textContent =
            "Calling...";


        const offer =
        await peerConnection
        .createOffer();


        await peerConnection
        .setLocalDescription(
            offer
        );


        await update(

            ref(
                db,
                "calls/" + callId
            ),

            {

                offer:{

                    type:
                    offer.type,

                    sdp:
                    offer.sdp

                }

            }

        );


        console.log(
            "OFFER CREATED"
        );

    }

    catch(error){

        console.error(
            "OFFER ERROR:",
            error
        );

        callStatus.textContent =
            "Unable to start call.";

    }

}


/*==================================
        LISTEN FOR OFFER
==================================*/

function listenForOffer(){

    const offerRef =
    ref(

        db,

        "calls/" +
        callId +
        "/offer"

    );


    onValue(

        offerRef,

        async snapshot=>{

            if(!snapshot.exists()){

                return;

            }


            if(
                peerConnection
                .currentRemoteDescription
            ){

                return;

            }


            try{

                const offer =
                snapshot.val();

await peerConnection
.setRemoteDescription(

    new RTCSessionDescription(
        offer
    )

);

await flushPendingIceCandidates();

await createAnswer();
            }

            catch(error){

                console.error(
                    "OFFER RECEIVE ERROR:",
                    error
                );

            }

        }

    );

}


/*==================================
        CREATE ANSWER
==================================*/

async function createAnswer(){

    try{

        const answer =
        await peerConnection
        .createAnswer();


        await peerConnection
        .setLocalDescription(
            answer
        );


        await update(

            ref(
                db,
                "calls/" + callId
            ),

            {

                answer:{

                    type:
                    answer.type,

                    sdp:
                    answer.sdp

                },

                status:
                "connected"

            }

        );


        callStatus.textContent =
            "Connecting...";


        console.log(
            "ANSWER CREATED"
        );

    }

    catch(error){

        console.error(
            "ANSWER ERROR:",
            error
        );

    }

}


/*==================================
        LISTEN FOR ANSWER
==================================*/

function listenForAnswer(){

    const answerRef =
    ref(

        db,

        "calls/" +
        callId +
        "/answer"

    );


    onValue(

        answerRef,

        async snapshot=>{

            if(!snapshot.exists()){

                return;

            }


            if(
                peerConnection
                .currentRemoteDescription
            ){

                return;

            }


            try{

                const answer =
                snapshot.val();

await peerConnection
.setRemoteDescription(

    new RTCSessionDescription(
        answer
    )

);

await flushPendingIceCandidates();

callStatus.textContent =
    "Connecting...";

            }

            catch(error){

                console.error(
                    "ANSWER RECEIVE ERROR:",
                    error
                );

            }

        }

    );

}


/*==================================
            TIMER
==================================*/

function startTimer(){

    if(timer){

        clearInterval(timer);

    }


    seconds = 0;


    timer =
    setInterval(()=>{

        seconds++;


        const minutes =
        String(

            Math.floor(
                seconds / 60
            )

        ).padStart(2,"0");


        const secs =
        String(

            seconds % 60

        ).padStart(2,"0");


        callTimer.textContent =
            minutes + ":" + secs;


    },1000);

}
/*==================================
            MUTE
==================================*/

muteBtn?.addEventListener(

    "click",

    ()=>{

        if(!localStream){

            return;

        }


        audioMuted =
            !audioMuted;


        localStream
        .getAudioTracks()
        .forEach(track=>{

            track.enabled =
                !audioMuted;

        });


        muteBtn.classList.toggle(
            "active",
            audioMuted
        );


        muteBtn.setAttribute(
            "aria-label",
            audioMuted
            ? "Unmute microphone"
            : "Mute microphone"
        );

    }

);

/*==================================
            CAMERA
==================================*/

cameraBtn?.addEventListener(

    "click",

    ()=>{

        if(!localStream){

            return;

        }


        const tracks =
            localStream.getVideoTracks();


        if(!tracks.length){

            return;

        }


        cameraEnabled =
            !cameraEnabled;


        tracks.forEach(track=>{

            track.enabled =
                cameraEnabled;

        });


        cameraBtn.classList.toggle(
            "active",
            !cameraEnabled
        );


        cameraBtn.setAttribute(
            "aria-label",
            cameraEnabled
            ? "Turn camera off"
            : "Turn camera on"
        );

    }

);

/*==================================
            SPEAKER
==================================*/

let speakerEnabled = true;


speakerBtn?.addEventListener(

    "click",

    ()=>{

        speakerEnabled =
            !speakerEnabled;


        if(remoteVideo){

            remoteVideo.muted =
                !speakerEnabled;

        }


        speakerBtn.classList.toggle(
            "active",
            !speakerEnabled
        );


        speakerBtn.setAttribute(
            "aria-label",
            speakerEnabled
            ? "Speaker on"
            : "Speaker off"
        );

    }

);

/*==================================
        SWITCH CAMERA
==================================*/

switchCameraBtn?.addEventListener(

    "click",

    async()=>{

        if(!localStream){

            return;

        }


        const videoTrack =
        localStream
        .getVideoTracks()[0];


        if(!videoTrack){

            return;

        }


        const settings =
        videoTrack.getSettings();


        const facingMode =
        settings.facingMode === "user"
        ? "environment"
        : "user";


        try{

            const newStream =
            await navigator.mediaDevices
            .getUserMedia({

                audio:true,

                video:{

                    facingMode:
                    facingMode

                }

            });


            const newVideoTrack =
            newStream
            .getVideoTracks()[0];


            const sender =
            peerConnection
            ?.getSenders()
            .find(

                s =>
                s.track &&
                s.track.kind === "video"

            );


            if(sender){

                await sender.replaceTrack(
                    newVideoTrack
                );

            }
const oldVideoTrack =
    localStream
    .getVideoTracks()[0];

oldVideoTrack?.stop();


localStream =
    newStream;


localVideo.srcObject =
    localStream;


localVideo.muted =
    true;

localVideo.playsInline =
    true;

localVideo.autoplay =
    true;


}

catch(error){

    console.error(
        "SWITCH CAMERA ERROR:",
        error
    );

}

}

);

/*==================================
        MISSED CALL TIMER
==================================*/

function startMissedCallTimer(){

    if(!currentUserIsCaller){

        return;

    }


    if(missedCallTimer){

        clearTimeout(
            missedCallTimer
        );

    }


    missedCallTimer =
        setTimeout(

            async()=>{

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

                        return;

                    }


                    const call =
                        snapshot.val();


                    /* ONLY IF STILL RINGING */

                    if(
                        call.status ===
                        "ringing"
                    ){

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
                                    Date.now()

                            }

                        );


                        callStatus.textContent =
                            "No answer";


                        setTimeout(()=>{

                            history.back();

                        },1200);

                    }

                }

                catch(error){

                    console.error(
                        "MISSED CALL TIMER ERROR:",
                        error
                    );

                }

            },

            30000

        );

}
/*==================================
            END CALL
==================================*/

endCallBtn?.addEventListener(

    "click",

    async()=>{

        try{

            if(missedCallTimer){

                clearTimeout(
                    missedCallTimer
                );

            }


            await update(

                ref(
                    db,
                    "calls/" +
                    callId
                ),

                {

                    status:
                        "ended",

                    endedAt:
                        Date.now(),

                    endedBy:
                        currentUser.uid

                }

            );

        }

        catch(error){

            console.error(
                "END CALL ERROR:",
                error
            );

        }


        cleanupCall();


        callStatus.textContent =
            "Call ended";


        setTimeout(()=>{

            history.back();

        },500);

    }

);

/*==================================
        LISTEN FOR CALL END
==================================*/

if(callId){

    onValue(

        ref(
            db,
            "calls/" +
            callId +
            "/status"
        ),

        snapshot=>{

            const status =
            snapshot.val();


            if(
                status === "ended" &&
                peerConnection
            ){

                cleanupCall();

                callStatus.textContent =
                    "Call ended";


                setTimeout(()=>{

                    history.back();

                },1000);

            }

        }

    );

}


/*==================================
            CLEANUP
==================================*/

function cleanupCall(){

    if(timer){

        clearInterval(timer);

        timer = null;

    }


    if(localStream){

        localStream
        .getTracks()
        .forEach(track=>{

            track.stop();

        });

        localStream = null;

    }


    if(peerConnection){

        peerConnection.close();

        peerConnection = null;

    }

}