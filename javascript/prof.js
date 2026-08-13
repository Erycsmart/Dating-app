/*=========================================================
        SETTINGS.JS
        PHASE 1 — AUTH + FIREBASE + PROFILE LOADING
=========================================================*/


/*=========================================================
        FIREBASE
=========================================================*/

import {
    auth,
    db
} from "./firebase.js";


import {
    onAuthStateChanged,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    ref,
    get,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";



/*=========================================================
        DOM
=========================================================*/


const backBtn =
    document.getElementById("backBtn");


const printProfileBtn =
    document.getElementById("printProfileBtn");


const privacyBtn =
    document.getElementById("privacyBtn");


const verificationBtn =
    document.getElementById("verificationBtn");


const supportBtn =
    document.getElementById("supportBtn");


const logoutBtn =
    document.getElementById("logoutBtn");


const deleteAccountBtn =
    document.getElementById("deleteAccountBtn");


/*=========================================================
        PROFILE MODAL
=========================================================*/


const profileModal =
    document.getElementById("profileModal");


const closeProfileModal =
    document.getElementById("closeProfileModal");


const printProfileAction =
    document.getElementById("printProfileAction");


const downloadProfileBtn =
    document.getElementById("downloadProfileBtn");


/*=========================================================
        PRIVACY MODAL
=========================================================*/


const privacyModal =
    document.getElementById("privacyModal");


const closePrivacyModal =
    document.getElementById("closePrivacyModal");


const savePrivacyBtn =
    document.getElementById("savePrivacyBtn");


/*=========================================================
        LOGOUT MODAL
=========================================================*/


const logoutModal =
    document.getElementById("logoutModal");


const cancelLogout =
    document.getElementById("cancelLogout");


const confirmLogout =
    document.getElementById("confirmLogout");


/*=========================================================
        DELETE MODAL
=========================================================*/


const deleteAccountModal =
    document.getElementById("deleteAccountModal");


const cancelDelete =
    document.getElementById("cancelDelete");


const confirmDelete =
    document.getElementById("confirmDelete");


/*=========================================================
        VERIFICATION STATUS
=========================================================*/


const verificationStatus =
    document.getElementById("verificationStatus");


/*=========================================================
        GLOBAL USER DATA
=========================================================*/


let currentUser = null;

let currentUserData = null;



/*=========================================================
        START SETTINGS
=========================================================*/


document.addEventListener(
    "DOMContentLoaded",
    startSettings
);



/*=========================================================
        AUTHENTICATION
=========================================================*/


function startSettings() {

    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                window.location.href =
                    "login.html";

                return;

            }


            currentUser = user;


            await loadCurrentUser();

        }
    );

}



/*=========================================================
        LOAD CURRENT USER
=========================================================*/


async function loadCurrentUser() {

    if (!currentUser) return;


    try {

        const snapshot =
            await get(
                ref(
                    db,
                    "users/" +
                    currentUser.uid
                )
            );


        if (!snapshot.exists()) {

            console.error(
                "USER PROFILE NOT FOUND"
            );

            return;

        }


        currentUserData =
            snapshot.val() || {};


        updateVerificationStatus(
            currentUserData
        );


        console.log(
            "SETTINGS USER LOADED:",
            currentUserData
        );


    }

    catch (error) {

        console.error(
            "SETTINGS LOAD ERROR:",
            error
        );

        showToast(
            "Unable to load your profile."
        );

    }

}



/*=========================================================
        VERIFICATION STATUS
=========================================================*/


function updateVerificationStatus(user) {

    if (!verificationStatus) return;


    const status =
        user?.verification?.status;


    if (status === "approved" ||
        status === "verified") {

        verificationStatus.textContent =
            "Verified account";

        verificationStatus.className =
            "verified";

        return;

    }


    if (status === "pending") {

        verificationStatus.textContent =
            "Verification submitted — pending review";

        verificationStatus.className =
            "pending";

        return;

    }


    if (status === "rejected") {

        verificationStatus.textContent =
            "Verification was rejected";

        verificationStatus.className =
            "rejected";

        return;

    }


    verificationStatus.textContent =
        "Identity verification not completed";

    verificationStatus.className =
        "";

}



