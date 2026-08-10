/*==================================
            APP.JS
==================================*/
import { initAuth } from "./auth.js";
import { app, auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    IMGBB_API_KEY,
    MAX_PHOTOS,
    MAX_IMAGE_SIZE,
    ALLOWED_IMAGE_TYPES,
    UPLOAD_MESSAGES
} from "./config.js";

import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
    getMessaging,
    getToken,
    onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
/*==================================
            DOM
==================================*/

const splashScreen = document.getElementById("splashScreen");
const authScreen = document.getElementById("authScreen");
const onboardingScreen = document.getElementById("onboardingScreen");

const uploadArea = document.getElementById("uploadArea");
const photoInput = document.getElementById("photoInput");
const photoGrid = document.getElementById("photoGrid");
const continuePhotoBtn = document.getElementById("continuePhotoBtn");

const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressBar = document.getElementById("uploadProgressBar");
const toast = document.getElementById("toast");

/*==================================
            GLOBALS
==================================*/

let uploadedPhotos = [];
let currentStep = 1;

/*==================================
            INITIALIZE APP
==================================*/

document.addEventListener("DOMContentLoaded", () => {

    console.log("Dating App Started");

    if (continuePhotoBtn) {
        continuePhotoBtn.disabled = true;
    }

    setTimeout(() => {

        if (splashScreen) {
            splashScreen.classList.add("hidden");
        }

        if (authScreen) {
            authScreen.classList.remove("hidden");
        }

        initAuth();

onAuthStateChanged(auth, user => {

    if(user){

        console.log(
            "FCM: USER LOGGED IN",
            user.uid
        );

        setupPushNotifications();

    }

});

setTimeout(loadOnboardingStep, 1500);

    }, 2000);

});

/*==================================
            TOAST
==================================*/

function showToast(message) {

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}
/*==================================
        PHOTO PICKER
==================================*/

if (uploadArea && photoInput) {

    uploadArea.addEventListener("click", () => {
        photoInput.click();
    });

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragging");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragging");
    });

    uploadArea.addEventListener("drop", (e) => {

        e.preventDefault();

        uploadArea.classList.remove("dragging");

        handleFiles([...e.dataTransfer.files]);

    });

    photoInput.addEventListener("change", (e) => {

        handleFiles([...e.target.files]);

        photoInput.value = "";

    });

}

/*==================================
        HANDLE FILES
==================================*/

async function handleFiles(files) {

    if (!files.length) return;

    for (const file of files) {

        if (uploadedPhotos.length >= MAX_PHOTOS) {
            showToast(UPLOAD_MESSAGES.MAX_REACHED);
            break;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showToast(UPLOAD_MESSAGES.INVALID_TYPE);
            continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            showToast(UPLOAD_MESSAGES.TOO_LARGE);
            continue;
        }

        await uploadPhoto(file);

    }

}

/*==================================
        CREATE PHOTO CARD
==================================*/
function addPhotoCard(imageUrl) {

    const card = document.createElement("div");
    card.className = "photo-card";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.loading = "lazy";
    img.alt = "Photo";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-photo";
    removeBtn.type = "button";
    removeBtn.innerHTML = "✕";

    removeBtn.onclick = () => {

        uploadedPhotos = uploadedPhotos.filter(url => url !== imageUrl);

        card.remove();

        continuePhotoBtn.disabled = uploadedPhotos.length === 0;

    };

    card.append(img, removeBtn);

    photoGrid.appendChild(card);

}
/*==================================
        UPLOAD PHOTO
==================================*/

async function uploadPhoto(file) {

    try {

        showToast(UPLOAD_MESSAGES.UPLOADING);

        if (uploadProgress) {
            uploadProgress.style.display = "block";
        }

        if (uploadProgressBar) {
            uploadProgressBar.style.width = "10%";
        }

        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            {
                method: "POST",
                body: formData
            }
        );

        if (uploadProgressBar) {
            uploadProgressBar.style.width = "60%";
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error("Upload failed.");
        }

        const imageUrl = result.data.url;

        uploadedPhotos.push(imageUrl);

        addPhotoCard(imageUrl);

        if (continuePhotoBtn) {
            continuePhotoBtn.disabled = uploadedPhotos.length === 0;
        }

        if (uploadProgressBar) {
            uploadProgressBar.style.width = "100%";
        }

        showToast(UPLOAD_MESSAGES.SUCCESS);

        setTimeout(() => {

            if (uploadProgress) {
                uploadProgress.style.display = "none";
            }

            if (uploadProgressBar) {
                uploadProgressBar.style.width = "0%";
            }

        }, 800);

    } catch (error) {

        console.error(error);

        showToast(UPLOAD_MESSAGES.FAILED);

        if (uploadProgress) {
            uploadProgress.style.display = "none";
        }

        if (uploadProgressBar) {
            uploadProgressBar.style.width = "0%";
        }

    }

}

