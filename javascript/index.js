/*==================================
            INDEX.JS
==================================*/

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    ref,
    get,
    set,
    push,
    update,
    onDisconnect,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { setupPresence } from "./presence.js";

/*==================================
            DOM
==================================*/
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes

const splashScreen =
document.getElementById("splashScreen");

const greeting =
document.getElementById("greeting");

const heroName =
document.getElementById("heroName");

const heroLocation =
document.getElementById("heroLocation");

const heroBio =
document.getElementById("heroBio");

const heroPhoto =
document.getElementById("heroPhoto");

const headerProfile =
document.getElementById("headerProfile");

const onlineText =
document.getElementById("onlineText");

const editProfileBtn =
document.getElementById("enableProfileEditBtn");
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
onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "login.html";
        return;

    }

    const snapshot = await get(ref(db, "users/" + user.uid));

    if (!snapshot.exists()) {

        location.href = "login.html";
        return;

    }

    const data = snapshot.val();
await update(
    ref(db, "users/" + user.uid),
    {
        lastActive: Date.now(),
        presence: {
            online: true
        }
    }
);
await loadUser(user.uid);

setupPresence();

await loadAIMatch(user.uid); 
    hideSplash();

});
}
/*==================================
        LOAD USER
==================================*/

async function loadUser(uid){

    const snapshot =
    await get(ref(db,"users/"+uid));

    if(!snapshot.exists()) return;

    const user =
    snapshot.val();

    const info =
    user.personalInformation || {};

    const about =
    user.about || {};

    const photos =
    user.photos || {};
let profileImage = "assets/avatar.png";

/*==================================
    ALWAYS USE SELECTED PROFILE PHOTO
==================================*/

if(
    photos &&
    !Array.isArray(photos) &&
    typeof photos.profile === "string" &&
    photos.profile.trim()
){

    profileImage = photos.profile.trim();

}

/*==================================
    FALLBACK TO FIRST PHOTO
==================================*/

else if(Array.isArray(photos)){

    const firstPhoto = photos.find(
        photo =>
            typeof photo === "string" &&
            photo.trim()
    );

    if(firstPhoto){

        profileImage = firstPhoto.trim();

    }

}

/*==================================
    OBJECT PHOTO FALLBACK
==================================*/

else if(
    photos &&
    typeof photos === "object"
){

    const firstPhoto = Object.values(photos)
        .find(
            photo =>
                typeof photo === "string" &&
                photo.trim()
        );

    if(firstPhoto){

        profileImage = firstPhoto.trim();

    }

}
    heroName.textContent =
    info.fullName || "Member";

    heroLocation.textContent =
    info.homeAddress ||
    info.country ||
    "";

    heroBio.textContent =
    about.quote ||
    about.bio ||
    "Find meaningful connections.";

    heroPhoto.src =
    profileImage;

    headerProfile.src =
    profileImage;

    onlineText.textContent =
    "Online";

    setGreeting();

}

/*==================================
        GREETING
==================================*/

function setGreeting(){

    const hour =
    new Date().getHours();

    if(hour>=5 && hour<12){

        greeting.textContent =
        "Good Morning ☀️";

    }

    else if(hour<17){

        greeting.textContent =
        "Good Afternoon 🌞";

    }

    else if(hour<21){

        greeting.textContent =
        "Good Evening 🌇";

    }

    else{

        greeting.textContent =
        "Good Night 🌙";

    }

}

/*==================================
        SPLASH
==================================*/

function hideSplash(){

    if(!splashScreen) return;

    splashScreen.style.opacity="0";

    splashScreen.style.visibility="hidden";

    setTimeout(()=>{

        splashScreen.remove();

    },500);

}

/*==================================
        AI MATCH DOM
==================================*/

const matchPhoto =
document.getElementById("matchPhoto");

const matchName =
document.getElementById("matchName");

const matchAge =
document.getElementById("matchAge");

const matchBio =
document.getElementById("matchBio");

const matchReason =
document.getElementById("matchReason");

const matchScore =
document.getElementById("matchScore");

const matchVerified =
document.getElementById("matchVerified");

const matchOnline =
document.getElementById("matchOnline");

const aiMatchCard =
document.getElementById("aiMatchCard");

const refreshMatch =
document.getElementById("refreshMatch");

const likeMatch =
document.getElementById("likeMatch");

const passMatch =
document.getElementById("passMatch");