/*=========================================================
        BACK BUTTON
=========================================================*/


backBtn?.addEventListener(
    "click",
    () => {

        if (
            window.history.length > 1
        ) {

            window.history.back();

        }

        else {

            window.location.href =
                "index.html";

        }

    }
);



/*=========================================================
        OPEN PROFILE
=========================================================*/


printProfileBtn?.addEventListener(
    "click",
    async () => {

        await loadProfileIntoPrint();

        openModal(
            profileModal
        );

    }
);



/*=========================================================
        CLOSE PROFILE
=========================================================*/


closeProfileModal?.addEventListener(
    "click",
    () => {

        closeModal(
            profileModal
        );

    }
);



/*=========================================================
        PROFILE OVERLAY CLICK
=========================================================*/


profileModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            profileModal
        ) {

            closeModal(
                profileModal
            );

        }

    }
);



/*=========================================================
        GENERIC OPEN MODAL
=========================================================*/


function openModal(modal) {

    if (!modal) return;


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}



/*=========================================================
        GENERIC CLOSE MODAL
=========================================================*/


function closeModal(modal) {

    if (!modal) return;


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );

}



/*=========================================================
        LOAD PROFILE INTO PRINT DOCUMENT
=========================================================*/


async function loadProfileIntoPrint() {

    if (!currentUser) return;


    try {

        const snapshot =
            await get(
                ref(
                    db,
                    "users/" +
                    currentUser.uid
                )
            );


        if (!snapshot.exists()) {

            showToast(
                "Profile information not found."
            );

            return;

        }


        currentUserData =
            snapshot.val() || {};


        fillPrintProfile(
            currentUserData
        );


    }

    catch (error) {

        console.error(
            "PRINT PROFILE LOAD ERROR:",
            error
        );

        showToast(
            "Unable to load profile."
        );

    }

}



/*=========================================================
        HELPER — SET TEXT
=========================================================*/


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) return;


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        element.textContent =
            "—";

        return;

    }


    element.textContent =
        String(value);

}



/*=========================================================
        FORMAT DATE
=========================================================*/


function formatDate(value) {

    if (!value) return "—";


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}



/*=========================================================
        END PHASE 1
=========================================================*/
/*=========================================================
        PHASE 2 — FILL PRINT PROFILE
=========================================================*/


/*=========================================================
        FILL COMPLETE PROFILE
=========================================================*/