/*==================================
        SAVE PHOTOS
==================================*/

async function savePhotosToFirebase() {

    if (!auth.currentUser) return;

    try {

        await update(
            ref(db, `users/${auth.currentUser.uid}`),
            {
                photos: uploadedPhotos
            }
        );

        console.log("Photos saved.");

    } catch (error) {

        console.error(error);
        showToast("Failed to save photos.");

    }

}
async function loadOnboardingStep() {

    if (!auth.currentUser) return;

    const snapshot = await get(
        ref(db, `users/${auth.currentUser.uid}`)
    );

    if (!snapshot.exists()) return;

    const step = snapshot.val().onboarding?.step || 1;

    showStep(step);

}function showStep(step){

    currentStep = step;

    document.querySelectorAll(".step").forEach(section=>{
        section.classList.remove("active");
    });

    const page = document.getElementById(`step${step}`);

    if(page){
        page.classList.add("active");
    }

    const progress = document.getElementById("progressFill");
    const text = document.getElementById("progressText");

    if(progress){
        progress.style.width = `${(step/8)*100}%`;
    }

    if(text){
        text.textContent = `Step ${step} of 8`;
    }

    // STEP 8 MAP FIX
    if(step === 8){

        setTimeout(() => {

            if(!map){

                initializeMap();

            }else{

                map.invalidateSize();

            }

        },400);

    }

}
/*==================================
        STEP 2
==================================*/

const continueStep2 = document.getElementById("continueStep2");

if (continueStep2) {

    continueStep2.addEventListener("click", savePersonalInformation);

}

async function savePersonalInformation() {

    if (!auth.currentUser) return;

    const personalInfo = {

        fullName: document.getElementById("fullName").value.trim(),
        gender: document.getElementById("gender").value,
        age: document.getElementById("age").value,
        dateOfBirth: document.getElementById("dateOfBirth").value,
        phoneNumber: document.getElementById("phoneNumber").value.trim(),
        nationality: document.getElementById("nationality").value.trim(),
        country: document.getElementById("country").value.trim(),
        tribe: document.getElementById("tribe").value.trim(),
        religion: document.getElementById("religion").value,
        occupation: document.getElementById("occupation").value.trim(),
        education: document.getElementById("education").value,
        children: document.getElementById("children").value,
        origin: document.getElementById("origin").value.trim(),
        homeAddress: document.getElementById("homeAddress").value.trim()

    };

    if (
        !personalInfo.fullName ||
        !personalInfo.gender ||
        !personalInfo.age ||
        !personalInfo.dateOfBirth
    ) {

        showToast("Please complete the required fields.");
        return;

    }

    try {

        await update(
            ref(db, `users/${auth.currentUser.uid}`),
            {

                personalInformation: personalInfo,

                onboarding: {

                    completed: false,
                    step: 3

                }

            }
        );

        showToast("Personal information saved.");

        showStep(3);

    } catch (error) {

        console.error(error);

        showToast("Failed to save personal information.");

    }

}
/*==================================
        CONTINUE BUTTON
==================================*/
continuePhotoBtn.addEventListener("click", async () => {

    if (uploadedPhotos.length === 0) {
        showToast("Please upload at least one photo.");
        return;
    }

    await savePhotosToFirebase();
    await update(
    ref(db, `users/${auth.currentUser.uid}`),
    {
        onboarding: {
            completed: false,
            step: 2
        }
    }
);
showToast("Photos saved.");

showStep(2);
});

/*==================================
      STEP 3 VERIFICATION
==================================*/

const submitVerification = document.getElementById("submitVerification");

if (submitVerification) {
    submitVerification.addEventListener("click", submitIdentityVerification);
}

async function uploadVerificationImage(file) {

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
            method: "POST",
            body: formData
        }
    );

    const result = await response.json();

    if (!result.success) {
        throw new Error("Upload failed");
    }

    return result.data.url;
}