/*==================================
        VARIABLES
==================================*/

let compatibleUsers=[];

let currentMatch=null;

let currentIndex=0;

let modalMatch = null;

/*==================================
        LOAD AI MATCH
==================================*/

async function loadAIMatch(currentUid){

    compatibleUsers=[];

    currentIndex=0;

    const snapshot=
    await get(ref(db,"users"));

    if(!snapshot.exists()) return;

    const users=
    snapshot.val();

    const currentUser=
    users[currentUid];

    if(!currentUser) return;

    const myPref=
    currentUser.preferences || {};

    for(const uid in users){

        if(uid===currentUid)
        continue;

        const candidate=
        users[uid];

        const info=
        candidate.personalInformation || {};

        /*==========================
            GENDER FILTER
        ==========================*/

        if(

            myPref.preferredGender &&

            myPref.preferredGender!=="Any" &&

            info.gender!==

            myPref.preferredGender

        ){

            continue;

        }

        /*==========================
            AGE FILTER
        ==========================*/

        const age=
        Number(info.age || 0);

        if(

            age<Number(myPref.minAge || 18)

        ){

            continue;

        }

        if(

            age>Number(myPref.maxAge || 100)

        ){

            continue;

        }

        const result=

        calculateCompatibility(

            currentUser,

            candidate

        );

        compatibleUsers.push({

            uid,

            ...candidate,

            score:result.score,

            reason:result.reason

        });

    }

    compatibleUsers.sort(

        (a,b)=>

        b.score-a.score

    );

    if(

        compatibleUsers.length===0

    ){

        showToast(

            "No compatible matches found."

        );

        return;

    }

    currentMatch=

    compatibleUsers[0];

    currentIndex=0;

    showMatch(currentMatch);

}
/*==================================
    CALCULATE COMPATIBILITY
==================================*/

function calculateCompatibility(currentUser,candidate){

    let score=0;

    let reasons=[];

    const myInfo=
    currentUser.personalInformation || {};

    const myPref=
    currentUser.preferences || {};

    const myInterests=
    currentUser.interests?.selected || [];

    const info=
    candidate.personalInformation || {};

    const pref=
    candidate.preferences || {};

    const interests=
    candidate.interests?.selected || [];

    /*==========================
        RELATIONSHIP GOAL
    ==========================*/

    if(

        myPref.lookingFor===

        pref.lookingFor

    ){

        score+=20;

        reasons.push(

            "Same relationship goal"

        );

    }

    /*==========================
        SHARED INTERESTS
    ==========================*/

    let shared=0;

    myInterests.forEach(item=>{

        if(interests.includes(item)){

            shared++;

        }

    });

    if(shared){

        score+=Math.min(shared*4,20);

        reasons.push(

            shared+

            " shared interests"

        );

    }

    /*==========================
        RELIGION
    ==========================*/

    if(

        myPref.preferredReligion==="Any"

    ){

        score+=5;

    }

    else if(

        myPref.preferredReligion===

        info.religion

    ){

        score+=5;

        reasons.push(

            "Same religion"

        );

    }

    /*==========================
        EDUCATION
    ==========================*/

    if(

        myPref.preferredEducation==="Any"

    ){

        score+=5;

    }

    else if(

        myPref.preferredEducation===

        info.education

    ){

        score+=5;

        reasons.push(

            "Same education"

        );

    }

    /*==========================
        OCCUPATION
    ==========================*/

    if(

        myPref.preferredOccupation==="Any"

    ){

        score+=5;

    }

    else if(

        myPref.preferredOccupation===

        info.occupation

    ){

        score+=5;

    }

    /*==========================
        NATIONALITY
    ==========================*/

    if(

        myPref.preferredNationality==="Any"

    ){

        score+=5;

    }

    else if(

        myPref.preferredNationality===

        info.nationality

    ){

        score+=5;

    }

    /*==========================
        TRIBE
    ==========================*/

    if(

        myPref.preferredTribe==="Any"

    ){

        score+=5;

    }

    else if(

        myPref.preferredTribe===

        info.tribe

    ){

        score+=5;

    }

    /*==========================
        CHILDREN
    ==========================*/

    if(

        myPref.preferredChildren===

        info.children

    ){

        score+=5;

    }

    /*==========================
        SMOKING
    ==========================*/

    if(

        myPref.acceptSmoking===

        info.smoking

    ){

        score+=5;

    }

    /*==========================
        DRINKING
    ==========================*/

    if(

        myPref.acceptDrinking===

        info.drinking

    ){

        score+=5;

    }

    /*==========================
        VERIFIED
    ==========================*/

    if(

        candidate.verification?.status===

        "approved"

    ){

        score+=5;

    }

    return{

        score:

        Math.min(score,100),

        reason:

        reasons.length?

        reasons.join(" • ")

        :

        "Highly Compatible"

    };

}
/*==================================
        DISPLAY MATCH
==================================*/

