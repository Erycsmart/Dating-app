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

let missedCallTimer = null;

let audioMuted = false;

let cameraEnabled = true;

let speakerEnabled = true;

let currentUserIsCaller = false;

let otherUid = null;

let pendingIceCandidates = [];

let callConnected = false;

let webRTCStarted = false;


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

    async user => {

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


        /*
            Camera/microphone can be prepared
            while caller waits.

            WebRTC connection itself is controlled
            by the call state.
        */

        const callSnapshot =
            await get(

                ref(
                    db,
                    "calls/" +
                    callId
                )

            );


        if(!callSnapshot.exists()){

            return;

        }


        const call =
            callSnapshot.val();


        /*
            RECEIVER

            Receiver only reaches call.html after
            pressing Accept.
        */

        if(!currentUserIsCaller){

            if(
                call.status ===
                "accepted"
            ){

                await startMedia();

                await setupWebRTC();

            }

            else{

                callStatus.textContent =
                    "Waiting...";

            }

        }


        /*
            CALLER

            Caller waits for receiver to accept.
        */

        else{

            await startMedia();

            listenForCallStatus();

            startMissedCallTimer();

        }

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
                    "calls/" +
                    callId
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
            call.type ||
            "audio";


        /*==================================
            DETERMINE OTHER USER
        ==================================*/

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
            "CALL ID:",
            callId
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
            "CALL TYPE:",
            callType
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
                    "users/" +
                    otherUid
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
            user.personalInformation ||
            {};


        const photos =
            user.photos ||
            {};


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
                Object.values(
                    photos
                );


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


        if(currentUserIsCaller){

            callStatus.textContent =
                "Calling...";

        }

        else{

            callStatus.textContent =
                "Connecting...";

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

    /*
        Don't request media twice.
    */

    if(localStream){

        return true;

    }


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


        /*==================================
                VIDEO CALL
        ==================================*/

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


            remoteVideo.playsInline =
                true;

            remoteVideo.autoplay =
                true;

            remoteVideo.style.display =
                "block";


            localVideo.play()
                .catch(()=>{});

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

        else if(
            error.name ===
            "SecurityError"
        ){

            callStatus.textContent =
                "Camera requires a secure connection.";

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


    /*==================================
        ADD LOCAL TRACKS
    ==================================*/

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
        event => {

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
                            "REMOTE PLAY ERROR:",
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
        async event => {

            if(!event.candidate){

                return;

            }


            const candidatePath =
                currentUserIsCaller

                ? "callerCandidates"

                : "receiverCandidates";


            try{

                const candidateRef =
                    push(

                        ref(

                            db,

                            "calls/" +
                            callId +
                            "/" +
                            candidatePath

                        )

                    );


                await set(

                    candidateRef,

                    event.candidate.toJSON()

                );

            }

            catch(error){

                console.error(
                    "ICE SEND ERROR:",
                    error
                );

            }

        };


    /*==================================
        CONNECTION STATE
    ==================================*/

    peerConnection.onconnectionstatechange =
        async()=>{

            const state =
                peerConnection.connectionState;


            console.log(
                "CONNECTION STATE:",
                state
            );


            switch(state){

                case "new":

                    callStatus.textContent =
                        currentUserIsCaller
                        ? "Calling..."
                        : "Connecting...";

                    break;


                case "connecting":

                    callStatus.textContent =
                        "Connecting...";

                    break;


                case "connected":

                    if(!callConnected){

                        callConnected =
                            true;


                        callStatus.textContent =
                            "Connected";


                        startTimer();


                        if(missedCallTimer){

                            clearTimeout(
                                missedCallTimer
                            );

                            missedCallTimer =
                                null;

                        }


                        await update(

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

                        );

                    }

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
                "ICE STATE:",
                peerConnection.iceConnectionState
            );

        };

}


/*==================================
        SETUP WEBRTC
==================================*/

async function setupWebRTC(){

    if(webRTCStarted){

        return;

    }


    webRTCStarted =
        true;


    createPeerConnection();


    /*
        Start listening for candidates
        BEFORE creating offer/answer.
    */

    listenForCandidates();


    if(currentUserIsCaller){

        await createOffer();

        listenForAnswer();

    }

    else{

        listenForOffer();

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
            await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );


        await update(

            ref(
                db,
                "calls/" +
                callId
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
                ?.currentRemoteDescription
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
            await peerConnection.createAnswer();


        await peerConnection.setLocalDescription(
            answer
        );


        await update(

            ref(
                db,
                "calls/" +
                callId
            ),

            {

                answer:{

                    type:
                        answer.type,

                    sdp:
                        answer.sdp

                },

                status:
                    "accepted"

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

        callStatus.textContent =
            "Unable to answer call.";

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
                ?.currentRemoteDescription
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


                if(
                    peerConnection &&
                    peerConnection.remoteDescription
                ){

                    await peerConnection.addIceCandidate(
                        iceCandidate
                    );

                    console.log(
                        "ICE CANDIDATE ADDED"
                    );

                }

                else{

                    pendingIceCandidates.push(
                        iceCandidate
                    );

                    console.log(
                        "ICE CANDIDATE QUEUED"
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
        FLUSH ICE
==================================*/

async function flushPendingIceCandidates(){

    if(
        !peerConnection ||
        !peerConnection.remoteDescription
    ){

        return;

    }


    while(
        pendingIceCandidates.length
    ){

        const candidate =
            pendingIceCandidates.shift();


        try{

            await peerConnection.addIceCandidate(
                candidate
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
        LISTEN FOR CALL STATUS
==================================*/

function listenForCallStatus(){

    const callRef =
        ref(
            db,
            "calls/" +
            callId
        );


    onValue(

        callRef,

        async snapshot=>{

            if(!snapshot.exists()){

                return;

            }


            const call =
                snapshot.val();


            /*==================================
                DECLINED
            ==================================*/

            if(
                call.status ===
                "declined"
            ){

                callStatus.textContent =
                    "Call declined";


                cleanupCall();


                setTimeout(()=>{

                    history.back();

                },1000);


                return;

            }


            /*==================================
                MISSED
            ==================================*/

            if(
                call.status ===
                "missed"
            ){

                callStatus.textContent =
                    "No answer";


                cleanupCall();


                setTimeout(()=>{

                    history.back();

                },1000);


                return;

            }


            /*==================================
                ENDED
            ==================================*/

            if(
                call.status ===
                "ended"
            ){

                callStatus.textContent =
                    "Call ended";


                cleanupCall();


                setTimeout(()=>{

                    history.back();

                },700);


                return;

            }


            /*==================================
                ACCEPTED
            ==================================*/
if(
    call.status ===
    "accepted" &&
    currentUserIsCaller
){

    console.log(
        "RECEIVER ACCEPTED CALL"
    );

    callStatus.textContent =
        "Connecting...";

    /*
        Start WebRTC only after
        receiver accepts.
    */

    if(!webRTCStarted){

        const mediaReady =
            await startMedia();

        if(mediaReady){

            await setupWebRTC();

        }

    }

}
        }

    );

}


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


                        cleanupCall();


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
            TIMER
==================================*/

function startTimer(){

    if(timer){

        clearInterval(
            timer
        );

    }


    seconds =
        0;


    callTimer.textContent =
        "00:00";


    timer =
        setInterval(()=>{

            seconds++;


            const minutes =
                String(

                    Math.floor(
                        seconds / 60
                    )

                ).padStart(
                    2,
                    "0"
                );


            const secs =
                String(

                    seconds % 60

                ).padStart(
                    2,
                    "0"
                );


            callTimer.textContent =
                minutes +
                ":" +
                secs;

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

        /* Camera only exists on video calls */

        if(callType !== "video"){

            console.log(
                "Camera is not available during audio calls."
            );

            return;

        }


        if(!localStream){

            console.log(
                "No local stream."
            );

            return;

        }


        /* Get camera track */

        const videoTracks =
            localStream.getVideoTracks();


        if(!videoTracks.length){

            console.log(
                "No video track found."
            );

            return;

        }


        /* Toggle camera */

        cameraEnabled =
            !cameraEnabled;


        videoTracks.forEach(track=>{

            track.enabled =
                cameraEnabled;

        });


        /*==================================
            BUTTON STATE
        ==================================*/

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


        /*==================================
            LOCAL PREVIEW
        ==================================*/

        if(localVideo){

            localVideo.style.opacity =
                cameraEnabled
                    ? "1"
                    : "0.25";

        }


        console.log(

            cameraEnabled
                ? "CAMERA ON"
                : "CAMERA OFF"

        );

    }

);
/*==================================
            SPEAKER
==================================*/

speakerBtn?.addEventListener(

    "click",

    async()=>{

        speakerEnabled =
            !speakerEnabled;


        /*==================================
            CONTROL REMOTE AUDIO
        ==================================*/

        if(remoteVideo){

            remoteVideo.muted =
                !speakerEnabled;

        }


        /*==================================
            BROWSER AUDIO OUTPUT
        ==================================*/

        if(
            remoteVideo &&
            typeof remoteVideo.setSinkId ===
            "function"
        ){

            try{

                await remoteVideo.setSinkId("");

            }

            catch(error){

                console.log(
                    "Speaker routing not supported:",
                    error
                );

            }

        }


        /*==================================
            BUTTON STATE
        ==================================*/

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


        /*==================================
            RESUME AUDIO
        ==================================*/

        if(
            remoteVideo &&
            speakerEnabled
        ){

            try{

                await remoteVideo.play();

            }

            catch(error){

                console.log(
                    "Remote audio play error:",
                    error
                );

            }

        }


        console.log(

            speakerEnabled
                ? "SPEAKER ON"
                : "SPEAKER OFF"

        );

    }

);


/*==================================
        SWITCH CAMERA
==================================*/

switchCameraBtn?.addEventListener(

    "click",

    async()=>{

        /* Camera switching only works
           during video calls */

        if(callType !== "video"){

            console.log(
                "Switch camera is only available for video calls."
            );

            return;

        }


        if(!localStream){

            console.log(
                "No local stream."
            );

            return;

        }


        /* Get current camera track */

        const currentVideoTrack =
            localStream.getVideoTracks()[0];


        if(!currentVideoTrack){

            console.log(
                "No video track found."
            );

            return;

        }


        try{

            /*==================================
                FIND CURRENT CAMERA
            ==================================*/

            const settings =
                currentVideoTrack.getSettings();


            const currentFacing =
                settings.facingMode ||
                "user";


            const newFacing =
                currentFacing === "user"
                    ? "environment"
                    : "user";


            console.log(
                "Switching camera:",
                currentFacing,
                "→",
                newFacing
            );


            /*==================================
                TRY SWITCHING EXISTING TRACK
            ==================================*/

            try{

                await currentVideoTrack.applyConstraints({

                    facingMode:{
                        exact:
                            newFacing
                    }

                });


                console.log(
                    "Camera switched successfully."
                );


                /* Refresh preview */

                if(localVideo){

                    localVideo.srcObject =
                        localStream;

                    localVideo.play()
                        .catch(()=>{});

                }


                return;

            }

            catch(error){

                console.log(
                    "Direct camera switch failed. Using fallback.",
                    error
                );

            }


            /*==================================
                FALLBACK
                GET ONLY VIDEO
            ==================================*/

            const newStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video:{
                            facingMode:{
                                ideal:
                                    newFacing
                            }
                        },

                        audio:false

                    });


            const newVideoTrack =
                newStream.getVideoTracks()[0];


            if(!newVideoTrack){

                throw new Error(
                    "New camera track unavailable."
                );

            }


            /*==================================
                REPLACE WEBRTC VIDEO TRACK
            ==================================*/

            if(peerConnection){

                const sender =
                    peerConnection
                        .getSenders()
                        .find(

                            sender =>

                                sender.track &&
                                sender.track.kind ===
                                "video"

                        );


                if(sender){

                    await sender.replaceTrack(
                        newVideoTrack
                    );

                }

            }


            /*==================================
                STOP OLD CAMERA
            ==================================*/

            currentVideoTrack.stop();


            /*==================================
                KEEP MICROPHONE
            ==================================*/

            const audioTracks =
                localStream.getAudioTracks();


            localStream =
                new MediaStream();


            audioTracks.forEach(track=>{

                localStream.addTrack(track);

            });


            localStream.addTrack(
                newVideoTrack
            );


            /*==================================
                UPDATE LOCAL PREVIEW
            ==================================*/

            if(localVideo){

                localVideo.srcObject =
                    localStream;

                localVideo.muted =
                    true;

                localVideo.autoplay =
                    true;

                localVideo.playsInline =
                    true;

                localVideo.play()
                    .catch(()=>{});

            }


            console.log(
                "Fallback camera switch successful:",
                newFacing
            );

        }

        catch(error){

            console.error(
                "SWITCH CAMERA ERROR:",
                error
            );

            callStatus.textContent =
                "Unable to switch camera.";

            setTimeout(()=>{

                if(
                    callStatus.textContent ===
                    "Unable to switch camera."
                ){

                    callStatus.textContent =
                        "Connected";

                }

            },1500);

        }

    }

);


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

                missedCallTimer =
                    null;

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
                status ===
                "ended"
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

        clearInterval(
            timer
        );

        timer =
            null;

    }


    if(missedCallTimer){

        clearTimeout(
            missedCallTimer
        );

        missedCallTimer =
            null;

    }


    if(localStream){

        localStream
            .getTracks()
            .forEach(track=>{

                track.stop();

            });

        localStream =
            null;

    }


    if(peerConnection){

        peerConnection.close();

        peerConnection =
            null;

    }


    pendingIceCandidates =
        [];

    webRTCStarted =
        false;

}
      