/* =========================================================
   COMMUNICATION.JS
   TWAGALANE / NANSUBUGA COMMUNICATION CENTRE

   FULL REWRITE — PHASE 1
   ---------------------------------------------------------
   PHASE 1:
   - Firebase
   - Admin authentication
   - Admin role
   - Registered users
   - Basic DOM references
   - User helpers
   - Toast
   - Foundation state

   DO NOT ADD CHAT LOGIC YET.
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    ref,
    get,
    set,
    push,
    update,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================================
   STATE
========================================================= */

let communicationAdminUid =
    null;

let communicationAdminRole =
    null;

let communicationAdmins =
    {};

let communicationUsers =
    {};

let communicationUsersLoaded =
    false;

let communicationSelectedUser =
    null;

let communicationSelectedChatId =
    null;

let communicationCurrentTab =
    "inbox";

let communicationInboxUnsubscribe =
    null;

let communicationMessagesUnsubscribe =
    null;

let communicationPresenceUnsubscribe =
    null;

let communicationUserPresenceUnsubscribe =
    null;

let communicationPresenceReady =
    false;

/* =========================================================
   CHAT BOT STATE — PHASE 1
========================================================= */

let communicationBotEnabled =
    true;

let communicationBotAvailable =
    false;

let communicationBotName =
    "Twagalane Assistant";

let communicationBotMode =
    "offline_only";
/* =========================================================
   DOM — MAIN COMMUNICATION MODAL
========================================================= */

const communicationModal =
    document.getElementById(
        "communicationModal"
    );

const communicationBackdrop =
    document.getElementById(
        "communicationBackdrop"
    );

const openCommunicationBtn =
    document.getElementById(
        "openCommunicationBtn"
    );

const closeCommunicationModal =
    document.getElementById(
        "closeCommunicationModal"
    );


/* =========================================================
   DOM — CHAT
========================================================= */

const communicationMessages =
    document.getElementById(
        "communicationMessages"
    );

const communicationMessageInput =
    document.getElementById(
        "communicationMessageInput"
    );

const communicationSendBtn =
    document.getElementById(
        "communicationSendBtn"
    );


/* =========================================================
   DOM — USERS / INBOX
========================================================= */

const communicationUserSearch =
    document.getElementById(
        "communicationUserSearch"
    );

const communicationConversationList =
    document.getElementById(
        "communicationConversationList"
    );

const communicationTabs =
    document.querySelectorAll(
        ".communication-tab"
    );


/* =========================================================
   TOAST
========================================================= */

function communicationToast(
    message,
    type = "info"
) {

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            type
        );

        return;

    }


    console.log(
        `[Communication ${type}]`,
        message
    );

}


/* =========================================================
   BODY SCROLL LOCK
========================================================= */