function showMatch(match){

    if(!match) return;

    currentMatch = match;

    const info =
    match.personalInformation || {};

    const about =
    match.about || {};

    const photos =
    match.photos || {};

    let photo =
    "assets/avatar.png";

    /*==========================
        PROFILE PHOTO
    ==========================*/

    if(photos.profile){

        photo =
        photos.profile;

    }

    else if(Array.isArray(photos)){

        photo =
        photos[0] || photo;

    }

    else{

        const values =
        Object.values(photos);

        if(values.length){

            photo =
            values[0];

        }

    }

    /*==========================
        CARD ANIMATION
    ==========================*/

    aiMatchCard.classList.remove(
        "match-show"
    );

    aiMatchCard.classList.add(
        "match-hide"
    );

    setTimeout(()=>{

        matchPhoto.src =
        photo;

        matchName.textContent =
        info.fullName || "Unknown";

        if(matchAge){

            matchAge.textContent =
            info.age || "--";

        }

        matchBio.textContent =

        about.quote ||

        about.bio ||

        "Looking for genuine love ❤️";

        matchReason.textContent =
        match.reason;

        animateCompatibility(
            match.score
        );

        /*==========================
            VERIFIED
        ==========================*/

        if(

            match.verification?.status ===

            "approved"

        ){

            matchVerified.style.display =
            "flex";

        }

        else{

            matchVerified.style.display =
            "none";

        }

        /*==========================
            ONLINE
        ==========================*/

        if(matchOnline){

            if(

                match.presence?.online

            ){

                matchOnline.classList.remove(
                    "offline"
                );

                matchOnline.classList.add(
                    "online"
                );

                matchOnline.textContent =
                "Online";

            }

            else{

                matchOnline.classList.remove(
                    "online"
                );

                matchOnline.classList.add(
                    "offline"
                );

                matchOnline.textContent =
                "Offline";

            }

        }

        aiMatchCard.classList.remove(
            "match-hide"
        );

        aiMatchCard.classList.add(
            "match-show"
        );

    },250);

}

/*==================================
    SCORE ANIMATION
==================================*/

function animateCompatibility(score){

    let value = 0;

    matchScore.textContent =
    "0%";

    const timer = setInterval(()=>{

        value++;

        matchScore.textContent =
        value + "%";

        if(value >= score){

            clearInterval(timer);

        }

    },15);

}
/*==================================
        TOAST
==================================*/

