/*==================================
        MESSAGES.JS
==================================*/

import {

    auth,

    db

} from "./firebase.js";

import {

    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setupPresence } from "./presence.js";
import {

    ref,

    get,

    onValue

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
            DOM
==================================*/

const backBtn =
document.getElementById("backBtn");

const searchInput =
document.getElementById("searchInput");

const conversationList =
document.getElementById("conversationList");

const conversationTemplate =
document.getElementById("conversationTemplate");

const emptyState =
document.getElementById("emptyState");

const unreadCount =
document.getElementById("unreadCount");

const toast =
document.getElementById("toast");

const filterButtons =
document.querySelectorAll(".filter-chip");

/*==================================
        VARIABLES
==================================*/

let currentUser = null;

let conversations = [];

let activeFilter = "all";

/*==================================
            START
==================================*/

document.addEventListener(

    "DOMContentLoaded",

    startMessages

);

function startMessages(){

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
            listenForConversations();

        }

    );

}

/*==================================
        BACK BUTTON
==================================*/

backBtn?.addEventListener(

    "click",

    ()=>{

        history.back();

    }

);

/*==================================
    LOAD CONVERSATIONS
==================================*/

function listenForConversations(){

    const chatsRef =

    ref(db,"chats");

    onValue(

        chatsRef,

        async(snapshot)=>{

            conversations=[];

            conversationList.innerHTML="";

            let unread=0;

            if(!snapshot.exists()){

                emptyState.style.display=

                "flex";

                unreadCount.textContent="0";

                return;

            }

            const chats=

            snapshot.val();

            for(const matchId in chats){

                const chat=

                chats[matchId];

                if(

                    !chat.participants ||

                    !chat.participants[currentUser.uid]

                ){

                    continue;

                }

                const otherUid=

                Object.keys(

                    chat.participants

                ).find(

                    uid=>

                    uid!==currentUser.uid

                );

                if(!otherUid)

                continue;

                const userSnap=

                await get(

                    ref(

                        db,

                        "users/"+

                        otherUid

                    )

                );

                if(!userSnap.exists())

                continue;

                const user=

                userSnap.val();
const existing = conversations.find(
    c => c.uid === otherUid
);

if (!existing) {

    conversations.push({

        matchId,

        uid: otherUid,

        user,

        chat

    });

} else if (
    (chat.lastMessageTime || 0) >
    (existing.chat.lastMessageTime || 0)
) {

    existing.matchId = matchId;
    existing.chat = chat;

}

                unread+=

                Number(

                    chat.unread?.[

                    currentUser.uid

                    ] || 0

                );

            }

            unreadCount.textContent=

            unread;

            renderConversations();

        }

    );

}
/*==================================
    RENDER CONVERSATIONS
==================================*/

function renderConversations(){

    conversationList.innerHTML="";

    let list=[...conversations];

    /*==========================
        FILTER
    ==========================*/

    if(activeFilter==="unread"){

        list=list.filter(item=>

            Number(

                item.chat.unread?.[

                    currentUser.uid

                ] || 0

            )>0

        );

    }

    /*==========================
        SEARCH
    ==========================*/

    const keyword=

    searchInput.value

    .trim()

    .toLowerCase();

    if(keyword){

        list=list.filter(item=>

            (

                item.user

                .personalInformation

                ?.fullName ||

                ""

            )

            .toLowerCase()

            .includes(keyword)

        );

    }

    /*==========================
        EMPTY
    ==========================*/

    if(list.length===0){

        emptyState.style.display="flex";

        return;

    }

    emptyState.style.display="none";

    /*==========================
        SORT
    ==========================*/

    list.sort(

        (a,b)=>

        (b.chat.lastMessageTime||0)

        -

        (a.chat.lastMessageTime||0)

    );

    list.forEach(item=>{

        createConversationCard(item);

    });

}

/*==================================
    CONVERSATION CARD
==================================*/

function createConversationCard(item){

    const clone=

    conversationTemplate

    .content

    .cloneNode(true);

    const info=

    item.user

    .personalInformation || {};

    const photos=

    item.user.photos || {};

    let photo=

    "assets/avatar.png";

    if(photos.profile){

        photo=

        photos.profile;

    }

    else if(

        Array.isArray(photos)

    ){

        photo=

        photos[0] ||

        photo;

    }

    else{

        const values=

        Object.values(photos);

        if(values.length){

            photo=

            values[0];

        }

    }

    clone.querySelector(

        ".avatar"

    ).src=photo;

    clone.querySelector(

        ".name"

    ).textContent=

    info.fullName ||

    "Member";
const lastMessageElement =
clone.querySelector(".last-message");

let ticks = "";

if(item.chat.lastSender === currentUser.uid){

    switch(item.chat.lastMessageStatus){

        case "seen":
            ticks = `<i class="fa-solid fa-check-double tick seen"></i>`;
            break;

        case "delivered":
            ticks = `<i class="fa-solid fa-check-double tick"></i>`;
            break;

        default:
            ticks = `<i class="fa-solid fa-check tick"></i>`;
    }

}

lastMessageElement.innerHTML = `
    ${ticks}
    <span>${item.chat.lastMessage || "Start chatting ❤️"}</span>
`;

    clone.querySelector(

        ".message-time"

    ).textContent=

    formatTime(

        item.chat.lastMessageTime

    );

    /*==========================
        VERIFIED
    ==========================*/

    if(

        item.user

        .verification

        ?.status !==

        "approved"

    ){

        clone.querySelector(

            ".verified-badge"

        ).style.display="none";

    }

    /*==========================
        ONLINE
    ==========================*/

    if(

        !item.user

        .presence?.online

    ){

        clone.querySelector(

            ".status-dot"

        ).style.background=

        "#C7C7C7";

    }

    /*==========================
        UNREAD
    ==========================*/

    const unread=

    Number(

        item.chat.unread?.[

            currentUser.uid

        ] || 0

    );

    const badge=

    clone.querySelector(

        ".unread-badge"

    );

    if(unread){

        badge.textContent=

        unread;

    }

    else{

        badge.style.display=

        "none";

    }

    /*==========================
        OPEN CHAT
    ==========================*/

    clone.querySelector(

        ".conversation-card"

    ).addEventListener(

        "click",

        ()=>{

            sessionStorage.setItem(

                "currentMatchId",

                item.matchId

            );

            sessionStorage.setItem(

                "selectedMatch",

                item.uid

            );

            window.location.href=

            "chat.html";

        }

    );

    conversationList.appendChild(

        clone

    );

}

/*==================================
        FORMAT TIME
==================================*/

function formatTime(timestamp){

    if(!timestamp) return "";

    const date=

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
            SEARCH
==================================*/

searchInput?.addEventListener(

    "input",

    ()=>{

        renderConversations();

    }

);

/*==================================
        FILTER CHIPS
==================================*/

filterButtons.forEach(button=>{

    button.addEventListener(

        "click",

        ()=>{

            filterButtons.forEach(btn=>{

                btn.classList.remove(

                    "active"

                );

            });

            button.classList.add(

                "active"

            );

            activeFilter =

            button.dataset.filter;

            renderConversations();

        }

    );

});

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

/*==================================
        MENU BUTTON
==================================*/

document.getElementById(

    "menuBtn"

)?.addEventListener(

    "click",

    ()=>{

        showToast(

            "More options coming soon."

        );

    }

);

/*==================================
        SEARCH BUTTON
==================================*/

document.getElementById(

    "searchToggle"

)?.addEventListener(

    "click",

    ()=>{

        searchInput.focus();

    }

);
