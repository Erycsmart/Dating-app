/*==================================
            MATCHES.JS
==================================*/

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { setupPresence } from "./presence.js";


/*==================================
            DOM
==================================*/

const cardStack =
    document.getElementById("cardStack");

const refreshBtn =
    document.getElementById("refreshMatches");

const heartLayer =
    document.getElementById("heartAnimationLayer");

const premiumBanner =
    document.getElementById("premiumBanner");

const premiumTitle =
    document.getElementById("premiumTitle");

const premiumDescription =
    document.getElementById("premiumDescription");

const upgradeBtn =
    document.getElementById("upgradeBtn");

const toast =
    document.getElementById("matchesToast");

const matchCount =
    document.getElementById("matchCount");


/*==================================
            VARIABLES
==================================*/

let currentUser = null;
let currentUid = null;

let allMatches = [];
let currentIndex = 0;

let premiumUser = false;
let isAnimating = false;


/*==================================
            START
==================================*/

document.addEventListener(
    "DOMContentLoaded",
    startApp
);


function startApp(){

    onAuthStateChanged(
        auth,
        async user => {

            if(!user){

                location.href =
                    "login.html";

                return;

            }

            currentUid =
                user.uid;

            setupPresence();

            await loadCurrentUser();

            await loadMatches();

            setupPremiumCard();

        }
    );

}


/*==================================
        LOAD CURRENT USER
==================================*/

async function loadCurrentUser(){

    try{

        const snapshot =
            await get(
                ref(
                    db,
                    "users/" + currentUid
                )
            );

        if(!snapshot.exists())
            return;

        currentUser =
            snapshot.val();


        /*
         * IMPORTANT:
         *
         * Your Firebase structure is:
         *
         * users/
         *   UID/
         *      premium/
         *          active: true
         *
         * and also:
         *
         * subscription/
         *      active: true
         */

        premiumUser =
            currentUser?.premium?.active === true ||
            currentUser?.subscription?.active === true;


        console.log(
            "CURRENT USER:",
            currentUser
        );

        console.log(
            "PREMIUM USER:",
            premiumUser
        );

    }

    catch(error){

        console.error(
            "CURRENT USER ERROR:",
            error
        );

    }

}


/*==================================
        LOAD ALL USERS
==================================*/

async function loadMatches(){

    try{

        showLoading();


        const snapshot =
            await get(
                ref(
                    db,
                    "users"
                )
            );


        if(!snapshot.exists()){

            showEmpty();

            return;

        }


        const users =
            snapshot.val();


        const myInfo =
            currentUser?.personalInformation || {};


        const myGender =
            String(
                myInfo.gender || ""
            )
            .trim()
            .toLowerCase();


        /*
         * Determine opposite gender.
         */

        let oppositeGender = "";

        if(myGender === "male"){

            oppositeGender =
                "female";

        }

        else if(myGender === "female"){

            oppositeGender =
                "male";

        }


        allMatches = [];


        for(const uid in users){

            /*
             * Never show yourself.
             */

            if(uid === currentUid)
                continue;


            const user =
                users[uid];


            const info =
                user.personalInformation || {};


            const gender =
                String(
                    info.gender || ""
                )
                .trim()
                .toLowerCase();


            /*
             * MALE -> FEMALE
             * FEMALE -> MALE
             */

            if(
                oppositeGender &&
                gender !== oppositeGender
            ){

                continue;

            }


            allMatches.push({

                uid,

                ...user

            });

        }


        /*
         * Random discovery order.
         */

        shuffleArray(
            allMatches
        );


        currentIndex = 0;


        if(matchCount){

            matchCount.textContent =
                `${allMatches.length} people`;

        }


        renderCurrentCard();

    }

    catch(error){

        console.error(
            "LOAD MATCHES ERROR:",
            error
        );

        showEmpty(
            "Unable to load profiles."
        );

    }

}


/*==================================
        SHUFFLE
==================================*/