function showToast(message){

    const toast =
    document.getElementById("toast");

    if(!toast){

        console.log(message);

        return;

    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}

/*==================================
        NEXT MATCH
==================================*/

function nextMatch(){

    if(compatibleUsers.length===0){

        showToast("No more matches.");

        return;

    }

    currentIndex++;

    if(currentIndex>=compatibleUsers.length){

        currentIndex=0;

    }

    showMatch(

        compatibleUsers[currentIndex]

    );

}

/*==================================
        HEART ANIMATION
==================================*/
function createFloatingHearts(){

    if(!aiMatchCard) return;

    const hearts=[
        "❤️",
        "💖",
        "💕",
        "💗",
        "💓"
    ];

    for(let i=0;i<18;i++){

        const heart=
        document.createElement("span");

        heart.className=
        "tiktok-heart";

        heart.innerHTML=

        hearts[
            Math.floor(
                Math.random()*
                hearts.length
            )
        ];

        heart.style.left=
        (48+(Math.random()*8-4))+"%";

        heart.style.bottom="70px";

        heart.style.fontSize=
        (18+Math.random()*18)+"px";

        heart.style.animationDelay=
        (i*0.04)+"s";

        heart.style.setProperty(
            "--x",
            (Math.random()*180-90)+"px"
        );

        heart.style.setProperty(
            "--rotate",
            (Math.random()*180-90)+"deg"
        );

        aiMatchCard.appendChild(heart);

        setTimeout(()=>{

            heart.remove();

        },2200);

    }

}
/*==================================
        REFRESH
==================================*/

refreshMatch?.addEventListener(

    "click",

    ()=>{

        refreshMatch.classList.add(

            "spin"

        );

        setTimeout(()=>{

            refreshMatch.classList.remove(

                "spin"

            );

            nextMatch();

        },500);

    }

);

/*==================================
        PASS
==================================*/

passMatch?.addEventListener(

    "click",

    ()=>{

        aiMatchCard.classList.add(

            "match-hide"

        );

        showToast("Match skipped");

        setTimeout(()=>{

            aiMatchCard.classList.remove(

                "match-hide"

            );

            nextMatch();

        },300);

    }

);

/*==================================
        LIKE
==================================*/

likeMatch?.addEventListener(

    "click",

    async()=>{

        if(!currentMatch) return;

        createFloatingHearts();
        aiMatchCard.animate(

    [

        { transform:"scale(1)" },

        { transform:"scale(1.04)" },

        { transform:"scale(1)" }

    ],

    {

        duration:220,

        easing:"ease-out"

    }

);

        showToast(

            "❤️ You liked " +

            (currentMatch.personalInformation?.fullName ||

            "this user")

        );

        const user=

        auth.currentUser;

        if(!user) return;

        await saveLike(

            user.uid,

            currentMatch.uid

        );

        setTimeout(()=>{

            nextMatch();

        },800);

    }

);

/*==================================
        SAVE LIKE
==================================*/

async function saveLike(

    currentUid,

    matchUid

){

    await set(

        ref(

            db,

            "likes/"+

            currentUid+

            "/"+

            matchUid

        ),

        {

            likedAt:Date.now(),

            status:"liked"

        }

    );

    await checkMutualLike(

        currentUid,

        matchUid

    );

}
/*==================================
      CHECK MUTUAL LIKE
==================================*/

async function checkMutualLike(

    currentUid,

    matchUid

){

    const snapshot = await get(

        ref(

            db,

            "likes/" +

            matchUid +

            "/" +

            currentUid

        )

    );

    if(snapshot.exists()){

        await createMatch(

            currentUid,

            matchUid

        );

        openMatchModal(currentMatch);

    }

}
/*==================================
        CREATE MATCH
==================================*/

async function createMatch(uid1, uid2){

    const matchId =

        uid1 < uid2

        ? uid1 + "_" + uid2

        : uid2 + "_" + uid1;

    await set(

        ref(db,"matches/"+matchId),

        {

            users:{

                [uid1]:true,

                [uid2]:true

            },

            createdAt:Date.now(),

            lastMessage:"",

            lastMessageTime:Date.now()

        }

    );

    await createChat(

        matchId,

        uid1,

        uid2

    );

}

/*==================================
        CREATE CHAT
==================================*/

async function createChat(

    matchId,

    uid1,

    uid2

){

    await set(

        ref(db,"chats/"+matchId),

        {

            participants:{

                [uid1]:true,

                [uid2]:true

            },

            createdAt:Date.now(),

            lastMessage:"",

            lastMessageTime:Date.now()

        }

    );

}

/*==================================
    RECOMMENDED USERS
    REAL FIREBASE USERS
==================================*/

const recommendedSlider =
document.getElementById("recommendedSlider");

const RECOMMENDED_LIMIT = 6;


/*==================================
    GET USER PROFILE PHOTO
==================================*/

function getUserProfilePhoto(user){

    const photos = user?.photos || {};

    if(
        photos &&
        !Array.isArray(photos) &&
        typeof photos.profile === "string" &&
        photos.profile.trim()
    ){

        return photos.profile.trim();

    }

    if(Array.isArray(photos)){

        const photo = photos.find(
            item =>
                typeof item === "string" &&
                item.trim()
        );

        if(photo){

            return photo.trim();

        }

    }

    if(
        photos &&
        typeof photos === "object"
    ){

        const photo =
        Object.values(photos).find(
            item =>
                typeof item === "string" &&
                item.trim()
        );

        if(photo){

            return photo.trim();

        }

    }

    return "assets/avatar.png";

}


/*==================================
    LOAD RECOMMENDED USERS
==================================*/

async function loadRecommendedUsers(){

    if(!recommendedSlider) return;

    const currentUser =
    auth.currentUser;

    if(!currentUser) return;

    try{

        const snapshot =
        await get(ref(db,"users"));

        if(!snapshot.exists()){

            recommendedSlider.innerHTML = "";

            return;

        }

        const users =
        snapshot.val();

        const recommendedUsers = [];

        for(const uid in users){

            /* Don't recommend myself */

            if(uid === currentUser.uid){

                continue;

            }

            const user =
            users[uid];

            if(!user) continue;


            const info =
            user.personalInformation || {};

            const about =
            user.about || {};


            /*==================================
                REQUIRE BASIC PROFILE DATA
            ==================================*/

            if(!info.fullName){

                continue;

            }


            /*==================================
                GET PROFILE PHOTO
            ==================================*/

            const image =
            getUserProfilePhoto(user);


            /*==================================
                ONLY NEW USERS
            ==================================*/

            const createdAt =
            Number(user.createdAt || 0);

            recommendedUsers.push({

                uid:uid,

                name:
                info.fullName,

                age:
                info.age || "",

                image:image,

                quote:
                about.quote ||
                about.bio ||
                "Looking for a meaningful connection ❤️",

                online:
                user.presence?.online === true,

                verified:
                user.verification?.status === "approved",

                createdAt:createdAt

            });

        }


        /*==================================
            NEWEST USERS FIRST
        ==================================*/

        recommendedUsers.sort(
            (a,b) =>
            b.createdAt - a.createdAt
        );


        /*==================================
            ONLY A FEW USERS
        ==================================*/

        const usersToShow =
        recommendedUsers.slice(
            0,
            RECOMMENDED_LIMIT
        );


        renderRecommendedUsers(
            usersToShow
        );

    }

    catch(error){

        console.error(
            "RECOMMENDED USERS ERROR:",
            error
        );

    }

}


/*==================================
    RENDER RECOMMENDED USERS
==================================*/

function renderRecommendedUsers(users){

    if(!recommendedSlider) return;

    recommendedSlider.innerHTML = "";


    users.forEach(user => {

        const card =
        document.createElement("div");

        card.className =
        "recommended-card";


        const age =
        user.age
        ? `, ${user.age}`
        : "";


        card.innerHTML = `

            <img
                src="${user.image}"
                class="recommended-image"
                alt="${user.name}"
                loading="lazy"
            >

            <div class="recommended-overlay">

                <div class="recommended-top">

                    ${
                        user.verified
                        ?
                        `
                        <span class="verified">
                            ✔ Verified
                        </span>
                        `
                        :
                        ""
                    }

                    <span
                        class="online ${
                            user.online
                            ? ""
                            : "offline"
                        }">
                    </span>

                </div>


                <div class="recommended-bottom">

                    <h3>
                        ${user.name}${age}
                    </h3>

                    <p>
                        ${user.quote}
                    </p>

                </div>

            </div>

        `;


        /*==================================
            CLICK PROFILE
        ==================================*/

        card.addEventListener(
            "click",
            () => {

                sessionStorage.setItem(
                    "selectedMatch",
                    user.uid
                );

                window.location.href =
                "profile.html";

            }
        );


        recommendedSlider.appendChild(
            card
        );

    });

}


/*==================================
    LOAD AFTER LOGIN
==================================*/

if(auth.currentUser){

    loadRecommendedUsers();

}

/*==================================
        PREMIUM IMAGE SLIDER
==================================*/

const premiumImage =
document.getElementById("premiumImage");

const premiumImages=[

    "assets/love1.jpeg",

    "assets/love2.jpeg",

    "assets/love3.jpeg",

    "assets/love4.jpeg",

    "assets/love5.jpeg"

];

let premiumIndex=0;

if(premiumImage){

    setInterval(()=>{

        premiumImage.style.opacity="0";

        setTimeout(()=>{

            premiumIndex++;

            if(premiumIndex>=premiumImages.length){

                premiumIndex=0;

            }

            premiumImage.src=
            premiumImages[premiumIndex];

            premiumImage.style.opacity="1";

        },400);

    },120000);

}

/*==================================
        near by singles
==================================*/
const nearbySlider =
document.getElementById("nearbySlider");

const nearbySingles=[

{
    distance:"2 km",
    image:"assets/models/model7.jpg"
},

{
    distance:"5 km",
    image:"assets/models/model8.jpg"
},

{
    distance:"8 km",
    image:"assets/models/model9.jpg"
},

{
    distance:"12 km",
    image:"assets/models/model10.jpg"
},

{
    distance:"18 km",
    image:"assets/models/model11.jpg"
}

];

loadNearbySingles();

function loadNearbySingles(){

    nearbySlider.innerHTML="";

    [...nearbySingles,...nearbySingles]

    .forEach(user=>{

        const card=document.createElement("div");

        card.className="nearby-card";

        card.innerHTML=`

            <img
            src="${user.image}"
            class="nearby-image">

            <div class="nearby-lock">

                🔒

            </div>

            <div class="nearby-overlay">

                <span class="premium-text">

                    Premium Only

                </span>

                <span class="distance">

                    📍 ${user.distance}

                </span>

            </div>

        `;

        nearbySlider.appendChild(card);

    });

}


/*==================================
        MATCH MODAL
==================================*/

const matchModal =
document.getElementById("matchModal");

const matchModalName =
document.getElementById("matchModalName");

const myMatchPhoto =
document.getElementById("myMatchPhoto");

const theirMatchPhoto =
document.getElementById("theirMatchPhoto");

const sendMessageBtn =
document.getElementById("sendMessageBtn");

const keepMatchingBtn =
document.getElementById("keepMatchingBtn");

/*==================================
        OPEN MATCH MODAL
==================================*/
function openMatchModal(match){

    if(!match) return;
    modalMatch = match;

    const photos =
    match.photos || {};

    let theirPhoto =
    "assets/avatar.png";

    if(Array.isArray(photos)){

        theirPhoto =
        photos[0] || theirPhoto;

    }

    else{

        const values =
        Object.values(photos);

        if(values.length){

            theirPhoto =
            values[0];

        }

    }

    matchModalName.textContent =
    match.personalInformation?.fullName ||
    "Member";

    /* Your photo */

    myMatchPhoto.src =
    heroPhoto.src;

    /* Match photo */

    theirMatchPhoto.src =
    theirPhoto;

    matchModal.classList.add("show");

}
/*==================================
        CLOSE MATCH MODAL
==================================*/

function closeMatchModal(){

    matchModal.classList.remove("show");

}
/*==================================
        MATCH MODAL EVENTS
==================================*/

keepMatchingBtn?.addEventListener(

    "click",

    ()=>{

        closeMatchModal();

        nextMatch();

    }

);
sendMessageBtn?.addEventListener(

    "click",

    async()=>{

        const user =
        auth.currentUser;

        if(!user) return;

        const snapshot =
        await get(ref(db,"users/"+user.uid));

        if(!snapshot.exists()) return;

        const data =
        snapshot.val();

        const isPremium =

        data.subscription?.active ||

        data.premium?.active ||

        false;
if(isPremium){
const matchId =

    user.uid < modalMatch.uid

    ? user.uid + "_" + modalMatch.uid

    : modalMatch.uid + "_" + user.uid;

sessionStorage.setItem(

    "currentMatchId",

    matchId

);

sessionStorage.setItem(

    "selectedMatch",

    modalMatch.uid

);
    window.location.href =

    "chat.html";

    return;

}
        
showToast(
    "💎 Premium membership required."
);

setTimeout(()=>{

    window.location.href =
    "premium.html";

},1000);
    }

);
matchModal?.addEventListener(

    "click",

    e=>{

        if(e.target===matchModal){

            closeMatchModal();

        }

    }

);
/*==================================
        SESSION MANAGER
==================================*/

const ACTIVITY_EVENTS = [
    "click",
    "keydown",
    "mousemove",
    "touchstart",
    "scroll"
];

// Update last active whenever the user does something
ACTIVITY_EVENTS.forEach(event => {

    document.addEventListener(event, async () => {

        if (!auth.currentUser) return;

        try {
await update(
    ref(db, "users/" + auth.currentUser.uid),
    {
        lastActive: Date.now(),
        "presence/lastSeen": Date.now()
    }
);
        } catch (error) {

            console.error(error);

        }

    }, { passive: true });

});

// Check every minute for inactivity
setInterval(async () => {

    if (!auth.currentUser) return;

    try {

        const snapshot = await get(
            ref(db, "users/" + auth.currentUser.uid)
        );

        if (!snapshot.exists()) return;

        const user = snapshot.val();

        if (
            user.lastActive &&
            Date.now() - user.lastActive > SESSION_TIMEOUT
        ) {

            alert("Your session has expired. Please log in again.");

            await signOut(auth);

            location.href = "login.html";

        }

    } catch (error) {

        console.error(error);

    }

}, 60000);

/*==================================
        PROFILE MODAL
===================================*/

const profileModal =
document.getElementById("profileModal");

const closeProfileBtn =
document.getElementById("closeProfileBtn");

const cancelProfileBtn =
document.getElementById("cancelProfileBtn");


/*==================================
        OPEN PROFILE MODAL
===================================*/

editProfileBtn?.addEventListener(
    "click",
    () => {

        if(!profileModal) return;

        profileModal.classList.add("show");

        profileModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "profile-modal-open"
        );

    }
);