if (
    !document.getElementById(
        "communicationBodyLockStyle"
    )
) {

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "communicationBodyLockStyle";


    style.textContent = `

        body.communication-modal-open {
            overflow: hidden;
        }

        body.communication-profile-open {
            overflow: hidden;
        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   INITIAL MODAL STATE
========================================================= */

if (
    communicationModal
) {

    communicationModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   USER NAME
========================================================= */

function communicationGetUserName(
    user
) {

    if (!user) {

        return "Unknown User";

    }


    const personal =
        user.personalInformation ||
        {};


    return (

        user.fullName ||

        user.name ||

        personal.fullName ||

        personal.name ||

        user.username ||

        "Unknown User"

    );

}


/* =========================================================
   USER PHOTO
========================================================= */
function communicationGetUserPhoto(user) {

    if (!user) {
        return "";
    }

    const personal =
        user.personalInformation || {};

    /*
     * Try every common photo field.
     */

    const directPhoto =
        user.profilePhoto ||
        user.photoURL ||
        user.photo ||
        user.profileImage ||
        user.profilePicture ||
        user.image ||
        personal.profilePhoto ||
        personal.photoURL ||
        personal.photo ||
        personal.profileImage ||
        personal.profilePicture ||
        personal.image ||
        "";

    if (typeof directPhoto === "string" && directPhoto.trim()) {
        return directPhoto.trim();
    }

    /*
     * Support profile photo arrays.
     */

    const photoArrays = [
        user.profilePhotos,
        user.photos,
        user.profileImages,
        personal.profilePhotos,
        personal.photos,
        personal.profileImages
    ];

    for (const photos of photoArrays) {

        if (!Array.isArray(photos)) {
            continue;
        }

        for (const photo of photos) {

            if (typeof photo === "string" && photo.trim()) {
                return photo.trim();
            }

            if (photo && typeof photo === "object") {

                const url =
                    photo.url ||
                    photo.image ||
                    photo.src ||
                    photo.downloadURL ||
                    photo.photoURL ||
                    "";

                if (url) {
                    return url;
                }
            }
        }
    }

    /*
     * Support an object containing photos.
     */

    const photoObjects = [
        user.profilePhotos,
        user.photos,
        personal.profilePhotos,
        personal.photos
    ];

    for (const photos of photoObjects) {

        if (!photos || typeof photos !== "object") {
            continue;
        }

        for (const value of Object.values(photos)) {

            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }

            if (value && typeof value === "object") {

                const url =
                    value.url ||
                    value.image ||
                    value.src ||
                    value.downloadURL ||
                    value.photoURL ||
                    "";

                if (url) {
                    return url;
                }
            }
        }
    }

    return "";
}

/* =========================================================
   USER AGE
========================================================= */

function communicationGetUserAge(
    user
) {

    if (!user) {

        return "";

    }


    const personal =
        user.personalInformation ||
        {};


    return (

        user.age ||

        personal.age ||

        ""

    );

}


/* =========================================================
   USER DISTRICT
========================================================= */

function communicationGetUserDistrict(
    user
) {

    if (!user) {

        return "";

    }


    const personal =
        user.personalInformation ||
        {};


    return (

        user.district ||

        personal.district ||

        user.homeAddress ||

        personal.homeAddress ||

        ""

    );

}


/* =========================================================
   USER TRIBE
========================================================= */

function communicationGetUserTribe(
    user
) {

    if (!user) {

        return "";

    }


    const personal =
        user.personalInformation ||
        {};


    return (

        user.tribe ||

        personal.tribe ||

        ""

    );

}


/* =========================================================
   INITIAL
========================================================= */

function communicationGetInitial(
    name
) {

    const value =
        String(
            name ||
            "U"
        )
        .trim();


    return (
        value.charAt(0) ||
        "U"
    )
    .toUpperCase();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function communicationEscapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================================
   GET ADMIN RECORD
========================================================= */

async function communicationGetAdminRecord(
    uid
) {

    if (!uid) {

        return null;

    }


    try {

        const adminRef =
            ref(
                db,
                `admins/${uid}`
            );


        const snapshot =
            await get(
                adminRef
            );


        if (
            snapshot.exists()
        ) {

            return snapshot.val();

        }


        return null;

    }

    catch (error) {

        console.error(
            "Communication admin lookup error:",
            error
        );

        return null;

    }

}


/* =========================================================
   LOAD ADMINS
========================================================= */

async function communicationLoadAdmins() {

    try {

        const adminsRef =
            ref(
                db,
                "admins"
            );


        const snapshot =
            await get(
                adminsRef
            );


        if (
            !snapshot.exists()
        ) {

            communicationAdmins =
                {};

            return;

        }


        communicationAdmins =
            snapshot.val() || {};


        /*
         * Find the currently logged-in
         * administrator.
         */

        if (
            communicationAdminUid &&
            communicationAdmins[
                communicationAdminUid
            ]
        ) {

            const admin =
                communicationAdmins[
                    communicationAdminUid
                ];


            communicationAdminRole =
                String(
                    admin.role ||
                    ""
                )
                .toLowerCase();

        }

    }

    catch (error) {

        console.error(
            "Communication admins load error:",
            error
        );

    }

}


/* =========================================================
   LOAD REGISTERED USERS
========================================================= */

async function communicationLoadUsers() {

    communicationUsersLoaded =
        false;


    try {

        const usersRef =
            ref(
                db,
                "users"
            );


        const snapshot =
            await get(
                usersRef
            );


        if (
            !snapshot.exists()
        ) {

            communicationUsers =
                {};

            communicationUsersLoaded =
                true;

            return;

        }


        const data =
            snapshot.val() || {};


        const users = {};


        Object.entries(
            data
        )
        .forEach(
            ([uid, user]) => {

                if (!user) {

                    return;

                }


                /*
                 * Keep the Firebase UID
                 * available even when it isn't
                 * stored inside the record.
                 */

                users[uid] = {

                    ...user,

                    uid:
                        user.uid ||
                        uid

                };

            }
        );


        communicationUsers =
            users;


        communicationUsersLoaded =
            true;


        console.log(
            "Communication users loaded:",
            Object.keys(
                communicationUsers
            ).length
        );

    }

    catch (error) {

        console.error(
            "Communication users load error:",
            error
        );


        communicationUsers =
            {};


        communicationUsersLoaded =
            false;


        communicationToast(
            "Unable to load registered users.",
            "error"
        );

    }

}


/* =========================================================
   CHECK ADMIN ACCESS
========================================================= */

function communicationHasAccess() {

    if (
        !communicationAdminUid
    ) {

        return false;

    }


    const role =
        String(
            communicationAdminRole ||
            ""
        )
        .toLowerCase();


    return (

        role ===
        "superadmin"

        ||

        role ===
        "messagingadmin"

        ||

        role ===
        "messaging_admin"

        ||

        role ===
        "messaging admin"

    );

}


/* =========================================================
   AUTHENTICATION FOUNDATION
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        /*
         * Logged out.
         */

        if (!user) {

            communicationAdminUid =
                null;

            communicationAdminRole =
                null;

            communicationAdmins =
                {};

            communicationUsers =
                {};

            communicationUsersLoaded =
                false;

            communicationSelectedUser =
                null;

            communicationSelectedChatId =
                null;

            return;

        }


        communicationAdminUid =
            user.uid;


        /*
         * Load admins first.
         */

        await communicationLoadAdmins();


        /*
         * Verify role.
         */

        if (
            !communicationHasAccess()
        ) {

            console.warn(
                "Communication Centre access denied:",
                communicationAdminRole
            );

            communicationToast(
                "You do not have messaging permission.",
                "error"
            );

            return;

        }


        /*
         * Load users.
         */

        await communicationLoadUsers();


        console.log(
            "Communication Centre ready:",
            {
                uid:
                    communicationAdminUid,

                role:
                    communicationAdminRole,

                users:
                    Object.keys(
                        communicationUsers
                    ).length
            }
        );

    }
);


/* =========================================================
   PHASE 1 READY
========================================================= */

console.log(
    "Communication Centre — Phase 1 ready."
);
/* =========================================================
   COMMUNICATION.JS
   PHASE 2 — INBOX + CONVERSATION ENGINE
========================================================= */


/* =========================================================
   CHAT HELPERS
========================================================= */

function communicationChatIdForUsers(
    uidA,
    uidB
) {

    if (
        !uidA ||
        !uidB
    ) {

        return "";

    }


    return [
        uidA,
        uidB
    ]
    .sort()
    .join("_");

}


/* =========================================================
   FIND EXISTING CHAT
========================================================= */

async function communicationFindExistingChat(
    otherUid
) {

    if (
        !communicationAdminUid ||
        !otherUid
    ) {

        return null;

    }


    /*
     * First check the deterministic chat ID.
     */

    const expectedChatId =
        communicationChatIdForUsers(
            communicationAdminUid,
            otherUid
        );


    const expectedRef =
        ref(
            db,
            `chats/${expectedChatId}`
        );


    const expectedSnapshot =
        await get(
            expectedRef
        );


    if (
        expectedSnapshot.exists()
    ) {

        return expectedChatId;

    }


    /*
     * Fallback:
     * search existing chats in case an older
     * conversation used another ID.
     */

    const chatsRef =
        ref(
            db,
            "chats"
        );


    const chatsSnapshot =
        await get(
            chatsRef
        );


    if (
        !chatsSnapshot.exists()
    ) {

        return null;

    }


    const chats =
        chatsSnapshot.val() ||
        {};


    for (
        const [
            chatId,
            chat
        ]
        of Object.entries(chats)
    ) {

        if (!chat) {

            continue;

        }


        const participants =
            chat.participants ||
            {};


        const hasAdmin =
            participants[
                communicationAdminUid
            ] !== undefined;


        const hasUser =
            participants[
                otherUid
            ] !== undefined;


        if (
            hasAdmin &&
            hasUser
        ) {

            return chatId;

        }


        /*
         * Support older chat records that may
         * have sender/receiver fields.
         */

        if (

            (
                chat.sender ===
                communicationAdminUid &&

                chat.receiver ===
                otherUid
            )

            ||

            (
                chat.sender ===
                otherUid &&

                chat.receiver ===
                communicationAdminUid
            )

        ) {

            return chatId;

        }

    }


    return null;

}


/* =========================================================
   GET OR CREATE CHAT
========================================================= */

async function communicationGetOrCreateChat(
    otherUid
) {

    if (
        !communicationAdminUid ||
        !otherUid
    ) {

        throw new Error(
            "Missing chat participants."
        );

    }


    /*
     * VERY IMPORTANT:
     * If a conversation is already open,
     * reuse its chat ID.
     */

    if (
        communicationSelectedChatId &&
        communicationSelectedUser?.uid ===
            otherUid
    ) {

        return {
            chatId:
                communicationSelectedChatId
        };

    }


    /*
     * Look for an existing conversation.
     */

    let chatId =
        await communicationFindExistingChat(
            otherUid
        );


    /*
     * Only create a new chat if no existing
     * conversation exists.
     */

    if (!chatId) {

        chatId =
            communicationChatIdForUsers(
                communicationAdminUid,
                otherUid
            );


        const chatRef =
            ref(
                db,
                `chats/${chatId}`
            );


        const existing =
            await get(
                chatRef
            );


        if (
            !existing.exists()
        ) {

            await set(
                chatRef,
                {

                    participants: {

                        [communicationAdminUid]:
                            true,

                        [otherUid]:
                            true

                    },

                    createdAt:
                        Date.now(),

                    createdBy:
                        communicationAdminUid,

                    unread: {

                        [communicationAdminUid]:
                            0,

                        [otherUid]:
                            0

                    }

                }
            );

        }

    }


    communicationSelectedChatId =
        chatId;
/* =====================================================
   MAKE THIS CONVERSATION THE ACTIVE VIEW
===================================================== */

communicationCurrentTab =
    "inbox";


communicationTabs.forEach(
    tab => {

        const value =
            String(
                tab.dataset.tab ||
                tab.textContent ||
                ""
            )
            .trim()
            .toLowerCase();


        tab.classList.toggle(
            "active",
            !value.includes("user")
        );

    }
);

    return {
        chatId
    };

}


/* =========================================================
   GET USER LAST MESSAGE
========================================================= */

function communicationGetLastMessage(
    chat
) {

    if (!chat) {

        return "";

    }


    return (

        chat.lastMessage ||

        chat.last_message ||

        ""

    );

}


/* =========================================================
   GET LAST MESSAGE TIME
========================================================= */

function communicationGetLastMessageTime(
    chat
) {

    if (!chat) {

        return 0;

    }


    return Number(
        chat.lastMessageTime ||
        chat.last_message_time ||
        chat.timestamp ||
        0
    );

}


/* =========================================================
   FORMAT LIST TIME
========================================================= */

function communicationFormatListTime(
    timestamp
) {

    if (!timestamp) {

        return "";

    }


    const date =
        new Date(
            timestamp
        );


    const now =
        new Date();


    if (
        date.toDateString() ===
        now.toDateString()
    ) {

        return date.toLocaleTimeString(
            [],
            {
                hour:
                    "numeric",
                minute:
                    "2-digit"
            }
        );

    }


    return date.toLocaleDateString(
        [],
        {
            day:
                "numeric",
            month:
                "short"
        }
    );

}


/* =========================================================
   GET USER DISPLAY RECORD
========================================================= */

function communicationBuildUserRecord(
    uid
) {

    const user =
        communicationUsers[
            uid
        ];


    if (!user) {

        return null;

    }


    return {

        ...user,

        uid:
            user.uid ||
            uid,

        name:
            communicationGetUserName(
                user
            ),

        photo:
            communicationGetUserPhoto(
                user
            )

    };

}


/* =========================================================
   RENDER USER LIST
========================================================= */

async function communicationRenderUserList(
    query = ""
) {

    if (
        !communicationConversationList
    ) {

        return;

    }


    communicationConversationList.innerHTML =
        "";


    const chatsRef =
        ref(
            db,
            "chats"
        );


    const snapshot =
        await get(
            chatsRef
        );


    const chatEntries =
        snapshot.exists()
            ? Object.entries(
                snapshot.val() || {}
            )
            : [];


    const search =
        String(
            query || ""
        )
        .trim()
        .toLowerCase();


    const rows = [];


    for (
        const [
            chatId,
            chat
        ]
        of chatEntries
    ) {

        if (!chat) {

            continue;

        }


        const participants =
            chat.participants ||
            {};


        /*
         * We only want conversations
         * involving this admin.
         */

        if (
            !participants[
                communicationAdminUid
            ]
        ) {

            continue;

        }


        const otherUid =
            Object.keys(
                participants
            )
            .find(
                uid =>
                    uid !==
                    communicationAdminUid
            );


        if (!otherUid) {

            continue;

        }


        const user =
            communicationBuildUserRecord(
                otherUid
            );


        if (!user) {

            continue;

        }


        const searchable = [

            user.name,

            user.username,

            communicationGetUserDistrict(
                user
            ),

            communicationGetUserTribe(
                user
            )

        ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


        if (
            search &&
            !searchable.includes(
                search
            )
        ) {

            continue;

        }


        rows.push({

            chatId,

            user,

            chat

        });

    }


    /*
     * Most recently active conversations
     * first.
     */

    rows.sort(
        (a, b) =>
            communicationGetLastMessageTime(
                b.chat
            )
            -
            communicationGetLastMessageTime(
                a.chat
            )
    );


    /*
     * Empty inbox.
     */

    if (
        !rows.length
    ) {

        communicationConversationList
            .innerHTML = `

                <div
                    class="communication-empty-state">

                    <strong>
                        No conversations
                    </strong>

                    <small>
                        Conversations with users
                        will appear here.
                    </small>

                </div>

            `;

        return;

    }


    /*
     * Render conversations.
     */

    rows.forEach(
        row => {

            const {
                chatId,
                user,
                chat
            } = row;


            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "communication-user-row";


            if (
                communicationSelectedChatId ===
                chatId
            ) {

                item.classList.add(
                    "active"
                );

            }


            const unread =
                Number(
                    chat?.unread
                        ?.[communicationAdminUid] ||
                    0
                );


            const lastMessage =
                communicationGetLastMessage(
                    chat
                );


            const lastTime =
                communicationGetLastMessageTime(
                    chat
                );


            const photo =
                user.photo;


            item.innerHTML = `

                ${
                    photo

                        ? `

                            <img
                                src="${communicationEscapeHTML(
                                    photo
                                )}"
                                class="communication-user-avatar"
                                alt="${communicationEscapeHTML(
                                    user.name
                                )}"
                                loading="lazy">

                        `

                        : `

                            <div
                                class="communication-user-avatar communication-user-avatar-fallback">

                                ${communicationEscapeHTML(
                                    communicationGetInitial(
                                        user.name
                                    )
                                )}

                            </div>

                        `
                }


                <span
                    class="communication-user-row-content">

                    <span
                        class="communication-user-row-top">

                        <strong>

                            ${communicationEscapeHTML(
                                user.name
                            )}

                        </strong>


                        <small>

                            ${communicationEscapeHTML(
                                communicationFormatListTime(
                                    lastTime
                                )
                            )}

                        </small>

                    </span>


                    <span
                        class="communication-user-row-bottom">

                        <span>

                            ${communicationEscapeHTML(
                                lastMessage ||
                                "Start conversation"
                            )}

                        </span>


                        ${
                            unread > 0

                                ? `

                                    <b
                                        class="communication-unread-badge">

                                        ${unread > 99
                                            ? "99+"
                                            : unread}

                                    </b>

                                `

                                : ""

                        }

                    </span>

                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    communicationOpenConversation(
                        user,
                        chatId
                    );

                }
            );


            communicationConversationList
                .appendChild(
                    item
                );

        }
    );

}


/* =========================================================
   OPEN CONVERSATION
========================================================= */

async function communicationOpenConversation(
    user,
    existingChatId = null
) {
    if (
        !user?.uid
    ) {

        return;

    }


    if (
        !communicationHasAccess()
    ) {

        communicationToast(
            "You do not have messaging permission.",
            "error"
        );

        return;

    }


    /*
     * Stop previous message listener.
     */

    if (
        typeof communicationMessagesUnsubscribe ===
        "function"
    ) {

        communicationMessagesUnsubscribe();

        communicationMessagesUnsubscribe =
            null;

    }


    if (
        typeof communicationUserPresenceUnsubscribe ===
        "function"
    ) {

        communicationUserPresenceUnsubscribe();

        communicationUserPresenceUnsubscribe =
            null;

    }


    communicationSelectedUser =
        user;


    communicationSelectedChatId =
        existingChatId ||
        null;


    /*
     * If a known chat ID wasn't supplied,
     * find/create the conversation.
     */

    const {
        chatId
    } =
        await communicationGetOrCreateChat(
            user.uid
        );


    communicationSelectedChatId =
        chatId;

/* =========================================================
   SHOW ACTIVE CHAT PANEL
========================================================= */

const communicationChatEmpty =
    document.getElementById(
        "communicationChatEmpty"
    );

const communicationActiveChat =
    document.getElementById(
        "communicationActiveChat"
    );


if (
    communicationChatEmpty
) {

    communicationChatEmpty.hidden =
        true;

    communicationChatEmpty.style.display =
        "none";

}


if (
    communicationActiveChat
) {

    communicationActiveChat.hidden =
        false;

    communicationActiveChat.style.display =
        "flex";

}
    /*
     * Render the conversation header.
     */

    communicationRenderConversationHeader(
        user
    );


    /*
     * Load messages.
     */

    communicationSubscribeToMessages(
        chatId
    );


    /*
     * Mark messages as read.
     */

    await communicationMarkChatRead(
        chatId
    );


    /*
     * Refresh inbox so the unread badge
     * disappears immediately.
     */

    communicationRenderUserList(
        communicationUserSearch?.value ||
        ""
    );

}
/* =========================================================
   RENDER CONVERSATION HEADER
========================================================= */

