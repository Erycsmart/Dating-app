/*==================================
        AUTH.JS
==================================*/

/*==================================
        IMPORTS
==================================*/

import { auth, db, provider } from "./firebase.js";
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithPopup,
    updateProfile,
    sendEmailVerification,
    fetchSignInMethodsForEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    ref,
    get,
    set,
    update,
    push,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
/*==================================
        DOM
==================================*/

const authScreen = document.getElementById("authScreen");
const loadingOverlay = document.getElementById("loadingOverlay");
const toast = document.getElementById("toast");

const emailTab = document.getElementById("emailTab");
const phoneTab = document.getElementById("phoneTab");

const emailGroup = document.getElementById("emailGroup");
const phoneGroup = document.getElementById("phoneGroup");

const username = document.getElementById("username");
const usernameStatus = document.getElementById("usernameStatus");

const email = document.getElementById("email");
const phone = document.getElementById("phone");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const continueBtn = document.getElementById("continueBtn");
const googleBtn = document.getElementById("googleBtn");

const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

const passwordMatch = document.getElementById("passwordMatch");

const onboardingScreen = document.getElementById("onboardingScreen");
const countryCode = document.getElementById("countryCode");
const otpModal = document.getElementById("otpModal");
const timer = document.getElementById("timer");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const resendBtn = document.getElementById("resendBtn");
const changeNumberBtn = document.getElementById("changeNumberBtn");
const otpInputs = document.querySelectorAll(".otp");
/*==================================
        GLOBALS
==================================*/

let currentUser = null;
let confirmationResult = null;
let recaptchaVerifier = null;
let verificationId = null;
let Seconds = 60;
let Interval = null;
/*==================================
    AUTOMATIC WELCOME CHAT
==================================*/

async function createWelcomeChat(user) {

    if (!user || !user.uid) return;

    try {

        /*
        --------------------------------
        FIND ADMIN UID
        --------------------------------
        */

        const adminsSnapshot =
            await get(ref(db, "admins"));

        if (!adminsSnapshot.exists()) {

            console.warn(
                "WELCOME CHAT: No admin found."
            );

            return;
        }

        const admins = adminsSnapshot.val();

        let adminUid = null;

        /*
        Supports:
        admins/UID
        admins/UID/uid
        */

        for (const key in admins) {

            const admin = admins[key];

            if (typeof admin === "object" && admin !== null) {

                if (
                    admin.uid ||
                    admin.userId
                ) {

                    adminUid =
                        admin.uid ||
                        admin.userId;

                    break;
                }

            } else {

                adminUid = key;
                break;

            }

        }

        if (!adminUid) {

            console.warn(
                "WELCOME CHAT: Admin UID not found."
            );

            return;
        }


        /*
        --------------------------------
        PREVENT DUPLICATE WELCOME
        --------------------------------
        */

        const userSnapshot =
            await get(
                ref(db, `users/${user.uid}/welcomeMessageSent`)
            );

        if (userSnapshot.exists() &&
            userSnapshot.val() === true) {

            console.log(
                "WELCOME CHAT: Already sent."
            );

            return;
        }


        /*
        --------------------------------
        CREATE STABLE CHAT ID
        --------------------------------
        */

        const chatId =
            [adminUid, user.uid]
                .sort()
                .join("_");


        const chatRef =
            ref(db, `chats/${chatId}`);


        /*
        --------------------------------
        CHECK EXISTING CHAT
        --------------------------------
        */

        const chatSnapshot =
            await get(chatRef);


        const now = Date.now();


        /*
        --------------------------------
        CREATE CHAT
        --------------------------------
        */

        if (!chatSnapshot.exists()) {

            await set(chatRef, {

                createdAt: now,

                lastMessage:
                  
                    "👋 Welcome to Nansubuga Corporate Affairs International Ltd,the love matching Company",

                lastMessageTime:
                    now,

                lastMessageStatus:
                    "sent",

                lastSender:
                    adminUid,

                participants: {

                    [adminUid]: true,

                    [user.uid]: true

                },

                unread: {

                    [adminUid]: 1,

                    [user.uid]: 0

                }

            });

        }


        /*
        --------------------------------
        ADD WELCOME MESSAGE
        --------------------------------
        */

        const messageRef =
            push(
                ref(
                    db,
                    `chats/${chatId}/messages`
                )
            );


        await set(
            messageRef,
            {

                sender:
                    adminUid,

                receiver:
                    user.uid,

                text:
                  
                    "👋 Welcome to Nansubuga Corporate Affairs International Limited! We're happy to have you here. If you need any help, we're available to assist you.",

                timestamp:
                    now,

                type:
                    "text",

                delivered:
                    true,

                read:
                    false

            }
        );


        /*
        --------------------------------
        MARK WELCOME AS SENT
        --------------------------------
        */

        await update(
            ref(db, `users/${user.uid}`),
            {

                welcomeMessageSent:
                    true,

                welcomeMessageSentAt:
                    now

            }
        );


        console.log(
            "WELCOME CHAT CREATED FOR:",
            user.uid
        );

    }

    catch(error) {

        console.error(
            "WELCOME CHAT ERROR:",
            error
        );

    }

}
/*==================================
        INITIALIZE
==================================*/

