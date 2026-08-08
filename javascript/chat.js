/*==================================
            CHAT.JS
==================================*/

import {

    auth,

    db

} from "./firebase.js";

import {

    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setupPresence } from "./presence.js";
import { IMGBB_API_KEY } from "./config.js";

import {

    ref,

    get,

    set,

    push,

    update,

    onValue

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
            DOM
==================================*/

const backBtn =
document.getElementById("backBtn");

const chatPhoto =
document.getElementById("chatPhoto");

const chatName =
document.getElementById("chatName");

const chatStatus =
document.getElementById("chatStatus");

const verifiedBadge =
document.getElementById("verifiedBadge");

const onlineDot =
document.getElementById("onlineDot");

const messagesContainer =
document.getElementById("messagesContainer");

const messageInput =
document.getElementById("messageInput");

const sendBtn =
document.getElementById("sendBtn");

const imagePicker =
document.getElementById("imagePicker");

const cameraBtn =
document.getElementById("cameraBtn");

const emojiBtn =
document.getElementById("emojiBtn");

const attachBtn =
document.getElementById("attachBtn");

const voiceCallBtn =
document.getElementById("voiceCallBtn");

const videoCallBtn =
document.getElementById("videoCallBtn");

const typingIndicator =
document.getElementById("typingIndicator");

const toast =
document.getElementById("toast");
const renderedMessages = new Set();

const imageViewer =
document.getElementById("imageViewer");

const viewerImage =
document.getElementById("viewerImage");

const closeViewer =
document.getElementById("closeViewer");
const reactionPicker =
document.getElementById("reactionPicker");
/*==================================
        INCOMING CALL DOM
==================================*/

const incomingCallSheet =
document.getElementById("incomingCallSheet");

const incomingCallPhoto =
document.getElementById("incomingCallPhoto");

const incomingCallName =
document.getElementById("incomingCallName");

const incomingCallType =
document.getElementById("incomingCallType");

const incomingCallIcon =
document.getElementById("incomingCallIcon");

const acceptCallBtn =
document.getElementById("acceptCallBtn");

const declineCallBtn =
document.getElementById("declineCallBtn");


let selectedReactionMessage = null;

/*==================================
        VARIABLES
==================================*/

let currentUser = null;

let currentUserData = null;

let selectedMatch = null;

let currentMatchId = null;
/*==================================
      IMAGE UPLOAD CACHE
==================================*/

let uploadingImages = new Map();

/*==================================
            START
==================================*/

document.addEventListener(

    "DOMContentLoaded",

    startChat

);

async function startChat(){

    onAuthStateChanged(

        auth,

        async(user)=>{

            if(!user){

                window.location.href =

                "login.html";

                return;

            }

            currentUser = user;
setupPresence();
            currentMatchId =

            sessionStorage.getItem(

                "currentMatchId"

            );

            selectedMatch =

            sessionStorage.getItem(

                "selectedMatch"

            );

            if(

                !currentMatchId ||

                !selectedMatch

            ){

                showToast(

                    "Conversation not found."

                );

                return;

            }
await loadCurrentUser();

await resetUnreadCount();

await markMessagesSeen();

loadMatchProfile();

listenForIncomingCalls();

listenForMissedCalls();

listenForMessages();
        }

    );

}
/*==================================
        LOAD CURRENT USER
==================================*/

async function loadCurrentUser(){

    const snapshot = await get(

        ref(

            db,

            "users/" +

            currentUser.uid

        )

    );

    if(!snapshot.exists()) return;

    currentUserData =

    snapshot.val();

}
/*==================================
        LOAD MATCH PROFILE
==================================*/

function loadMatchProfile(){

    const userRef = ref(

        db,

        "users/" + selectedMatch

    );

    onValue(userRef,(snapshot)=>{

        if(!snapshot.exists()) return;

        const user = snapshot.val();

        const info = user.personalInformation || {};

        const photos = user.photos || {};

        let photo = "assets/avatar.png";

        if(photos.profile){

            photo = photos.profile;

        }

        else if(Array.isArray(photos)){

            photo = photos[0] || photo;

        }

        else{

            const values = Object.values(photos);

            if(values.length){

                photo = values[0];

            }

        }

        chatPhoto.src = photo;

        chatName.textContent =

        info.fullName || "Member";

        /* VERIFIED */

        verifiedBadge.style.display =

        user.verification?.status === "approved"

        ? "inline-flex"

        : "none";

        /* ONLINE STATUS */

        const online =

        user.presence?.online === true;

        chatStatus.textContent =

        online ? "Online" : "Offline";

        onlineDot.classList.toggle(

            "online",

            online

        );

        onlineDot.classList.toggle(

            "offline",

            !online

        );

    });

}

/*==================================
            TOAST
==================================*/

function showToast(message){

    if(!toast) return;

    toast.textContent =

    message;

    toast.classList.add(

        "show"

    );

    setTimeout(()=>{

        toast.classList.remove(

            "show"

        );

    },2500);

}
window.showToast = showToast;
/*==================================
        LISTEN FOR MESSAGES
==================================*/

function listenForMessages(){

    const messagesRef =

    ref(

        db,

        "chats/" +

        currentMatchId +

        "/messages"

    );

    onValue(

        messagesRef,

        snapshot=>{

            messagesContainer.innerHTML="";
             renderedMessages.clear();

            if(!snapshot.exists()){

                return;

            }

            const messages =

            snapshot.val();
const sortedMessages = Object.entries(messages)
.sort((a,b)=>a[1].timestamp-b[1].timestamp);

for (const [id, message] of sortedMessages) {

    if (
        message.receiver === currentUser.uid &&
        message.status === "sent"
    ) {
update(
    ref(
        db,
        "chats/" +
        currentMatchId +
        "/messages/" +
        id
    ),
    {
        status:"delivered"
    }
);

update(
    ref(db,"chats/"+currentMatchId),
    {
        lastMessageStatus:"delivered"
    }
);
    }

    if(!renderedMessages.has(id)){

    renderMessage(id, message);

    renderedMessages.add(id);

}

}

            scrollToBottom();

        }

    );

}/*==================================
        RENDER MESSAGE
==================================*/

function renderMessage(messageId, message){

    const mine = message.sender === currentUser.uid;

    const wrapper = document.createElement("div");

wrapper.id = "msg-" + messageId;
    wrapper.className = mine
        ? "message right"
        : "message left";

    const time = formatTime(message.timestamp);

    let tickHTML = "";

    if(mine){

        switch(message.status){

            case "seen":
                tickHTML = `<i class="fa-solid fa-check-double tick seen"></i>`;
                break;

            case "delivered":
                tickHTML = `<i class="fa-solid fa-check-double tick"></i>`;
                break;

            default:
                tickHTML = `<i class="fa-solid fa-check tick"></i>`;
        }

    }
    if(

    message.hidden?.[currentUser.uid]

){

    return;

}
let replyHTML = "";

if(message.reply){

    replyHTML = `
        <div
    class="reply-box"
    data-target="${message.reply.id}">

            <strong>

                ${
                    message.reply.sender === currentUser.uid
                    ? "You"
                    : "Reply"
                }

            </strong>

            <p>

                ${message.reply.text}

            </p>

        </div>
    `;

}
let forwardedHTML = "";

if(message.forwarded){

    forwardedHTML = `

        <div class="forwarded-label">

            <i class="fa-solid fa-share"></i>

            Forwarded

        </div>

    `;

}
let content = "";

if(message.deleted){

    content = `

        <div class="bubble deleted-message">

            <i class="fa-solid fa-ban"></i>

            ${
                message.deletedBy === currentUser.uid
                ? "You deleted this message"
                : "This message was deleted"
            }

        </div>

    `;

}

else if(message.type === "image"){

    content = `

        ${forwardedHTML}

${replyHTML}

        <img
            src="${message.image}"
            class="message-image"
            onclick="openImageViewer('${message.image}')">

    `;

}

else{

    content = `

        ${forwardedHTML}

${replyHTML}
         
        <div
            class="bubble"
            data-id="${messageId}">

            ${message.text}

        </div>

    `;

}
let reactionsHTML = "";

if(message.reactions){

    reactionsHTML = `

        <div class="message-reactions">

            ${Object.values(message.reactions).join(" ")}

        </div>

    `;

}
    

    wrapper.innerHTML = `

        ${!mine ? `
            <img
                src="${chatPhoto.src}"
                class="message-avatar">
        ` : ""}

      <div class="message-content">

    <button
        class="message-menu-btn"
        data-id="${messageId}">

        <i class="fa-solid fa-ellipsis"></i>

    </button>

            ${content}
<div class="message-meta">

    <span>${time}</span>

    ${tickHTML}

</div>

${reactionsHTML}
        </div>

    `;

    messagesContainer.appendChild(wrapper);
    const menuBtn =

wrapper.querySelector(".message-menu-btn");

if(menuBtn){

    menuBtn.addEventListener(

        "click",

        e=>{

            e.stopPropagation();

            const rect = menuBtn.getBoundingClientRect();

window.Chat2.openMenu(

    messageId,

    message,

    rect.left - 170,

    rect.bottom + 5

);

        }

    );

}
    const replyBox = wrapper.querySelector(".reply-box");

if(replyBox){

    replyBox.addEventListener("click",()=>{

        const target = document.getElementById(

            "msg-" + replyBox.dataset.target

        );

        if(!target) return;

        target.scrollIntoView({

            behavior:"smooth",

            block:"center"

        });

        target.classList.add("reply-highlight");

        setTimeout(()=>{

            target.classList.remove("reply-highlight");

        },1500);

    });

}
    
    if(window.Chat2){

    window.Chat2.attachMessage(

        wrapper,

        messageId,

        message

    );

}
    
const target = wrapper.querySelector(".bubble, .message-image");

if(target){
target.addEventListener("click",(e)=>{

    e.stopPropagation();

    selectedReactionMessage = messageId;

    reactionPicker.style.display = "flex";

    reactionPicker.style.left =
    (e.clientX - 120) + "px";

    reactionPicker.style.top =
    (e.clientY - 70) + "px";

});
}
}


/*==================================
        FORMAT TIME
==================================*/

function formatTime(timestamp){

    const date =

    new Date(timestamp);

    return date.toLocaleTimeString(

        [],

        {

            hour:"2-digit",

            minute:"2-digit"

        }

    );

}

/*==================================
        SCROLL
==================================*/

function scrollToBottom(){

    requestAnimationFrame(()=>{

        messagesContainer.scrollTop =

        messagesContainer.scrollHeight;

        const chatBody =

        document.getElementById(

            "chatBody"

        );

        if(chatBody){

            chatBody.scrollTop =

            chatBody.scrollHeight;

        }

    });

}
/*==================================
        SEND MESSAGE
==================================*/

sendBtn?.addEventListener(

    "click",

    sendMessage

);

messageInput?.addEventListener(

    "keydown",

    e=>{

        if(e.key==="Enter"){

            e.preventDefault();

            sendMessage();

        }

    }

);

async function sendMessage(){

    const text =

    messageInput.value.trim();

    if(!text) return;
const messagesRef =

ref(

    db,

    "chats/" +

    currentMatchId +

    "/messages"

);

/*==================================
        EDIT MESSAGE
==================================*/

if(

    window.Chat2?.editingMessageId

){

    await update(

        ref(

            db,

            "chats/" +

            currentMatchId +

            "/messages/" +

            window.Chat2.editingMessageId

        ),

        {

            text:text,

            edited:true

        }

    );

    window.Chat2.editingMessageId = null;

    messageInput.value = "";

    return;

}
    const newMessage =

    push(messagesRef);
    await set(newMessage,{

    sender: currentUser.uid,

    receiver: selectedMatch,

    text: text,

    type:"text",

    timestamp: Date.now(),

    status:"sent",

    reply: window.Chat2
        ? window.Chat2.getReply()
        : null

});
/*==================================
        UPDATE CHAT
==================================*/

const chatRef = ref(
    db,
    "chats/" + currentMatchId
);

const chatSnap = await get(chatRef);

let unread = 0;

if(chatSnap.exists()){

    unread = Number(
        chatSnap.val().unread?.[
            selectedMatch
        ] || 0
    );

}
const updates = {

    lastMessage: text,

    lastMessageTime: Date.now(),

    lastSender: currentUser.uid,

    lastMessageStatus: "sent"

};

updates["unread/" + selectedMatch] = unread + 1;

console.log("Writing updates:", updates);

await update(chatRef, updates);

const verify = await get(chatRef);

console.log("Chat after update:", verify.val());
messageInput.value = "";
if(window.Chat2){

    window.Chat2.clearReply();

}

scrollToBottom();

}


/*==================================
        OPEN IMAGE PICKER
==================================*/

cameraBtn?.addEventListener(

    "click",

    ()=>{

        imagePicker.click();

    }

);


imagePicker?.addEventListener(
    "change",
    uploadImageMessage
);
async function uploadImageMessage(){

    const file = imagePicker.files[0];

    if(!file) return;

    const tempId = "temp_" + Date.now();

    const localURL = URL.createObjectURL(file);

    uploadingImages.set(tempId, localURL);

    renderUploadingImage(tempId, localURL);

    imagePicker.value = "";

    try{

        const formData = new FormData();

        formData.append("image", file);

        const response = await fetch(

            "https://api.imgbb.com/1/upload?key=" +
            IMGBB_API_KEY,

            {

                method:"POST",

                body:formData

            }

        );

        const result = await response.json();

        if(!result.success){

            removeUploadingImage(tempId);

            return;

        }
await sendImageMessage(
    result.data.url,
    tempId
);
    }

    catch(err){

        console.error(err);

        removeUploadingImage(tempId);

    }

}
function renderUploadingImage(id,image){

    const wrapper = document.createElement("div");

    wrapper.className = "message right uploading";

    wrapper.id = id;

    wrapper.innerHTML = `

        <div class="message-content">

            <img
                src="${image}"
                class="message-image">

            <div class="upload-spinner"></div>

        </div>

    `;

    messagesContainer.appendChild(wrapper);
  

    messagesContainer.scrollTop =
    messagesContainer.scrollHeight;

}

function removeUploadingImage(id){

    document.getElementById(id)?.remove();

}
/*==================================
        START CALL
==================================*/

async function startCall(type){

    if(!currentUser){

        showToast("Please wait...");

        return;

    }

    if(!selectedMatch){

        showToast("User not found.");

        return;

    }

    try{

        showToast(
            type === "video"
            ? "📹 Starting video call..."
            : "📞 Starting voice call..."
        );

        const callsRef = ref(db, "calls");

        const newCall = push(callsRef);

        const callId = newCall.key;

        await set(newCall, {

            caller: currentUser.uid,

            receiver: selectedMatch,

            type: type,

            status: "ringing",

            createdAt: Date.now(),

            startedAt: null,

            answeredAt: null,

            endedAt: null,

            endedBy: null

        });

        console.log("CALL CREATED:", callId);

        window.location.href =
            "call.html?callId=" +
            encodeURIComponent(callId);

    }

    catch(error){

        console.error(
            "START CALL ERROR:",
            error
        );

        showToast(
            "Unable to start call."
        );

    }

}


/*==================================
        VOICE CALL
==================================*/

voiceCallBtn?.addEventListener(
    "click",
    ()=>{
        startCall("audio");
    }
);


/*==================================
        VIDEO CALL
==================================*/

videoCallBtn?.addEventListener(
    "click",
    ()=>{
        startCall("video");
    }
);
/*==================================
        INCOMING CALLS
==================================*/

let incomingCallId = null;

const incomingCallsShown = new Set();

function listenForIncomingCalls(){

    if(!currentUser){

        return;

    }

    const callsRef =
        ref(
            db,
            "calls"
        );

    onValue(

        callsRef,

        async snapshot=>{

            if(!snapshot.exists()){

                return;

            }

            const calls =
                snapshot.val();

            const now =
                Date.now();

            for(const callId in calls){

                const call =
                    calls[callId];


                /* ONLY CALLS SENT TO ME */

                if(
                    call.receiver !==
                    currentUser.uid
                ){

                    continue;

                }


                /* ONLY RINGING CALLS */

                if(
                    call.status !==
                    "ringing"
                ){

                    continue;

                }


                /*==================================
                    IGNORE OLD CALLS
                    30 SECONDS MAX
                ==================================*/

                const callAge =
                    now -
                    Number(call.createdAt || 0);


                if(
                    callAge > 30000
                ){

                    /* Mark old ringing call
                       as missed */

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


                /* DON'T SHOW SAME CALL TWICE */

                if(
                    incomingCallsShown.has(
                        callId
                    )
                ){

                    continue;

                }


                incomingCallsShown.add(
                    callId
                );


                incomingCallId =
                    callId;


                /*==================================
                    LOAD CALLER
                ==================================*/

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


                        if(
                            photos.profile
                        ){

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


                /*==================================
                    SHOW CALL
                ==================================*/

                incomingCallPhoto.src =
                    callerPhoto;


                incomingCallName.textContent =
                    callerName;


                if(
                    call.type ===
                    "video"
                ){

                    incomingCallType.textContent =
                        "Incoming video call";

                    incomingCallIcon.className =
                        "fa-solid fa-video";

                }

                else{

                    incomingCallType.textContent =
                        "Incoming voice call";

                    incomingCallIcon.className =
                        "fa-solid fa-phone";

                }


                incomingCallSheet.classList.add(
                    "show"
                );


                console.log(
                    "ACTIVE INCOMING CALL:",
                    callId
                );


                break;

            }

        }

    );

}
/*==================================
        ACCEPT CALL
==================================*/

acceptCallBtn?.addEventListener(

    "click",

    async()=>{

        if(!incomingCallId){

            return;

        }


        const callId =
            incomingCallId;


        try{

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


            incomingCallSheet.classList.remove(
                "show"
            );


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

            showToast(
                "Unable to answer call."
            );

        }

    }

);
 /*==================================
        DECLINE CALL
==================================*/

declineCallBtn?.addEventListener(

    "click",

    async()=>{

        if(!incomingCallId){

            return;

        }


        const callId =
            incomingCallId;


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


            incomingCallSheet.classList.remove(
                "show"
            );


            incomingCallId = null;


            showToast(
                "Call declined"
            );

        }

        catch(error){

            console.error(
                "DECLINE CALL ERROR:",
                error
            );

            showToast(
                "Unable to decline call."
            );

        }

    }

);
/*==================================
        MISSED CALLS
==================================*/

const missedCallsShown = new Set();

function listenForMissedCalls(){

    if(!currentUser){
        return;
    }

    const callsRef = ref(
        db,
        "calls"
    );

    onValue(
        callsRef,
        async snapshot=>{

            if(!snapshot.exists()){
                return;
            }

            const calls = snapshot.val();

            for(const callId in calls){

                const call = calls[callId];

                /* ONLY CALLS RECEIVED BY ME */

                if(
                    call.receiver !==
                    currentUser.uid
                ){
                    continue;
                }

                /* ONLY MISSED CALLS */

                if(
                    call.status !==
                    "missed"
                ){
                    continue;
                }

                /* DON'T SHOW SAME ALERT TWICE */

                if(
                    missedCallsShown.has(callId)
                ){
                    continue;
                }

                missedCallsShown.add(callId);

                let callerName = "Someone";

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

                        callerName =
                        user.personalInformation
                        ?.fullName ||
                        "Someone";

                    }

                }

                catch(error){

                    console.error(
                        "MISSED CALL USER ERROR:",
                        error
                    );

                }

                showToast(
                    "📞 Missed " +
                    (
                        call.type === "video"
                        ? "video"
                        : "voice"
                    ) +
                    " call from " +
                    callerName
                );

            }

        }
    );

}
/*==================================
        EMOJI
==================================*/

