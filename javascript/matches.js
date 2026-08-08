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
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { setupPresence } from "./presence.js";

/*==================================
            DOM
==================================*/

const cardStack =
document.getElementById("cardStack");

const matchCount =
document.getElementById("matchCount");

const streakText =
document.getElementById("streakText");

const aiSuggestion =
document.getElementById("aiSuggestion");

const anniversaryText =
document.getElementById("anniversaryText");

/*==================================
        VARIABLES
==================================*/

let currentUser=null;

let currentUid=null;

let allMatches=[];

let premiumUser=false;

let currentIndex=0;

/*==================================
            START
==================================*/

document.addEventListener(

    "DOMContentLoaded",

    startApp

);

/*==================================
        START APP
==================================*/

function startApp(){

    onAuthStateChanged(

        auth,

        async(user)=>{

            if(!user){

                location.href="login.html";

                return;

            }

            currentUid=user.uid;
setupPresence();
            await loadCurrentUser();

            await loadMatches();

        }

    );

}

/*==================================
    LOAD CURRENT USER
==================================*/

async function loadCurrentUser(){

    try{

        const snapshot=

        await get(

            ref(db,"users/"+currentUid)

        );

        if(snapshot.exists()){

            currentUser=

            snapshot.val();

        }

        const premiumSnapshot=

        await get(

            ref(db,

            "subscriptions/"+currentUid)

        );

        if(

            premiumSnapshot.exists()

        ){

            premiumUser=

            premiumSnapshot.val()

            .premium===true;

        }

    }

    catch(error){

        console.error(error);

    }

}

/*==================================
        LOAD MATCHES
==================================*/

async function loadMatches(){

    try{

        const snapshot=

        await get(

            ref(db,"users")

        );

        if(!snapshot.exists())

            return;

        const users=

        snapshot.val();

        allMatches=[];

        for(const uid in users){

            if(uid===currentUid)

                continue;

            const user=

            users[uid];

            const score=

            calculateCompatibility(

                currentUser,

                user

            );

            allMatches.push({

                uid,

                ...user,

                compatibility:score

            });

        }

        allMatches.sort(

            (a,b)=>

            b.compatibility-

            a.compatibility

        );

        matchCount.textContent=

        `${allMatches.length} Matches`;

        renderCards();

    }

    catch(error){

        console.error(error);

    }

}

/*==================================
    AI COMPATIBILITY
==================================*/

function calculateCompatibility(

    me,

    other

){

    let score=30;

    const myInfo=

    me.personalInformation||{};

    const otherInfo=

    other.personalInformation||{};

    const myPref=

    me.preferences||{};

    const interests1=

    me.interests?.selected||[];

    const interests2=

    other.interests?.selected||[];

    if(

        myPref.relationshipGoal &&

        myPref.relationshipGoal===

        otherInfo.relationshipGoal

    ){

        score+=20;

    }

    if(

        myInfo.country===

        otherInfo.country

    ){

        score+=10;

    }

    if(

        myInfo.religion===

        otherInfo.religion

    ){

        score+=10;

    }

    let shared=0;

    interests1.forEach(item=>{

        if(

            interests2.includes(item)

        ){

            shared++;

        }

    });

    score+=shared*5;

    if(

        other.verification &&

        other.verification.status===

        "approved"

    ){

        score+=5;

    }

    score+=

    Math.floor(

        Math.random()*20

    );

    return Math.min(score,100);

}
/*==================================
        RENDER CARDS
==================================*/

function renderCards(){

    cardStack.innerHTML="";

    const visibleCards=

    allMatches.slice(

        currentIndex,

        currentIndex+3

    );

    visibleCards.forEach(

        (user,index)=>{

        const card=

        document.createElement("div");

        card.className="match-card";

        if(index===0)

            card.classList.add("active");

        if(index===1)

            card.classList.add("second");

        if(index===2)

            card.classList.add("third");

        const info=

        user.personalInformation||{};

        const photos=

        user.photos||{};

        let image="assets/avatar.png";

        if(Array.isArray(photos)){

            image=photos[0]||image;

        }

        else{

            const keys=

            Object.keys(photos);

            if(keys.length)

                image=

                photos[keys[0]];

        }

        card.innerHTML=`

        <img

        src="${image}"

        class="match-photo"

        style="filter:${
        premiumUser
        ?
        "none"
        :
        "blur(12px) brightness(.55)"
        }">

        ${
        premiumUser
        ?
        ""
        :
        `<div class="match-lock">

        🔒 Premium

        </div>`
        }

        <div class="match-gradient"></div>

        <div class="match-info">

            <div class="match-top">

                <span class="verified">

                ${
                user.verification?.status==="approved"

                ?

                "✔ Verified"

                :

                ""

                }

                </span>

                <span class="online">

                🟢 Online

                </span>

            </div>

            <h2>

            ${info.fullName||"Member"},

            ${info.age||"--"}

            </h2>

            <p>

            ❤️

            ${user.compatibility}%

            Compatible

            </p>

            <small>

            ${info.homeAddress||

            info.country||

            "Uganda"}

            </small>

            <div class="match-actions">

                <button

                class="chat-btn"

                data-uid="${user.uid}">

                💬 Chat

                </button>

                <button

                class="profile-btn"

                data-uid="${user.uid}">

                👤 Profile

                </button>

                <button

                class="gift-btn"

                data-uid="${user.uid}">

                🎁

                </button>

            </div>

        </div>

        `;

        cardStack.appendChild(card);

    });

    registerEvents();

    enableSwipe();

}