function shuffleArray(array){

    for(
        let i = array.length - 1;
        i > 0;
        i--
    ){

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            array[i],
            array[j]
        ] =
        [
            array[j],
            array[i]
        ];

    }

}


/*==================================
        GET PHOTOS
==================================*/

function getUserPhotos(user){

    const photos =
        user?.photos || {};

    let result = [];


    if(Array.isArray(photos)){

        result =
            photos.filter(
                photo =>
                    typeof photo === "string" &&
                    photo.trim()
            );

    }

    else if(
        typeof photos === "object"
    ){

        /*
         * Profile photo first.
         */

        if(
            typeof photos.profile ===
            "string" &&
            photos.profile.trim()
        ){

            result.push(
                photos.profile
            );

        }


        Object.entries(photos)
            .forEach(
                ([key,value]) => {

                    if(key === "profile")
                        return;

                    if(
                        typeof value === "string" &&
                        value.trim()
                    ){

                        result.push(value);

                    }

                }
            );

    }


    /*
     * Also support photoURL.
     */

    if(
        !result.length &&
        user?.photoURL
    ){

        result.push(
            user.photoURL
        );

    }


    if(
        !result.length
    ){

        result.push(
            "assets/avatar.png"
        );

    }


    return [
        ...new Set(result)
    ];

}


/*==================================
        CURRENT CARD
==================================*/

function renderCurrentCard(){

    cardStack.innerHTML = "";


    if(!allMatches.length){

        showEmpty();

        return;

    }


    if(
        currentIndex >=
        allMatches.length
    ){

        currentIndex = 0;

    }


    const user =
        allMatches[currentIndex];


    const card =
        createProfileCard(user);


    cardStack.appendChild(card);


    setupCardSwipe(card);

}


/*==================================
        CREATE PROFILE CARD
==================================*/