export function initAuth() {

    console.log("Initializing Authentication...");

    observeAuth();

    initializeUI();

}
  /*==================================
        AUTH OBSERVER
==================================*/
function observeAuth() {

    onAuthStateChanged(auth, async (user) => {

        currentUser = user;

        if (!user) {

            console.log("Guest User");

            if (authScreen)
                authScreen.classList.remove("hidden");

            if (onboardingScreen)
                onboardingScreen.classList.add("hidden");

            return;
        }

        console.log("Logged in:", user.uid);

        try {

            showLoading();

            const snapshot = await get(
                ref(db, "users/" + user.uid)
            );

            hideLoading();
if (!snapshot.exists()) {

    console.log("Waiting for user profile...");

    setTimeout(async () => {

        const retry = await get(ref(db, "users/" + user.uid));

        if (!retry.exists()) {
            console.error("User profile was not created.");
            return;
        }

        authScreen.classList.add("hidden");
        onboardingScreen.classList.remove("hidden");

    }, 1000);

    return;
}

            const userData = snapshot.val();

            if (userData.onboarding?.completed) {
                window.location.href = "index.html";
                return;
            }

            if (authScreen)
                authScreen.classList.add("hidden");

            if (onboardingScreen)
                onboardingScreen.classList.remove("hidden");

        } catch (error) {

            hideLoading();

            console.error(error);

            showToast("Failed to load account.", "error");

        }

    });

}
/*==================================
        INITIALIZE UI
==================================*/

function initializeUI() {

    initSwitch();
    initPasswordToggle();

}

/*==================================
        EMAIL / PHONE SWITCH
==================================*/

function initSwitch() {

    if (!emailTab || !phoneTab) return;

    emailTab.addEventListener("click", () => {

        emailTab.classList.add("active");
        phoneTab.classList.remove("active");

        emailGroup.classList.remove("hidden");
        phoneGroup.classList.add("hidden");

    });

    phoneTab.addEventListener("click", () => {

        phoneTab.classList.add("active");
        emailTab.classList.remove("active");

        phoneGroup.classList.remove("hidden");
        emailGroup.classList.add("hidden");

    });

}

/*==================================
        PASSWORD SHOW / HIDE
==================================*/

function initPasswordToggle() {

    togglePassword(
        "password",
        "togglePassword"
    );

    togglePassword(
        "confirmPassword",
        "toggleConfirmPassword"
    );

}

function togglePassword(inputId, buttonId) {

    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    if (!input || !button) return;

    button.addEventListener("click", () => {

        if (input.type === "password") {

            input.type = "text";

        } else {

            input.type = "password";

        }

    });

}
/*==================================
        PASSWORD STRENGTH
==================================*/

if (password) {
    password.addEventListener("input", checkPasswordStrength);
}

if (confirmPassword) {
    confirmPassword.addEventListener("input", checkPasswordMatch);
}

function checkPasswordStrength() {

    const value = password.value;
    let score = 0;

    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const percent = score * 20;

    strengthBar.style.width = percent + "%";

    if (score <= 2) {
        strengthBar.style.background = "#ff3b30";
        strengthText.textContent = "Weak Password";
    } else if (score <= 4) {
        strengthBar.style.background = "#ff9500";
        strengthText.textContent = "Medium Password";
    } else {
        strengthBar.style.background = "#34c759";
        strengthText.textContent = "Strong Password";
    }

}

function checkPasswordMatch() {

    if (confirmPassword.value === "") {
        passwordMatch.textContent = "";
        return;
    }

    if (password.value === confirmPassword.value) {
        passwordMatch.textContent = "✓ Passwords match";
        passwordMatch.style.color = "#34c759";
    } else {
        passwordMatch.textContent = "✗ Passwords do not match";
        passwordMatch.style.color = "#ff3b30";
    }

}
/*==================================
        USERNAME CHECK
==================================*/

let usernameTimer = null;
let usernameAvailable = false;

if (username) {

    username.addEventListener("input", () => {

        clearTimeout(usernameTimer);

        usernameTimer = setTimeout(checkUsername, 500);

    });

}

