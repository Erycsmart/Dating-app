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
    update,
    push,
    remove,
    onValue,
    onChildAdded
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
        CALL LOGS
==================================*/

const callLogsOption =
document.getElementById("callLogsOption");

const callLogsSheet =
document.getElementById("callLogsSheet");

const callLogsList =
document.getElementById("callLogsList");

const closeCallLogs =
document.getElementById("closeCallLogs");
const clearChatOption =
document.getElementById("clearChatOption");

const clearChatDialog =
document.getElementById("clearChatDialog");

const confirmClearChat =
document.getElementById("confirmClearChat");

const cancelClearChat =
document.getElementById("cancelClearChat");



/*==================================
        CHAT THEMES
==================================*/

const chatThemesOption =
document.getElementById("chatThemesOption");

const chatThemesSheet =
document.getElementById("chatThemesSheet");

const closeChatThemes =
document.getElementById("closeChatThemes");

const themeOptions =
document.querySelectorAll(".theme-option");


/*==================================
        THEME HELPERS
==================================*/

function getChatThemeKey(){

    return "chatTheme_" +
        (currentMatchId || "default");

}


function getSavedChatTheme(){

    return localStorage.getItem(
        getChatThemeKey()
    ) || "pink";

}


function applyChatTheme(theme){

    const allowedThemes = [
        "pink",
        "blue",
        "dark",
        "green",
        "purple",
        "sunset"
    ];

    if(!allowedThemes.includes(theme)){

        theme = "pink";

    }


    /* REMOVE OLD THEME */

    document.body.classList.remove(

        "chat-theme-pink",
        "chat-theme-blue",
        "chat-theme-dark",
        "chat-theme-green",
        "chat-theme-purple",
        "chat-theme-sunset"

    );


    /* APPLY NEW THEME */

    document.body.classList.add(
        "chat-theme-" + theme
    );


    /* ALSO STORE AS DATA ATTRIBUTE */

    document.body.dataset.chatTheme =
        theme;


    /* SAVE FOR THIS CHAT */

    if(currentMatchId){

        localStorage.setItem(

            getChatThemeKey(),

            theme

        );

    }


    /* SELECTED BUTTON */

    themeOptions.forEach(option => {

        option.classList.toggle(

            "selected",

            option.dataset.theme === theme

        );

    });

}


/*==================================
        OPEN THEMES
==================================*/

chatThemesOption?.addEventListener(

    "click",

    e => {

        e.preventDefault();

        e.stopPropagation();

        chatHeaderMenu?.classList.remove(
            "show"
        );

        applyChatTheme(
            getSavedChatTheme()
        );

        chatThemesSheet?.classList.add(
            "show"
        );

    }

);


/*==================================
        CLOSE THEMES
==================================*/

closeChatThemes?.addEventListener(

    "click",

    e => {

        e.preventDefault();

        e.stopPropagation();

        chatThemesSheet?.classList.remove(
            "show"
        );

    }

);


/*==================================
        CLOSE OUTSIDE
==================================*/

chatThemesSheet?.addEventListener(

    "click",

    e => {

        if(e.target === chatThemesSheet){

            chatThemesSheet.classList.remove(
                "show"
            );

        }

    }

);


/*==================================
        SELECT THEME
==================================*/

themeOptions.forEach(option => {

    option.addEventListener(

        "click",

        e => {

            e.preventDefault();

            e.stopPropagation();

            const theme =
                option.dataset.theme;

            if(!theme) return;


            applyChatTheme(theme);


            chatThemesSheet?.classList.remove(
                "show"
            );


            showToast(

                theme.charAt(0).toUpperCase() +
                theme.slice(1) +
                " theme applied"

            );

        }

    );

});


/*==================================
        LOAD SAVED THEME
==================================*/

function loadSavedChatTheme(){

    if(!currentMatchId) return;

    applyChatTheme(
        getSavedChatTheme()
    );

}


/*==================================
        VARIABLES
==================================*/

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
/*==================================
        CALL LISTENER
==================================*/

            currentMatchId =

            sessionStorage.getItem(

                "currentMatchId"

            );

            selectedMatch =

            sessionStorage.getItem(

                "selectedMatch"

            );