function fillPrintProfile(user) {

    const info =
        user.personalInformation || {};

    const about =
        user.about || {};

    const interests =
        user.interests || {};

    const preferences =
        user.preferences || {};

    const nextOfKin =
        user.nextOfKin || {};

    const location =
        user.location || {};

    const verification =
        user.verification || {};


    /*=====================================================
            PERSONAL INFORMATION
    =====================================================*/

    setText(
        "printFullName",
        info.fullName ||
        user.username ||
        "Member"
    );


    setText(
        "printName",
        info.fullName
    );


    setText(
        "printAge",
        info.age
    );


    setText(
        "printDateOfBirth",
        formatDate(info.dateOfBirth)
    );


    setText(
        "printGender",
        info.gender
    );


    setText(
        "printPhone",
        info.phoneNumber
    );


    setText(
        "printNationality",
        info.nationality
    );


    setText(
        "printCountry",
        info.country
    );


    setText(
        "printTribe",
        info.tribe
    );


    setText(
        "printReligion",
        info.religion
    );


    setText(
        "printOccupation",
        info.occupation
    );


    setText(
        "printEducation",
        info.education
    );


    setText(
        "printChildren",
        info.children
    );


    setText(
        "printHivStatus",
        info.hivStatus
    );


    setText(
        "printHomeAddress",
        info.homeAddress
    );


    /*=====================================================
            HOME OF ORIGIN
    =====================================================*/

    const origin =
        info.originLocation ||
        info.origin ||
        location.home;


    if (
        origin &&
        typeof origin === "object"
    ) {

        const latitude =
            origin.latitude;


        const longitude =
            origin.longitude;


        if (
            latitude !== undefined &&
            longitude !== undefined
        ) {

            setText(
                "printOrigin",
                `${latitude}, ${longitude}`
            );


            setText(
                "printHomeOrigin",
                `${latitude}, ${longitude}`
            );

        }

    }

    else if (typeof origin === "string") {

        setText(
            "printOrigin",
            origin
        );


        setText(
            "printHomeOrigin",
            origin
        );

    }



    /*=====================================================
            ABOUT ME
    =====================================================*/

    setText(
        "printAbout",
        about.bio
    );


    setText(
        "printHeight",
        about.height
    );


    setText(
        "printRelationshipStatus",
        about.relationshipStatus
    );


    setText(
        "printLanguages",
        about.languages
    );


    setText(
        "printSmoking",
        about.smoking
    );


    setText(
        "printDrinking",
        about.drinking
    );


    setText(
        "printQuote",
        about.quote
    );



    /*=====================================================
            INTERESTS
    =====================================================*/

    renderInterests(
        interests.selected
    );


    setText(
        "printMusicGenre",
        interests.musicGenre
    );


    setText(
        "printFavoriteFood",
        interests.favoriteFood
    );


    setText(
        "printWeekendActivity",
        interests.weekendActivity
    );



    /*=====================================================
            MATCH PREFERENCES
    =====================================================*/

    setText(
        "printLookingFor",
        preferences.lookingFor
    );


    setText(
        "printPreferredGender",
        preferences.preferredGender
    );


    setText(
        "printMinAge",
        preferences.minAge
    );


    setText(
        "printMaxAge",
        preferences.maxAge
    );


    setText(
        "printPreferredNationality",
        preferences.preferredNationality
    );


    setText(
        "printPreferredCountry",
        preferences.preferredCountry
    );


    setText(
        "printPreferredTribe",
        preferences.preferredTribe
    );


    setText(
        "printPreferredReligion",
        preferences.preferredReligion
    );


    setText(
        "printPreferredEducation",
        preferences.preferredEducation
    );


    setText(
        "printPreferredOccupation",
        preferences.preferredOccupation
    );


    setText(
        "printHeightRange",
        formatHeightRange(preferences)
    );


    setText(
        "printAppearance",
        preferences.preferredAppearance
    );


    setText(
        "printComplexion",
        preferences.preferredComplexion
    );


    setText(
        "printPreferredChildren",
        preferences.preferredChildren
    );


    setText(
        "printAcceptSmoking",
        preferences.acceptSmoking
    );


    setText(
        "printAcceptDrinking",
        preferences.acceptDrinking
    );


    setText(
        "printDistance",
        preferences.distance
    );


    setText(
        "printDealBreakers",
        formatList(
            preferences.dealBreakers
        )
    );



    /*=====================================================
            NEXT OF KIN
    =====================================================*/

    setText(
        "printKinName",
        nextOfKin.fullName
    );


    setText(
        "printKinRelationship",
        nextOfKin.relationship
    );


    setText(
        "printKinPhone",
        nextOfKin.phone
    );


    setText(
        "printKinAlternativePhone",
        nextOfKin.alternativePhone
    );


    setText(
        "printKinEmail",
        nextOfKin.email
    );


    setText(
        "printKinCountry",
        nextOfKin.country
    );


    setText(
        "printKinDistrict",
        nextOfKin.district
    );


    setText(
        "printKinOccupation",
        nextOfKin.occupation
    );


    setText(
        "printKinAddress",
        nextOfKin.address
    );



    /*=====================================================
            LOCATION
    =====================================================*/

    const current =
        location.current;


    if (
        current &&
        current.latitude !== undefined &&
        current.longitude !== undefined
    ) {

        setText(
            "printCurrentLocation",
            `${current.latitude}, ${current.longitude}`
        );

    }

    else {

        setText(
            "printCurrentLocation",
            "Not available"
        );

    }



    /*=====================================================
            VERIFICATION
    =====================================================*/

    const status =
        verification.status;


    setText(
        "printVerification",
        formatVerificationStatus(status)
    );


    setText(
        "printVerificationStatus",
        formatVerificationStatus(status)
    );


    setText(
        "printVerificationDate",
        formatDate(
            verification.submittedAt
        )
    );


    setText(
        "printAccountStatus",
        "Active"
    );



    /*=====================================================
            PROFILE PHOTO
    =====================================================*/

    const photo =
        getProfilePhoto(user);


    const photoElement =
        document.getElementById(
            "printProfilePhoto"
        );


    if (
        photoElement &&
        photo
    ) {

        photoElement.src =
            photo;

    }

}