function communicationRenderConversationHeader(
    user
) {

    if (!user) {

        return;

    }


    const name =
        communicationGetUserName(
            user
        );


    const photo =
        communicationGetUserPhoto(
            user
        );


    /*
     * NAME
     */

    const nameElements =
        document.querySelectorAll(
            "#communicationChatName, " +
            ".communication-selected-user-name, " +
            ".communication-chat-user-name"
        );


    nameElements.forEach(
        element => {

            element.textContent =
                name;

        }
    );


    /*
     * STATUS
     */

    const statusElements =
        document.querySelectorAll(
            "#communicationChatStatus, " +
            ".communication-selected-user-status, " +
            ".communication-chat-user-status"
        );


    statusElements.forEach(
        element => {

            element.textContent =
                "Offline";

        }
    );


    /*
     * PHOTO / AVATAR
     */

    const avatarElements =
        document.querySelectorAll(
            "#communicationChatAvatar, " +
            ".communication-selected-user-photo, " +
            ".communication-chat-user-photo"
        );


    avatarElements.forEach(
        element => {

            if (
                element.tagName ===
                "IMG"
            ) {

                element.src =
                    photo || "";

                element.alt =
                    name;

                return;

            }


            if (photo) {

                element.innerHTML = `

                    <img
                        src="${communicationEscapeHTML(
                            photo
                        )}"
                        alt="${communicationEscapeHTML(
                            name
                        )}">

                `;

            }

            else {

                element.innerHTML = `

                    <span>

                        ${communicationEscapeHTML(
                            communicationGetInitial(
                                name
                            )
                        )}

                    </span>

                `;

            }

        }
    );

}

/* =========================================================
   SUBSCRIBE TO MESSAGES
========================================================= */

function communicationSubscribeToMessages(
    chatId
) {

    if (
        !chatId
    ) {

        return;

    }


    if (
        typeof communicationMessagesUnsubscribe ===
        "function"
    ) {

        communicationMessagesUnsubscribe();

    }


    const messagesRef =
        ref(
            db,
            `chats/${chatId}/messages`
        );


    communicationMessagesUnsubscribe =
        onValue(
            messagesRef,
            snapshot => {

                communicationRenderMessages(
                    snapshot
                );

            }
        );

}


/* =========================================================
   RENDER MESSAGES — PHASE 2 FOUNDATION
========================================================= */

function communicationRenderMessages(
    snapshot
) {

    if (
        !communicationMessages
    ) {

        return;

    }


    communicationMessages.innerHTML =
        "";


    if (
        !snapshot.exists()
    ) {

        communicationMessages.innerHTML = `

            <div
                class="communication-empty-state communication-chat-empty">

                <strong>
                    No messages yet
                </strong>

                <small>
                    Start the conversation below.
                </small>

            </div>

        `;

        return;

    }


    const messages =
        snapshot.val() ||
        {};


    Object.entries(
        messages
    )
    .sort(
        (a, b) =>
            Number(
                a[1]?.timestamp || 0
            )
            -
            Number(
                b[1]?.timestamp || 0
            )
    )
    .forEach(
        ([messageId, message]) => {

            communicationRenderSingleMessage(
                messageId,
                message
            );

        }
    );

requestAnimationFrame(
    () => {

        communicationMessages.scrollTop =
            communicationMessages.scrollHeight;

        communicationBindProfileMessageClicks();

    }
);
}

/* =========================================================
   RENDER MEMBER PROFILE MESSAGE
   CLICKABLE PROFILE CARD
========================================================= */

function communicationRenderProfileMessage(
    message,
    time
) {

    const profile =
        message?.profile ||
        {};

    const name =
        profile.name ||
        "Member";

    const username =
        profile.username ||
        "";

    const photo =
        profile.photo ||
        "";

    const age =
        profile.age ||
        "";

    const gender =
        profile.gender ||
        "";

    const height =
        profile.height ||
        "";

    const skinTone =
        profile.skinTone ||
        "";

    const district =
        profile.district ||
        "";

    const tribe =
        profile.tribe ||
        "";

    const occupation =
        profile.occupation ||
        "";


    const meta = [

        age
            ? `${age} yrs`
            : "",

        gender,

        height

    ]
    .filter(Boolean)
    .join(" • ");


    return `

        <button
            type="button"
            class="communication-profile-message"
            data-profile-message-uid="${communicationEscapeHTML(
                profile.uid || ""
            )}">

            ${
                photo

                ? `

                    <img
                        src="${communicationEscapeHTML(photo)}"
                        class="communication-profile-message-photo"
                        alt="${communicationEscapeHTML(name)}"
                        loading="lazy">

                `

                : `

                    <div
                        class="communication-profile-message-photo communication-profile-message-photo-fallback">

                        ${communicationEscapeHTML(
                            communicationGetInitial(name)
                        )}

                    </div>

                `
            }


            <div
                class="communication-profile-message-body">

                <span
                    class="communication-profile-message-label">

                    MEMBER PROFILE

                </span>


                <strong
                    class="communication-profile-message-name">

                    ${communicationEscapeHTML(name)}

                </strong>


                ${
                    username

                    ? `

                        <span
                            class="communication-profile-message-username">

                            @${communicationEscapeHTML(username)}

                        </span>

                    `
                    : ""
                }


                ${
                    meta

                    ? `

                        <span
                            class="communication-profile-message-meta">

                            ${communicationEscapeHTML(meta)}

                        </span>

                    `
                    : ""
                }


                <div
                    class="communication-profile-message-details">

                    ${
                        district

                        ? `
                            <span>
                                📍 ${communicationEscapeHTML(district)}
                            </span>
                          `

                        : ""
                    }

                    ${
                        tribe

                        ? `
                            <span>
                                Tribe: ${communicationEscapeHTML(tribe)}
                            </span>
                          `

                        : ""
                    }

                    ${
                        occupation

                        ? `
                            <span>
                                Occupation: ${communicationEscapeHTML(
                                    occupation
                                )}
                            </span>
                          `

                        : ""
                    }

                    ${
                        skinTone

                        ? `
                            <span>
                                Skin tone: ${communicationEscapeHTML(
                                    skinTone
                                )}
                            </span>
                          `

                        : ""
                    }

                </div>


                <div
                    class="communication-profile-message-footer">

                    <span>
                        View profile
                    </span>

                    <small>
                        ${communicationEscapeHTML(time)}
                    </small>

                </div>

            </div>

        </button>

    `;
}
/* =========================================================
   PROFILE MESSAGE CLICK
========================================================= */

function communicationBindProfileMessageClicks() {

    if (!communicationMessages) {
        return;
    }

    communicationMessages
        .querySelectorAll(
            ".communication-profile-message"
        )
        .forEach(card => {

            if (
                card.dataset.profileClickBound === "true"
            ) {
                return;
            }

            card.dataset.profileClickBound = "true";

            card.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();
                    event.stopPropagation();

                    const uid =
                        card.dataset.profileMessageUid;

                    if (!uid) {
                        communicationToast(
                            "Profile information is unavailable.",
                            "error"
                        );
                        return;
                    }

                    communicationOpenFullMemberProfile(uid);

                }
            );

        });

}
/* =========================================================
   RENDER SINGLE MESSAGE
   Supports:
   - text
   - image/photo
   - proper sender side
   - timestamp
========================================================= */

function communicationRenderSingleMessage(
    messageId,
    message
) {

    if (
        !communicationMessages ||
        !message
    ) {

        return;

    }


    const isAdmin =
        String(
            message.sender || ""
        ) ===
        String(
            communicationAdminUid
        );


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "communication-message-row";


    wrapper.classList.add(
        isAdmin
            ? "communication-message-admin"
            : "communication-message-user"
    );


    wrapper.dataset.messageId =
        messageId;


    const type =
        String(
            message.type ||
            "text"
        )
        .toLowerCase();


    const timestamp =
        Number(
            message.timestamp ||
            0
        );


    const time =
        timestamp
            ? new Date(
                timestamp
            ).toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "";


    /* =====================================================
       IMAGE / PHOTO MESSAGE
    ===================================================== */

    if (
        type === "image" ||
        type === "photo"
    ) {

        const imageUrl =
            String(
                message.image ||
                message.url ||
                ""
            );


        if (
            imageUrl
        ) {

            wrapper.innerHTML = `

                <div
                    class="communication-image-message">

                    <img
                        src="${communicationEscapeHTML(
                            imageUrl
                        )}"
                        class="communication-message-image"
                        alt="Shared photo"
                        loading="lazy">

                    <small
                        class="communication-message-time">

                        ${communicationEscapeHTML(
                            time
                        )}

                    </small>

                </div>

            `;

        }

        else {

            wrapper.innerHTML = `

                <div
                    class="communication-message-bubble">

                    <div
                        class="communication-message-text">

                        Photo unavailable

                    </div>

                    <small
                        class="communication-message-time">

                        ${communicationEscapeHTML(
                            time
                        )}

                    </small>

                </div>

            `;

        }

    }


    /* =====================================================
       PROFILE CARD
    ===================================================== */

    else if (
        type === "profile"
    ) {

        if (
            typeof communicationRenderProfileMessage ===
            "function"
        ) {

            wrapper.innerHTML =
                communicationRenderProfileMessage(
                    message,
                    time
                );

        }

        else {

            wrapper.innerHTML = `

                <div
                    class="communication-message-bubble">

                    <div
                        class="communication-message-text">

                        Member profile

                    </div>

                    <small>

                        ${communicationEscapeHTML(
                            time
                        )}

                    </small>

                </div>

            `;

        }

    }


    /* =====================================================
       NORMAL TEXT
    ===================================================== */

    else {

        const text =
            String(
                message.text ||
                ""
            );


        wrapper.innerHTML = `

            <div
                class="communication-message-bubble">

                <div
                    class="communication-message-text">

                    ${communicationEscapeHTML(
                        text
                    )}

                </div>

                <small
                    class="communication-message-time">

                    ${communicationEscapeHTML(
                        time
                    )}

                </small>

            </div>

        `;

    }


    communicationMessages.appendChild(
        wrapper
    );

}
/* =========================================================
   MARK CHAT READ
========================================================= */

async function communicationMarkChatRead(
    chatId
) {

    if (
        !chatId ||
        !communicationAdminUid
    ) {

        return;

    }


    try {

        const unreadRef =
            ref(
                db,
                `chats/${chatId}/unread/${communicationAdminUid}`
            );


        await set(
            unreadRef,
            0
        );

    }

    catch (error) {

        console.error(
            "Mark chat read error:",
            error
        );

    }

}