/*==================================
        CLOSE PROFILE MODAL
===================================*/

function closeProfileModal(){

    if(!profileModal) return;

    profileModal.classList.remove("show");

    profileModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "profile-modal-open"
    );

}


/*==================================
        CLOSE BUTTON
===================================*/

closeProfileBtn?.addEventListener(
    "click",
    closeProfileModal
);


/*==================================
        CANCEL BUTTON
===================================*/

cancelProfileBtn?.addEventListener(
    "click",
    closeProfileModal
);


/*==================================
        CLICK OUTSIDE MODAL
===================================*/

profileModal?.addEventListener(
    "click",
    (event) => {

        if(event.target === profileModal){

            closeProfileModal();

        }

    }
);


/*==================================
        ESC KEY
===================================*/

document.addEventListener(
    "keydown",
    (event) => {

        if(
            event.key === "Escape" &&
            profileModal?.classList.contains("show")
        ){

            closeProfileModal();

        }

    }
);
/*==================================
        LOAD PROFILE DATA
===================================*/

const personalInformationFields =
document.getElementById("personalInformationFields");

const aboutFields =
document.getElementById("aboutFields");

const interestsFields =
document.getElementById("interestsFields");

const preferencesFields =
document.getElementById("preferencesFields");

const nextOfKinFields =
document.getElementById("nextOfKinFields");