/*=========================================================
        INTERESTS
=========================================================*/

function renderInterests(
    interests
) {

    const container =
        document.getElementById(
            "printInterests"
        );


    if (!container) return;


    container.innerHTML = "";


    if (
        !Array.isArray(interests) ||
        interests.length === 0
    ) {

        container.textContent =
            "—";

        return;

    }


    interests.forEach(
        interest => {

            const tag =
                document.createElement(
                    "span"
                );


            tag.className =
                "tag";


            tag.textContent =
                interest;


            container.appendChild(
                tag
            );

        }
    );

}



/*=========================================================
        HEIGHT RANGE
=========================================================*/

function formatHeightRange(
    preferences
) {

    const min =
        preferences.minHeight;


    const max =
        preferences.maxHeight;


    if (min && max) {

        return `${min} - ${max}`;

    }


    if (min) {

        return `From ${min}`;

    }


    if (max) {

        return `Up to ${max}`;

    }


    return "—";

}



/*=========================================================
        LIST FORMATTER
=========================================================*/

function formatList(value) {

    if (
        Array.isArray(value)
    ) {

        return value.length
            ? value.join(", ")
            : "—";

    }


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "—";

    }


    return String(value);

}



/*=========================================================
        VERIFICATION FORMAT
=========================================================*/

function formatVerificationStatus(
    status
) {

    switch (status) {

        case "approved":
            return "Verified";

        case "verified":
            return "Verified";

        case "pending":
            return "Pending Review";

        case "rejected":
            return "Rejected";

        default:
            return "Not Submitted";

    }

}



/*=========================================================
        PROFILE PHOTO
=========================================================*/

function getProfilePhoto(user) {

    if (
        user.photoURL
    ) {

        return user.photoURL;

    }


    if (
        Array.isArray(user.photos) &&
        user.photos.length > 0
    ) {

        return user.photos[0];

    }


    if (
        typeof user.photos === "object" &&
        user.photos !== null
    ) {

        const photos =
            Object.values(
                user.photos
            );


        if (photos.length) {

            return photos[0];

        }

    }


    return "";

}



/*=========================================================
        END PHASE 2
=========================================================*/
/*=========================================================
        PHASE 3 — PRIVACY + VERIFICATION + SUPPORT
=========================================================*/


/*=========================================================
        OPEN PRIVACY
=========================================================*/

privacyBtn?.addEventListener(
    "click",
    () => {

        loadPrivacySettings();

        openModal(
            privacyModal
        );

    }
);


/*=========================================================
        CLOSE PRIVACY
=========================================================*/

closePrivacyModal?.addEventListener(
    "click",
    () => {

        closeModal(
            privacyModal
        );

    }
);


/*=========================================================
        CLOSE PRIVACY ON OVERLAY
=========================================================*/

privacyModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            privacyModal
        ) {

            closeModal(
                privacyModal
            );

        }

    }
);


/*=========================================================
        LOAD PRIVACY SETTINGS
=========================================================*/