async function checkUsername() {

    const value = username.value.trim().toLowerCase();

    if (value.length < 4) {

        usernameStatus.textContent = "Minimum 4 characters";
        usernameStatus.style.color = "#ff3b30";
        usernameAvailable = false;

        return;

    }

    try {

        const snapshot = await get(ref(db, "usernames/" + value));

        if (snapshot.exists()) {

            usernameStatus.textContent = "❌ Username already taken";
            usernameStatus.style.color = "#ff3b30";
            usernameAvailable = false;

        } else {

            usernameStatus.textContent = "✅ Username available";
            usernameStatus.style.color = "#34c759";
            usernameAvailable = true;

        }

    } catch (error) {

        console.error(error);

        usernameStatus.textContent = "Unable to check username";
        usernameStatus.style.color = "#ff9500";

    }

}
function validateSignup() {

    if (!username.value.trim()) {
        showToast("Enter a username", "error");
        return false;
    }

    if (!usernameAvailable) {
        showToast("Choose another username", "error");
        return false;
    }

    if (!email.value.trim()) {
        showToast("Enter your email", "error");
        return false;
    }

    if (password.value !== confirmPassword.value) {
        showToast("Passwords do not match", "error");
        return false;
    }

    if (password.value.length < 8) {
        showToast("Password must be at least 8 characters", "error");
        return false;
    }

    return true;
}
/*==================================
        LOADING
==================================*/

function showLoading() {

    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }

}

function hideLoading() {

    if (loadingOverlay) {
        loadingOverlay.classList.add("hidden");
    }

}

/*==================================
        TOAST
==================================*/

function showToast(message, type = "success") {

    if (!toast) return;

    toast.textContent = message;

    toast.className = "show";

    if (type === "success") {
        toast.style.background = "#34c759";
    } else {
        toast.style.background = "#ff3b30";
    }

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}

/*==================================
        CONTINUE BUTTON
==================================*/

if (continueBtn) {

    continueBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        if (!phoneGroup.classList.contains("hidden")) {

            await send();

        } else {

            await registerUser();

        }

    });
await createWelcomeChat(user);
}

/*==================================
        REGISTER USER
==================================*/

async function registerUser() {

    if (!validateSignup()) return;

    try {

        showLoading();

        const usernameValue = username.value.trim().toLowerCase();
        const emailValue = email.value.trim();

        const methods = await fetchSignInMethodsForEmail(auth, emailValue);

        if (methods.length > 0) {

            hideLoading();
            showToast("Email already exists.", "error");
            return;

        }

        const credential = await createUserWithEmailAndPassword(
            auth,
            emailValue,
            password.value
        );

        const user = credential.user;

        await updateProfile(user, {
            displayName: username.value.trim()
        });

        await sendEmailVerification(user);

        await set(ref(db, "usernames/" + usernameValue), user.uid);


        await set(ref(db, "users/" + user.uid), {

            uid: user.uid,
            username: username.value.trim(),
            email: user.email,
            photoURL: "",
            createdAt: serverTimestamp(),
            lastActive: Date.now(),

            onboarding: {
                completed: false,
                step: 1
            }

        });

        hideLoading();

        showToast("Account created successfully!", "success");

        setTimeout(() => {

            authScreen.classList.add("hidden");
            onboardingScreen.classList.remove("hidden");

        }, 1000);

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "error");

    }

}

/*==================================
        GOOGLE SIGN IN
==================================*/

if (googleBtn) {

    googleBtn.addEventListener("click", signInWithGoogle);

}

async function signInWithGoogle() {

    try {

        showLoading();

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        const userRef = ref(db, "users/" + user.uid);

        const snapshot = await get(userRef);

        if (!snapshot.exists()) {

            const usernameValue = (
                user.displayName ||
                user.email.split("@")[0]
            ).replace(/\s+/g, "").toLowerCase();
            await set(userRef, {

    uid: user.uid,
    username: usernameValue,
    email: user.email,
    photoURL: user.photoURL || "",
    createdAt: serverTimestamp(),
    lastActive: Date.now(),

    onboarding: {
        completed: false,
        step: 1
    }

});

            await set(ref(db, "usernames/" + usernameValue), user.uid);
           await updateProfile(user, {
    displayName: usernameValue
});
        }

        hideLoading();

        showToast("Welcome " + (user.displayName || "User"), "success");

        setTimeout(() => {

            authScreen.classList.add("hidden");
            onboardingScreen.classList.remove("hidden");

        }, 1000);

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "error");

    }

}

/*==================================
        RECAPTCHA
==================================*/
function initializeRecaptcha() {

    if (recaptchaVerifier) return;

    recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
            size: "invisible"
        }
    );

}
/*==================================
        SEND 
==================================*/