loadSavedChatTheme();
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
if (
    message.hidden?.[currentUser.uid]
) {
    continue;
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

        const callsRef =
            ref(db, "calls");

        const newCall =
            push(callsRef);

        const callId =
            newCall.key;

        await set(newCall, {

            caller:
                currentUser.uid,

            receiver:
                selectedMatch,

            type:
                type,

            status:
                "ringing",

            createdAt:
                Date.now(),

            startedAt:
                null,

            answeredAt:
                null,

            endedAt:
                null,

            endedBy:
                null

        });

        console.log(
            "CALL CREATED:",
            callId
        );

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
        CHAT HEADER MENU
==================================*/

const menuBtn =
document.getElementById("menuBtn");

const chatHeaderMenu =
document.getElementById("chatHeaderMenu");


menuBtn?.addEventListener(

    "click",

    e => {

        e.preventDefault();

        e.stopPropagation();

        chatHeaderMenu?.classList.toggle("show");

    }

);


chatHeaderMenu?.addEventListener(

    "click",

    e => {

        e.stopPropagation();

    }

);


document.addEventListener(

    "click",

    () => {

        chatHeaderMenu?.classList.remove("show");

    }

);


/*==================================
        OPEN CALL LOGS
==================================*/

callLogsOption?.addEventListener(

    "click",

    async e => {

        e.preventDefault();

        e.stopPropagation();


        /* Close three-dot menu */

        chatHeaderMenu?.classList.remove(
            "show"
        );


        /* Open Call Logs */

        callLogsSheet?.classList.add(
            "show"
        );


        /* Load Firebase calls */

        await loadCallLogs();

    }

);


/*==================================
        CLOSE CALL LOGS
==================================*/

closeCallLogs?.addEventListener(

    "click",

    () => {

        callLogsSheet?.classList.remove(
            "show"
        );

    }

);


/*==================================
        CLOSE OUTSIDE
==================================*/

callLogsSheet?.addEventListener(

    "click",

    e => {

        if(
            e.target ===
            callLogsSheet
        ){

            callLogsSheet.classList.remove(
                "show"
            );

        }

    }

);
/*==================================
        CALL LOGS
==================================*/

async function loadCallLogs(){

    if(!callLogsList){

        return;

    }

    callLogsList.innerHTML = `
        <div class="call-log-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Loading call history...</span>
        </div>
    `;


    try{

        if(!currentUser){

            throw new Error(
                "Current user not loaded."
            );

        }


        /*==================================
            GET CHAT PARTICIPANTS
        ==================================*/

        const participants = new Set();


        /* My UID */

        participants.add(
            String(currentUser.uid)
        );


        /* Other user's UID */

        if(selectedMatch){

            participants.add(
                String(selectedMatch)
            );

        }


        /*
            currentMatchId is normally:

            UID1_UID2
        */

        if(currentMatchId){

            const parts =
                String(currentMatchId)
                .split("_");


            parts.forEach(uid=>{

                if(uid){

                    participants.add(
                        String(uid)
                    );

                }

            });

        }


        console.log(
            "CALL LOG PARTICIPANTS:",
            [...participants]
        );


        /*==================================
            GET ALL CALLS
        ==================================*/

        const snapshot =
            await get(
                ref(
                    db,
                    "calls"
                )
            );


        if(!snapshot.exists()){

            console.log(
                "CALL LOGS: No calls node found."
            );

            emptyCallLogs();

            return;

        }


        const allCalls =
            snapshot.val();


        console.log(
            "CALL LOGS: ALL CALLS:",
            allCalls
        );


        /*==================================
            FILTER CALLS BETWEEN THESE USERS
        ==================================*/

        const calls = [];


        Object.entries(allCalls)
        .forEach(
            ([callId, call])=>{

                if(!call){

                    return;

                }


                const caller =
                    String(
                        call.caller || ""
                    );


                const receiver =
                    String(
                        call.receiver || ""
                    );


                /*
                    Both participants must belong
                    to this conversation.
                */

                if(

                    participants.has(caller)

                    &&

                    participants.has(receiver)

                    &&

                    caller !== receiver

                ){

                    calls.push({

                        id:
                            callId,

                        ...call

                    });

                }

            }
        );


        console.log(
            "CALL LOGS: MATCHED CALLS:",
            calls
        );


        /*==================================
            SORT NEWEST FIRST
        ==================================*/

        calls.sort(

            (a,b)=>

                Number(
                    b.createdAt || 0
                )

                -

                Number(
                    a.createdAt || 0
                )

        );


        if(!calls.length){

            emptyCallLogs();

            return;

        }


        /*==================================
            RENDER
        ==================================*/

        callLogsList.innerHTML = "";


        calls.forEach(

            call=>{

                renderCallLog(
                    call
                );

            }

        );

    }

    catch(error){

        console.error(
            "CALL LOGS ERROR:",
            error
        );


        callLogsList.innerHTML = `

            <div class="call-log-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h4>Unable to load call logs</h4>

                <p>
                    ${error.message || "Unknown error"}
                </p>

            </div>

        `;

    }

}


/*==================================
        RENDER CALL LOG
==================================*/

function renderCallLog(call){

    const isOutgoing =
        String(call.caller) ===
        String(currentUser.uid);


    const isVideo =
        call.type === "video";


    /*==================================
        CALL STATUS
    ==================================*/

    let status = "Completed";


    if(
        call.status === "missed" ||
        call.status === "ringing"
    ){

        status = "Missed";

    }

    else if(
        call.status === "declined" ||
        call.status === "rejected"
    ){

        status = "Declined";

    }


    /*==================================
        DATE
    ==================================*/

    const timestamp =
        Number(
            call.createdAt ||
            Date.now()
        );


    const date =
        new Date(timestamp);


    const dateText =
        date.toLocaleString(
            [],
            {
                day:"numeric",
                month:"short",
                hour:"2-digit",
                minute:"2-digit"
            }
        );


    /*==================================
        CARD
    ==================================*/
const row = document.createElement("div");

row.className = "call-log-row";

const item = document.createElement("div");

item.className = "call-log-item";

row.appendChild(item);

    item.innerHTML = `

        <div class="call-log-icon">

            <i class="fa-solid ${
                isVideo
                ? "fa-video"
                : "fa-phone"
            }"></i>

        </div>


        <div class="call-log-info">

            <strong>

                ${
                    isVideo
                    ? "Video call"
                    : "Voice call"
                }

            </strong>


            <span class="call-log-details">

                <i class="fa-solid ${
                    isOutgoing
                    ? "fa-arrow-up"
                    : "fa-arrow-down"
                }"></i>

                ${
                    isOutgoing
                    ? "Outgoing"
                    : "Incoming"
                }

                ·

                ${dateText}

            </span>


            <span class="call-log-status ${
                status.toLowerCase()
            }">

                ${status}

            </span>

        </div>


        <!-- RECALL -->

        <button
            class="call-log-recall"
            type="button"
            title="${
                isVideo
                ? "Call back with video"
                : "Call back"
            }">

            <i class="fa-solid ${
                isVideo
                ? "fa-video"
                : "fa-phone"
            }"></i>

        </button>

    `;


    /*==================================
        RECALL BUTTON
    ==================================*/

    const recallBtn =
        item.querySelector(
            ".call-log-recall"
        );


    recallBtn?.addEventListener(

        "click",

        async e => {

            e.preventDefault();

            e.stopPropagation();


            /* Prevent double tapping */

            recallBtn.disabled = true;


            recallBtn.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

            `;


            try{

                await startCall(
                    isVideo
                    ? "video"
                    : "audio"
                );

            }

            catch(error){

                console.error(
                    "RECALL ERROR:",
                    error
                );


                recallBtn.disabled = false;


                recallBtn.innerHTML = `

                    <i class="fa-solid ${
                        isVideo
                        ? "fa-video"
                        : "fa-phone"
                    }"></i>

                `;

            }

        }

    );
    /*==================================
        SWIPE TO DELETE
==================================*/

let startX = 0;
let currentX = 0;
let swiping = false;

item.addEventListener(
    "touchstart",
    e => {

        startX = e.touches[0].clientX;
        currentX = startX;
        swiping = true;

        item.style.transition = "none";

    },
    { passive: true }
);


item.addEventListener(
    "touchmove",
    e => {

        if (!swiping) return;

        currentX = e.touches[0].clientX;

        const distance = currentX - startX;

        if (distance < 0) {

            item.style.transform =
                `translateX(${Math.max(distance, -90)}px)`;

        }

    },
    { passive: true }
);


item.addEventListener(
    "touchend",
    () => {

        if (!swiping) return;

        swiping = false;

        const distance = currentX - startX;

        item.style.transition =
            "transform .2s ease";

        if (distance < -60) {

            item.style.transform =
                "translateX(-90px)";

            showDeleteButton(
                item,
                call
            );

        } else {

            item.style.transform =
                "translateX(0)";

        }

    }
);

/*==================================
        SHOW DELETE BUTTON
==================================*/

function showDeleteButton(item, call) {

    const row = item.parentElement;

    if (!row) return;

    if (row.querySelector(".call-log-delete")) {
        return;
    }

    const deleteBtn = document.createElement("button");

    deleteBtn.className = "call-log-delete";

    deleteBtn.type = "button";

    deleteBtn.innerHTML = `
        <i class="fa-solid fa-trash"></i>
    `;

    deleteBtn.addEventListener("click", async e => {

        e.preventDefault();
        e.stopPropagation();

        try {

            await remove(
                ref(
                    db,
                    "calls/" + call.id
                )
            );

            row.remove();

            showToast("Call log deleted");

        } catch (error) {

            console.error(
                "DELETE CALL ERROR:",
                error
            );

            showToast(
                "Unable to delete call"
            );

        }

    });

    row.appendChild(deleteBtn);

}


/*==================================
        ADD TO CALL LOG LIST
==================================*/

callLogsList.appendChild(row);}
/*==================================
        EMPTY CALL LOGS
==================================*/

function emptyCallLogs(){

    callLogsList.innerHTML = `

        <div class="call-log-empty">

            <i class="fa-solid fa-phone-slash"></i>

            <h4>No calls yet</h4>

            <p>
                Your calls with this person
                will appear here.
            </p>

        </div>

    `;

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

}/*==================================
        CLEAR CHAT
==================================*/

clearChatOption?.addEventListener(
    "click",
    e => {

        e.preventDefault();
        e.stopPropagation();

        // Close three-dot menu
        chatHeaderMenu?.classList.remove("show");

        // Open custom confirmation dialog
        clearChatDialog?.classList.add("show");
    }
);


/*==================================
        CANCEL CLEAR CHAT
==================================*/

cancelClearChat?.addEventListener(
    "click",
    e => {

        e.preventDefault();
        e.stopPropagation();

        clearChatDialog?.classList.remove("show");
    }
);


/*==================================
        CONFIRM CLEAR CHAT
==================================*/

confirmClearChat?.addEventListener(
    "click",
    async e => {

        e.preventDefault();
        e.stopPropagation();

        if (!currentUser || !currentMatchId) {

            clearChatDialog?.classList.remove("show");

            showToast("Chat is not ready.");

            return;
        }

        // Prevent double clicks
        confirmClearChat.disabled = true;

        try {

            const messagesRef = ref(
                db,
                "chats/" +
                currentMatchId +
                "/messages"
            );

            const snapshot =
                await get(messagesRef);

            if (snapshot.exists()) {

                const messages =
                    snapshot.val();

                const updates = {};

                Object.keys(messages).forEach(
                    messageId => {

                        updates[
                            messageId +
                            "/hidden/" +
                            currentUser.uid
                        ] = true;

                    }
                );

                if (Object.keys(updates).length) {

                    await update(
                        messagesRef,
                        updates
                    );

                }
            }

            // Reset my unread count
            await update(
                ref(
                    db,
                    "chats/" +
                    currentMatchId
                ),
                {
                    ["unread/" + currentUser.uid]: 0
                }
            );

            // Clear screen immediately
            messagesContainer.innerHTML = "";

            renderedMessages.clear();

            // Close custom dialog
            clearChatDialog?.classList.remove("show");

            showToast(
                "Chat cleared for you."
            );

        }

        catch(error) {

            console.error(
                "CLEAR CHAT ERROR:",
                error
            );

            showToast(
                "Unable to clear chat."
            );

        }

        finally {

            confirmClearChat.disabled = false;

        }

    }
);