function loadPrivacySettings() {

    if (!currentUserData) return;


    const privacy =
        currentUserData.privacy || {};


    const profileVisibility =
        document.getElementById(
            "profileVisibility"
        );


    const showPhone =
        document.getElementById(
            "showPhone"
        );


    const showLocation =
        document.getElementById(
            "showLocation"
        );


    const showHiv =
        document.getElementById(
            "showHiv"
        );


    const showChildren =
        document.getElementById(
            "showChildren"
        );


    const showOnline =
        document.getElementById(
            "showOnline"
        );


    if (profileVisibility) {

        profileVisibility.value =
            privacy.profileVisibility ||
            "everyone";

    }


    if (showPhone) {

        showPhone.checked =
            privacy.showPhone === true;

    }


    if (showLocation) {

        showLocation.checked =
            privacy.showLocation === true;

    }


    if (showHiv) {

        showHiv.checked =
            privacy.showHiv === true;

    }


    if (showChildren) {

        showChildren.checked =
            privacy.showChildren === true;

    }


    if (showOnline) {

        showOnline.checked =
            privacy.showOnline !== false;

    }

}



/*=========================================================
        SAVE PRIVACY
=========================================================*/

savePrivacyBtn?.addEventListener(
    "click",
    async () => {

        if (!currentUser) return;


        const profileVisibility =
            document.getElementById(
                "profileVisibility"
            );


        const showPhone =
            document.getElementById(
                "showPhone"
            );


        const showLocation =
            document.getElementById(
                "showLocation"
            );


        const showHiv =
            document.getElementById(
                "showHiv"
            );


        const showChildren =
            document.getElementById(
                "showChildren"
            );


        const showOnline =
            document.getElementById(
                "showOnline"
            );


        const privacyData = {

            profileVisibility:
                profileVisibility?.value ||
                "everyone",

            showPhone:
                showPhone?.checked === true,

            showLocation:
                showLocation?.checked === true,

            showHiv:
                showHiv?.checked === true,

            showChildren:
                showChildren?.checked === true,

            showOnline:
                showOnline?.checked !== false

        };


        try {

            savePrivacyBtn.disabled =
                true;


            await update(
                ref(
                    db,
                    "users/" +
                    currentUser.uid
                ),
                {
                    privacy:
                        privacyData
                }
            );


            currentUserData.privacy =
                privacyData;


            closeModal(
                privacyModal
            );


            showToast(
                "Privacy settings saved."
            );


        }

        catch (error) {

            console.error(
                "PRIVACY SAVE ERROR:",
                error
            );


            showToast(
                "Unable to save privacy settings."
            );

        }

        finally {

            savePrivacyBtn.disabled =
                false;

        }

    }
);



/*=========================================================
        VERIFICATION
=========================================================*/

verificationBtn?.addEventListener(
    "click",
    () => {

        /*
         * Keep the verification flow
         * on the existing verification page.
         */

        window.location.href =
            "verification.html";

    }
);



/*=========================================================
        SUPPORT
=========================================================*/

supportBtn?.addEventListener(
    "click",
    () => {

        /*
         * Change this later if your app
         * has a dedicated support page.
         */

        window.location.href =
            "support.html";

    }
);



/*=========================================================
        LOGOUT
=========================================================*/

logoutBtn?.addEventListener(
    "click",
    () => {

        openModal(
            logoutModal
        );

    }
);



/*=========================================================
        CANCEL LOGOUT
=========================================================*/

cancelLogout?.addEventListener(
    "click",
    () => {

        closeModal(
            logoutModal
        );

    }
);



/*=========================================================
        LOGOUT OVERLAY
=========================================================*/

logoutModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            logoutModal
        ) {

            closeModal(
                logoutModal
            );

        }

    }
);



/*=========================================================
        CONFIRM LOGOUT
=========================================================*/

confirmLogout?.addEventListener(
    "click",
    async () => {

        if (!currentUser) return;


        try {

            confirmLogout.disabled =
                true;


            await signOut(
                auth
            );


            window.location.href =
                "login.html";

        }

        catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );


            showToast(
                "Unable to log out."
            );


            confirmLogout.disabled =
                false;

        }

    }
);



/*=========================================================
        DELETE ACCOUNT
=========================================================*/

deleteAccountBtn?.addEventListener(
    "click",
    () => {

        openModal(
            deleteAccountModal
        );

    }
);