async function submitIdentityVerification() {

    if (!auth.currentUser) return;

    const front = document.getElementById("idFront").files[0];
    const back = document.getElementById("idBack").files[0];
    const selfie = document.getElementById("selfie").files[0];
    const selfieWithId = document.getElementById("selfieWithId").files[0];
    const confirm = document.getElementById("confirmIdentity").checked;

    if (!front || !back || !selfie || !selfieWithId || !confirm) {
        showToast("Please complete identity verification.");
        return;
    }

    try {

        showToast("Uploading verification documents...");

        const frontUrl = await uploadVerificationImage(front);
        const backUrl = await uploadVerificationImage(back);
        const selfieUrl = await uploadVerificationImage(selfie);
        const selfieWithIdUrl = await uploadVerificationImage(selfieWithId);

        await update(
            ref(db, `users/${auth.currentUser.uid}`),
            {
                verification: {
                    idFront: frontUrl,
                    idBack: backUrl,
                    selfie: selfieUrl,
                    selfieWithId: selfieWithIdUrl,
                    status: "pending",
                    submittedAt: Date.now()
                },

                onboarding: {
                    completed: false,
                    step: 4
                }
            }
        );

        showToast("Verification submitted successfully.");

        showStep(4);

    } catch (error) {

        console.error(error);

        showToast("Verification upload failed.");

    }
}
/*==================================
        STEP 4 - ABOUT YOURSELF
==================================*/

const continueStep4 = document.getElementById("continueStep4");

if (continueStep4) {
    continueStep4.addEventListener("click", saveAboutYourself);
}

async function saveAboutYourself() {

    if (!auth.currentUser) return;

    const about = {

        bio: document.getElementById("bio").value.trim(),
        height: document.getElementById("height").value,
        relationshipStatus: document.getElementById("relationshipStatus").value,
        languages: document.getElementById("languages").value.trim(),
        smoking: document.getElementById("smoking").value,
        drinking: document.getElementById("drinking").value,
        quote: document.getElementById("quote").value.trim()

    };

    if (
        !about.bio ||
        !about.relationshipStatus ||
        !about.languages
    ) {

        showToast("Please complete your profile.");
        return;

    }

    try {

        await update(
            ref(db, `users/${auth.currentUser.uid}`),
            {

                about,

                onboarding: {

                    completed: false,
                    step: 5

                }

            }
        );

        showToast("About yourself saved.");

        showStep(5);

    } catch (error) {

        console.error(error);

        showToast("Failed to save profile.");

    }

}
/*==================================
        STEP 5 - INTERESTS
==================================*/

const continueStep5 = document.getElementById("continueStep5");
const interestTags = document.querySelectorAll(".interest-tag");

let selectedInterests = [];

// Select/Deselect interests
interestTags.forEach(tag => {

    tag.addEventListener("click", () => {

        tag.classList.toggle("active");

        const interest = tag.textContent.trim();

        if (selectedInterests.includes(interest)) {

            selectedInterests =
                selectedInterests.filter(i => i !== interest);

        } else {

            selectedInterests.push(interest);

        }

    });

});

if (continueStep5) {

    continueStep5.addEventListener("click", saveInterests);

}

async function saveInterests() {

    if (!auth.currentUser) return;

    if (selectedInterests.length === 0) {

        showToast("Please select at least one interest.");

        return;

    }

    const interests = {

        selected: selectedInterests,
        musicGenre: document.getElementById("musicGenre").value,
        favoriteFood: document.getElementById("favoriteFood").value.trim(),
        weekendActivity: document.getElementById("weekendActivity").value.trim()

    };

    try {

        await update(
            ref(db, `users/${auth.currentUser.uid}`),
            {

                interests,

                onboarding: {

                    completed: false,
                    step: 6

                }

            }
        );

        showToast("Interests saved.");

        showStep(6);

    } catch (error) {

        console.error(error);

        showToast("Failed to save interests.");

    }

}
/*==================================
        STEP 6 - MATCH PREFERENCES
==================================*/

const continueStep6 = document.getElementById("continueStep6");
const dealBreakerTags = document.querySelectorAll(".deal-breaker");

let selectedDealBreakers = [];

/* Deal Breakers */

dealBreakerTags.forEach(tag => {

    tag.onclick = () => {

        tag.classList.toggle("active");

        const value = tag.textContent.trim();

        if (tag.classList.contains("active")) {

            if (!selectedDealBreakers.includes(value)) {
                selectedDealBreakers.push(value);
            }

        } else {

            selectedDealBreakers =
                selectedDealBreakers.filter(item => item !== value);

        }

    };

});

/* Continue */

if (continueStep6) {

    continueStep6.addEventListener("click", savePreferences);

}

