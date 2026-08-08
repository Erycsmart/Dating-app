/*==================================
            PROFILE.JS
==================================*/

import { auth, db } from "./firebase.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
            DOM
==================================*/

const profileModal =
document.getElementById("profileModal");

const heroEditBtn =
document.getElementById("enableProfileEditBtn");

const headerProfileBtn =
document.getElementById("profileBtn");

const closeProfileBtn =
document.getElementById("closeProfileBtn");

const cancelProfileBtn =
document.getElementById("cancelProfileBtn");

const printProfileBtn =
document.getElementById("printProfileBtn");
const saveProfileBtn =
document.getElementById("saveProfileBtn");

const profileForm =
document.getElementById("profileForm");


/*==================================
        SELECTED PROFILE PHOTO
===================================*/

let selectedProfilePhoto = "";

/*==================================
        PHOTO DOM
==================================*/

const profileImage =
document.getElementById("profileImage");

const profilePhotoGrid =
document.getElementById("profilePhotoGrid");

const noProfilePhotos =
document.getElementById("noProfilePhotos");


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

    toast.textContent =
    message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}


/*==================================
        OPEN PROFILE
==================================*/

async function openProfileModal(){

    if(!profileModal){

        showToast(
            "Profile modal not found."
        );

        return;

    }


    profileModal.style.display =
    "flex";


    document.body.classList.add(
        "profile-modal-open"
    );


    /* Load photos */

    await loadProfilePhotos();

}


/*==================================
        CLOSE PROFILE
==================================*/

function closeProfileModal(){

    if(!profileModal) return;


    profileModal.style.display =
    "none";


    document.body.classList.remove(
        "profile-modal-open"
    );

}


/*==================================
        LOAD PROFILE PHOTOS
==================================*/

async function loadProfilePhotos(){

    const user =
    auth.currentUser;


    if(!user){

        console.log(
            "No logged in user."
        );

        return;

    }


    try{

        const snapshot =
        await get(
            ref(
                db,
                "users/" +
                user.uid +
                "/photos"
            )
        );


        if(!snapshot.exists()){

            showNoPhotos();

            return;

        }


        const photos =
        snapshot.val();


        console.log(
            "PROFILE PHOTOS:",
            photos
        );


  selectedProfilePhoto =
    getSelectedProfilePhoto(photos);

renderProfilePhotos(
    photos
);


    }

    catch(error){

        console.error(
            "PROFILE PHOTO ERROR:",
            error
        );

        showToast(
            "Unable to load profile photos."
        );

    }

}

/*==================================
        GET PHOTO LIST
===================================*/

function getPhotoList(photos){

    const list = [];


    if(!photos){

        return list;

    }


    /*==================================
        PHOTOS AS ARRAY
    ==================================*/

    if(Array.isArray(photos)){

        photos.forEach(
            (photo,index)=>{

                /* Direct URL */

                if(
                    typeof photo === "string" &&
                    photo.trim()
                ){

                    list.push({

                        key:String(index),

                        url:photo.trim()

                    });

                    return;

                }


                /* Photo object */

                if(
                    photo &&
                    typeof photo === "object"
                ){

                    const url =
                    photo.url ||
                    photo.photoURL ||
                    photo.downloadURL ||
                    photo.src ||
                    photo.image;


                    if(
                        typeof url === "string" &&
                        url.trim()
                    ){

                        list.push({

                            key:
                            photo.key ||
                            String(index),

                            url:url.trim()

                        });

                    }

                }

            }
        );

    }


    /*==================================
        PHOTOS AS OBJECT
    ==================================*/

    else if(
        typeof photos === "object"
    ){

        Object.entries(
            photos
        ).forEach(
            ([key,value])=>{

                /*
                    "profile" stores the
                    currently selected
                    profile photo.
                */

                if(key === "profile"){

                    return;

                }


                /* Direct URL */

                if(
                    typeof value === "string" &&
                    value.trim()
                ){

                    list.push({

                        key:key,

                        url:value.trim()

                    });

                    return;

                }


                /* Photo object */

                if(
                    value &&
                    typeof value === "object"
                ){

                    const url =
                    value.url ||
                    value.photoURL ||
                    value.downloadURL ||
                    value.src ||
                    value.image;


                    if(
                        typeof url === "string" &&
                        url.trim()
                    ){

                        list.push({

                            key:key,

                            url:url.trim()

                        });

                    }

                }

            }
        );

    }


    console.log(
        "PHOTO LIST:",
        list
    );


    return list;

}