function createProfileCard(user){

    const card =
        document.createElement("article");


    card.className =
        "match-card active";


    card.dataset.uid =
        user.uid;


    const info =
        user.personalInformation || {};


    const photos =
        getUserPhotos(user);


    const name =
        info.fullName ||
        user.username ||
        "Member";


    const age =
        info.age ||
        "--";


    const tribe =
        info.tribe ||
        info.ethnicity ||
        "Tribe not specified";


    const religion =
        info.religion ||
        "Religion not specified";


    /*
     * Location can exist in several
     * places in your database.
     */

    let location =
        info.homeAddress ||
        info.location ||
        user.location?.address ||
        user.location?.city ||
        user.location?.district ||
        user.location?.country ||
        "Location not specified";


    if(
        typeof location === "object"
    ){

        location =
            location.address ||
            location.city ||
            location.district ||
            location.country ||
            "Location not specified";

    }


    const verified =
        user.verification?.status ===
        "approved";


    const online =
        user.presence?.online === true;


    card.innerHTML = `

        <!--==========================
                MAIN PHOTO
        ===========================-->

        <div class="match-photo-wrap">

            <img
                class="match-photo"
                src="${escapeHtml(photos[0])}"
                alt="${escapeHtml(name)}"
                draggable="false"
            >

            <div class="match-photo-gradient"></div>


            <div class="match-status-row">

                ${
                    verified
                    ?
                    `
                    <span class="match-verified">
                        ✓ Verified
                    </span>
                    `
                    :
                    `<span></span>`
                }


                ${
                    online
                    ?
                    `
                    <span class="match-online">
                        Online
                    </span>
                    `
                    :
                    ""
                }

            </div>


            <div class="swipe-like">
                LIKE
            </div>


            <div class="swipe-pass">
                PASS
            </div>

        </div>


        <!--==========================
                PHOTO STRIP
        ===========================-->

        <div class="match-thumbnails">

            ${photos.map(
                (photo,index) => {

                    const locked =
                        !premiumUser &&
                        index > 0;


                    return `

                        <button
                            type="button"
                            class="
                                match-thumbnail
                                ${index === 0 ? "active" : ""}
                                ${locked ? "locked" : ""}
                            "
                            data-index="${index}"
                        >

                            <img
                                src="${escapeHtml(photo)}"
                                alt="Photo ${index + 1}"
                                draggable="false"
                            >

                            ${
                                locked
                                ?
                                `
                                <span class="thumbnail-lock">
                                    🔒
                                </span>
                                `
                                :
                                ""
                            }

                        </button>

                    `;

                }
            ).join("")}

        </div>


        <!--==========================
                DETAILS
        ===========================-->

        <div class="match-details">

            <div class="match-name-row">

                <h2 class="match-name">

                    ${escapeHtml(name)}

                </h2>

                ${
                    verified
                    ?
                    `
                    <span
                        class="match-name-verified">
                        ✓
                    </span>
                    `
                    :
                    ""
                }

            </div>


            <div class="match-basic-info">

                ${escapeHtml(age)}
                years
                •
                ${escapeHtml(tribe)}

            </div>


            <div class="match-basic-info">

                ${escapeHtml(religion)}

            </div>


            <div class="match-location">

                📍
                ${escapeHtml(location)}

            </div>

        </div>


        <!--==========================
                ACTIONS
        ===========================-->

        <div class="match-actions">

            <!-- PASS -->

            <button
                type="button"
                class="match-action match-pass"
                data-action="pass"
                aria-label="Pass">

                ✕

            </button>


            <!-- CHAT -->

            <button
                type="button"
                class="match-action match-chat"
                data-action="chat"
                aria-label="Chat">

                💬

            </button>


            <!-- LIKE -->

            <button
                type="button"
                class="match-action match-like"
                data-action="like"
                aria-label="Like">

                ❤️

            </button>

        </div>

    `;


    /*==================================
            PHOTO CLICK
    ==================================*/

    const mainPhoto =
        card.querySelector(
            ".match-photo"
        );


    card.querySelectorAll(
        ".match-thumbnail"
    ).forEach(
        thumbnail => {

            thumbnail.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    const index =
                        Number(
                            thumbnail.dataset.index
                        );


                    if(
                        !premiumUser &&
                        index > 0
                    ){

                        showToast(
                            "💎 Premium users can view all photos."
                        );

                        return;

                    }


                    mainPhoto.src =
                        photos[index];


                    card.querySelectorAll(
                        ".match-thumbnail"
                    ).forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    thumbnail.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    /*==================================
            LIKE
    ==================================*/

    card.querySelector(
        '[data-action="like"]'
    )?.addEventListener(
        "click",
        async event => {

            event.stopPropagation();

            await handleLike(
                user,
                card
            );

        }
    );


    /*==================================
            PASS
    ==================================*/

    card.querySelector(
        '[data-action="pass"]'
    )?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            swipeCard(
                card,
                "left"
            );

        }
    );


    /*==================================
            CHAT
    ==================================*/

    card.querySelector(
        '[data-action="chat"]'
    )?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            openChat(
                user.uid
            );

        }
    );


    return card;

}


/*==================================
            CHAT
==================================*/

function openChat(matchUid){

    /*
     * Premium users can chat directly.
     */

    if(premiumUser){

        const matchId =
            currentUid < matchUid
            ?
            currentUid + "_" + matchUid
            :
            matchUid + "_" + currentUid;


        sessionStorage.setItem(
            "currentMatchId",
            matchId
        );


        sessionStorage.setItem(
            "selectedMatch",
            matchUid
        );


        location.href =
            "chat.html";

        return;

    }


    /*
     * Free users cannot directly chat.
     */

    showToast(
        "💎 Premium membership is required to chat."
    );


    setTimeout(
        () => {

            location.href =
                "premium.html";

        },
        900
    );

}


/*==================================
            LIKE
==================================*/