async function send() {

    try {

        const userName = username.value.trim();
        const phoneNumber = countryCode.value + phone.value.trim();

        if (!userName) {
            showToast("Enter a username", "error");
            return;
        }

        if (!phone.value.trim()) {
            showToast("Enter your phone number", "error");
            return;
        }

        if (password.value.length < 8) {
            showToast("Password must be at least 8 characters", "error");
            return;
        }

        if (password.value !== confirmPassword.value) {
            showToast("Passwords do not match", "error");
            return;
        }

        showLoading();

        initializeRecaptcha();

        confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );

        hideLoading();

        showToast("Verification code sent.", "success");

        openModal();

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "error");

    }

}
/*==================================
        OPEN  MODAL
==================================*/


function openModal() {

    otpModal.classList.remove("hidden");

    otpInputs.forEach(input => input.value = "");

    otpInputs[0].focus();

    startTimer();

}


/*==================================
        START  TIMER
==================================*/

function startTimer() {

    Seconds = 60;

    timer.textContent = Seconds;

    resendBtn.disabled = true;

    if (Interval) {

        clearInterval(Interval);

    }

    Interval = setInterval(() => {

        Seconds--;

        timer.textContent = Seconds;

        if (Seconds <= 0) {

            clearInterval(Interval);

            resendBtn.disabled = false;

            timer.textContent = "0";

        }

    }, 1000);

}
/*==================================
         INPUTS
==================================*/
/*==================================
         INPUTS
==================================*/

otpInputs.forEach((input, index) => {

    input.addEventListener("input", (e) => {

        e.target.value = e.target.value.replace(/\D/g, "");

        if (e.target.value && index < otpInputs.length - 1) {

            otpInputs[index + 1].focus();

        }

    });

    input.addEventListener("keydown", (e) => {

        if (e.key === "Backspace" &&
            !input.value &&
            index > 0) {

            otpInputs[index - 1].focus();

        }

    });

});
/*==================================
        CHANGE NUMBER
==================================*/

function changeNumber() {

    if (Interval) {

        clearInterval(Interval);

    }

    otpModal.classList.add("hidden");

    otpInputs.forEach(input => input.value = "");

    phone.focus();

}

changeNumberBtn.addEventListener("click", changeNumber);
/*==================================
        RESEND 
==================================*/

async function resend() {

    if (resendBtn.disabled) return;

    try {

        showLoading();

        initializeRecaptcha();

        const phoneNumber =
            countryCode.value + phone.value.trim();

        confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );

        hideLoading();

        showToast("New verification code sent.", "success");

        startTimer();

       otpInputs.forEach(input => input.value = "");

        otpInputs[0].focus();

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "error");

    }

}

resendBtn.addEventListener("click", resend);

/*==================================
        VERIFY
==================================*/

async function verify() {

    try {

        const code = Array.from(otpInputs)
            .map(input => input.value)
            .join("");

        if (code.length !== 6) {

            showToast("Enter the complete 6-digit code", "error");
            return;

        }

        if (!confirmationResult) {

            showToast("Please request a verification code first.", "error");
            return;

        }

        showLoading();

        const result = await confirmationResult.confirm(code);

        const user = result.user;

        const userRef = ref(db, "users/" + user.uid);

        const snapshot = await get(userRef);

        if (!snapshot.exists()) {

            const usernameValue = username.value.trim().toLowerCase();

            // Save username lookup
            await set(
                ref(db, "usernames/" + usernameValue),
                user.uid
            );

            // Save phone lookup
            await set(
                ref(db, "phones/" + user.phoneNumber),
                user.uid
            );

            // Save user profile
            await set(userRef, {

                uid: user.uid,
                username: username.value.trim(),
                phone: user.phoneNumber,
                email: "",
                photoURL: "",
                createdAt: serverTimestamp(),
                lastActive: Date.now(),

                onboarding: {
                    completed: false,
                    step: 1
                }

            });

        }

        hideLoading();

        if (Interval) {
            clearInterval(Interval);
        }

        otpModal.classList.add("hidden");

        authScreen.classList.add("hidden");

        onboardingScreen.classList.remove("hidden");

        showToast("Phone verified successfully!", "success");

    } catch (error) {

        hideLoading();

        console.error(error);

        showToast(error.message, "error");

    }

}


verifyOtpBtn.addEventListener("click", verify);
otpInputs[0].addEventListener("paste", (e) => {

    e.preventDefault();

    const data = e.clipboardData.getData("text").replace(/\D/g, "");

    if (data.length === 6) {

        data.split("").forEach((digit, index) => {

            otpInputs[index].value = digit;

        });

        otpInputs[5].focus();

    }

});
const form = document.getElementById("signupForm");

form.addEventListener("submit", (e) => {
    if (!document.getElementById("terms").checked) {
        e.preventDefault();
        alert("You must agree to the Terms of Service and Privacy Policy.");
    }
});