/*==================================
        GET SELECTED PROFILE PHOTO
==================================*/

function getSelectedProfilePhoto(photos){

    if(
        photos &&
        !Array.isArray(photos) &&
        typeof photos.profile === "string" &&
        photos.profile.trim() !== ""
    ){

        return photos.profile.trim();

    }


    const photoList =
    getPhotoList(photos);


    if(photoList.length){

        return photoList[0].url;

    }


    return "";

}


/*==================================
        RENDER PHOTOS
==================================*/

function renderProfilePhotos(photos){

    if(!profilePhotoGrid){

        console.error(
            "profilePhotoGrid not found."
        );

        return;

    }


    profilePhotoGrid.innerHTML = "";


    const photoList =
    getPhotoList(photos);


    /*==============================
        SELECTED PHOTO
    ==============================*/

    let selectedPhoto =
    getSelectedProfilePhoto(photos);


    selectedProfilePhoto =
    selectedPhoto;


    /*==============================
        MAIN PHOTO
    ==============================*/

    if(profileImage){

        profileImage.src =
        selectedPhoto ||
        "assets/avatar.png";

    }


    /*==============================
        NO PHOTOS
    ==============================*/

    if(photoList.length === 0){

        showNoPhotos();

        return;

    }


    if(noProfilePhotos){

        noProfilePhotos.hidden =
        true;

    }


    /*==============================
        CREATE PHOTO THUMBNAILS
    ==============================*/

    photoList.forEach(
        (photo,index)=>{

            const button =
            document.createElement("button");


            button.type =
            "button";


            button.className =
            "profile-photo-choice";


            /* IMAGE */

            const image =
            document.createElement("img");


            image.src =
            photo.url;


            image.alt =
            "Profile photo " +
            (index + 1);


            image.loading =
            "lazy";


            image.onerror = ()=>{

                console.error(
                    "Image failed to load:",
                    photo.url
                );

            };


            /* CHECK */

            const check =
            document.createElement("span");


            check.className =
            "profile-photo-check";


            check.textContent =
            "✓";


            /* LABEL */

            const label =
            document.createElement("span");


            label.className =
            "profile-photo-label";


            label.textContent =
            photo.url === selectedPhoto
            ? "Profile"
            : "Use photo";


            button.appendChild(image);

            button.appendChild(check);

            button.appendChild(label);


            /*==========================
                SELECT PHOTO
            ==========================*/

            button.addEventListener(
                "click",
                ()=>{

                    selectedPhoto =
                    photo.url;


                    selectedProfilePhoto =
                    photo.url;


                    if(profileImage){

                        profileImage.src =
                        photo.url;

                    }


                    /* Remove old selection */

                    document
                    .querySelectorAll(
                        ".profile-photo-choice"
                    )
                    .forEach(
                        item=>{

                            item.classList.remove(
                                "selected"
                            );

                        }
                    );


                    /* Select this photo */

                    button.classList.add(
                        "selected"
                    );


                    /* Update labels */

                    document
                    .querySelectorAll(
                        ".profile-photo-choice"
                    )
                    .forEach(
                        item=>{

                            const itemLabel =
                            item.querySelector(
                                ".profile-photo-label"
                            );


                            if(!itemLabel){

                                return;

                            }


                            itemLabel.textContent =
                            item.classList.contains(
                                "selected"
                            )
                            ? "Profile"
                            : "Use photo";

                        }
                    );

                }
            );


            /*==========================
                CURRENT PROFILE
            ==========================*/

            if(
                photo.url ===
                selectedPhoto
            ){

                button.classList.add(
                    "selected"
                );

            }


            profilePhotoGrid.appendChild(
                button
            );

        }
    );

}

/*==================================
        NO PHOTOS
==================================*/

function showNoPhotos(){

    if(profilePhotoGrid){

        profilePhotoGrid.innerHTML =
        "";

    }


    if(noProfilePhotos){

        noProfilePhotos.hidden =
        false;

    }


    if(profileImage){

        profileImage.src =
        "assets/avatar.png";

    }

}
/*==================================
        SAVE PROFILE
===================================*/

