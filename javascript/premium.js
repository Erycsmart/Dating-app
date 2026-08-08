/*==================================
        PREMIUM.JS
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

    update,

    get

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
        DOM
==================================*/

const monthlyBtn =
document.getElementById("monthlyBtn");

const yearlyBtn =
document.getElementById("yearlyBtn");

const backBtn =
document.getElementById("backBtn");

const restorePurchase =
document.getElementById("restorePurchase");

/*==================================
        VARIABLES
==================================*/

let currentUser = null;

/*==================================
        START
==================================*/

onAuthStateChanged(

    auth,

    user=>{

        if(!user){

            window.location.href =
            "login.html";

            return;

        }

        currentUser = user;
        setupPresence();

    }

);

/*==================================
        ACTIVATE PREMIUM
==================================*/

async function activatePremium(plan){

    if(!currentUser) return;

    await update(

        ref(

            db,

            "users/" +

            currentUser.uid

        ),

        {

            "subscription/active":true,

            "subscription/plan":plan,

            "subscription/startedAt":Date.now(),

            "premium/active":true

        }

    );

    showToast(

        "🎉 Premium activated!"

    );

    setTimeout(()=>{

        window.location.href =

        "index.html";

    },1200);

}

/*==================================
        EVENTS
==================================*/

monthlyBtn?.addEventListener(

    "click",

    ()=>{

        activatePremium(

            "monthly"

        );

    }

);

yearlyBtn?.addEventListener(

    "click",

    ()=>{

        activatePremium(

            "yearly"

        );

    }

);

backBtn?.addEventListener(

    "click",

    ()=>{

        history.back();

    }

);

restorePurchase?.addEventListener(

    "click",

    ()=>{

        showToast(

            "Restore purchase coming soon."

        );

    }

);

/*==================================
        TOAST
==================================*/

function showToast(message){

    const toast =

    document.getElementById(

        "toast"

    );

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

    },3000);

}