emojiBtn?.addEventListener(

    "click",

    ()=>{

        showToast(

            "😊 Emoji picker coming next."

        );

    }

);

/*==================================
        BACK
==================================*/

backBtn?.addEventListener(

    "click",

    ()=>{

        window.history.back();

    }

);
/*==================================
        RESET UNREAD
==================================*/

async function resetUnreadCount(){

    if(!currentMatchId || !currentUser) return;

    await update(

        ref(
            db,
            "chats/" + currentMatchId
        ),

        {

            ["unread/" + currentUser.uid]:0

        }

    );

}
async function markMessagesSeen(){

    const messagesRef = ref(
        db,
        "chats/" + currentMatchId + "/messages"
    );

    const snap = await get(messagesRef);

    if(!snap.exists()) return;

    const updates = {};

    Object.entries(snap.val()).forEach(([id, msg]) => {

        if(
            msg.receiver === currentUser.uid &&
            msg.status === "delivered"
        ){

            updates[id + "/status"] = "seen";

        }

    });

    if(Object.keys(updates).length){

        await update(messagesRef, updates);

        await update(
            ref(db, "chats/" + currentMatchId),
            {
                lastMessageStatus: "seen"
            }
        );

    }

}
async function sendImageMessage(imageUrl, tempId){

    const messagesRef = ref(
        db,
        "chats/" +
        currentMatchId +
        "/messages"
    );

    const newMessage = push(messagesRef);
await set(newMessage,{

    sender: currentUser.uid,

    receiver: selectedMatch,

    type:"image",

    image:imageUrl,

    timestamp: Date.now(),

    status:"sent",

    reply: window.Chat2
        ? window.Chat2.getReply()
        : null

});
await update(
    ref(db,"chats/"+currentMatchId),
    {
        lastMessage:"📷 Photo",
        lastMessageTime:Date.now(),
        lastSender:currentUser.uid,
        lastMessageStatus:"sent"
    }
);

// Remove the temporary uploading preview
removeUploadingImage(tempId);

if(window.Chat2){

    window.Chat2.clearReply();

}
}
/*==================================
        IMAGE VIEWER
==================================*/