/* =========================================================
   USER SEARCH
========================================================= */
if (
    communicationUserSearch
) {

    communicationUserSearch
        .addEventListener(
            "input",
            async () => {

                const query =
                    communicationUserSearch.value;


                if (
                    communicationCurrentTab ===
                    "users"
                ) {

                    await communicationRenderRegisteredUsers(
                        query
                    );

                    return;

                }


                await communicationRenderUserList(
                    query
                );

            }
        );

}
/* =========================================================
   TAB SWITCHING — FINAL
========================================================= */

communicationTabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            async () => {

                communicationTabs.forEach(
                    other => {

                        other.classList.remove(
                            "active"
                        );

                    }
                );


                tab.classList.add(
                    "active"
                );


                /*
                 * Detect the tab safely.
                 *
                 * We do NOT depend only on
                 * data-tab because your existing
                 * HTML may use another value.
                 */

                const tabValue =
                    String(
                        tab.dataset.tab ||
                        tab.textContent ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if (
                    tabValue.includes("user")
                ) {

                    communicationCurrentTab =
                        "users";

                }

                else {

                    communicationCurrentTab =
                        "inbox";

                }


                const query =
                    communicationUserSearch
                        ?.value ||
                    "";


                /*
                 * USERS TAB
                 */

                if (
                    communicationCurrentTab ===
                    "users"
                ) {

                    /*
                     * Make sure we have the
                     * latest registered users.
                     */

                    if (
                        !communicationUsersLoaded
                    ) {

                        await communicationLoadUsers();

                    }


                    await communicationRenderRegisteredUsers(
                        query
                    );


                    return;

                }


                /*
                 * INBOX TAB
                 */

                await communicationRenderUserList(
                    query
                );

            }
        );

    }
);

/* =========================================================
   OPEN COMMUNICATION CENTRE
========================================================= */

if (
    openCommunicationBtn
) {

    openCommunicationBtn
        .addEventListener(
            "click",
            async () => {

                if (
                    !communicationHasAccess()
                ) {

                    communicationToast(
                        "You do not have messaging permission.",
                        "error"
                    );

                    return;

                }


                /*
                 * OPEN MODAL
                 */

                if (
                    communicationModal
                ) {

                    communicationModal
                        .classList
                        .add("show");


                    communicationModal
                        .setAttribute(
                            "aria-hidden",
                            "false"
                        );


                    document.body.classList.add(
                        "communication-modal-open"
                    );

                }


                /*
                 * LOAD USERS
                 */

                if (
                    !communicationUsersLoaded
                ) {

                    await communicationLoadUsers();

                }


                /*
                 * RENDER THE CORRECT TAB
                 */

                const query =
                    communicationUserSearch?.value ||
                    "";


                if (
                    communicationCurrentTab ===
                    "users"
                ) {

                    await communicationRenderRegisteredUsers(
                        query
                    );

                }

                else {

                    await communicationRenderUserList(
                        query
                    );

                }

            }
        );

}

/* =========================================================
   CLOSE COMMUNICATION CENTRE
========================================================= */

function communicationCloseCentre() {

    if (
        communicationModal
    ) {

        communicationModal
            .classList
            .remove(
                "show"
            );


        communicationModal
            .setAttribute(
                "aria-hidden",
                "true"
            );

    }


    document.body.classList.remove(
        "communication-modal-open"
    );

}


if (
    closeCommunicationModal
) {

    closeCommunicationModal
        .addEventListener(
            "click",
            communicationCloseCentre
        );

}


if (
    communicationBackdrop
) {

    communicationBackdrop
        .addEventListener(
            "click",
            communicationCloseCentre
        );

}


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        communicationCloseCentre();

    }
); 
/* =========================================================
   INITIAL USER LIST
========================================================= */

async function communicationInitializePhase2() {

    if (
        !communicationHasAccess()
    ) {

        return;

    }


    if (
        !communicationUsersLoaded
    ) {

        await communicationLoadUsers();

    }


    await communicationRenderUserList();

}


communicationInitializePhase2();


/* =========================================================
   PHASE 2 READY
========================================================= */

console.log(
    "Communication Centre — Phase 2 ready."
);


/* =========================================================
   PHASE 3 — SEND TEXT MESSAGE
========================================================= */

async function communicationSendMessage() {

    if (
        !communicationAdminUid
    ) {

        communicationToast(
            "Admin account is not ready.",
            "error"
        );

        return;

    }


    if (
        !communicationSelectedUser?.uid
    ) {

        communicationToast(
            "Select a conversation first.",
            "info"
        );

        return;

    }


    if (
        !communicationSelectedChatId
    ) {

        communicationToast(
            "Conversation is not ready.",
            "error"
        );

        return;

    }


    const text =
        String(
            communicationMessageInput?.value ||
            ""
        )
        .trim();
/* =====================================================
   BOT INTERCEPTION
   -----------------------------------------------------
   If Admin is offline, let the bot handle the message.
   If Admin is online, continue with normal messaging.
===================================================== */

if (
    communicationBotAvailable &&
    text
){

    const handledByBot =
        communicationBotProcessMessage(
            text
        );


    if(handledByBot){

        communicationMessageInput.value =
            "";

        communicationMessageInput.style.height =
            "";


        return;

    }

}

    if (!text) {

        return;

    }


    try {

        const messagesRef =
            ref(
                db,
                `chats/${communicationSelectedChatId}/messages`
            );


        const messageRef =
            push(
                messagesRef
            );


        const timestamp =
            Date.now();


        await set(
            messageRef,
            {

                sender:
                    communicationAdminUid,

                receiver:
                    communicationSelectedUser.uid,

                type:
                    "text",

                text:
                    text,

                timestamp:
                    timestamp,

                status:
                    "sent"

            }
        );


        const chatRef =
            ref(
                db,
                `chats/${communicationSelectedChatId}`
            );


        const chatSnapshot =
            await get(
                chatRef
            );


        const chat =
            chatSnapshot.exists()
                ? chatSnapshot.val()
                : {};


        const unread =
            Number(
                chat?.unread
                    ?.[communicationSelectedUser.uid] ||
                0
            );


        await update(
            chatRef,
            {

                lastMessage:
                    text,

                lastMessageTime:
                    timestamp,

                lastSender:
                    communicationAdminUid,

                lastMessageStatus:
                    "sent",

                [
                    `unread/${communicationSelectedUser.uid}`
                ]:
                    unread + 1

            }
        );


        if (
            communicationMessageInput
        ) {

            communicationMessageInput.value =
                "";

        }


        communicationMessageInput
            ?.focus();


        communicationRenderUserList(
            communicationUserSearch?.value ||
            ""
        );

    }

    catch (error) {

        console.error(
            "Send message error:",
            error
        );


        communicationToast(
            "Message could not be sent.",
            "error"
        );

    }

}


/* =========================================================
   SEND BUTTON
========================================================= */

if (
    communicationSendBtn
) {

    communicationSendBtn
        .addEventListener(
            "click",
            communicationSendMessage
        );

}


/* =========================================================
   ENTER TO SEND
========================================================= */

if (
    communicationMessageInput
) {

    communicationMessageInput
        .addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    communicationSendMessage();

                }

            }
        );

}

/* =========================================================
   PHASE 4 — ADMIN PERMISSION + PRESENCE
   ---------------------------------------------------------
   IMPORTANT:
   This phase does NOT replace or wrap any Phase 1–3
   functions.
========================================================= */


/* =========================================================
   PHASE 4 ROLE CHECK
========================================================= */

function communicationPhase4NormalizeRole(
    role
) {

    return String(
        role || ""
    )
    .trim()
    .toLowerCase()
    .replace(
        /[\s-]+/g,
        "_"
    );

}


/* =========================================================
   PHASE 4 ACCESS CHECK
========================================================= */
  function communicationPhase4CanMessage() {

    return communicationHasAccess();

  }

/* =========================================================
   PHASE 4 ADMIN PRESENCE
========================================================= */

async function communicationPhase4StartPresence() {

    if (
        !communicationAdminUid
    ) {

        return;

    }


    if (
        !communicationPhase4CanMessage()
    ) {

        return;

    }


    const presenceRef =
        ref(
            db,
            `presence/admins/${communicationAdminUid}`
        );


    try {

        await onDisconnect(
            presenceRef
        )
        .set({

            online:
                false,

            lastSeen:
                Date.now()

        });


        await set(
            presenceRef,
            {

                online:
                    true,

                lastSeen:
                    Date.now()

            }
        );


        communicationPresenceReady =
            true;


        console.log(
            "Communication admin presence started."
        );

    }

    catch (error) {

        console.error(
            "Communication presence error:",
            error
        );

    }

}


/* =========================================================
   PHASE 4 UPDATE PRESENCE
========================================================= */

async function communicationPhase4UpdatePresence() {

    if (
        !communicationAdminUid ||
        !communicationPresenceReady
    ) {

        return;

    }


    try {

        await update(
            ref(
                db,
                `presence/admins/${communicationAdminUid}`
            ),
            {

                online:
                    true,

                lastSeen:
                    Date.now()

            }
        );

    }

    catch (error) {

        console.error(
            "Presence update error:",
            error
        );

    }

}


/* =========================================================
   PHASE 4 PRESENCE HEARTBEAT
========================================================= */

setInterval(
    () => {

        communicationPhase4UpdatePresence();

    },
    30000
);

/* =========================================================
   PHASE 4 — UNREAD MONITOR
========================================================= */


/* =========================================================
   GET ADMIN UNREAD COUNT
========================================================= */

function communicationPhase4GetUnreadCount(
    chat
) {

    if (
        !chat ||
        !communicationAdminUid
    ) {

        return 0;

    }


    const unread =
        chat.unread || {};


    return Number(
        unread[
            communicationAdminUid
        ] || 0
    );

}


/* =========================================================
   UPDATE UNREAD BADGES
========================================================= */