const locationFields =
document.getElementById("locationFields");

const onboardingFields =
document.getElementById("onboardingFields");

const accountFields =
document.getElementById("accountFields");


/*==================================
        OPEN + LOAD PROFILE
===================================*/

editProfileBtn?.addEventListener(
    "click",
    async () => {

        const user = auth.currentUser;

        if(!user) return;

        await loadProfileModal(user.uid);

    }
);


/*==================================
        LOAD FROM FIREBASE
===================================*/

async function loadProfileModal(uid){

    try{

        const snapshot =
        await get(
            ref(db,"users/"+uid)
        );

        if(!snapshot.exists()){

            showToast(
                "Profile information not found."
            );

            return;

        }

        const user =
        snapshot.val();


        /*==============================
            PERSONAL INFORMATION
        ==============================*/

        renderProfileSection(
            personalInformationFields,
            user.personalInformation || {}
        );


        /*==============================
            ABOUT
        ==============================*/

        renderProfileSection(
            aboutFields,
            user.about || {}
        );


        /*==============================
            INTERESTS
        ==============================*/

        renderProfileSection(
            interestsFields,
            user.interests || {}
        );


        /*==============================
            PREFERENCES
        ==============================*/

        renderProfileSection(
            preferencesFields,
            user.preferences || {}
        );


        /*==============================
            NEXT OF KIN
        ==============================*/

        renderProfileSection(
            nextOfKinFields,
            user.nextOfKin || {}
        );


        /*==============================
            LOCATION
        ==============================*/

        renderProfileSection(
            locationFields,
            user.location || {}
        );


        /*==============================
            ONBOARDING
        ==============================*/

        renderProfileSection(
            onboardingFields,
            user.onboarding || {}
        );


        /*==============================
            ACCOUNT
        ==============================*/

        renderAccountInformation(user);


    }

    catch(error){

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        showToast(
            "Unable to load your profile."
        );

    }

}