async function saveProfile(){

    const user =
    auth.currentUser;


    if(!user){

        showToast(
            "You are not logged in."
        );

        return;

    }


    if(!profileForm){

        showToast(
            "Profile form not found."
        );

        return;

    }


    try{

        /*==============================
            SAVING STATE
        ==============================*/

        if(saveProfileBtn){

            saveProfileBtn.disabled =
            true;

            saveProfileBtn.textContent =
            "Saving...";

        }


        /*==============================
            GET CURRENT DATA
        ==============================*/

        const snapshot =
        await get(
            ref(
                db,
                "users/" +
                user.uid
            )
        );


        if(!snapshot.exists()){

            showToast(
                "Profile not found."
            );

            return;

        }


        const currentData =
        snapshot.val();


        /*==============================
            PROFILE SECTIONS
        ==============================*/

        const sections = {

            personalInformation:
            "personalInformationFields",

            about:
            "aboutFields",

            interests:
            "interestsFields",

            preferences:
            "preferencesFields",

            nextOfKin:
            "nextOfKinFields",

            location:
            "locationFields",

            onboarding:
            "onboardingFields"

        };


        const updates = {};


        /*==============================
            COLLECT CHANGES
        ==============================*/

        Object.entries(sections).forEach(
            ([section,containerId])=>{

                const container =
                document.getElementById(
                    containerId
                );


                if(!container) return;


                const inputs =
                container.querySelectorAll(
                    "input, textarea, select"
                );


                inputs.forEach(input=>{

                    const key =
                    input.dataset.field;


                    if(!key) return;


                    let value =
                    input.value;


                    const original =
                    currentData?.[section]?.[key];


                    /* ARRAY */

                    if(
                        Array.isArray(original)
                    ){

                        value =
                        value
                        .split(",")
                        .map(
                            item =>
                            item.trim()
                        )
                        .filter(Boolean);

                    }


                    /* NUMBER */

                    else if(
                        typeof original ===
                        "number"
                    ){

                        const number =
                        Number(value);


                        if(!Number.isNaN(number)){

                            value =
                            number;

                        }

                    }


                    /* BOOLEAN */

                    else if(
                        typeof original ===
                        "boolean"
                    ){

                        value =
                        value === "true";

                    }


                    updates[
                        section +
                        "/" +
                        key
                    ] =
                    value;

                });

            }
        );


        /*==============================
            PROFILE PHOTO
        ==============================*/

        if(selectedProfilePhoto){

            updates[
                "photos/profile"
            ] =
            selectedProfilePhoto;

        }


        /*==============================
            SAVE TO FIREBASE
        ==============================*/

        await update(

            ref(
                db,
                "users/" +
                user.uid
            ),

            updates

        );


        /*==============================
            UPDATE HERO
        ==============================*/

        if(selectedProfilePhoto){

            const heroPhoto =
            document.getElementById(
                "heroPhoto"
            );

            const headerProfile =
            document.getElementById(
                "headerProfile"
            );


            if(heroPhoto){

                heroPhoto.src =
                selectedProfilePhoto;

            }


            if(headerProfile){

                headerProfile.src =
                selectedProfilePhoto;

            }

        }


        /*==============================
            SUCCESS
        ==============================*/

        showToast(
            "Profile updated successfully ❤️"
        );


        /*==============================
            CLOSE MODAL
        ==============================*/

        setTimeout(()=>{

            closeProfileModal();

        },700);


    }

    catch(error){

        console.error(
            "SAVE PROFILE ERROR:",
            error
        );


        showToast(
            "Unable to save profile."
        );

    }

    finally{

        if(saveProfileBtn){

            saveProfileBtn.disabled =
            false;

            saveProfileBtn.textContent =
            "Save Changes";

        }

    }

}
function printProfile(){

    if(!profileModal){

        showToast(
            "Profile modal not found."
        );

        return;

    }


    /*==================================
        OPEN ALL PROFILE SECTIONS
    ==================================*/

    document
    .querySelectorAll(
        ".profile-section-body"
    )
    .forEach(body => {

        body.classList.add(
            "active"
        );

    });


    document
    .querySelectorAll(
        ".profile-section-toggle"
    )
    .forEach(toggle => {

        toggle.classList.add(
            "active"
        );

    });


    /*==================================
        MARK PAGE FOR PRINTING
    ==================================*/

    document.body.classList.add(
        "printing-profile"
    );


    profileModal.classList.add(
        "show"
    );


    profileModal.setAttribute(
        "aria-hidden",
        "false"
    );


    /*==================================
        PRINT
    ==================================*/

    setTimeout(() => {

        window.print();

    }, 300);


    /*==================================
        AFTER PRINT
    ==================================*/

    window.onafterprint = () => {

        document.body.classList.remove(
            "printing-profile"
        );

        window.onafterprint = null;

    };

}
/*==================================
        PRINT SECTION
===================================*/