function communicationPhase4UpdateBadges(
    total
) {

    const badges =
        document.querySelectorAll(
            `
            .communication-unread-badge,
            .communication-main-unread-badge
            `
        );


    badges.forEach(
        badge => {

            if (
                total > 0
            ) {

                badge.textContent =
                    total > 99
                        ? "99+"
                        : String(total);


                badge.style.display =
                    "";

            }

            else {

                badge.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   START UNREAD MONITOR
========================================================= */

function communicationPhase4StartUnreadMonitor() {

    if (
        communicationInboxUnsubscribe
    ) {

        communicationInboxUnsubscribe();

        communicationInboxUnsubscribe =
            null;

    }


    if (
        !communicationAdminUid
    ) {

        return;

    }


    const chatsRef =
        ref(
            db,
            "chats"
        );


    communicationInboxUnsubscribe =
        onValue(
            chatsRef,
            snapshot => {

                let total =
                    0;


                if (
                    snapshot.exists()
                ) {

                    const chats =
                        snapshot.val() || {};


                    Object.values(
                        chats
                    )
                    .forEach(
                        chat => {

                            total +=
                                communicationPhase4GetUnreadCount(
                                    chat
                                );

                        }
                    );

                }


                communicationPhase4UpdateBadges(
                    total
                );

            }
        );

}

/* =========================================================
   PHASE 4 — USER PRESENCE
========================================================= */


/* =========================================================
   WATCH USER PRESENCE
========================================================= */

function communicationPhase4WatchUser(
    uid
) {

    if (
        communicationUserPresenceUnsubscribe
    ) {

        communicationUserPresenceUnsubscribe();

        communicationUserPresenceUnsubscribe =
            null;

    }


    if (!uid) {

        return;

    }


    const presenceRef =
        ref(
            db,
            `presence/users/${uid}`
        );


    communicationUserPresenceUnsubscribe =
        onValue(
            presenceRef,
            snapshot => {

                const presence =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                communicationPhase4RenderUserStatus(
                    presence
                );

            }
        );

}


/* =========================================================
   RENDER ONLINE / OFFLINE
========================================================= */

function communicationPhase4RenderUserStatus(
    presence
) {

    const online =
        presence?.online === true;


    const statusElements =
        document.querySelectorAll(
            `
            .communication-user-status,
            .communication-selected-user-status,
            .communication-chat-user-status
            `
        );


    statusElements.forEach(
        element => {

            element.textContent =
                online
                    ? "Online"
                    : "Offline";


            element.classList.toggle(
                "online",
                online
            );


            element.classList.toggle(
                "offline",
                !online
            );

        }
    );

}

/* =========================================================
   PHASE 4 — SAFE INITIALIZATION
========================================================= */

async function communicationPhase4Initialize() {

    /*
     * Firebase may not have finished authentication
     * when this file first loads.
     */

    if (
        !communicationAdminUid
    ) {

        return;

    }


    if (
        !communicationPhase4CanMessage()
    ) {

        console.warn(
            "Phase 4: messaging permission denied."
        );

        return;

    }


    await communicationPhase4StartPresence();


    communicationPhase4StartUnreadMonitor();
  
    communicationInitializeBot();

    console.log(
        "Communication Centre — Phase 4 ready."
    );

}


/* =========================================================
   WAIT FOR AUTHENTICATED USER
========================================================= */

onAuthStateChanged(
    auth,
    () => {

        communicationPhase4Initialize();

    }
);

/* =========================================================
   PHASE 4 PATCH — REGISTERED USERS TAB
========================================================= */
async function communicationRenderRegisteredUsers(
    query = ""
) {

    if (
        !communicationConversationList
    ) {

        return;

    }


    /*
     * Always make sure the Users tab has
     * the current Firebase users.
     */

    if (
        !communicationUsersLoaded
    ) {

        await communicationLoadUsers();

    }


    communicationConversationList.innerHTML = "";
  
    const search =
        String(query || "")
            .trim()
            .toLowerCase();

    const users =
        Object.values(
            communicationUsers || {}
        )
        .filter(
            user =>
                user?.uid &&
                user.uid !== communicationAdminUid
        )
        .filter(
            user => {

                if (!search) {
                    return true;
                }

                const searchable = [

                    communicationGetUserName(user),

                    user.username,

                    communicationGetUserGenderSafe(user),

                    communicationGetUserHeightSafe(user),

                    communicationGetUserSkinToneSafe(user),

                    communicationGetUserDistrict(user),

                    communicationGetUserTribe(user),

                    communicationGetUserOccupationSafe(user)

                ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

                return searchable.includes(
                    search
                );

            }
        )
        .sort(
            (a, b) =>
                communicationGetUserName(a)
                    .localeCompare(
                        communicationGetUserName(b)
                    )
        );


    if (!users.length) {

        communicationConversationList.innerHTML = `

            <div class="communication-empty-state">

                <strong>
                    No users found
                </strong>

                <small>
                    Try searching another name or username.
                </small>

            </div>

        `;

        return;
    }


    users.forEach(
        user => {

            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";

            item.className =
                "communication-user-row";


            const name =
                communicationGetUserName(
                    user
                );

            const photo =
                communicationGetUserPhoto(
                    user
                );


            item.innerHTML = `

                ${
                    photo

                    ? `

                        <img
                            src="${communicationEscapeHTML(photo)}"
                            class="communication-user-avatar"
                            alt="${communicationEscapeHTML(name)}"
                            loading="lazy">

                    `

                    : `

                        <div
                            class="communication-user-avatar communication-user-avatar-fallback">

                            ${communicationEscapeHTML(
                                communicationGetInitial(
                                    name
                                )
                            )}

                        </div>

                    `
                }

                <span
                    class="communication-user-row-content">

                    <span
                        class="communication-user-row-top">

                        <strong>
                            ${communicationEscapeHTML(name)}
                        </strong>

                    </span>

                    <span
                        class="communication-user-row-bottom">

                        <span>
                            ${communicationEscapeHTML(
                                user.username ||
                                "Registered member"
                            )}
                        </span>

                    </span>

                </span>

            `;


            item.addEventListener(
                "click",
                async () => {

                    await communicationOpenUserFromDirectory(
                        user
                    );

                }
            );


            communicationConversationList
                .appendChild(
                    item
                );

        }
    );

}


/* =========================================================
   USER DIRECTORY FIELD HELPERS
========================================================= */

function communicationGetUserGenderSafe(
    user
) {

    return (
        user?.gender ||
        user?.sex ||
        user?.personalInformation?.gender ||
        user?.personalInformation?.sex ||
        ""
    );

}


function communicationGetUserHeightSafe(
    user
) {

    return (
        user?.height ||
        user?.personalInformation?.height ||
        ""
    );

}


function communicationGetUserSkinToneSafe(
    user
) {

    return (
        user?.skinTone ||
        user?.complexion ||
        user?.personalInformation?.skinTone ||
        user?.personalInformation?.complexion ||
        ""
    );

}


function communicationGetUserOccupationSafe(
    user
) {

    return (
        user?.occupation ||
        user?.personalInformation?.occupation ||
        ""
    );

}

/* =========================================================
   OPEN USER FROM DIRECTORY
========================================================= */

async function communicationOpenUserFromDirectory(
    user
) {

    if (
        !user?.uid
    ) {

        return;

    }


    /*
     * Switch back to the Inbox/chat view.
     */

    communicationCurrentTab =
        "inbox";


    /*
     * Update the visible tab buttons.
     */

    communicationTabs.forEach(
        tab => {

            const value =
                String(
                    tab.dataset.tab ||
                    tab.textContent ||
                    ""
                )
                .trim()
                .toLowerCase();


            tab.classList.toggle(
                "active",
                !value.includes("user")
            );

        }
    );


    /*
     * Open/create the real conversation.
     */

    try {

        await communicationOpenConversation(
            user
        );

    }

    catch (error) {

        console.error(
            "Could not open user conversation:",
            error
        );


        communicationToast(
            "Could not open this conversation.",
            "error"
        );

    }

}



/* =========================================================
   ATTACHMENT SYSTEM
   ---------------------------------------------------------
   Uses the EXISTING HTML elements:

   #communicationAttachBtn
   #communicationAttachmentMenu
   [data-communication-attachment="profile"]

   Does NOT create another button or menu.
========================================================= */

function communicationCreateAttachmentButton() {

    const attachButton =
        document.getElementById(
            "communicationAttachBtn"
        );

    const menu =
        document.getElementById(
            "communicationAttachmentMenu"
        );


    /* -----------------------------------------------------
       CHECK ATTACHMENT BUTTON
    ----------------------------------------------------- */

    if (!attachButton) {

        console.error(
            "Attachment button not found: #communicationAttachBtn"
        );

        return;

    }


    /* -----------------------------------------------------
       CHECK ATTACHMENT MENU
    ----------------------------------------------------- */

    if (!menu) {

        console.error(
            "Attachment menu not found: #communicationAttachmentMenu"
        );

        return;

    }


    /* -----------------------------------------------------
       PREVENT DOUBLE BINDING
    ----------------------------------------------------- */

    if (
        attachButton.dataset.communicationBound ===
        "true"
    ) {

        return;

    }


    attachButton.dataset.communicationBound =
        "true";


    /* -----------------------------------------------------
       OPEN / CLOSE MENU
    ----------------------------------------------------- */

    attachButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            menu.hidden =
                !menu.hidden;

        }
    );


    /* -----------------------------------------------------
       MEMBER PROFILE OPTION
    ----------------------------------------------------- */

    const profileOption =
        menu.querySelector(
            '[data-communication-attachment="profile"]'
        );


    if (!profileOption) {

        console.error(
            "Member Profile attachment option not found."
        );

        return;

    }


    if (
        profileOption.dataset.communicationBound !==
        "true"
    ) {

        profileOption.dataset.communicationBound =
            "true";


        profileOption.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                menu.hidden =
                    true;


                /*
                 * Open the EXISTING profile search
                 * system.
                 */

                if (
                    typeof communicationOpenProfilePicker ===
                    "function"
                ) {

                    communicationOpenProfilePicker();

                }

                else if (
                    typeof openCommunicationProfileSearch ===
                    "function"
                ) {

                    openCommunicationProfileSearch();

                }

                else {

                    console.error(
                        "No profile search function exists."
                    );

                    communicationToast(
                        "Profile search is not available.",
                        "error"
                    );

                }

            }
        );

    }


    /* -----------------------------------------------------
       CLOSE MENU WHEN CLICKING OUTSIDE
    ----------------------------------------------------- */

    if (
        menu.dataset.communicationOutsideBound !==
        "true"
    ) {

        menu.dataset.communicationOutsideBound =
            "true";


        document.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    attachButton
                ) {

                    return;

                }


                if (
                    menu.contains(
                        event.target
                    )
                ) {

                    return;

                }


                menu.hidden =
                    true;

            }
        );

    }


    console.log(
        "Communication attachment system connected."
    );

}
/* =========================================================
   MEMBER PROFILE SEARCH MODAL
========================================================= */

function communicationOpenProfilePicker() {

    const modal =
        document.getElementById(
            "communicationProfileModal"
        );

    const search =
        document.getElementById(
            "communicationProfileSearch"
        );

    const results =
        document.getElementById(
            "communicationProfileResults"
        );


    if (!modal) {

        console.error(
            "communicationProfileModal not found."
        );

        return;

    }


    if (!communicationSelectedUser) {

        communicationToast(
            "Open a conversation first.",
            "info"
        );

        return;

    }


    /* OPEN MODAL */

    modal.hidden =
        false;

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    modal.classList.add(
        "show"
    );


    /* CLEAR SEARCH */

    if (search) {

        search.value =
            "";

    }

/* =========================================================
   LOAD MEMBERS IMMEDIATELY
========================================================= */

if (results) {

    communicationRenderProfileResults("");

}

    /* SEARCH */

    if (
        search &&
        search.dataset.profileBound !==
        "true"
    ) {

        search.dataset.profileBound =
            "true";


        search.addEventListener(
            "input",
            function () {

                communicationRenderProfileResults(
                    search.value
                );

            }
        );

    }


    /* CLOSE BUTTON */

    const closeButton =
        document.getElementById(
            "closeCommunicationProfileModal"
        );


    if (
        closeButton &&
        closeButton.dataset.profileBound !==
        "true"
    ) {

        closeButton.dataset.profileBound =
            "true";


        closeButton.addEventListener(
            "click",
            communicationCloseProfilePicker
        );

    }


    /* BACKDROP */

    const backdrop =
        document.getElementById(
            "communicationProfileBackdrop"
        );


    if (
        backdrop &&
        backdrop.dataset.profileBound !==
        "true"
    ) {

        backdrop.dataset.profileBound =
            "true";


        backdrop.addEventListener(
            "click",
            communicationCloseProfilePicker
        );

    }


    /* FOCUS SEARCH */

    setTimeout(
        () => {

            search?.focus();

        },
        100
    );

}