/*==================================
        EVENTS
==================================*/

function registerEvents(){

    document

    .querySelectorAll(".profile-btn")

    .forEach(btn=>{

        btn.onclick=()=>{

            const uid=

            btn.dataset.uid;

            location.href=

            "profile.html?uid="+uid;

        };

    });

    document

    .querySelectorAll(".gift-btn")

    .forEach(btn=>{

        btn.onclick=()=>{

            alert(

            "Gift system coming soon ❤️"

            );

        };

    });

    document

    .querySelectorAll(".chat-btn")

    .forEach(btn=>{

        btn.onclick=()=>{

            openChat(

                btn.dataset.uid

            );

        };

    });

}

/*==================================
        SWIPE
==================================*/

function enableSwipe(){

    const card=

    document.querySelector(

        ".match-card.active"

    );

    if(!card) return;

    let startX=0;

    card.addEventListener(

        "touchstart",

        e=>{

            startX=

            e.touches[0].clientX;

        }

    );

    card.addEventListener(

        "touchend",

        e=>{

            const endX=

            e.changedTouches[0]

            .clientX;

            if(

                Math.abs(

                endX-startX

                )>80

            ){

                nextCard();

            }

        }

    );

}

/*==================================
        NEXT CARD
==================================*/

function nextCard(){

    currentIndex++;

    if(

        currentIndex>=

        allMatches.length

    ){

        currentIndex=0;

    }

    renderCards();

}
/*==================================
        CHAT SYSTEM
==================================*/

async function openChat(matchUid){

    try{

        const premiumSnapshot=

        await get(

            ref(

                db,

                "subscriptions/"+currentUid

            )

        );

        const isPremium=

        premiumSnapshot.exists() &&

        premiumSnapshot.val().premium===true;

        if(isPremium){

            location.href=

            "chat.html?uid="+matchUid;

            return;

        }

        const freeRef=

        ref(

            db,

            "users/"+currentUid+

            "/freeMessagesRemaining"

        );

        const freeSnapshot=

        await get(freeRef);

        let remaining=1;

        if(freeSnapshot.exists()){

            remaining=

            freeSnapshot.val();

        }

        if(remaining>0){

            await update(

                ref(

                    db,

                    "users/"+currentUid

                ),

                {

                    freeMessagesRemaining:

                    remaining-1

                }

            );

            location.href=

            "chat.html?uid="+matchUid;

        }

        else{

            location.href=

            "premium.html";

        }

    }

    catch(error){

        console.error(error);

    }

}

/*==================================
        AI SUGGESTIONS
==================================*/

const suggestions=[

"What's your dream holiday destination? ✈️",

"If you could have dinner with anyone, who would it be? ❤️",

"What's your favourite weekend activity? ☕",

"What song best describes your personality? 🎵",

"What made you smile today? 😊",

"What's one thing you can't live without? 💕",

"If we met today, where would you take me? 🌅",

"What's your biggest life goal? 🚀"

];

function loadSuggestion(){

    if(!aiSuggestion) return;

    aiSuggestion.textContent=

    suggestions[

        Math.floor(

            Math.random()*

            suggestions.length

        )

    ];

}

document
.getElementById("sendSuggestion")
?.addEventListener("click", () => {

    alert(
        "Conversation starter copied. Open chat to send it."
    );

});
/*==================================
        MATCH ANNIVERSARY
==================================*/

function loadAnniversary(){

    if(

        !anniversaryText ||

        !allMatches.length

    ) return;

    const random=

    allMatches[

        Math.floor(

            Math.random()*

            allMatches.length

        )

    ];

    anniversaryText.textContent=

    `🎉 You've been matched with ${

    random.personalInformation?.fullName||

    "your match"

    }. Keep the conversation going ❤️`;

}

/*==================================
        STREAK
==================================*/

function loadStreak(){

    if(!streakText) return;

    const days=

    Math.floor(

        Math.random()*30

    )+1;

    streakText.textContent=

    `${days} day conversation streak 🔥`;

}

/*==================================
        PREMIUM
==================================*/
document
.getElementById("upgradeBtn")
?.addEventListener("click", () => {

    location.href = "premium.html";

});
/*==================================
        INITIALIZE UI
==================================*/

setTimeout(()=>{

    loadSuggestion();

    loadAnniversary();

    loadStreak();

},500);