function openImageViewer(src){

    viewerImage.src = src;

    viewerImage.style.transform = "scale(1)";

    imageViewer.classList.add("show");

}
window.openImageViewer = openImageViewer;

closeViewer?.addEventListener(

    "click",

    ()=>{

        imageViewer.classList.remove("show");

    }

);

imageViewer?.addEventListener(

    "click",

    e=>{

        if(e.target===imageViewer){

            imageViewer.classList.remove("show");

        }

    }

);
/*==================================
        PINCH TO ZOOM
==================================*/

let currentScale = 1;

let startDistance = 0;

viewerImage?.addEventListener(

    "touchstart",

    e=>{

        if(e.touches.length!==2) return;

        startDistance = getDistance(

            e.touches[0],

            e.touches[1]

        );

    },

    {passive:false}

);

viewerImage?.addEventListener(

    "touchmove",

    e=>{

        if(e.touches.length!==2) return;

        e.preventDefault();

        const distance = getDistance(

            e.touches[0],

            e.touches[1]

        );

        currentScale *= distance/startDistance;

        currentScale = Math.max(

            1,

            Math.min(

                currentScale,

                4

            )

        );

        viewerImage.style.transform =

        `scale(${currentScale})`;

        startDistance = distance;

    },

    {passive:false}

);