/*=========================================================
        CANCEL DELETE
=========================================================*/

cancelDelete?.addEventListener(
    "click",
    () => {

        closeModal(
            deleteAccountModal
        );

    }
);



/*=========================================================
        DELETE OVERLAY
=========================================================*/

deleteAccountModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            deleteAccountModal
        ) {

            closeModal(
                deleteAccountModal
            );

        }

    }
);



/*=========================================================
        CONFIRM DELETE
=========================================================*/

confirmDelete?.addEventListener(
    "click",
    async () => {

        if (!currentUser) return;


        try {

            confirmDelete.disabled =
                true;


            /*
             * Remove the user's Realtime
             * Database profile first.
             */

            await remove(
                ref(
                    db,
                    "users/" +
                    currentUser.uid
                )
            );


            /*
             * Then delete Firebase
             * Authentication account.
             */

            await deleteUser(
                currentUser
            );


            window.location.href =
                "register.html";

        }

        catch (error) {

            console.error(
                "DELETE ACCOUNT ERROR:",
                error
            );


            /*
             * Firebase may require the
             * user to sign in again
             * before deletion.
             */

            if (
                error.code ===
                "auth/requires-recent-login"
            ) {

                showToast(
                    "Please log in again before deleting your account."
                );

            }

            else {

                showToast(
                    "Unable to delete your account."
                );

            }


            confirmDelete.disabled =
                false;

        }

    }
);



/*=========================================================
        ESC KEY — CLOSE MODALS
=========================================================*/

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        closeModal(
            profileModal
        );


        closeModal(
            privacyModal
        );


        closeModal(
            logoutModal
        );


        closeModal(
            deleteAccountModal
        );

    }
);



/*=========================================================
        END PHASE 3
=========================================================*/

/*=========================================================
        PHASE 4 — PRINT + DOWNLOAD
        FIXED FOR ANDROID / WEBVIEW
=========================================================*/


/*=========================================================
        PRINT PROFILE
=========================================================*/

printProfileAction?.addEventListener(
    "click",
    () => {

        if (!currentUserData) {

            showToast(
                "Profile is still loading."
            );

            return;

        }

        window.print();

    }
);



/*=========================================================
        DOWNLOAD PROFILE
=========================================================*/

downloadProfileBtn?.addEventListener(
    "click",
    async () => {

        if (!currentUserData) {

            showToast(
                "Profile is still loading."
            );

            return;

        }


        try {

            downloadProfileBtn.disabled = true;

            downloadProfileBtn.style.opacity = "0.6";


            await downloadProfileDocument();


        }

        catch (error) {

            console.error(
                "PROFILE DOWNLOAD ERROR:",
                error
            );

            showToast(
                "Unable to download profile."
            );

        }

        finally {

            downloadProfileBtn.disabled = false;

            downloadProfileBtn.style.opacity = "";

        }

    }
);



/*=========================================================
        CREATE PROFILE DOCUMENT
=========================================================*/

function createProfileDocument() {

    const profile =
        document.getElementById(
            "printProfile"
        );


    if (!profile) {

        throw new Error(
            "Profile document not found."
        );

    }


    const profileHTML =
        profile.outerHTML;


    return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>My Profile</title>


<style>

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    padding: 30px;

    background: #FFF7FB;

    color: #1E1E2F;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

}


.print-profile {

    width: 100%;

    max-width: 900px;

    margin: 0 auto;

    padding: 25px;

    background: #FFFFFF;

    border:
        1px solid #F1D9E7;

    border-radius: 20px;

}


.print-profile-header {

    display: flex;

    align-items: center;

    gap: 18px;

    padding-bottom: 22px;

    margin-bottom: 22px;

    border-bottom:
        1px solid #F1D9E7;

}


.print-profile-photo-wrapper {

    width: 88px;

    height: 88px;

    flex: 0 0 88px;

    padding: 3px;

    border-radius: 22px;

    background:
        linear-gradient(
            135deg,
            #FF2E88,
            #FF5FA2
        );

}