/* =========================================================
   CLOSE MEMBER PROFILE SEARCH
========================================================= */

function communicationCloseProfilePicker() {

    const modal =
        document.getElementById(
            "communicationProfileModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.hidden =
        true;

}

/* =========================================================
   START ATTACHMENT SYSTEM
========================================================= */

function communicationInitializeAttachmentSystem() {

    communicationCreateAttachmentButton();

}


/* =========================================================
   INITIALIZE ATTACHMENTS
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        communicationInitializeAttachmentSystem
    );

} else {

    communicationInitializeAttachmentSystem();

}
/* =========================================================
   SEND MEMBER PROFILE CARD
========================================================= */

async function communicationSendProfileCard(user) {

    if (!user?.uid) {

        communicationToast(
            "Invalid member profile.",
            "error"
        );

        return;

    }


    if (!communicationAdminUid) {

        communicationToast(
            "Admin account is not ready.",
            "error"
        );

        return;

    }


    if (!communicationSelectedUser) {

        communicationToast(
            "Select a conversation first.",
            "error"
        );

        return;

    }


    try {

        const receiverUid =
            communicationSelectedUser.uid;


        /* ---------------------------------------------
           USE CURRENT ADMIN ↔ USER CHAT
        --------------------------------------------- */

        const {
            chatId
        } =
            await communicationGetOrCreateChat(
                receiverUid
            );


        if (!chatId) {

            throw new Error(
                "Chat ID was not created."
            );

        }


        /* ---------------------------------------------
           PROFILE INFORMATION
        --------------------------------------------- */

        const personal =
            user.personalInformation ||
            {};


        const profile = {

            uid:
                user.uid,

            name:
                communicationGetUserName(
                    user
                ),

            username:
                user.username ||
                personal.username ||
                "",

            photo:
                communicationGetUserPhoto(
                    user
                ),

            age:
                communicationGetUserAge(
                    user
                ),

            gender:
                personal.gender ||
                personal.sex ||
                user.gender ||
                user.sex ||
                "",

            height:
                personal.height ||
                user.height ||
                "",

            skinTone:
                personal.skinTone ||
                personal.skinToneColor ||
                personal.complexion ||
                user.skinTone ||
                user.complexion ||
                "",

            district:
                communicationGetUserDistrict(
                    user
                ),

            tribe:
                communicationGetUserTribe(
                    user
                ),

            occupation:
                personal.occupation ||
                user.occupation ||
                ""

        };


        /* ---------------------------------------------
           CREATE NEW MESSAGE
        --------------------------------------------- */

        const messagesRef =
            ref(
                db,
                `chats/${chatId}/messages`
            );


        const newMessage =
            push(
                messagesRef
            );


        const timestamp =
            Date.now();


        /* ---------------------------------------------
           THIS MUST BE A PROFILE MESSAGE
        --------------------------------------------- */

        await set(
            newMessage,
            {

                sender:
                    communicationAdminUid,

                receiver:
                    receiverUid,

                type:
                    "profile",

                profile:
                    profile,

                text:
                    `Member profile: ${profile.name}`,

                timestamp:
                    timestamp,

                status:
                    "sent"

            }
        );


        /* ---------------------------------------------
           UPDATE CHAT PREVIEW
        --------------------------------------------- */

        await update(
            ref(
                db,
                `chats/${chatId}`
            ),
            {

                lastMessage:
                    `Profile: ${profile.name}`,

                lastMessageTime:
                    timestamp,

                lastSender:
                    communicationAdminUid,

                lastMessageStatus:
                    "sent"

            }
        );


        /* ---------------------------------------------
           CLOSE PICKER
        --------------------------------------------- */

        communicationCloseProfilePicker();


        /* ---------------------------------------------
           FORCE CURRENT CHAT TO DISPLAY
        --------------------------------------------- */

        communicationLoadMessagesByChatId(
            chatId
        );


        communicationToast(
            `${profile.name}'s profile sent.`,
            "success"
        );


        console.log(
            "PROFILE MESSAGE SENT:",
            {
                chatId,
                messageId: newMessage.key,
                profile
            }
        );

    }

    catch (error) {

        console.error(
            "SEND PROFILE CARD ERROR:",
            error
        );


        communicationToast(
            "Unable to send member profile.",
            "error"
        );

    }

}

/* =========================================================
   RENDER MEMBER PROFILE RESULTS
========================================================= */

function communicationRenderProfileResults(
    searchTerm = ""
) {

    const results =
        document.getElementById(
            "communicationProfileResults"
        );

    if (!results) {

        console.error(
            "communicationProfileResults not found."
        );

        return;

    }


    /* -----------------------------------------------------
       GET SEARCH QUERY
    ----------------------------------------------------- */

    const query =
        String(searchTerm || "")
            .trim()
            .toLowerCase();


    /* -----------------------------------------------------
       GET ALL LOADED USERS
    ----------------------------------------------------- */

    let users =
        Object.values(
            communicationUsers || {}
        )
        .filter(
            user =>
                user &&
                user.uid
        );


    /* -----------------------------------------------------
       FILTER USERS
    ----------------------------------------------------- */

    if (query) {

        users =
            users.filter(
                user => {

                    const searchText =
                        communicationProfileSearchText(
                            user
                        );

                    return query
                        .split(/\s+/)
                        .filter(Boolean)
                        .every(
                            term =>
                                searchText.includes(
                                    term
                                )
                        );

                }
            );

    }


    /* -----------------------------------------------------
       SORT ALPHABETICALLY
    ----------------------------------------------------- */

    users.sort(
        (a, b) =>
            communicationGetUserName(a)
                .localeCompare(
                    communicationGetUserName(b)
                )
    );


    /* -----------------------------------------------------
       CLEAR OLD RESULTS
    ----------------------------------------------------- */

    results.innerHTML = "";


    /* -----------------------------------------------------
       NO USERS
    ----------------------------------------------------- */

    if (!users.length) {

        results.innerHTML = `

            <div
                class="communication-profile-empty">

                <span>
                    👤
                </span>

                <strong>
                    ${
                        query
                            ? "No members found"
                            : "No members available"
                    }
                </strong>

                <small>
                    ${
                        query
                            ? "Try another name or username."
                            : "Registered members will appear here."
                    }
                </small>

            </div>

        `;

        return;

    }


    /* -----------------------------------------------------
       CREATE MEMBER RESULTS
    ----------------------------------------------------- */

    users.forEach(
        user => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "communication-profile-result";


            const name =
                communicationGetUserName(
                    user
                );


            const photo =
                communicationGetUserPhoto(
                    user
                );


            const age =
                communicationGetUserAge(
                    user
                );


            const personal =
                user.personalInformation ||
                {};


            const gender =
                personal.gender ||
                personal.sex ||
                user.gender ||
                user.sex ||
                "";


            const height =
                personal.height ||
                user.height ||
                "";


            const skinTone =
                personal.skinTone ||
                personal.skinToneColor ||
                personal.complexion ||
                user.skinTone ||
                user.complexion ||
                "";


            const district =
                communicationGetUserDistrict(
                    user
                );


            const username =
                user.username ||
                personal.username ||
                "";


            const meta = [

                username
                    ? `@${username}`
                    : "",

                age
                    ? `${age} yrs`
                    : "",

                gender,

                height,

                skinTone,

                district

            ]
            .filter(Boolean)
            .slice(0, 4)
            .join(" • ");


            /* -------------------------------------------------
               AVATAR
            ------------------------------------------------- */

            let avatarHTML;


            if (photo) {

                avatarHTML = `

                    <img
                        class="communication-profile-result-photo"
                        src="${communicationEscapeHTML(photo)}"
                        alt="${communicationEscapeHTML(name)}"
                        loading="lazy">

                `;

            }

            else {

                avatarHTML = `

                    <div
                        class="communication-profile-result-initial">

                        ${communicationEscapeHTML(
                            communicationGetInitial(
                                name
                            )
                        )}

                    </div>

                `;

            }


            /* -------------------------------------------------
               RESULT CONTENT
            ------------------------------------------------- */

            button.innerHTML = `

                ${avatarHTML}


                <span
                    style="
                        min-width:0;
                        flex:1;
                    ">

                    <span
                        class="communication-profile-result-name">

                        ${communicationEscapeHTML(
                            name
                        )}

                    </span>


                    <span
                        class="communication-profile-result-meta">

                        ${communicationEscapeHTML(
                            meta ||
                            "Registered member"
                        )}

                    </span>

                </span>


                <span
                    class="communication-profile-result-send">

                    SEND

                </span>

            `;


            /* -------------------------------------------------
               SELECT MEMBER
            ------------------------------------------------- */

            button.addEventListener(
                "click",
                async function () {

                    await communicationSendProfileCard(
                        user
                    );

                }
            );


            results.appendChild(
                button
            );

        }
    );

}

/* =========================================================
   FULL MEMBER PROFILE VIEWER
========================================================= */