async function handleLike(
    user,
    card
){

    if(isAnimating)
        return;


    createFloatingHearts();


    showToast(
        "❤️ You liked " +
        (
            user.personalInformation
                ?.fullName ||
            user.username ||
            "this person"
        )
    );


    try{

        /*
         * SAVE LIKE
         */

        await set(
            ref(
                db,
                "likes/" +
                currentUid +
                "/" +
                user.uid
            ),
            {

                likedAt:
                    Date.now(),

                status:
                    "liked"

            }
        );


        /*
         * CHECK MUTUAL LIKE
         */

        const reverse =
            await get(
                ref(
                    db,
                    "likes/" +
                    user.uid +
                    "/" +
                    currentUid
                )
            );


        if(reverse.exists()){

            await createMatch(
                currentUid,
                user.uid
            );

            showToast(
                "💕 It's a match!"
            );

        }


        /*
         * Move to next profile.
         */

        setTimeout(
            () => {

                swipeCard(
                    card,
                    "right"
                );

            },
            500
        );

    }

    catch(error){

        console.error(
            "LIKE ERROR:",
            error
        );

        showToast(
            "Unable to save like."
        );

    }

}


/*==================================
        CREATE MATCH
==================================*/

async function createMatch(
    uid1,
    uid2
){

    const matchId =
        uid1 < uid2
        ?
        uid1 + "_" + uid2
        :
        uid2 + "_" + uid1;


    await set(
        ref(
            db,
            "matches/" +
            matchId
        ),
        {

            users:{

                [uid1]:true,
                [uid2]:true

            },

            createdAt:
                Date.now(),

            lastMessage:"",
            lastMessageTime:
                Date.now()

        }
    );


    /*
     * Create chat automatically.
     */

    await set(
        ref(
            db,
            "chats/" +
            matchId
        ),
        {

            participants:{

                [uid1]:true,
                [uid2]:true

            },

            createdAt:
                Date.now(),

            lastMessage:"",
            lastMessageTime:
                Date.now(),

            unread:{

                [uid1]:0,
                [uid2]:0

            }

        }
    );

}


/*==================================
            SWIPE
==================================*/

function setupCardSwipe(card){

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;


    card.addEventListener(
        "pointerdown",
        event => {

            if(
                event.target.closest(
                    "button"
                )
            ){

                return;

            }


            dragging = true;

            startX =
                event.clientX;

            startY =
                event.clientY;

            currentX =
                startX;


            card.setPointerCapture(
                event.pointerId
            );

        }
    );


    card.addEventListener(
        "pointermove",
        event => {

            if(!dragging)
                return;


            currentX =
                event.clientX;


            const deltaX =
                currentX - startX;


            const rotation =
                deltaX * 0.05;


            card.style.transition =
                "none";


            card.style.transform =
                `
                translateX(${deltaX}px)
                rotate(${rotation}deg)
                `;


            const like =
                card.querySelector(
                    ".swipe-like"
                );

            const pass =
                card.querySelector(
                    ".swipe-pass"
                );


            if(deltaX > 0){

                like.style.opacity =
                    Math.min(
                        deltaX / 100,
                        1
                    );

                pass.style.opacity =
                    "0";

            }

            else{

                pass.style.opacity =
                    Math.min(
                        Math.abs(deltaX) / 100,
                        1
                    );

                like.style.opacity =
                    "0";

            }

        }
    );


    card.addEventListener(
        "pointerup",
        event => {

            if(!dragging)
                return;


            dragging = false;

          const deltaX =
                currentX - startX;


            const deltaY =
                event.clientY - startY;


            if(
                Math.abs(deltaY) >
                Math.abs(deltaX)
            ){

                resetCard(
                    card
                );

                return;

            }


            if(
                Math.abs(deltaX) >= 100
            ){

                if(deltaX > 0){

                    handleLike(
                        allMatches[currentIndex],
                        card
                    );

                }

                else{

                    swipeCard(
                        card,
                        "left"
                    );

                }

                return;

            }


            resetCard(
                card
            );

        }
    );


    card.addEventListener(
        "pointercancel",
        () => {

            dragging = false;

            resetCard(
                card
            );

        }
    );

}


/*==================================
        SWIPE CARD
==================================*/