.print-profile-photo-wrapper img {

    width: 100%;

    height: 100%;

    object-fit: cover;

    display: block;

    border-radius: 19px;

}


.print-profile-heading h1 {

    margin: 0;

    font-size: 25px;

}


.print-profile-heading p {

    margin: 5px 0 0;

    color: #7A7A8C;

    font-size: 13px;

}


.verification-label {

    display: inline-block;

    margin-top: 8px;

    padding: 5px 10px;

    border-radius: 999px;

    background: #FFF0F6;

    color: #FF2E88;

    font-size: 11px;

    font-weight: 700;

}


.profile-document-section {

    margin-bottom: 18px;

    padding: 19px;

    border:
        1px solid #F1D9E7;

    border-radius: 19px;

    background: #FFFFFF;

    page-break-inside: avoid;

}


.profile-document-section h3 {

    margin: 0 0 15px;

    color: #1E1E2F;

    font-size: 15px;

}


.profile-information-grid {

    display: grid;

    grid-template-columns:
        repeat(2, minmax(0, 1fr));

    gap: 10px;

}


.profile-field {

    padding: 12px;

    border:
        1px solid #F1D9E7;

    border-radius: 13px;

    background: #FFF7FB;

}


.profile-field-full {

    grid-column: 1 / -1;

}


.profile-field label {

    display: block;

    margin-bottom: 5px;

    color: #7A7A8C;

    font-size: 9px;

    font-weight: 800;

    text-transform: uppercase;

}


.profile-field span {

    color: #1E1E2F;

    font-size: 13px;

    font-weight: 600;

    line-height: 1.45;

}


.profile-text-box {

    margin-bottom: 12px;

    padding: 14px;

    border:
        1px solid #F1D9E7;

    border-radius: 14px;

    background: #FFF7FB;

}


.profile-text-box p {

    margin: 0;

    font-size: 13px;

    line-height: 1.65;

}


.profile-tags {

    display: flex;

    flex-wrap: wrap;

    gap: 7px;

}


.profile-tags .tag {

    display: inline-block;

    padding: 6px 10px;

    border-radius: 999px;

    background: #FFF0F6;

    color: #FF2E88;

    font-size: 11px;

    font-weight: 700;

}


@media (max-width: 600px) {

    body {

        padding: 10px;

    }


    .print-profile {

        padding: 15px;

    }


    .profile-information-grid {

        grid-template-columns: 1fr;

    }


    .profile-field-full {

        grid-column: auto;

    }

}


@media print {

    body {

        padding: 0;

        background: #FFFFFF;

    }


    .print-profile {

        max-width: none;

        border: 0;

        border-radius: 0;

    }

}

</style>

</head>


<body>

${profileHTML}

</body>