function communicationOpenFullMemberProfile(uid) {

    const user =
        communicationUsers?.[uid];

    if (!user) {

        communicationToast(
            "Member profile could not be found.",
            "error"
        );

        return;

    }


    const name =
        communicationGetUserName(user);

    const photo =
        communicationGetUserPhoto(user);

    const age =
        communicationGetUserAge(user);

    const personal =
        user.personalInformation || {};

    const username =
        user.username ||
        personal.username ||
        "";

    const gender =
        user.gender ||
        user.sex ||
        personal.gender ||
        personal.sex ||
        "";

    const height =
        user.height ||
        personal.height ||
        "";

    const skinTone =
        user.skinTone ||
        user.complexion ||
        personal.skinTone ||
        personal.complexion ||
        "";

    const district =
        communicationGetUserDistrict(user);

    const tribe =
        communicationGetUserTribe(user);

    const occupation =
        user.occupation ||
        personal.occupation ||
        "";

    const about =
        user.about ||
        user.aboutYourself ||
        personal.about ||
        personal.aboutYourself ||
        "";


    /*
     * Remove existing viewer.
     */

    document
        .getElementById(
            "communicationFullProfileModal"
        )
        ?.remove();


    const modal =
        document.createElement("div");

    modal.id =
        "communicationFullProfileModal";

    modal.className =
        "communication-full-profile-modal";


    modal.innerHTML = `

        <div
            class="communication-full-profile-backdrop">
        </div>


        <div
            class="communication-full-profile-dialog">


            <button
                type="button"
                class="communication-full-profile-close"
                aria-label="Close profile">

                ×

            </button>


            <div
                class="communication-full-profile-cover">

                ${
                    photo

                    ? `

                        <img
                            src="${communicationEscapeHTML(photo)}"
                            alt="${communicationEscapeHTML(name)}">

                    `

                    : `

                        <div
                            class="communication-full-profile-fallback">

                            ${communicationEscapeHTML(
                                communicationGetInitial(name)
                            )}

                        </div>

                    `
                }

            </div>


            <div
                class="communication-full-profile-content">


                <span
                    class="communication-profile-message-label">

                    MEMBER PROFILE

                </span>


                <h2>

                    ${communicationEscapeHTML(name)}

                </h2>


                ${
                    username

                    ? `

                        <div
                            class="communication-full-profile-username">

                            @${communicationEscapeHTML(username)}

                        </div>

                    `

                    : ""
                }


                <div
                    class="communication-full-profile-grid">

                    ${
                        age

                        ? `

                            <div>
                                <small>Age</small>
                                <strong>
                                    ${communicationEscapeHTML(age)}
                                </strong>
                            </div>

                        `

                        : ""
                    }


                    ${
                        gender

                        ? `

                            <div>
                                <small>Gender</small>
                                <strong>
                                    ${communicationEscapeHTML(gender)}
                                </strong>
                            </div>

                        `

                        : ""
                    }


                    ${
                        height

                        ? `

                            <div>
                                <small>Height</small>
                                <strong>
                                    ${communicationEscapeHTML(height)}
                                </strong>
                            </div>

                        `

                        : ""
                    }


                    ${
                        district

                        ? `

                            <div>
                                <small>Location</small>
                                <strong>
                                    ${communicationEscapeHTML(district)}
                                </strong>
                            </div>

                        `

                        : ""
                    }


                    ${
                        tribe

                        ? `

                            <div>
                                <small>Tribe</small>
                                <strong>
                                    ${communicationEscapeHTML(tribe)}
                                </strong>
                            </div>

                        `

                        : ""
                    }


                    ${
                        occupation

                        ? `

                            <div>
                                <small>Occupation</small>
                                <strong>
                                    ${communicationEscapeHTML(
                                        occupation
                                    )}
                                </strong>
                            </div>

                        `

                        : ""
                    }

                </div>


                ${
                    skinTone

                    ? `

                        <div
                            class="communication-full-profile-section">

                            <small>
                                Skin tone
                            </small>

                            <p>
                                ${communicationEscapeHTML(
                                    skinTone
                                )}
                            </p>

                        </div>

                    `

                    : ""
                }


                ${
                    about

                    ? `

                        <div
                            class="communication-full-profile-section">

                            <small>
                                About
                            </small>

                            <p>
                                ${communicationEscapeHTML(
                                    about
                                )}
                            </p>

                        </div>

                    `

                    : ""
                }


            </div>

        </div>

    `;


    document.body.appendChild(modal);


    requestAnimationFrame(() => {

        modal.classList.add("show");

    });


    const close = () => {

        modal.classList.remove("show");

        setTimeout(
            () => modal.remove(),
            180
        );

    };


    modal
        .querySelector(
            ".communication-full-profile-close"
        )
        ?.addEventListener(
            "click",
            close
        );


    modal
        .querySelector(
            ".communication-full-profile-backdrop"
        )
        ?.addEventListener(
            "click",
            close
        );

}

/* =========================================================
   CHAT BOT — PHASE 1
   ---------------------------------------------------------
   The bot is available when the Admin is offline.
========================================================= */


/* =========================================================
   CHECK ADMIN ONLINE STATUS
========================================================= */

function communicationBotCheckAdminStatus() {

    if (
        !communicationAdminUid
    ) {

        communicationBotAvailable =
            false;

        return;

    }


    const presenceRef =
        ref(
            db,
            `presence/admins/${communicationAdminUid}`
        );


    onValue(
        presenceRef,
        snapshot => {

            const presence =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            const adminOnline =
                presence.online === true;


            /*
             * Bot works only when Admin
             * is offline.
             */

            communicationBotAvailable =
                communicationBotEnabled &&
                !adminOnline;


            communicationBotUpdateStatusUI(
                adminOnline
            );


            console.log(
                "Bot availability:",
                {
                    adminOnline,
                    botAvailable:
                        communicationBotAvailable
                }
            );

        }
    );

}


/* =========================================================
   BOT STATUS UI
========================================================= */

function communicationBotUpdateStatusUI(
    adminOnline
) {

    const status =
        document.getElementById(
            "communicationBotStatus"
        );


    if (!status) {

        return;

    }


    if (adminOnline) {

        status.hidden =
            true;

        status.style.display =
            "none";

        return;

    }


    if (
        !communicationBotEnabled
    ) {

        status.hidden =
            true;

        status.style.display =
            "none";

        return;

    }


    status.hidden =
        false;

    status.style.display =
        "";


    status.innerHTML = `

        🤖 <strong>
            ${communicationEscapeHTML(
                communicationBotName
            )}
        </strong>
        is available while Admin is offline.

    `;

}


/* =========================================================
   BOT ENABLE / DISABLE
========================================================= */

function communicationSetBotEnabled(
    enabled
) {

    communicationBotEnabled =
        enabled === true;


    /*
     * Re-check availability immediately.
     */

    communicationBotCheckAdminStatus();


    console.log(
        "Communication bot:",
        communicationBotEnabled
            ? "enabled"
            : "disabled"
    );

}


/* =========================================================
   GET BOT STATUS
========================================================= */

function communicationGetBotStatus() {

    return {

        enabled:
            communicationBotEnabled,

        available:
            communicationBotAvailable,

        name:
            communicationBotName,

        mode:
            communicationBotMode

    };

}


/* =========================================================
   INITIALIZE BOT
========================================================= */

function communicationInitializeBot() {

    if (
        !communicationAdminUid
    ) {

        return;

    }


    communicationBotCheckAdminStatus();


    console.log(
        "Communication Bot — Phase 1 ready.",
        communicationGetBotStatus()
    );

}
/* =========================================================
   MATCHING ENGINE — PHASE 3A
========================================================= */

let communicationMatchingState = {

    active: false,

    gender: null,

    ageMin: null,

    ageMax: null,

    location: null,

    intention: null

};


/* =========================================================
   RESET MATCHING
========================================================= */

function communicationResetMatching(){

    communicationMatchingState = {

        active: false,

        gender: null,

        ageMin: null,

        ageMax: null,

        location: null,

        intention: null

    };

}


/* =========================================================
   START MATCHING
========================================================= */

function communicationStartMatching(){

    communicationResetMatching();

    communicationMatchingState.active =
        true;

    communicationBotWaitingFor =
        "matching_gender";

}


/* =========================================================
   SAVE MATCHING PREFERENCE
========================================================= */

function communicationSetMatchingPreference(
    key,
    value
){

    if(
        !communicationMatchingState.active
    ){

        communicationStartMatching();

    }


    communicationMatchingState[key] =
        value;

}

/* =========================================================
   CHAT BOT — PHASE 2
   ---------------------------------------------------------
   PURPOSE:
   - Handle basic messages when Admin is offline
   - Recognize greetings
   - Recognize help/support
   - Recognize partner-matching requests
   - Show quick action buttons
   - Prepare matching for Phase 3
========================================================= */


/* =========================================================
   BOT STATE
========================================================= */

let communicationBotConversationActive =
    false;

let communicationBotLastReply =
    "";

let communicationBotWaitingFor =
    null;


/* =========================================================
   BOT MESSAGE ID
========================================================= */