/*==================================
        RENDER SECTION
===================================*/

function renderProfileSection(
    container,
    data
){

    if(!container) return;

    container.innerHTML = "";


    const entries =
    Object.entries(data);


    if(entries.length === 0){

        container.innerHTML = `
            <div class="profile-empty">
                No information available.
            </div>
        `;

        return;

    }


    entries.forEach(
        ([key,value]) => {

            const field =
            document.createElement("div");

            field.className =
            "profile-field";


            const label =
            document.createElement("label");

            label.textContent =
            formatProfileLabel(key);


            const input =
            createProfileInput(
                key,
                value
            );


            field.appendChild(label);

            field.appendChild(input);

            container.appendChild(field);

        }
    );

}


/*==================================
        CREATE INPUT
===================================*/

function createProfileInput(
    key,
    value
){

    const lowerKey =
    key.toLowerCase();


    /*==============================
            TEXTAREA
    ==============================*/

    if(
        lowerKey.includes("bio") ||
        lowerKey.includes("quote") ||
        lowerKey.includes("address") ||
        lowerKey.includes("description")
    ){

        const textarea =
        document.createElement("textarea");

        textarea.value =
        value ?? "";

        textarea.dataset.field =
        key;

        return textarea;

    }


    /*==============================
            SELECT
    ==============================*/

    if(
        lowerKey === "gender" ||
        lowerKey.includes("status")
    ){

        const select =
        document.createElement("select");


        const options = [

            "Male",
            "Female",
            "Other",
            "Single",
            "In a Relationship",
            "Married",
            "Divorced",
            "Widowed"

        ];


        const uniqueOptions =
        [...new Set([
            value,
            ...options
        ])];


        uniqueOptions
        .filter(Boolean)
        .forEach(option => {

            const item =
            document.createElement("option");

            item.value =
            option;

            item.textContent =
            option;

            select.appendChild(item);

        });


        select.value =
        value ?? "";

        select.dataset.field =
        key;

        return select;

    }


    /*==============================
            NORMAL INPUT
    ==============================*/

    const input =
    document.createElement("input");

    input.type =
    "text";

    input.value =
    value ?? "";

    input.dataset.field =
    key;

    return input;

}