function createPrintSection(
    title,
    data
){

    if(
        !data ||
        typeof data !== "object"
    ){

        return "";

    }


    const items =
    flattenPrintData(data);


    if(!items.length){

        return "";

    }


    return `

        <div class="print-section">

            <div class="print-section-title">

                ${escapePrint(title)}

            </div>


            <div class="print-grid">

                ${
                    items.map(item=>
                        createPrintItem(
                            item.label,
                            item.value
                        )
                    ).join("")
                }

            </div>

        </div>

    `;

}


/*==================================
        FLATTEN DATA
===================================*/

function flattenPrintData(
    object,
    parent=""
){

    const result = [];


    Object.entries(
        object || {}
    ).forEach(
        ([key,value])=>{

            /*
                Don't print verification
                documents or private IDs.
            */

            if(
                key === "documents" ||
                key === "idDocument" ||
                key === "selfie" ||
                key === "nin"
            ){

                return;

            }


            const label =
            parent
            ? parent +
              " · " +
              formatProfileLabel(key)
            : formatProfileLabel(key);


            if(Array.isArray(value)){

                result.push({

                    label:label,

                    value:value
                    .map(item=>{

                        if(
                            typeof item ===
                            "object"
                        ){

                            return JSON.stringify(
                                item
                            );

                        }

                        return String(item);

                    })
                    .join(", ")

                });

            }


            else if(
                value &&
                typeof value ===
                "object"
            ){

                result.push(
                    ...flattenPrintData(
                        value,
                        formatProfileLabel(key)
                    )
                );

            }


            else{

                result.push({

                    label:label,

                    value:
                    formatPrintValue(value)

                });

            }

        }
    );


    return result;

}


/*==================================
        PRINT ITEM
===================================*/

function createPrintItem(
    label,
    value
){

    return `

        <div class="print-item">

            <span class="print-label">

                ${escapePrint(label)}

            </span>


            <span class="print-value">

                ${escapePrint(value)}

            </span>

        </div>

    `;

}


/*==================================
        PRINT VALUE
===================================*/

function formatPrintValue(value){

    if(
        value === null ||
        value === undefined ||
        value === ""
    ){

        return "Not provided";

    }


    if(typeof value === "boolean"){

        return value
        ? "Yes"
        : "No";

    }


    return String(value);

}


/*==================================
        PRINT DATE
===================================*/

function formatPrintDate(value){

    const date =
    new Date(value);


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return String(value);

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
        ESCAPE PRINT HTML
===================================*/

function escapePrint(value){

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
/*==================================
        EVENTS
==================================*/

if(heroEditBtn){

    heroEditBtn.addEventListener(
        "click",
        openProfileModal
    );

}


if(headerProfileBtn){

    headerProfileBtn.addEventListener(
        "click",
        openProfileModal
    );

}


if(closeProfileBtn){

    closeProfileBtn.addEventListener(
        "click",
        closeProfileModal
    );

}


if(cancelProfileBtn){

    cancelProfileBtn.addEventListener(
        "click",
        closeProfileModal
    );

}


if(printProfileBtn){

    printProfileBtn.addEventListener(
        "click",
        printProfile
    );

}

/*==================================
        SAVE BUTTON
===================================*/

if(saveProfileBtn){

    saveProfileBtn.addEventListener(
        "click",
        saveProfile
    );

}
/*==================================
        OUTSIDE CLICK
==================================*/

window.addEventListener(
    "click",
    (event)=>{

        if(
            event.target ===
            profileModal
        ){

            closeProfileModal();

        }

    }
);


/*==================================
        ESCAPE
==================================*/

document.addEventListener(
    "keydown",
    (event)=>{

        if(
            event.key ===
            "Escape"
        ){

            closeProfileModal();

        }

    }
);


/*==================================
        INITIALIZED
==================================*/

console.log(
    "Profile.js Loaded"
);