async function savePreferences() {

    if (!auth.currentUser) return;

    const preferences = {

        lookingFor: document.getElementById("lookingFor").value,
        preferredGender: document.getElementById("preferredGender").value,

        minAge: document.getElementById("minAge").value,
        maxAge: document.getElementById("maxAge").value,

        preferredNationality: document.getElementById("preferredNationality").value.trim(),
        preferredCountry: document.getElementById("preferredCountry").value.trim(),
        preferredTribe: document.getElementById("preferredTribe").value.trim(),

        preferredReligion: document.getElementById("preferredReligion").value,
        preferredEducation: document.getElementById("preferredEducation").value,

        preferredOccupation: document.getElementById("preferredOccupation").value.trim(),

        minHeight: document.getElementById("minHeight").value,
        maxHeight: document.getElementById("maxHeight").value,

        preferredAppearance: document.getElementById("preferredAppearance").value,
        preferredComplexion: document.getElementById("preferredComplexion").value,

        preferredChildren: document.getElementById("preferredChildren").value,

        acceptSmoking: document.getElementById("acceptSmoking").value,
        acceptDrinking: document.getElementById("acceptDrinking").value,

        distance: document.getElementById("distance").value,

        dealBreakers: selectedDealBreakers

    };

    /* Validation */

    if (!preferences.lookingFor) {

        showToast("Please select what you're looking for.");
        return;

    }

    if (!preferences.preferredGender) {

        showToast("Please choose your preferred gender.");
        return;

    }

    if (
        preferences.minAge &&
        preferences.maxAge &&
        Number(preferences.minAge) >
        Number(preferences.maxAge)
    ) {

        showToast("Age range is invalid.");
        return;

    }

    try {

        await update(

            ref(db, `users/${auth.currentUser.uid}`),

            {

                preferences,

                onboarding: {

                    completed: false,

                    step: 7

                }

            }

        );

        showToast("Match preferences saved.");

        showStep(7);

    } catch (error) {

        console.error(error);

        showToast("Failed to save preferences.");

    }

}
/*==================================
        STEP 7 - NEXT OF KIN
==================================*/

const continueStep7 = document.getElementById("continueStep7");

if (continueStep7) {
    continueStep7.addEventListener("click", saveNextOfKin);
}

async function saveNextOfKin() {

    if (!auth.currentUser) return;

    const nextOfKin = {

        fullName: document.getElementById("kinName").value.trim(),
        relationship: document.getElementById("kinRelationship").value,
        phone: document.getElementById("kinPhone").value.trim(),
        alternativePhone: document.getElementById("kinAltPhone").value.trim(),
        email: document.getElementById("kinEmail").value.trim(),
        country: document.getElementById("kinCountry").value.trim(),
        district: document.getElementById("kinDistrict").value.trim(),
        address: document.getElementById("kinAddress").value.trim(),
        occupation: document.getElementById("kinOccupation").value.trim(),
        consent: document.getElementById("kinConsent").checked

    };

    /* Validation */

    if (
        !nextOfKin.fullName ||
        !nextOfKin.relationship ||
        !nextOfKin.phone ||
        !nextOfKin.country ||
        !nextOfKin.district ||
        !nextOfKin.address
    ) {

        showToast("Please complete all required fields.");
        return;

    }

    if (!nextOfKin.consent) {

        showToast("Please confirm you have permission.");

        return;

    }

    try {

        await update(

            ref(db, `users/${auth.currentUser.uid}`),

            {

                nextOfKin,

                onboarding: {

                    completed: false,

                    step: 8

                }

            }

        );

        showToast("Next of kin saved.");

        showStep(8);

    } catch (error) {

        console.error(error);

        showToast("Failed to save next of kin.");

    }

}
/*==================================
        STEP 8 - LOCATION
==================================*/

let map = null;
let homeMarker = null;
let currentMarker = null;

let currentLocation = null;
let homeLocation = null;

const getCurrentLocationBtn = document.getElementById("getCurrentLocation");
const finishRegistrationBtn = document.getElementById("finishRegistration");
const locationStatus = document.getElementById("locationStatus");

/* Initialize Map */

function initializeMap() {

    if (map) return;

    map = L.map("homeMap").setView([1.3733, 32.2903], 7);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(map);

    map.on("click", function(e){

        if(homeMarker){
            map.removeLayer(homeMarker);
        }

        homeMarker = L.marker(e.latlng).addTo(map);

        homeLocation = {

            latitude: e.latlng.lat,
            longitude: e.latlng.lng

        };

        showToast("✅ Home of Origin selected.");

    });

    setTimeout(()=>{
        map.invalidateSize();
    },300);

}

/* Load map immediately */



/* Current Location */

if(getCurrentLocationBtn){

    getCurrentLocationBtn.onclick = getCurrentLocation;

}