</html>`;

}



/*=========================================================
        DOWNLOAD PROFILE DOCUMENT
=========================================================*/

async function downloadProfileDocument() {

    const documentHTML =
        createProfileDocument();


    const fileName =
        "my-profile.html";


    /*
     * METHOD 1
     * Android / modern browsers
     *
     * Use the native file picker when available.
     */

    if (
        "showSaveFilePicker" in window
    ) {

        try {

            const handle =
                await window.showSaveFilePicker({

                    suggestedName:
                        fileName,

                    types: [

                        {
                            description:
                                "HTML Profile",

                            accept: {

                                "text/html": [
                                    ".html"
                                ]

                            }

                        }

                    ]

                });


            const writable =
                await handle.createWritable();


            await writable.write(
                documentHTML
            );


            await writable.close();


            showToast(
                "Profile saved successfully."
            );


            return;

        }

        catch (error) {

            /*
             * User cancelled the picker.
             */

            if (
                error.name ===
                "AbortError"
            ) {

                return;

            }

            console.warn(
                "File picker unavailable:",
                error
            );

        }

    }



    /*
     * METHOD 2
     * Android share sheet
     */

    if (
        navigator.share &&
        typeof File !== "undefined"
    ) {

        try {

            const file =
                new File(
                    [documentHTML],
                    fileName,
                    {
                        type:
                            "text/html"
                    }
                );


            if (
                !navigator.canShare ||
                navigator.canShare({
                    files: [file]
                })
            ) {

                await navigator.share({

                    title:
                        "My Profile",

                    text:
                        "My Twagalane profile",

                    files: [file]

                });


                showToast(
                    "Profile ready to save."
                );


                return;

            }

        }

        catch (error) {

            /*
             * User cancelled sharing.
             */

            if (
                error.name ===
                "AbortError"
            ) {

                return;

            }

            console.warn(
                "Share failed:",
                error
            );

        }

    }



    /*
     * METHOD 3
     *
     * Safe fallback.
     *
     * We DO NOT use:
     *
     * URL.createObjectURL()
     * link.download
     * URL.revokeObjectURL()
     *
     * because those can crash some
     * Android WebView wrappers.
     */

    openProfileForSaving(
        documentHTML
    );

}



/*=========================================================
        OPEN PROFILE FOR SAVING
=========================================================*/

function openProfileForSaving(
    documentHTML
) {

    const newWindow =
        window.open(
            "",
            "_blank"
        );


    if (!newWindow) {

        showToast(
            "Please allow popups to save your profile."
        );

        return;

    }


    newWindow.document.open();


    newWindow.document.write(
        documentHTML
    );


    newWindow.document.close();


    /*
     * Give the browser time to render
     * the profile before showing message.
     */

    setTimeout(
        () => {

            try {

                newWindow.focus();

            }

            catch (error) {

                console.warn(
                    error
                );

            }

        },
        300
    );


    showToast(
        "Profile opened. Use your browser menu to save it."
    );

}



/*=========================================================
        TOAST
=========================================================*/

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "settingsToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "settingsToast";


        toast.className =
            "settings-toast";


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.settingsToastTimer
    );


    window.settingsToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}



/*=========================================================
        MODAL BODY LOCK
=========================================================*/

const modalStyle =
    document.createElement(
        "style"
    );


modalStyle.textContent = `

body.modal-open {

    overflow: hidden;

}


.settings-toast {

    position: fixed;

    left: 50%;

    bottom: 25px;

    z-index: 10000;

    max-width:
        calc(100% - 30px);

    padding:
        11px 16px;

    border-radius:
        999px;

    background:
        #1E1E2F;

    color:
        #FFFFFF;

    font-size:
        12px;

    font-weight:
        600;

    box-shadow:
        0 10px 30px
        rgba(0,0,0,.18);

    opacity: 0;

    visibility: hidden;

    pointer-events: none;

    transform:
        translate(-50%, 10px);

    transition:
        .25s ease;

}


.settings-toast.show {

    opacity: 1;

    visibility: visible;

    transform:
        translate(-50%, 0);

}


@media (max-width: 600px) {

    .settings-toast {

        bottom: 20px;

        font-size: 11px;

    }

}

`;

document.head.appendChild(
    modalStyle
);



/*=========================================================
        MODAL STATE
=========================================================*/

function updateBodyModalState() {

    const modals = [

        profileModal,

        privacyModal,

        logoutModal,

        deleteAccountModal

    ];


    const open =
        modals.some(
            modal =>

                modal &&

                modal.getAttribute(
                    "aria-hidden"
                ) === "false"
        );


    document.body.classList.toggle(
        "modal-open",
        open
    );

}



/*=========================================================
        OBSERVE MODAL CHANGES
=========================================================*/

[
    profileModal,

    privacyModal,

    logoutModal,

    deleteAccountModal

]
.forEach(
    modal => {

        if (!modal) return;


        const observer =
            new MutationObserver(
                updateBodyModalState
            );


        observer.observe(
            modal,
            {

                attributes: true,

                attributeFilter: [
                    "aria-hidden"
                ]

            }
        );

    }
);



/*=========================================================
        INITIALIZATION
=========================================================*/

updateBodyModalState();


console.log(
    "Settings initialized successfully."
);


/*=========================================================
        END PHASE 4
=========================================================*/