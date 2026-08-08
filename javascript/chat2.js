/*==================================
            CHAT2.JS
==================================*/

import { auth, db } from "./firebase.js";

import {
    ref,
    update,
    remove,
    get,
    push,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
            DOM
==================================*/
const messageInput =
document.getElementById("messageInput");
const messagesContainer =
document.getElementById("messagesContainer");

const replyPreview =
document.getElementById("replyPreview");

const replyName =
document.getElementById("replyName");

const replyText =
document.getElementById("replyText");

const cancelReply =
document.getElementById("cancelReply");
const forwardSheet =
document.getElementById("forwardSheet");

const forwardList =
document.getElementById("forwardList");

const closeForward =
document.getElementById("closeForward");

const sendForward =
document.getElementById("sendForward");
/*==================================
        ATTACH SHEET
==================================*/

const attachSheet =
document.getElementById("attachSheet");

const galleryAttach =
document.getElementById("galleryAttach");

const cameraAttach =
document.getElementById("cameraAttach");

const videoAttach =
document.getElementById("videoAttach");

const audioAttach =
document.getElementById("audioAttach");

const fileAttach =
document.getElementById("fileAttach");

const locationAttach =
document.getElementById("locationAttach");

const contactAttach =
document.getElementById("contactAttach");

const cancelAttach =
document.getElementById("cancelAttach");

/*==================================
        MESSAGE MENU
==================================*/

const messageMenu =
document.getElementById("messageMenu");

const cancelMenu =
document.getElementById("cancelMenu");

const replyOption =
document.getElementById("replyOption");

const copyOption =
document.getElementById("copyOption");

const editOption =
document.getElementById("editOption");

const forwardOption =
document.getElementById("forwardOption");

const deleteOption =
document.getElementById("deleteOption");
const deleteSheet =
document.getElementById("deleteSheet");

const deleteMe =
document.getElementById("deleteMe");

const deleteEveryone =
document.getElementById("deleteEveryone");

const cancelDelete =
document.getElementById("cancelDelete");
/*==================================
        VARIABLES
==================================*/

let currentUser = null;

let replyingTo = null;

let selectedMessage = null;

let selectedMessageId = null;

let forwardTargets = [];
let forwardingMessage = null;

let editingMessageId = null;
const currentMatchId =
sessionStorage.getItem(
    "currentMatchId"
);
/*==================================
        AUTH
==================================*/

auth.onAuthStateChanged(user=>{

    currentUser = user;

});

/*==================================
        START REPLY
==================================*/

function startReply(

    messageId,

    sender,

    text

){

    replyingTo = {

        id:messageId,

        sender,

        text

    };

    replyName.textContent =

        sender===currentUser?.uid

        ? "You"

        : "Reply";

    replyText.textContent =

        text;

    replyPreview.classList.add(

        "show"

    );

}

/*==================================
        CANCEL REPLY
==================================*/

cancelReply?.addEventListener(

    "click",

    ()=>{

        replyingTo = null;

        replyPreview.classList.remove(

            "show"

        );

    }

);
/*-------edit--++--*/

editOption.addEventListener(

    "click",

    ()=>{

        if(

            selectedMessage.sender !== currentUser.uid

        ){

            return;

        }

        messageInput.value =

        selectedMessage.text || "";

        editingMessageId =

        selectedMessageId;

        messageInput.focus();

        messageMenu.classList.remove("show");

    }

);
/*==================================
        DELETE MENU
==================================*/

deleteOption.addEventListener(

    "click",

    ()=>{

        messageMenu.classList.remove("show");

        deleteSheet.classList.add("show");

    }

);

cancelDelete.addEventListener(

    "click",

    ()=>{

        deleteSheet.classList.remove("show");

    }

);

deleteMe.addEventListener(

    "click",

    async ()=>{

        if(!selectedMessageId) return;

        await update(

            ref(

                db,

                "chats/" +
                currentMatchId +
                "/messages/" +
                selectedMessageId +
                "/hidden"

            ),

            {

                [currentUser.uid]:true

            }

        );

        deleteSheet.classList.remove("show");

        window.showToast("Message deleted");

    }

);

deleteEveryone.addEventListener(

    "click",

    async ()=>{

        if(!selectedMessageId) return;

        await update(

            ref(

                db,

                "chats/" +
                currentMatchId +
                "/messages/" +
                selectedMessageId

            ),

            {

                deleted:true,

                deletedBy:currentUser.uid,

                text:"",

                image:""

            }

        );

        deleteSheet.classList.remove("show");

        window.showToast("Message deleted for everyone");

    }

);
/*==================================
        ATTACH FEATURES
==================================*/

function attachMessage(

    wrapper,

    messageId,

    message

){



    let startX = 0;

    let moved = false;

    wrapper.addEventListener(

        "touchstart",

        e=>{

            startX = e.touches[0].clientX;

            moved = false;

        }

    );

    wrapper.addEventListener(

        "touchmove",

        e=>{

            const diff =

                e.touches[0].clientX - startX;

            if(Math.abs(diff) > 20){

                moved = true;

            }

        }

    );

    wrapper.addEventListener(

        "touchend",

        e=>{

            if(!moved) return;

            const endX =

                e.changedTouches[0].clientX;

            if(endX - startX > 80){

                startReply(

                    messageId,

                    message.sender,

                    message.type === "image"

                        ? "📷 Photo"

                        : message.text

                );

            }

        }

    );

}

cancelMenu?.addEventListener(

    "click",

    ()=>{

        messageMenu.classList.remove("show");

    }

);

/*==================================
        OPEN MENU
==================================*/
function openMenu(

    messageId,

    message,

    x,

    y

){

    selectedMessageId = messageId;

    selectedMessage = message;

    messageMenu.style.display = "block";

    const menuHeight =

    messageMenu.offsetHeight;

    messageMenu.style.display = "";

    messageMenu.style.left = x + "px";

    if(y + menuHeight > window.innerHeight){

        messageMenu.style.top =

        (y - menuHeight) + "px";

    }

    else{

        messageMenu.style.top =

        y + "px";

    }

    messageMenu.classList.add("show");

}
async function loadForwardChats(){

    forwardTargets = [];

    forwardList.innerHTML = "";

    const chatsSnap = await get(ref(db,"chats"));

    if(!chatsSnap.exists()){

        forwardList.innerHTML =
        "<p>No chats found.</p>";

        return;

    }

    const chats = chatsSnap.val();

    for(const chatId in chats){

        const chat = chats[chatId];

        if(
            !chat.participants ||
            !chat.participants[currentUser.uid]
        ){

            continue;

        }

        const otherUser = Object.keys(
            chat.participants
        ).find(
            uid=>uid!==currentUser.uid
        );

        if(!otherUser) continue;

        const userSnap = await get(
            ref(db,"users/"+otherUser)
        );

        if(!userSnap.exists()) continue;

        const user = userSnap.val();

        const photo =
            user.photos?.profile ||
            Object.values(user.photos||{})[0] ||
            "assets/avatar.png";

        const name =
            user.personalInformation?.fullName ||
            "Member";

        const row =
        document.createElement("label");

        row.className="forward-user";

        row.innerHTML=`

            <img src="${photo}">

            <div class="info">

                <h4>${name}</h4>

            </div>

            <input
                type="checkbox"
                value="${chatId}"
                data-user="${otherUser}">

        `;

        forwardList.appendChild(row);

    }

}
sendForward.addEventListener(

    "click",

    async ()=>{

        const selected = [

            ...forwardList.querySelectorAll(

                "input:checked"

            )

        ];

        if(selected.length===0){

            window.showToast(

                "Select at least one chat"

            );

            return;

        }

        const message =

        window.Chat2.getForwardMessage();

        if(!message) return;

        for(const item of selected){

            const chatId =

            item.value;

            const receiver =

            item.dataset.user;

            const messagesRef = ref(

                db,

                "chats/" +

                chatId +

                "/messages"

            );

            const newMessage =

            push(messagesRef);

            await set(newMessage,{

                sender:currentUser.uid,

                receiver:receiver,

                text:message.text || "",

                image:message.image || "",

                type:message.type,

                timestamp:Date.now(),

                status:"sent",

                forwarded:true

            });

            await update(

                ref(db,"chats/"+chatId),

                {

                    lastMessage:

                        message.type==="image"

                        ? "📷 Photo"

                        : message.text,

                    lastMessageTime:

                        Date.now(),

                    lastSender:

                        currentUser.uid,

                    lastMessageStatus:

                        "sent"

                }

            );

        }

        forwardSheet.classList.remove(

            "show"

        );

        window.Chat2.clearForwardMessage();

        window.showToast(

            "Message forwarded"

        );

    }

);
/*==================================
        EXPORT
==================================*/
window.Chat2 = {

    attachMessage,

    openMenu,

    startReply,

    getReply(){

        return replyingTo;

    },

    clearReply(){

        replyingTo = null;

        replyPreview.classList.remove("show");

    },

    getForwardMessage(){

        return forwardingMessage;

    },

    clearForwardMessage(){

        forwardingMessage = null;

    },

    get editingMessageId(){

        return editingMessageId;

    },

    set editingMessageId(value){

        editingMessageId = value;

    }

};
document.addEventListener(

    "click",

    ()=>{

        messageMenu.classList.remove("show");

    }

);

messageMenu.addEventListener(

    "click",

    e=>{

        e.stopPropagation();

    }

);

/*-------Reply--------*/

replyOption.addEventListener(

    "click",

    ()=>{

        startReply(

            selectedMessageId,

            selectedMessage.sender,

            selectedMessage.type==="image"
            ? "📷 Photo"
            : selectedMessage.text

        );

        messageMenu.classList.remove("show");

    }

);

/*---- copy----*/
copyOption.addEventListener(

    "click",

    async ()=>{

        if(selectedMessage.type==="text"){

            await navigator.clipboard.writeText(

                selectedMessage.text

            );

        }

        messageMenu.classList.remove("show");

    }

);


/*---------------------/
  delete
/*------------------*/
deleteSheet.addEventListener(

    "click",

    e=>{

        if(e.target===deleteSheet){

            deleteSheet.classList.remove("show");

        }

    }

);
closeForward.addEventListener(

    "click",

    ()=>{

        forwardSheet.classList.remove("show");

    }

);

forwardSheet.addEventListener(

    "click",

    e=>{

        if(e.target===forwardSheet){

            forwardSheet.classList.remove("show");

        }

    }

);
forwardOption.addEventListener(

    "click",

    async ()=>{

        forwardingMessage = selectedMessage;

        messageMenu.classList.remove("show");

        forwardSheet.classList.add("show");

        await loadForwardChats();

    }

);
attachBtn.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.add("show");

    }

);
cancelAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

    }

);

attachSheet.addEventListener(

    "click",

    e=>{

        if(e.target===attachSheet){

            attachSheet.classList.remove("show");

        }

    }

);
galleryAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        imagePicker.click();

    }

);
cameraAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        imagePicker.setAttribute(

            "capture",

            "environment"

        );

        imagePicker.click();

    }

);
videoAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        window.showToast("Video coming soon");

    }

);

audioAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        window.showToast("Audio coming soon");

    }

);

fileAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        window.showToast("Documents coming soon");

    }

);

locationAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        window.showToast("Location coming soon");

    }

);

contactAttach.addEventListener(

    "click",

    ()=>{

        attachSheet.classList.remove("show");

        window.showToast("Contacts coming soon");

    }

);