function getCurrentLocation(){

    if(!navigator.geolocation){

        showToast("Geolocation is not supported.");

        return;

    }

    locationStatus.innerHTML = "Getting your current location...";

    navigator.geolocation.getCurrentPosition(

        function(position){

            currentLocation = {

                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()

            };

            locationStatus.innerHTML =
            "✅ Current location captured.";

            map.setView(
                [
                    currentLocation.latitude,
                    currentLocation.longitude
                ],
                15
            );

            if(currentMarker){

                map.removeLayer(currentMarker);

            }

            currentMarker = L.marker(
                [
                    currentLocation.latitude,
                    currentLocation.longitude
                ]
            ).addTo(map);

            currentMarker.bindPopup("Your Current Location")
            .openPopup();

        },

        function(error){

            locationStatus.innerHTML = "";

            switch(error.code){

                case error.PERMISSION_DENIED:
                    showToast("Location permission denied.");
                    break;

                case error.POSITION_UNAVAILABLE:
                    showToast("Location unavailable.");
                    break;

                case error.TIMEOUT:
                    showToast("Location request timed out.");
                    break;

                default:
                    showToast(error.message);

            }

            console.log(error);

        },

        {

            enableHighAccuracy:true,
            timeout:15000,
            maximumAge:0

        }

    );

}

/* Finish */

if(finishRegistrationBtn){

    finishRegistrationBtn.onclick = finishOnboarding;

}

async function finishOnboarding(){

    if(!auth.currentUser) return;

    if(!currentLocation){

        showToast("Please use your current location.");

        return;

    }

    if(!homeLocation){

        showToast("Please tap the map and choose your Home of Origin.");

        return;

    }

    try{

        await update(

            ref(db,`users/${auth.currentUser.uid}`),

            {

                location:{

                    current:currentLocation,

                    home:{

                        latitude:homeLocation.latitude,
                        longitude:homeLocation.longitude,
                        visibility:"owner_admin_only"

                    },

                    privacy:{

                        currentLocation:document.getElementById("locationPrivacy").value,

                        homeLocation:"owner_admin_only"

                    }

                },

                onboarding:{

                    completed:true,

                    step:8,

                    completedAt:Date.now()

                }

            }

        );

        showToast("Registration completed.");

        setTimeout(()=>{

            window.location.href="index.html";

        },1000);

    }catch(error){

        console.error(error);

        showToast("Failed to complete registration.");

    }

}
/*==================================
        FCM PUSH NOTIFICATIONS
==================================*/

async function setupPushNotifications(){

    try{

        if(
            !("Notification" in window)
        ){

            console.log(
                "Notifications are not supported."
            );

            return;

        }


        if(
            !("serviceWorker" in navigator)
        ){

            console.log(
                "Service workers are not supported."
            );

            return;

        }


        /*==================================
            REQUEST NOTIFICATION PERMISSION
        ==================================*/

        const permission =
            await Notification.requestPermission();


        if(permission !== "granted"){

            console.log(
                "Notification permission denied."
            );

            return;

        }


        console.log(
            "Notification permission granted."
        );


        /*==================================
            REGISTER FCM SERVICE WORKER
        ==================================*/

        const registration =
            await navigator.serviceWorker.register(
                "/firebase-messaging-sw.js"
            );


        console.log(
            "FCM SERVICE WORKER REGISTERED",
            registration
        );


        /*==================================
            FIREBASE MESSAGING
        ==================================*/

        const messaging =
            getMessaging(app);


        /*==================================
            GET DEVICE TOKEN
        ==================================*/

        const token =
            await getToken(

                messaging,

                {

                    vapidKey:
    "BB2y10iEKDxZRLEc_vSBH3uQp7NIVS2Ycnp4FUYHx-EW1fEC_puVHhXWXQKV_eC5s9U_huhhBAW9_IgqXvovK-4",
                      

                    serviceWorkerRegistration:
                        registration

                }

            );


        if(!token){

            console.log(
                "FCM token was not generated."
            );

            return;

        }


        console.log(
            "FCM TOKEN:",
            token
        );


        /*==================================
            SAVE TOKEN TO USER
        ==================================*/

        if(auth.currentUser){

            await update(

                ref(
                    db,
                    "users/" +
                    auth.currentUser.uid
                ),

                {

                    fcmToken:
                        token,

                    fcmUpdatedAt:
                        Date.now()

                }

            );


            console.log(
                "FCM TOKEN SAVED TO FIREBASE."
            );

        }


        /*==================================
            FOREGROUND MESSAGE
        ==================================*/

        onMessage(

            messaging,

            payload => {

                console.log(
                    "FCM FOREGROUND MESSAGE:",
                    payload
                );

            }

        );

    }

    catch(error){

        console.error(
            "FCM SETUP ERROR:",
            error
        );

    }

}