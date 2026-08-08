/*==================================
            LOGIN.JS
==================================*/

import { auth, provider, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
            DOM
==================================*/

const loginForm = document.getElementById("loginForm");
const loginInput = document.getElementById("loginInput");
const password = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");

const otpGroup = document.getElementById("otpGroup");
const otpCode = document.getElementById("otpCode");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

const loadingOverlay = document.getElementById("loadingOverlay");
const toast = document.getElementById("toast");

const togglePassword = document.getElementById("togglePassword");
/*==================================
        AUTH OBSERVER
==================================*/

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    try {

        const snapshot = await get(
            ref(db, "users/" + user.uid)
        );

        if (!snapshot.exists()) {

            location.href = "register.html";
            return;

        }

        const data = snapshot.val();

await update(
    ref(db, "users/" + auth.currentUser.uid),
    {
        lastActive: Date.now(),
        presence: {
            online: true,
            lastSeen: Date.now()
        }
    }
);
        await ctUser(user.uid);

    } catch (error) {

        console.error(error);

        hideLoading();

        showToast("Failed to load account.", "#ff3b30");

    }

});
/*==================================
            GLOBALS
==================================*/

let confirmationResult = null;
let phoneNumber = "";
let recaptchaVerifier = null;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes

/*==================================
        INITIALIZE
==================================*/

window.addEventListener("DOMContentLoaded", () => {

    recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
            size: "invisible"
        }
    );

});

/*==================================
        PASSWORD TOGGLE
==================================*/

togglePassword?.addEventListener("click", () => {

    password.type =
        password.type === "password"
        ? "text"
        : "password";

});

/*==================================
            LOADING
==================================*/

function showLoading(){

    loadingOverlay.classList.remove("hidden");

    loginBtn.disabled = true;

    loginBtn.textContent = "Please wait...";

}

function hideLoading(){

    loadingOverlay.classList.add("hidden");

    loginBtn.disabled = false;

    loginBtn.textContent = "Log In";

}

/*==================================
            TOAST
==================================*/

function showToast(message,color="#34c759"){

    toast.textContent = message;

    toast.style.background = color;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}
/*==================================
            LOGIN
==================================*/

loginForm?.addEventListener("submit", loginUser);

async function loginUser(e) {

    e.preventDefault();

    showLoading();

    try {

        const value = loginInput.value.trim();

        if (!value) {

            hideLoading();

            showToast("Enter your email, username or phone", "#ff3b30");

            return;

        }

        let email = "";
        phoneNumber = "";

        /*==============================
                EMAIL
        ==============================*/

        if (value.includes("@")) {

            email = value.toLowerCase();

        }

        /*==============================
                PHONE
        ==============================*/

        else if (/^[0-9+]+$/.test(value)) {

            let phone = value;

            if (phone.startsWith("0")) {

                phone = "+256" + phone.substring(1);

            } else if (phone.startsWith("256")) {

                phone = "+" + phone;

            }

            const phoneSnap = await get(
                ref(db, "phones/" + phone)
            );

            if (!phoneSnap.exists()) {

                hideLoading();

                showToast("Phone number not found", "#ff3b30");

                return;

            }

            const uid = phoneSnap.val();

            const userSnap = await get(
                ref(db, "users/" + uid)
            );

            const user = userSnap.val();

            if (user.email) {

                email = user.email;

            } else {

                phoneNumber = user.phone;

            }

        }

        /*==============================
                USERNAME
        ==============================*/

        else {

            const usernameSnap = await get(
                ref(db, "usernames/" + value.toLowerCase())
            );

            if (!usernameSnap.exists()) {

                hideLoading();

                showToast("Username not found", "#ff3b30");

                return;

            }

            const uid = usernameSnap.val();

            const userSnap = await get(
                ref(db, "users/" + uid)
            );

            const user = userSnap.val();

            if (user.email) {

                email = user.email;

            } else {

                phoneNumber = user.phone;

            }

        }

        /*==============================
            EMAIL LOGIN
        ==============================*/

        if (email) {

            await signInWithEmailAndPassword(
                auth,
                email,
                password.value
            );

            hideLoading();

            return;

        }

        /*==============================
            PHONE LOGIN
        ==============================*/

        confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );

        hideLoading();

        otpGroup.classList.remove("hidden");
        verifyOtpBtn.classList.remove("hidden");

        showToast("Verification code sent.");

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "#ff3b30");

    }

}

/*==================================
        VERIFY OTP
==================================*/

verifyOtpBtn?.addEventListener("click", verifyOTP);

async function verifyOTP() {

    try {

        showLoading();

        const code = otpCode.value.trim();

        if (code.length !== 6) {

            hideLoading();

            showToast("Enter the 6-digit code", "#ff3b30");

            return;

        }

        await confirmationResult.confirm(code);

        hideLoading();

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast("Invalid verification code.", "#ff3b30");

    }

}
/*==================================
        GOOGLE LOGIN
==================================*/

googleBtn?.addEventListener("click", googleLogin);

async function googleLogin() {

    try {

        showLoading();
    await signInWithPopup(
    auth,
    provider
);

hideLoading();
    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "#ff3b30");

    }

}

/*==================================
        CT USER
==================================*/
async function ctUser(uid) {

    const snapshot = await get(
        ref(db, "users/" + uid)
    );

    hideLoading();

    if (!snapshot.exists()) {

        location.href = "register.html";

        return;

    }
const user = snapshot.val();
    await updateLastActive();

    if (!user.onboarding) {

        location.href = "register.html";

        return;

    }

    if (!user.onboarding.completed) {

        const step = user.onboarding.step || 1;

        location.href =
            `register.html?step=${step}`;

        return;

    }

    location.href = "index.html";

}
async function updateLastActive() {

    if (!auth.currentUser) return;

    await update(
        ref(db, "users/" + auth.currentUser.uid),
        {
            lastActive: Date.now(),
            presence: {
                online: true
            }
        }
    );


}
/*==================================
        USER ACTIVITY
==================================*/

[
    "click",
    "keydown",
    "mousemove",
    "touchstart",
    "scroll"
].forEach(event => {

    document.addEventListener(event, () => {

        updateLastActive();

    }, { passive: true });

});