function getDistance(a,b){

    return Math.hypot(

        b.clientX-a.clientX,

        b.clientY-a.clientY

    );

}
/*==================================
      DOUBLE TAP ZOOM
==================================*/

let lastTap = 0;

viewerImage?.addEventListener(

    "touchend",

    ()=>{

        const now = Date.now();

        if(now-lastTap<300){

            currentScale =

            currentScale===1

            ?

            2

            :

            1;

            viewerImage.style.transform =

            `scale(${currentScale})`;

        }

        lastTap = now;

    }

);
/*==================================
      SWIPE DOWN CLOSE
==================================*/

let startY = 0;

viewerImage?.addEventListener(

    "touchstart",

    e=>{

        startY =

        e.touches[0].clientY;

    }

);

viewerImage?.addEventListener(

    "touchend",

    e=>{

        const endY =

        e.changedTouches[0].clientY;

        if(endY-startY>120){

            imageViewer.classList.remove(

                "show"

            );

            currentScale = 1;

            viewerImage.style.transform =

            "scale(1)";

        }

    }

);
/*==================================
        MESSAGE REACTIONS
==================================*/

async function reactToMessage(

    messageId,

    emoji

){

    await update(

        ref(

            db,

            "chats/" +
            currentMatchId +
            "/messages/" +
            messageId +
            "/reactions"

        ),

        {

            [currentUser.uid]: emoji

        }

    );

}
reactionPicker
.querySelectorAll("span")
.forEach(emoji=>{

    emoji.addEventListener(

        "click",

        ()=>{

            reactToMessage(

                selectedReactionMessage,

                emoji.textContent

            );

            reactionPicker.classList.remove(

                "show"

            );

        }

    );

});
document.addEventListener(

    "click",

    ()=>{

        reactionPicker.style.display = "none";

    }

);
/*==================================
        FORWARD MESSAGE
==================================*/

async function sendForwardMessage(

    chatId,

    receiverId

){

    const forwarded =

    window.Chat2.getForwardMessage();

    if(!forwarded) return;

    const newMessage = push(

        ref(

            db,

            "chats/" +

            chatId +

            "/messages"

        )

    );

    await set(newMessage,{

        sender:currentUser.uid,

        receiver:receiverId,

        text:forwarded.text || "",

        image:forwarded.image || "",

        type:forwarded.type,

        timestamp:Date.now(),

        status:"sent",

        forwarded:true

    });

    window.Chat2.clearForwardMessage();

}