function swipeCard(
    card,
    direction
){

    if(isAnimating)
        return;


    isAnimating = true;


    const distance =
        direction === "right"
        ?
        window.innerWidth + 250
        :
        -(window.innerWidth + 250);


    card.style.transition =
        "transform .35s ease, opacity .35s ease";


    card.style.transform =
        `
        translateX(${distance}px)
        rotate(${direction === "right" ? 18 : -18}deg)
        `;


    card.style.opacity =
        "0";


    setTimeout(
        () => {

            currentIndex++;


            if(
                currentIndex >=
                allMatches.length
            ){

                currentIndex = 0;

            }


            isAnimating = false;


            renderCurrentCard();

        },
        350
    );

}


/*==================================
        RESET CARD
==================================*/

function resetCard(card){

    card.style.transition =
        "transform .25s ease";


    card.style.transform =
        "translateX(0) rotate(0deg)";


    const like =
        card.querySelector(
            ".swipe-like"
        );

    const pass =
        card.querySelector(
            ".swipe-pass"
        );


    if(like)
        like.style.opacity =
            "0";


    if(pass)
        pass.style.opacity =
            "0";

}


/*==================================
        HEART ANIMATION
==================================*/

function createFloatingHearts(){

    if(!heartLayer)
        return;


    const hearts = [
        "❤️",
        "💖",
        "💕",
        "💗",
        "💓"
    ];


    for(
        let i = 0;
        i < 18;
        i++
    ){

        const heart =
            document.createElement(
                "span"
            );


        heart.className =
            "floating-heart";


        heart.textContent =
            hearts[
                Math.floor(
                    Math.random() *
                    hearts.length
                )
            ];


        heart.style.left =
            (
                20 +
                Math.random() * 60
            ) + "%";


        heart.style.bottom =
            (
                100 +
                Math.random() * 100
            ) + "px";


        heart.style.animationDelay =
            (
                Math.random() * .3
            ) + "s";


        heartLayer.appendChild(
            heart
        );


        setTimeout(
            () => heart.remove(),
            1800
        );

    }

}


/*==================================
        PREMIUM CARD
==================================*/

function setupPremiumCard(){

    if(!premiumBanner)
        return;


    if(premiumUser){

        premiumBanner.classList.add(
            "premium-member"
        );


        if(premiumTitle){

            premiumTitle.textContent =
                "👑 You're Premium";

        }


        if(premiumDescription){

            premiumDescription.textContent =
                "You can view all photos and chat directly with people you discover.";

        }


        if(upgradeBtn){

            upgradeBtn.textContent =
                "Premium Benefits";

            upgradeBtn.onclick =
                () => {

                    location.href =
                        "premium.html";

                };

        }

    }

    else{

        premiumBanner.classList.remove(
            "premium-member"
        );


        if(premiumTitle){

            premiumTitle.textContent =
                "💎 Unlock More Connections";

        }


        if(premiumDescription){

            premiumDescription.textContent =
                "See all profile photos and chat directly with people you discover.";

        }


        if(upgradeBtn){

            upgradeBtn.textContent =
                "Get Premium";

            upgradeBtn.onclick =
                () => {

                    location.href =
                        "premium.html";

                };

        }

    }

}


/*==================================
        REFRESH
==================================*/

refreshBtn?.addEventListener(
    "click",
    loadMatches
);


/*==================================
        LOADING
==================================*/

function showLoading(){

    cardStack.innerHTML = `

        <div class="matches-loading">

            <div class="matches-spinner"></div>

            <p>
                Finding your Soulmate...
            </p>

        </div>

    `;

}


/*==================================
        EMPTY
==================================*/

function showEmpty(
    message =
        "No profiles available right now."
){

    cardStack.innerHTML = `

        <div class="matches-empty">

            <div class="matches-empty-icon">
                💕
            </div>

            <h2>
                No more profiles
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>

    `;

}


/*==================================
        TOAST
==================================*/

function showToast(message){

    if(!toast){

        console.log(message);

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        showToast.timer
    );


    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/*==================================
        ESCAPE HTML
==================================*/

function escapeHtml(value){

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