function communicationBotMessageId() {

    return (
        "bot_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


/* =========================================================
   BOT INTENT DETECTION
========================================================= */

function communicationBotDetectIntent(
    text
) {

    const message =
        String(
            text || ""
        )
        .trim()
        .toLowerCase();


    if (!message) {

        return "unknown";

    }


    /* ==============================
       GREETING
    ============================== */

    if (

        /\b(hi|hello|hey|hallo)\b/
            .test(message)

        ||

        message.includes("good morning")

        ||

        message.includes("good afternoon")

        ||

        message.includes("good evening")

    ) {

        return "greeting";

    }


    /* ==============================
       PARTNER / MATCHING
    ============================== */

    if (

        message.includes("find me")

        ||

        message.includes("find someone")

        ||

        message.includes("find a partner")

        ||

        message.includes("want a partner")

        ||

        message.includes("looking for a partner")

        ||

        message.includes("need a partner")

        ||

        message.includes("match me")

        ||

        message.includes("matchmaking")

        ||

        message.includes("matching")

        ||

        message.includes("boyfriend")

        ||

        message.includes("girlfriend")

        ||

        message.includes("relationship")

    ) {

        return "matching";

    }


    /* ==============================
       SUPPORT
    ============================== */

    if (

        message.includes("help")

        ||

        message.includes("support")

        ||

        message.includes("problem")

        ||

        message.includes("issue")

        ||

        message.includes("not working")

        ||

        message.includes("report")

    ) {

        return "support";

    }


    /* ==============================
       ACCOUNT
    ============================== */

    if (

        message.includes("account")

        ||

        message.includes("login")

        ||

        message.includes("password")

        ||

        message.includes("profile")

        ||

        message.includes("verification")

    ) {

        return "account";

    }


    /* ==============================
       ADMIN
    ============================== */

    if (

        message.includes("admin")

        ||

        message.includes("human")

        ||

        message.includes("real person")

        ||

        message.includes("talk to someone")

    ) {

        return "admin";

    }


    /* ==============================
       THANK YOU
    ============================== */

    if (

        message.includes("thank you")

        ||

        message.includes("thanks")

    ) {

        return "thanks";

    }


    return "unknown";

}


/* =========================================================
   BOT RESPONSE BUILDER
========================================================= */

function communicationBotBuildResponse(
    text
) {

    const intent =
        communicationBotDetectIntent(
            text
        );


    switch(intent){

        /* ==========================
           GREETING
        ========================== */

        case "greeting":

            return {

                text:
                    "Hello! 👋 I'm the Twagalane Assistant. I'm here to help while Admin is offline. How can I help you?",

                actions: [

                    {
                        label:
                            "❤️ Find a Partner",

                        action:
                            "matching"
                    },

                    {
                        label:
                            "🛟 Get Help",

                        action:
                            "support"
                    },

                    {
                        label:
                            "👤 Account Help",

                        action:
                            "account"
                    }

                ]

            };


        /* ==========================
           MATCHING
        ========================== */
case "matching":

    communicationStartMatching();


    communicationBotRenderMessage(

        "Great ❤️ Let's find someone who may be a good match for you. What kind of partner are you looking for?",

        [

            {
                label: "👨 Men",
                action: "matching_men"
            },

            {
                label: "👩 Women",
                action: "matching_women"
            },

            {
                label: "🌍 Anyone",
                action: "matching_any"
            }

        ]

    );

    return;

        /* ==========================
           SUPPORT
        ========================== */

        case "support":

            return {

                text:
                    "I'm here to help 🛟. Please tell me what problem you're experiencing and I'll guide you.",

                actions: [

                    {
                        label:
                            "👤 Account Help",

                        action:
                            "account"
                    },

                    {
                        label:
                            "❤️ Find a Partner",

                        action:
                            "matching"
                    },

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            };


        /* ==========================
           ACCOUNT
        ========================== */

        case "account":

            return {

                text:
                    "I can help with account and profile questions. What do you need help with?",

                actions: [

                    {
                        label:
                            "🔐 Login",

                        action:
                            "account_login"
                    },

                    {
                        label:
                            "👤 Profile",

                        action:
                            "account_profile"
                    },

                    {
                        label:
                            "✅ Verification",

                        action:
                            "account_verification"
                    },

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            };


        /* ==========================
           ADMIN
        ========================== */

        case "admin":

            return {

                text:
                    "Admin is currently offline. 🕐 Your message can be handled when Admin is available. In the meantime, I can still help you here.",

                actions: [

                    {
                        label:
                            "❤️ Find a Partner",

                        action:
                            "matching"
                    },

                    {
                        label:
                            "🛟 Get Help",

                        action:
                            "support"
                    }

                ]

            };


        /* ==========================
           THANKS
        ========================== */

        case "thanks":

            return {

                text:
                    "You're welcome! 😊 I'm here whenever you need help.",

                actions: [

                    {
                        label:
                            "❤️ Find a Partner",

                        action:
                            "matching"
                    },

                    {
                        label:
                            "🛟 Get Help",

                        action:
                            "support"
                    }

                ]

            };


        /* ==========================
           UNKNOWN
        ========================== */

        default:

            return {

                text:
                    "I'm not completely sure what you need yet. 🤖 You can choose one of these options:",

                actions: [

                    {
                        label:
                            "❤️ Find a Partner",

                        action:
                            "matching"
                    },

                    {
                        label:
                            "🛟 Get Help",

                        action:
                            "support"
                    },

                    {
                        label:
                            "👤 Account Help",

                        action:
                            "account"
                    },

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            };

    }

}


/* =========================================================
   BOT SEND MESSAGE TO UI
========================================================= */

function communicationBotRenderMessage(
    text,
    actions = []
) {

    if (
        !communicationMessages
    ) {

        return;

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "communication-message-row communication-message-bot";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "communication-message-bubble communication-bot-message";


    bubble.innerHTML = `

        <div
            class="communication-message-text">

            ${communicationEscapeHTML(
                text
            )}

        </div>

    `;


    /* ==========================
       QUICK ACTIONS
    ========================== */

    if (
        actions &&
        actions.length
    ) {

        const actionsContainer =
            document.createElement(
                "div"
            );


        actionsContainer.className =
            "communication-bot-actions";


        actions.forEach(
            action => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "communication-bot-action";


                button.textContent =
                    action.label;


                button.dataset.botAction =
                    action.action;


                button.addEventListener(
                    "click",
                    () => {

                        communicationBotHandleAction(
                            action.action
                        );

                    }
                );


                actionsContainer.appendChild(
                    button
                );

            }
        );


        bubble.appendChild(
            actionsContainer
        );

    }


    wrapper.appendChild(
        bubble
    );


    communicationMessages.appendChild(
        wrapper
    );


    requestAnimationFrame(
        () => {

            communicationMessages.scrollTop =
                communicationMessages.scrollHeight;

        }
    );

}


/* =========================================================
   BOT HANDLE ACTION
========================================================= */

function communicationBotHandleAction(
    action
) {

    if (!communicationBotAvailable) {

        communicationToast(
            "Admin is currently available.",
            "info"
        );

        return;

    }


    switch(action){

        case "matching":

            communicationBotWaitingFor =
                "matching_gender";


            communicationBotRenderMessage(

                "Great ❤️ Let's find someone who may be a good match for you. What kind of partner are you looking for?",

                [

                    {
                        label:
                            "👨 Men",

                        action:
                            "matching_men"
                    },

                    {
                        label:
                            "👩 Women",

                        action:
                            "matching_women"
                    },

                    {
                        label:
                            "🌍 Anyone",

                        action:
                            "matching_any"
                    }

                ]

            );

            return;
case "matching_men":

    communicationSetMatchingPreference(
        "gender",
        "male"
    );

    communicationBotWaitingFor =
        "matching_age";

    communicationBotRenderMessage(

        "Got it 👍 You're looking for men. What age range would you prefer?",

        [

            {
                label: "18–25",
                action: "matching_age_18_25"
            },

            {
                label: "26–35",
                action: "matching_age_26_35"
            },

            {
                label: "36–45",
                action: "matching_age_36_45"
            },

            {
                label: "Any age",
                action: "matching_age_any"
            }

        ]

    );

    return;


case "matching_women":

    communicationSetMatchingPreference(
        "gender",
        "female"
    );

    communicationBotWaitingFor =
        "matching_age";

    communicationBotRenderMessage(

        "Got it 👍 You're looking for women. What age range would you prefer?",

        [

            {
                label: "18–25",
                action: "matching_age_18_25"
            },

            {
                label: "26–35",
                action: "matching_age_26_35"
            },

            {
                label: "36–45",
                action: "matching_age_36_45"
            },

            {
                label: "Any age",
                action: "matching_age_any"
            }

        ]

    );

    return;


case "matching_any":

    communicationSetMatchingPreference(
        "gender",
        "any"
    );

    communicationBotWaitingFor =
        "matching_age";

    communicationBotRenderMessage(

        "No problem 🌍 We'll consider anyone. What age range would you prefer?",

        [

            {
                label: "18–25",
                action: "matching_age_18_25"
            },

            {
                label: "26–35",
                action: "matching_age_26_35"
            },

            {
                label: "36–45",
                action: "matching_age_36_45"
            },

            {
                label: "Any age",
                action: "matching_age_any"
            }

        ]

    );

    return;

        case "matching_women":

            communicationBotWaitingFor =
                "matching_age";


            communicationBotRenderMessage(

                "Got it 👍 You're looking for women. What age range would you prefer?",

                [

                    {
                        label:
                            "18–25",

                        action:
                            "matching_age_18_25"
                    },

                    {
                        label:
                            "26–35",

                        action:
                            "matching_age_26_35"
                    },

                    {
                        label:
                            "36–45",

                        action:
                            "matching_age_36_45"
                    },

                    {
                        label:
                            "Any age",

                        action:
                            "matching_age_any"
                    }

                ]

            );

            return;


        case "matching_any":

            communicationBotWaitingFor =
                "matching_age";


            communicationBotRenderMessage(

                "No problem 🌍 We'll consider anyone. What age range would you prefer?",

                [

                    {
                        label:
                            "18–25",

                        action:
                            "matching_age_18_25"
                    },

                    {
                        label:
                            "26–35",

                        action:
                            "matching_age_26_35"
                    },

                    {
                        label:
                            "36–45",

                        action:
                            "matching_age_36_45"
                    },

                    {
                        label:
                            "Any age",

                        action:
                            "matching_age_any"
                    }

                ]

            );

            return;

case "matching_age_18_25":

    communicationSetMatchingPreference(
        "ageMin",
        18
    );

    communicationSetMatchingPreference(
        "ageMax",
        25
    );

    communicationBotWaitingFor =
        null;

    communicationBotRenderMessage(

        "Perfect ❤️ I can search for people aged 18–25. Before I search, we can also consider location and relationship goals.",

        [

            {
                label: "🔎 Find Matches",
                action: "run_matching"
            }

        ]

    );

    return;


case "matching_age_26_35":

    communicationSetMatchingPreference(
        "ageMin",
        26
    );

    communicationSetMatchingPreference(
        "ageMax",
        35
    );

    communicationBotWaitingFor =
        null;

    communicationBotRenderMessage(

        "Perfect ❤️ I can search for people aged 26–35. Let's find suitable matches.",

        [

            {
                label: "🔎 Find Matches",
                action: "run_matching"
            }

        ]

    );

    return;


case "matching_age_36_45":

    communicationSetMatchingPreference(
        "ageMin",
        36
    );

    communicationSetMatchingPreference(
        "ageMax",
        45
    );

    communicationBotWaitingFor =
        null;

    communicationBotRenderMessage(

        "Perfect ❤️ I can search for people aged 36–45. Let's find suitable matches.",

        [

            {
                label: "🔎 Find Matches",
                action: "run_matching"
            }

        ]

    );

    return;


case "matching_age_any":

    communicationSetMatchingPreference(
        "ageMin",
        null
    );

    communicationSetMatchingPreference(
        "ageMax",
        null
    );

    communicationBotWaitingFor =
        null;

    communicationBotRenderMessage(

        "Okay 🌍 I'll consider all available ages. Let's search for suitable matches.",

        [

            {
                label: "🔎 Find Matches",
                action: "run_matching"
            }

        ]

    );

    return;

        
        case "run_matching":

            communicationBotRenderMessage(

                "🔎 Searching for suitable members...",

                []

            );


            /*
             * PHASE 3 will replace this
             * placeholder with the real
             * Firebase matching engine.
             */

            setTimeout(
                () => {

                    communicationBotRenderMessage(

                        "Matching is being prepared. ❤️ The real member search will be connected in Phase 3.",

                        []

                    );

                },
                700
            );

            return;


        case "account":

            communicationBotRenderMessage(

                "Sure 👤 What account help do you need?",

                [

                    {
                        label:
                            "🔐 Login",

                        action:
                            "account_login"
                    },

                    {
                        label:
                            "👤 Profile",

                        action:
                            "account_profile"
                    },

                    {
                        label:
                            "✅ Verification",

                        action:
                            "account_verification"
                    }

                ]

            );

            return;


        case "account_login":

            communicationBotRenderMessage(

                "For login problems, check that your phone number, email or username is correct. If you still cannot log in, you can leave a message for Admin.",

                [

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            );

            return;


        case "account_profile":

            communicationBotRenderMessage(

                "For profile help, make sure your profile information and photos are saved correctly. If something is missing, Admin can assist you.",

                [

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            );

            return;

case "account_verification":

            communicationBotRenderMessage(

                "Verification help is available. Make sure the information and documents requested during verification are complete.",

                [

                    {
                        label:
                            "👨‍💼 Talk to Admin",

                        action:
                            "admin"
                    }

                ]

            );

            return;


        case "admin":

            communicationBotRenderMessage(

                "Admin is offline right now. 🕐 I've saved the conversation so you can continue when Admin is available.",

                []

            );

            return;


        case "support":

            communicationBotRenderMessage(

                "Tell me what went wrong and I'll try to help. 🛟",

                []

            );

            return;

    }

}

/* =========================================================
   BOT PROCESS USER TEXT
========================================================= */

function communicationBotProcessMessage(
    text
) {

    if (
        !communicationBotAvailable
    ) {

        return false;

    }


    if (
        !String(
            text || ""
        ).trim()
    ) {

        return false;

    }


    const response =
        communicationBotBuildResponse(
            text
        );


    communicationBotLastReply =
        response.text;


    communicationBotConversationActive =
        true;


    communicationBotRenderMessage(

        response.text,

        response.actions || []

    );


    return true;

}


/* =========================================================
   BOT MESSAGE LISTENER
========================================================= */

function communicationBotWatchComposer() {

    if (
        !communicationMessageInput
    ) {

        return;

    }


    if (
        communicationMessageInput.dataset.botBound ===
        "true"
    ) {

        return;

    }


    communicationMessageInput.dataset.botBound =
        "true";


    console.log(
        "Communication Bot composer connected."
    );

}

/* =========================================================
   INITIALIZE PHASE 2 BOT
========================================================= */

function communicationInitializeBotPhase2() {

    communicationBotWatchComposer();


    console.log(
        "Communication Bot — Phase 2 ready."
    );

}


communicationInitializeBotPhase2();