/*==================================
        ACCOUNT INFORMATION
===================================*/

function renderAccountInformation(user){

    if(!accountFields) return;

    accountFields.innerHTML = "";


    /* EMAIL */

    addReadonlyProfileField(
        "Email",
        user.email || ""
    );


    /* USERNAME */

    addReadonlyProfileField(
        "Username",
        user.username || ""
    );


    /* UID */

    addReadonlyProfileField(
        "Account ID",
        user.uid || ""
    );


    /* VERIFICATION */

    addReadonlyProfileField(
        "Verification",
        user.verification?.status ||
        "Not verified"
    );


    /* CREATED */

    if(user.createdAt){

        addReadonlyProfileField(
            "Member Since",
            formatProfileDate(
                user.createdAt
            )
        );

    }

}


/*==================================
        READ ONLY FIELD
===================================*/

function addReadonlyProfileField(
    labelText,
    value
){

    const field =
    document.createElement("div");

    field.className =
    "profile-field";


    const label =
    document.createElement("label");

    label.textContent =
    labelText;


    const input =
    document.createElement("input");

    input.type =
    "text";

    input.value =
    value;

    input.readOnly =
    true;

    input.classList.add(
        "profile-readonly-input"
    );


    field.appendChild(label);

    field.appendChild(input);

    accountFields.appendChild(field);

}


/*==================================
        LABEL FORMATTER
===================================*/

function formatProfileLabel(key){

    return String(key)

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /[_-]/g,
            " "
        )

        .replace(
            /^./,
            char => char.toUpperCase()
        );

}


/*==================================
        DATE FORMATTER
===================================*/

function formatProfileDate(value){

    const date =
    new Date(value);

    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return value;

    }

    return date.toLocaleDateString(
        [],
        {
            year:"numeric",
            month:"long",
            day:"numeric"
        }
    );

}
/*==================================
        PROFILE SECTION TOGGLES
===================================*/

const profileSectionToggles =
document.querySelectorAll(
    ".profile-section-toggle"
);


profileSectionToggles.forEach(
    toggle => {

        toggle.addEventListener(
            "click",
            () => {

                const sectionBody =
                toggle.nextElementSibling;

                if(!sectionBody) return;


                /*==========================
                    OPEN / CLOSE
                ==========================*/

                const isOpen =
                sectionBody.classList.contains(
                    "active"
                );


                if(isOpen){

                    sectionBody.classList.remove(
                        "active"
                    );

                    toggle.classList.remove(
                        "active"
                    );

                }

                else{

                    sectionBody.classList.add(
                        "active"
                    );

                    toggle.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);