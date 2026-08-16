/* =========================================
   TWAGALANE DATABASE CENTRE
   STAGE 1 — DATABASE READER
========================================= */

import { db } from "./firebase.js";
import {
    ref,
    get,
    push,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================
   DATABASE STATE
========================================= */

const databaseState = {

    users: [],

    filteredUsers: [],

    loaded: false

};


/* =========================================
   DOM HELPER
========================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================
   SAFE TEXT
========================================= */

function safeText(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }

    return String(value);

}


/* =========================================
   GET USER INFORMATION
========================================= */

function getPersonalInformation(user) {

    return user?.personalInformation || {};

}


function getHomeInformation(user) {

    return user?.location?.home || {};

}


/* =========================================
   USER FIELDS
========================================= */

function getName(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.fullName ||
        info.name ||
        user.fullName ||
        user.name ||
        user.username ||
        "Unknown User"
    );

}


function getEmail(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.email ||
        user.email ||
        "-"
    );

}


function getGender(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.gender ||
        user.gender ||
        ""
    );

}


function getDistrict(user) {

    const info =
        getPersonalInformation(user);

    const home =
        getHomeInformation(user);

    return (
        home.district ||
        info.district ||
        user.district ||
        ""
    );

}


function getReligion(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.religion ||
        user.religion ||
        ""
    );

}


function getTribe(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.tribe ||
        user.tribe ||
        ""
    );

}


function getEducation(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.education ||
        user.education ||
        ""
    );

}


function getOccupation(user) {

    const info =
        getPersonalInformation(user);

    return (
        info.occupation ||
        user.occupation ||
        ""
    );

}
/* =========================================
   PROFILE PHOTO
========================================= */

function getProfilePhoto(user) {

    if (!user) {
        return "";
    }


    /*
        Some older records may have
        photoURL directly on the user.
    */

    if (
        typeof user.photoURL === "string" &&
        user.photoURL.trim()
    ) {

        return user.photoURL.trim();

    }


    const photos =
        user.photos;


    if (!photos) {
        return "";
    }


    /*
        New/current structure:
        photos: [
            "https://...",
            "https://..."
        ]
    */

    if (
        Array.isArray(photos)
    ) {

        const firstPhoto =
            photos.find(
                photo =>
                    typeof photo === "string" &&
                    photo.trim()
            );


        return firstPhoto || "";

    }


    /*
        Older/object structure:
        photos: {
            profile: "https://...",
            photo1: "https://..."
        }
    */

    if (
        typeof photos === "object"
    ) {

        if (
            typeof photos.profile === "string" &&
            photos.profile.trim()
        ) {

            return photos.profile.trim();

        }


        const firstPhoto =
            Object.values(
                photos
            ).find(
                photo =>
                    typeof photo === "string" &&
                    photo.trim()
            );


        return firstPhoto || "";

    }


    return "";

}

/* =========================================
   AGE
========================================= */

function calculateAge(dateOfBirth) {

    if (!dateOfBirth) {

        return "";

    }


    const birthDate =
        new Date(dateOfBirth);


    if (
        Number.isNaN(
            birthDate.getTime()
        )
    ) {

        return "";

    }


    const today =
        new Date();


    let age =
        today.getFullYear() -
        birthDate.getFullYear();


    const monthDifference =
        today.getMonth() -
        birthDate.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() <
            birthDate.getDate()
        )
    ) {

        age--;

    }


    return age >= 0
        ? age
        : "";

}


function getAge(user) {

    const info =
        getPersonalInformation(user);


    if (
        info.age !== undefined &&
        info.age !== null &&
        info.age !== ""
    ) {

        return Number(
            info.age
        ) || info.age;

    }


    return calculateAge(
        info.dateOfBirth
    );

}


/* =========================================
   LOAD USERS
========================================= */

async function loadDatabaseUsers() {

    try {

        console.log(
            "Loading Twagalane users..."
        );


        const usersRef =
            ref(
                db,
                "users"
            );


        const snapshot =
            await get(
                usersRef
            );


        databaseState.users = [];


        if (
            snapshot.exists()
        ) {

            snapshot.forEach(
                childSnapshot => {

                    databaseState.users.push({

                        uid:
                            childSnapshot.key,

                        ...childSnapshot.val()

                    });

                }
            );

        }


        databaseState.filteredUsers =
            [
                ...databaseState.users
            ];


        databaseState.loaded =
            true;


        console.log(
            `Database loaded: ${databaseState.users.length} users`
        );


        updateDatabaseOverview();

        renderDatabaseRecords();

        renderDatabaseGroups();


    } catch (error) {

        console.error(
            "Database loading failed:",
            error
        );

        showDatabaseError(
            "Unable to load database records."
        );

    }

}


/* =========================================
   DATABASE OVERVIEW
========================================= */

function updateDatabaseOverview() {

    const totalRecords =
        $("totalRecords");


    if (totalRecords) {

        totalRecords.textContent =
            databaseState.users
                .length
                .toLocaleString();

    }


    const archivedUsers =
        $("archivedUsers");


    if (archivedUsers) {

        archivedUsers.textContent =
            "0";

    }


    const duplicateAccounts =
        $("duplicateAccounts");


    if (duplicateAccounts) {

        duplicateAccounts.textContent =
            "0";

    }


    calculateDatabaseSize();

}


/* =========================================
   DATABASE SIZE
========================================= */

function calculateDatabaseSize() {

    const databaseSize =
        $("databaseSize");


    if (!databaseSize)
        return;


    try {

        const json =
            JSON.stringify(
                databaseState.users
            );


        const bytes =
            new Blob(
                [json]
            ).size;


        const megabytes =
            bytes /
            1024 /
            1024;


        databaseSize.textContent =
            `${megabytes.toFixed(2)} MB`;


    } catch (error) {

        console.warn(
            "Could not calculate database size:",
            error
        );


        databaseSize.textContent =
            "Unknown";

    }

}


/* =========================================
   RENDER DATABASE RECORDS
========================================= */

function renderDatabaseRecords() {

    const table =
        $("databaseRecordsTable");


    if (!table)
        return;


    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="text-align:center;padding:30px;">

                    No database records found.

                </td>

            </tr>

        `;

        return;

    }


    /*
       We initially display the first 100 records.
       The database itself is NOT limited.
    */

    const visibleUsers =
        users.slice(
            0,
            100
        );


    table.innerHTML =
        visibleUsers.map(
            user => {

                const name =
                    getName(user);

                const email =
                    getEmail(user);

                const gender =
                    getGender(user);

                const age =
                    getAge(user);

                const district =
                    getDistrict(user);

                const religion =
                    getReligion(user);

                const occupation =
                    getOccupation(user);


                const verified =
                    user?.verification?.status ===
                    "approved";


                const premium =
                    user?.subscription?.active ===
                    true;


                return `

                    <tr>

                        <td>

                            <div
                                class="database-user-cell">

                          ${
    getProfilePhoto(user)

    ?

    `
    <img
        src="${escapeHtml(
            getProfilePhoto(user)
        )}"
        class="database-user-avatar"
        alt="${escapeHtml(
            getName(user)
        )}"
        loading="lazy"
        onerror="
            this.onerror=null;
            this.src='assets/avatar.png';
        "
    >
    `

    :

    `
    <div
        class="database-user-avatar">

        <span>
            👤
        </span>

    </div>
    `
                          }

                                </div>

                                <div
                                    class="database-user-info">

                                    <strong>

                                        ${escapeHtml(
                                            name
                                        )}

                                    </strong>

                                    <span>

                                        ${escapeHtml(
                                            email
                                        )}

                                    </span>

                                </div>

                            </div>

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    gender
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    age
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    district
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    religion
                                )
                            )}

                        </td>


                        <td>

                            ${escapeHtml(
                                safeText(
                                    occupation
                                )
                            )}

                        </td>


                        <td>

                            <span
                                class="
                                database-status
                                ${
                                    verified
                                    ? "verified"
                                    : "unverified"
                                }">

                                ${
                                    verified
                                    ? "Verified"
                                    : "Unverified"
                                }

                            </span>

                        </td>


                        <td>

                            <span
                                class="
                                database-status
                                ${
                                    premium
                                    ? "premium"
                                    : "free"
                                }">

                                ${
                                    premium
                                    ? "Premium"
                                    : "Free"
                                }

                            </span>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    const viewCount =
        $("databaseViewCount");


    if (viewCount) {

        viewCount.textContent =
            `${users.length.toLocaleString()} records`;

    }

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   GROUP COUNTER
========================================= */

function createGroups(
    users,
    getter
) {

    const groups =
        {};


    users.forEach(
        user => {

            let value =
                getter(user);


            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                value =
                    "Unknown";

            }


            value =
                String(
                    value
                ).trim();


            groups[value] =
                (
                    groups[value] ||
                    0
                ) + 1;

        }
    );


    return groups;

}


/* =========================================
   AGE GROUP
========================================= */

function getAgeGroup(user) {

    const age =
        Number(
            getAge(user)
        );


    if (!age)
        return "Unknown";


    if (age < 18)
        return "Under 18";


    if (age <= 25)
        return "18 - 25";


    if (age <= 35)
        return "26 - 35";


    if (age <= 45)
        return "36 - 45";


    if (age <= 55)
        return "46 - 55";


    return "56+";

}


/* =========================================
   GROUP CARD
========================================= */
function renderGroupCard(
    title,
    groups,
    filterType
) {

    const entries =
        Object.entries(
            groups
        )
        .sort(
            (
                a,
                b
            ) =>
                b[1] -
                a[1]
        )
        .slice(
            0,
            8
        );


    return `

        <div
            class="db-live-group">

            <h4>

                ${escapeHtml(
                    title
                )}

            </h4>


            ${
                entries.length

                ?

                entries.map(
                    (
                        [
                            name,
                            count
                        ]
                    ) => `

                        <button
                            type="button"
                            class="db-group-item"
                            data-group-filter="${escapeHtml(
                                filterType
                            )}"
                            data-group-value="${escapeHtml(
                                name
                            )}">

                            <span>

                                ${escapeHtml(
                                    name
                                )}

                            </span>

                            <b>

                                ${count}

                            </b>

                        </button>

                    `
                ).join("")

                :

                `

                    <div
                        class="db-group-empty">

                        No data

                    </div>

                `
            }

        </div>

    `;

}
/* =========================================
   RENDER GROUPS
========================================= */

function renderDatabaseGroups() {

    const panel =
        $("databaseGroupingPanel");


    if (!panel)
        return;


    const users =
        databaseState.filteredUsers;

panel.innerHTML = `

    ${renderGroupCard(
        "Age",
        createGroups(
            users,
            getAgeGroup
        ),
        "age"
    )}


    ${renderGroupCard(
        "Gender",
        createGroups(
            users,
            getGender
        ),
        "gender"
    )}


    ${renderGroupCard(
        "District",
        createGroups(
            users,
            getDistrict
        ),
        "district"
    )}


    ${renderGroupCard(
        "Religion",
        createGroups(
            users,
            getReligion
        ),
        "religion"
    )}


    ${renderGroupCard(
        "Tribe",
        createGroups(
            users,
            getTribe
        ),
        "tribe"
    )}

`;
}

/* =========================================
   CLICKABLE GROUP FILTERS
========================================= */

function bindDatabaseGroupEvents() {

    const panel =
        $("databaseGroupingPanel");


    if (!panel)
        return;


    panel.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".db-group-item"
                );


            if (!button)
                return;


            const type =
                button.dataset.groupFilter;


            const value =
                button.dataset.groupValue;


            applyGroupFilter(
                type,
                value
            );

        }
    );

}
/* =========================================
   APPLY GROUP FILTER
========================================= */

function applyGroupFilter(
    type,
    value
) {

    /*
        Clear current filters first.
    */

    clearDatabaseFilterValues();


    /*
        AGE
    */

    if (
        type === "age"
    ) {

        databaseFilters.age =
            convertAgeGroupValue(
                value
            );


        const select =
            $("databaseAgeFilter");


        if (select) {

            select.value =
                databaseFilters.age;

        }

    }


    /*
        GENDER
    */

    else if (
        type === "gender"
    ) {

        databaseFilters.gender =
            value;


        const select =
            $("databaseGenderFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        DISTRICT
    */

    else if (
        type === "district"
    ) {

        databaseFilters.district =
            value;


        const select =
            $("databaseDistrictFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        RELIGION
    */

    else if (
        type === "religion"
    ) {

        databaseFilters.religion =
            value;


        const select =
            $("databaseReligionFilter");


        if (select) {

            select.value =
                value;

        }

    }


    /*
        TRIBE
    */

    else if (
        type === "tribe"
    ) {

        databaseFilters.tribe =
            value;


        const select =
            $("databaseTribeFilter");


        if (select) {

            select.value =
                value;

        }

    }


    applyDatabaseFilters();

}
/* =========================================
   CLEAR FILTER VALUES
========================================= */

function clearDatabaseFilterValues() {

    databaseFilters.age = "";
    databaseFilters.gender = "";
    databaseFilters.district = "";
    databaseFilters.religion = "";
    databaseFilters.tribe = "";
    databaseFilters.education = "";
    databaseFilters.occupation = "";
    databaseFilters.status = "";


    const ids = [

        "databaseAgeFilter",
        "databaseGenderFilter",
        "databaseDistrictFilter",
        "databaseReligionFilter",
        "databaseTribeFilter",
        "databaseEducationFilter",
        "databaseOccupationFilter",
        "databaseStatusFilter"

    ];


    ids.forEach(
        id => {

            const element =
                $(id);


            if (element) {

                element.value = "";

            }

        }
    );

}


/* =========================================
   AGE GROUP VALUE
========================================= */

function convertAgeGroupValue(
    value
) {

    const normalized =
        String(
            value
        )
        .replace(
            /\s/g,
            ""
        );


    if (
        normalized ===
        "18-25"
    ) {

        return "18-25";

    }


    if (
        normalized ===
        "26-35"
    ) {

        return "26-35";

    }


    if (
        normalized ===
        "36-45"
    ) {

        return "36-45";

    }


    if (
        normalized ===
        "46-55"
    ) {

        return "46-55";

    }


    if (
        normalized ===
        "56+"
    ) {

        return "56+";

    }


    return "";

}
/* =========================================
   DATABASE ERROR
========================================= */

function showDatabaseError(
    message
) {

    const table =
        $("databaseRecordsTable");


    if (table) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    ">

                    <strong>
                        Database Error
                    </strong>

                    <br>

                    <span>
                        ${escapeHtml(
                            message
                        )}
                    </span>

                </td>

            </tr>

        `;

    }

}
/* =========================================
   DATABASE FILTER SYSTEM
========================================= */

const databaseFilters = {

    age: "",
    gender: "",
    district: "",
    religion: "",
    tribe: "",
    education: "",
    occupation: "",
    status: ""

};


/* =========================================
   ACCOUNT STATUS
========================================= */

function getAccountStatus(user) {

    return (
        user?.status ||
        user?.account?.status ||
        "Active"
    );

}


/* =========================================
   CHECK AGE GROUP
========================================= */

function matchesAgeGroup(
    user,
    selectedAge
) {

    if (!selectedAge) {

        return true;

    }


    const age =
        Number(
            getAge(user)
        );


    if (!age) {

        return selectedAge ===
            "unknown";

    }


    switch (selectedAge) {

        case "18-25":

            return age >= 18 &&
                   age <= 25;


        case "26-35":

            return age >= 26 &&
                   age <= 35;


        case "36-45":

            return age >= 36 &&
                   age <= 45;


        case "46-55":

            return age >= 46 &&
                   age <= 55;


        case "56+":

            return age >= 56;


        default:

            return true;

    }

}


/* =========================================
   CHECK ONE USER AGAINST FILTERS
========================================= */

function matchesDatabaseFilters(
    user
) {

    /*
        AGE
    */

    if (
        !matchesAgeGroup(
            user,
            databaseFilters.age
        )
    ) {

        return false;

    }


    /*
        GENDER
    */

    if (
        databaseFilters.gender
    ) {

        if (
            String(
                getGender(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.gender
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        DISTRICT
    */

    if (
        databaseFilters.district
    ) {

        if (
            String(
                getDistrict(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.district
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        RELIGION
    */

    if (
        databaseFilters.religion
    ) {

        if (
            String(
                getReligion(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.religion
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        TRIBE
    */

    if (
        databaseFilters.tribe
    ) {

        if (
            String(
                getTribe(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.tribe
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        EDUCATION
    */

    if (
        databaseFilters.education
    ) {

        if (
            String(
                getEducation(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.education
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        OCCUPATION
    */

    if (
        databaseFilters.occupation
    ) {

        if (
            String(
                getOccupation(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.occupation
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    /*
        ACCOUNT STATUS
    */

    if (
        databaseFilters.status
    ) {

        if (
            String(
                getAccountStatus(user)
            ).trim().toLowerCase()
            !==
            databaseFilters.status
                .trim()
                .toLowerCase()
        ) {

            return false;

        }

    }


    return true;

}


/* =========================================
   APPLY DATABASE FILTERS
========================================= */

function applyDatabaseFilters() {

    databaseState.filteredUsers =
        databaseState.users.filter(
            user =>
                matchesDatabaseFilters(
                    user
                )
        );


    updateFilteredSummary();

    renderDatabaseRecords();

    renderDatabaseGroups();

}


/* =========================================
   UPDATE FILTERED SUMMARY
========================================= */

function updateFilteredSummary() {

    const users =
        databaseState.filteredUsers;


    /*
        MATCHING RECORDS
    */

    const filteredCount =
        $("filteredRecordCount");


    if (filteredCount) {

        filteredCount.textContent =
            users.length
                .toLocaleString();

    }


    /*
        MALE
    */

    const maleCount =
        $("databaseMaleCount");


    if (maleCount) {

        maleCount.textContent =
            users.filter(
                user =>
                    String(
                        getGender(user)
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    "male"
            ).length
            .toLocaleString();

    }


    /*
        FEMALE
    */

    const femaleCount =
        $("databaseFemaleCount");


    if (femaleCount) {

        femaleCount.textContent =
            users.filter(
                user =>
                    String(
                        getGender(user)
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    "female"
            ).length
            .toLocaleString();

    }


    /*
        VERIFIED
    */

    const verifiedCount =
        $("databaseVerifiedCount");


    if (verifiedCount) {

        verifiedCount.textContent =
            users.filter(
                user =>
                    user?.verification?.status
                    ===
                    "approved"
            ).length
            .toLocaleString();

    }


    /*
        PREMIUM
    */

    const premiumCount =
        $("databasePremiumCount");


    if (premiumCount) {

        premiumCount.textContent =
            users.filter(
                user =>
                    user?.subscription?.active
                    ===
                    true
            ).length
            .toLocaleString();

    }

}


/* =========================================
   UNIQUE VALUES
========================================= */

function getUniqueDatabaseValues(
    getter
) {

    const values =
        new Set();


    databaseState.users.forEach(
        user => {

            const value =
                getter(user);


            if (
                value !== null &&
                value !== undefined &&
                String(value).trim()
            ) {

                values.add(
                    String(
                        value
                    ).trim()
                );

            }

        }
    );


    return [
        ...values
    ].sort(
        (
            a,
            b
        ) =>
            a.localeCompare(
                b
            )
    );

}


/* =========================================
   ADD OPTIONS TO SELECT
========================================= */

function populateDatabaseSelect(
    id,
    values
) {

    const select =
        $(id);


    if (!select)
        return;


    /*
        Preserve the first
        "All..." option.
    */

    const firstOption =
        select.options[0];


    select.innerHTML =
        "";


    if (firstOption) {

        select.appendChild(
            firstOption
        );

    }


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                value;


            option.textContent =
                value;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================
   POPULATE DATABASE FILTERS
========================================= */

function populateDatabaseFilters() {

    populateDatabaseSelect(

        "databaseDistrictFilter",

        getUniqueDatabaseValues(
            getDistrict
        )

    );


    populateDatabaseSelect(

        "databaseReligionFilter",

        getUniqueDatabaseValues(
            getReligion
        )

    );


    populateDatabaseSelect(

        "databaseTribeFilter",

        getUniqueDatabaseValues(
            getTribe
        )

    );


    populateDatabaseSelect(

        "databaseEducationFilter",

        getUniqueDatabaseValues(
            getEducation
        )

    );


    populateDatabaseSelect(

        "databaseOccupationFilter",

        getUniqueDatabaseValues(
            getOccupation
        )

    );

}


/* =========================================
   READ FILTER CONTROLS
========================================= */

function readDatabaseFilters() {

    databaseFilters.age =
        $("databaseAgeFilter")
        ?.value || "";


    databaseFilters.gender =
        $("databaseGenderFilter")
        ?.value || "";


    databaseFilters.district =
        $("databaseDistrictFilter")
        ?.value || "";


    databaseFilters.religion =
        $("databaseReligionFilter")
        ?.value || "";


    databaseFilters.tribe =
        $("databaseTribeFilter")
        ?.value || "";


    databaseFilters.education =
        $("databaseEducationFilter")
        ?.value || "";


    databaseFilters.occupation =
        $("databaseOccupationFilter")
        ?.value || "";


    databaseFilters.status =
        $("databaseStatusFilter")
        ?.value || "";

}


/* =========================================
   CLEAR FILTERS
========================================= */

function clearDatabaseFilters() {

    const filterIds = [

        "databaseAgeFilter",

        "databaseGenderFilter",

        "databaseDistrictFilter",

        "databaseReligionFilter",

        "databaseTribeFilter",

        "databaseEducationFilter",

        "databaseOccupationFilter",

        "databaseStatusFilter"

    ];


    filterIds.forEach(
        id => {

            const select =
                $(id);


            if (select) {

                select.value =
                    "";

            }

        }
    );


    readDatabaseFilters();

    applyDatabaseFilters();

}


/* =========================================
   FILTER EVENTS
========================================= */

function bindDatabaseFilterEvents() {


    /*
        Apply Filters button
    */

    $("applyDatabaseFilters")
        ?.addEventListener(
            "click",
            () => {

                readDatabaseFilters();

                applyDatabaseFilters();

            }
        );


    /*
        Clear Filters button
    */

    $("clearDatabaseFilters")
        ?.addEventListener(
            "click",
            clearDatabaseFilters
        );


    /*
        Optional:
        allow filters to update immediately
        when changed.
    */

    const filterIds = [

        "databaseAgeFilter",

        "databaseGenderFilter",

        "databaseDistrictFilter",

        "databaseReligionFilter",

        "databaseTribeFilter",

        "databaseEducationFilter",

        "databaseOccupationFilter",

        "databaseStatusFilter"

    ];


    filterIds.forEach(
        id => {

            const select =
                $(id);


            if (!select)
                return;


            select.addEventListener(
                "change",
                () => {

                    readDatabaseFilters();

                    applyDatabaseFilters();

                }
            );

        }
    );

}
async function initDatabaseCentre() {

    console.log(
        "Twagalane Database Centre starting..."
    );


    /*
        Load Firebase users first.
    */

    await loadDatabaseUsers();


    /*
        Build District, Religion,
        Tribe, Education and
        Occupation options.
    */

    populateDatabaseFilters();


    /*
        Connect filter controls.
    */

    bindDatabaseFilterEvents();


    /*
        Make sure summary values
        are correct on first load.
    */

  bindDatabaseImportEvents()
  
bindDatabaseGroupEvents();


  bindDatabaseExportEvents();


  
  

  
    updateFilteredSummary();


    console.log(
        "Twagalane Database Centre ready."
    );

}
/* =========================================
   DATABASE EXPORT CENTRE
   CSV / EXCEL / JSON / PDF / SQL / FIREBASE
========================================= */


/* =========================================
   CSV ESCAPE
========================================= */

function csvEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    const text =
        String(value);


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replaceAll(
            '"',
            '""'
        )}"`;

    }


    return text;

}


/* =========================================
   CREATE EXPORT RECORD
========================================= */

function createExportRecord(user) {

    const info =
        getPersonalInformation(user);


    return {

        UID:
            user.uid || "",

        Name:
            getName(user),

        Username:
            info.username ||
            user.username ||
            "",

        Email:
            getEmail(user),

        Phone:
            info.phoneNumber ||
            info.phone ||
            user.phoneNumber ||
            user.phone ||
            "",

        Gender:
            getGender(user),

        Age:
            getAge(user),

        DateOfBirth:
            info.dateOfBirth ||
            "",

        District:
            getDistrict(user),

        Religion:
            getReligion(user),

        Tribe:
            getTribe(user),

        Education:
            getEducation(user),

        Occupation:
            getOccupation(user),

        MaritalStatus:
            info.maritalStatus ||
            "",

        Verification:
            user?.verification?.status ===
            "approved"
                ? "Verified"
                : "Unverified",

        Subscription:
            user?.subscription?.active ===
            true
                ? "Premium"
                : "Free",

        AccountStatus:
            getAccountStatus(user)

    };

}


/* =========================================
   DOWNLOAD HELPER
========================================= */

function downloadDatabaseFile(
    content,
    filename,
    type
) {

    const blob =
        content instanceof Blob

        ? content

        :

        new Blob(
            [content],
            {
                type
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );

}


/* =========================================
   FILE DATE
========================================= */

function exportDate() {

    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );

}


/* =========================================
   1. CSV EXPORT
========================================= */

function exportDatabaseCSV() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const records =
        users.map(
            createExportRecord
        );


    const headers =
        Object.keys(
            records[0]
        );


    const lines = [];


    lines.push(
        headers
            .map(
                csvEscape
            )
            .join(",")
    );


    records.forEach(
        record => {

            lines.push(

                headers
                    .map(
                        header =>
                            csvEscape(
                                record[
                                    header
                                ]
                            )
                    )
                    .join(",")

            );

        }
    );


    const csv =
        lines.join(
            "\r\n"
        );


    downloadDatabaseFile(

        "\uFEFF" + csv,

        `twagalane-database-${exportDate()}.csv`,

        "text/csv;charset=utf-8;"

    );


    console.log(
        `CSV exported: ${users.length} records`
    );

}


/* =========================================
   2. EXCEL EXPORT
========================================= */

function loadExcelLibrary() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                window.XLSX
            ) {

                resolve(
                    window.XLSX
                );

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";


            script.onload =
                () => {

                    if (
                        window.XLSX
                    ) {

                        resolve(
                            window.XLSX
                        );

                    } else {

                        reject(
                            new Error(
                                "Excel library unavailable."
                            )
                        );

                    }

                };


            script.onerror =
                () => {

                    reject(
                        new Error(
                            "Unable to load Excel library."
                        )
                    );

                };


            document.head.appendChild(
                script
            );

        }
    );

}


async function exportDatabaseExcel() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {
showImportMessage(
        "There are no records to export.",
        "warning"
    );
        return;

    }


    try {

        const XLSX =
            await loadExcelLibrary();


        const records =
            users.map(
                createExportRecord
            );


        const worksheet =
            XLSX.utils.json_to_sheet(
                records
            );


        /*
            Make columns reasonably wide.
        */

        worksheet["!cols"] =
            [

                {
                    wch: 25
                },

                {
                    wch: 25
                },

                {
                    wch: 18
                },

                {
                    wch: 30
                },

                {
                    wch: 18
                },

                {
                    wch: 12
                },

                {
                    wch: 8
                },

                {
                    wch: 15
                },

                {
                    wch: 18
                },

                {
                    wch: 18
                },

                {
                    wch: 18
                },

                {
                    wch: 22
                },

                {
                    wch: 22
                },

                {
                    wch: 20
                },

                {
                    wch: 15
                },

                {
                    wch: 15
                },

                {
                    wch: 18
                }

            ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(

            workbook,

            worksheet,

            "Users"

        );


        /*
            Add a second sheet showing
            the current filters.
        */

        const filterSheet =
            XLSX.utils.aoa_to_sheet(

                [

                    [
                        "Twagalane Database Export"
                    ],

                    [
                        "Generated",
                        new Date()
                            .toLocaleString()
                    ],

                    [
                        "Records",
                        users.length
                    ],

                    [],

                    [
                        "Filter",
                        "Value"
                    ],

                    [
                        "Age",
                        databaseFilters.age ||
                        "All"
                    ],

                    [
                        "Gender",
                        databaseFilters.gender ||
                        "All"
                    ],

                    [
                        "District",
                        databaseFilters.district ||
                        "All"
                    ],

                    [
                        "Religion",
                        databaseFilters.religion ||
                        "All"
                    ],

                    [
                        "Tribe",
                        databaseFilters.tribe ||
                        "All"
                    ],

                    [
                        "Education",
                        databaseFilters.education ||
                        "All"
                    ],

                    [
                        "Occupation",
                        databaseFilters.occupation ||
                        "All"
                    ],

                    [
                        "Account Status",
                        databaseFilters.status ||
                        "All"
                    ]

                ]

            );


        XLSX.utils.book_append_sheet(

            workbook,

            filterSheet,

            "Export Information"

        );


        XLSX.writeFile(

            workbook,

            `twagalane-database-${exportDate()}.xlsx`

        );


        console.log(
            `Excel exported: ${users.length} records`
        );


    } catch (error) {

        console.error(
            "Excel export failed:",
            error
        );

showImportMessage(
    "Excel export failed. Check your internet connection and try again.",
    "error"
);

    }

}


/* =========================================
   3. JSON EXPORT
========================================= */

function exportDatabaseJSON() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

       showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const exportData = {

        exportType:
            "TWAGALANE_FILTERED_DATABASE",

        version:
            1,

        generatedAt:
            new Date().toISOString(),

        generatedBy:
            "Super Admin",

        totalRecords:
            users.length,

        filters:
            {
                ...databaseFilters
            },

        users

    };


    downloadDatabaseFile(

        JSON.stringify(
            exportData,
            null,
            2
        ),

        `twagalane-database-${exportDate()}.json`,

        "application/json"

    );


    console.log(
        `JSON exported: ${users.length} records`
    );

}


/* =========================================
   4. FULL FIREBASE BACKUP
========================================= */

async function exportFirebaseBackup() {

    try {

        const confirmBackup =
            confirm(

                "Create a complete Firebase database backup?\n\n" +

                "This will export the entire database, not just the currently filtered users."

            );


        if (!confirmBackup)
            return;


        console.log(
            "Creating full Firebase backup..."
        );


        const databaseRef =
            ref(db);


        const snapshot =
            await get(
                databaseRef
            );


        if (
            !snapshot.exists()
        ) {

            alert(
                "Firebase database is empty."
            );

            return;

        }


        const backup = {

            backupType:
                "TWAGALANE_FULL_FIREBASE_BACKUP",

            version:
                1,

            createdAt:
                new Date().toISOString(),

            data:
                snapshot.val()

        };


        downloadDatabaseFile(

            JSON.stringify(
                backup,
                null,
                2
            ),

            `twagalane-full-backup-${exportDate()}.json`,

            "application/json"

        );


        console.log(
            "Full Firebase backup exported."
        );


    } catch (error) {

        console.error(
            "Firebase backup failed:",
            error
        );


        alert(
            "Firebase backup failed."
        );

    }

}


/* =========================================
   5. PDF REPORT
========================================= */

function exportDatabasePDF() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);
        return;

    }


    /*
        Open a printable report.
        The administrator can choose
        Save as PDF from the browser.
    */

    const report =
        window.open(
            "",
            "_blank"
        );


    if (!report) {

     showImportMessage(
        "Please allow popups for PDF export.",
        "warning"
    );
        return;

    }


    const rows =
        users
            .slice(
                0,
                1000
            )
            .map(
                user => {

                    const info =
                        getPersonalInformation(
                            user
                        );


                    return `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    getName(user)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGender(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getAge(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getDistrict(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getReligion(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getOccupation(user) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${
                                    user?.verification?.status ===
                                    "approved"
                                    ? "Verified"
                                    : "Unverified"
                                }
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    report.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                Twagalane Database Report
            </title>


            <style>

                * {
                    box-sizing: border-box;
                }


                body {

                    margin: 0;

                    padding: 35px;

                    font-family:
                        Arial,
                        sans-serif;

                    color:
                        #111827;

                    background:
                        #ffffff;

                }


                .header {

                    border-bottom:
                        2px solid #4F46E5;

                    padding-bottom:
                        20px;

                    margin-bottom:
                        25px;

                }


                h1 {

                    margin:
                        0 0 7px;

                    font-size:
                        25px;

                }


                .subtitle {

                    color:
                        #64748B;

                    font-size:
                        12px;

                }


                .summary {

                    display:
                        flex;

                    gap:
                        20px;

                    margin-bottom:
                        25px;

                }


                .summary-card {

                    padding:
                        12px 18px;

                    background:
                        #F8FAFC;

                    border:
                        1px solid #E2E8F0;

                    border-radius:
                        8px;

                }


                .summary-card strong {

                    display:
                        block;

                    font-size:
                        20px;

                }


                .summary-card span {

                    font-size:
                        10px;

                    color:
                        #64748B;

                }


                table {

                    width:
                        100%;

                    border-collapse:
                        collapse;

                }


                th {

                    background:
                        #F1F5F9;

                    font-weight:
                        700;

                }


                th,
                td {

                    border:
                        1px solid #E2E8F0;

                    padding:
                        7px;

                    text-align:
                        left;

                    font-size:
                        9px;

                }


                .print-button {

                    margin-bottom:
                        20px;

                    padding:
                        10px 18px;

                    border:
                        0;

                    border-radius:
                        7px;

                    background:
                        #4F46E5;

                    color:
                        #ffffff;

                    cursor:
                        pointer;

                }


                @media print {

                    .print-button {

                        display:
                            none;

                    }

                }

            </style>

        </head>


        <body>


            <div class="header">

                <h1>
                    Twagalane Database Report
                </h1>

                <div class="subtitle">

                    Generated:
                    ${new Date().toLocaleString()}

                </div>

            </div>


          <button
                class="print-button"
                onclick="window.print()">

                Print / Save as PDF

            </button>


            <div class="summary">


                <div class="summary-card">

                    <strong>
                        ${users.length.toLocaleString()}
                    </strong>

                    <span>
                        Records
                    </span>

                </div>


                <div class="summary-card">

                    <strong>
                        ${
                            users.filter(
                                user =>
                                    String(
                                        getGender(user)
                                    )
                                    .toLowerCase()
                                    ===
                                    "male"
                            ).length
                        }
                    </strong>

                    <span>
                        Male
                    </span>

                </div>


                <div class="summary-card">

                    <strong>
                        ${
                            users.filter(
                                user =>
                                    String(
                                        getGender(user)
                                    )
                                    .toLowerCase()
                                    ===
                                    "female"
                            ).length
                        }
                    </strong>

                    <span>
                        Female
                    </span>

                </div>


            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            Name
                        </th>

                        <th>
                            Gender
                        </th>

                        <th>
                            Age
                        </th>

                        <th>
                            District
                        </th>

                        <th>
                            Religion
                        </th>

                        <th>
                            Occupation
                        </th>

                        <th>
                            Verification
                        </th>

                    </tr>

                </thead>

<tbody>

                    ${rows}

                </tbody>

            </table>


        </body>

        </html>

    `);


    report.document.close();


    console.log(
        `PDF report prepared: ${users.length} records`
    );

}


/* =========================================
   6. SQL EXPORT
========================================= */

function sqlEscape(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "NULL";

    }


    const text =
        String(value)
            .replaceAll(
                "'",
                "''"
            );


    return `'${text}'`;

}


function exportDatabaseSQL() {

    const users =
        databaseState.filteredUsers;


    if (!users.length) {

        showImportMessage(
    "There are no records to export.",
    "warning"
);

        return;

    }


    const lines = [];


    lines.push(
        "-- TWAGALANE DATABASE EXPORT"
    );


    lines.push(
        `-- Generated: ${new Date().toISOString()}`
    );


    lines.push(
        `-- Records: ${users.length}`
    );


    lines.push("");


    lines.push(

        "CREATE TABLE IF NOT EXISTS users (" +

        "uid VARCHAR(255) PRIMARY KEY," +

        "name VARCHAR(255)," +

        "username VARCHAR(255)," +

        "email VARCHAR(255)," +

        "phone VARCHAR(100)," +

        "gender VARCHAR(50)," +

        "age INT," +

        "date_of_birth VARCHAR(50)," +

        "district VARCHAR(255)," +

        "religion VARCHAR(255)," +

        "tribe VARCHAR(255)," +

        "education VARCHAR(255)," +

        "occupation VARCHAR(255)," +

        "marital_status VARCHAR(100)," +

        "verification VARCHAR(50)," +

        "subscription VARCHAR(50)," +

        "account_status VARCHAR(50)" +

        ");"

    );


    lines.push("");

    users.forEach(
        user => {

            const record =
                createExportRecord(user);

            lines.push(
                "INSERT INTO users (" +
                "uid,name,username,email,phone," +
                "gender,age,date_of_birth,district," +
                "religion,tribe,education,occupation," +
                "marital_status,verification," +
                "subscription,account_status" +
                ") VALUES (" +

                [
                    sqlEscape(record.UID),
                    sqlEscape(record.Name),
                    sqlEscape(record.Username),
                    sqlEscape(record.Email),
                    sqlEscape(record.Phone),
                    sqlEscape(record.Gender),

                    record.Age
                        ? Number(record.Age) || "NULL"
                        : "NULL",

                    sqlEscape(record.DateOfBirth),
                    sqlEscape(record.District),
                    sqlEscape(record.Religion),
                    sqlEscape(record.Tribe),
                    sqlEscape(record.Education),
                    sqlEscape(record.Occupation),
                    sqlEscape(record.MaritalStatus),
                    sqlEscape(record.Verification),
                    sqlEscape(record.Subscription),
                    sqlEscape(record.AccountStatus)

                ].join(",") +

                ");"
            );

        }
    );

    downloadDatabaseFile(
        lines.join("\n"),
        `twagalane-database-${exportDate()}.sql`,
        "application/sql"
    );

    console.log(
        `SQL exported: ${users.length} records`
    );

}

/* =========================================
   EXPORT BUTTON EVENTS
========================================= */

function bindDatabaseExportEvents() {

    $("exportCsvBtn")
        ?.addEventListener("click", exportDatabaseCSV);

    $("exportExcelBtn")
        ?.addEventListener("click", exportDatabaseExcel);

    $("exportJsonBtn")
        ?.addEventListener("click", exportDatabaseJSON);

    $("exportPdfBtn")
        ?.addEventListener("click", exportDatabasePDF);

    $("exportSqlBtn")
        ?.addEventListener("click", exportDatabaseSQL);

    $("exportFirebaseBtn")
        ?.addEventListener("click", exportFirebaseBackup);

}
  
  /* =========================================
   DATABASE IMPORT CENTRE
========================================= */

let selectedImportFile = null;

let importedRecords = [];

/* =========================================
   IMPORT FILE EVENTS
========================================= */

function bindDatabaseImportEvents() {

    const importButton =
        $("importDatabaseBtn");

    const fileInput =
        $("databaseFileInput");

    if (!fileInput) {

        console.warn(
            "databaseFileInput not found."
        );

        return;

    }


    /*
        IMPORT BUTTON
        ---------------------------------
        Only use JavaScript click when
        the button itself is clicked.
    */


    /*
        FILE SELECTED
    */

    fileInput.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files &&
                event.target.files[0];


            if (!file) {

                return;

            }


            selectedImportFile =
                file;


            console.log(
                "Import file selected:",
                file.name,
                file.type,
                file.size
            );


            try {

                await processImportFile(
                    file
                );

            } catch (error) {

                console.error(
                    "File processing failed:",
                    error
                );

                showImportMessage(
                    "Unable to process the selected file.",
                    "error"
                );

            }


            /*
                Allows the user to select
                the SAME file again.
            */

            fileInput.value = "";

        }
    );


    /*
        AUTO MAP
    */

    $("autoMapImportBtn")
        ?.addEventListener(
            "click",
            autoMapImportedFields
        );


    /*
        VALIDATE MAPPING
    */

    $("validateMappedImportBtn")
        ?.addEventListener(
            "click",
            () => {

                if (
                    !validateImportMapping()
                ) {

                    return;

                }


                const results =
                    validateImportedRecords();


                showImportValidationResults(
                    results
                );

            }
        );

}

  /* =========================================
   IMPORT MAPPING VALIDATION
========================================= */

function getCurrentImportMapping() {

    const mapping = {};

    const selects =
        document.querySelectorAll(
            ".import-field-select"
        );


    selects.forEach(
        select => {

            const source =
                select.dataset.source;

            const target =
                select.value;


            if (
                source &&
                target
            ) {

                mapping[
                    source
                ] = target;

            }

        }
    );


    return mapping;

}


/* =========================================
   CHECK REQUIRED MAPPING
========================================= */

function validateImportMapping() {

    const mapping =
        getCurrentImportMapping();


    const mappedFields =
        Object.values(
            mapping
        );


    const requiredFields =
        importFields.filter(
            field =>
                field.required
        );


    const missingRequired =
        requiredFields.filter(
            field =>
                !mappedFields.includes(
                    field.key
                )
        );


    if (
        missingRequired.length
    ) {

        showImportMessage(

            `Required field missing: ${missingRequired.map(
                field =>
                    field.label
            ).join(", ")}`,

            "warning"

        );


        return false;

    }


    /*
        Prevent two old columns from
        being mapped to the same field.
    */

    const duplicates =
        mappedFields.filter(
            (
                value,
                index,
                array
            ) =>
                array.indexOf(
                    value
                ) !== index
        );


    if (
        duplicates.length
    ) {

        showImportMessage(

            "Two or more columns are mapped to the same Twagalane field. Please correct the mapping.",

            "warning"

        );


        return false;

    }


    return true;

}
  /* =========================================
   VALIDATE IMPORTED RECORDS
========================================= */

function validateImportedRecords() {

    const mapping =
        getCurrentImportMapping();


    const results = {

        valid: [],

        invalid: [],

        duplicates: [],

        total:
            importedRecords.length

    };


    const seenEmails =
        new Set();

    const seenPhones =
        new Set();


    /*
        Existing Firebase users
    */

    const existingEmails =
        new Set();

    const existingPhones =
        new Set();

    const existingUids =
        new Set();


    databaseState.users.forEach(
        user => {

            const email =
                String(
                    getEmail(user) || ""
                )
                .trim()
                .toLowerCase();


            const phone =
                String(
                    getPhoneForImport(user) || ""
                )
                .trim();


            if (email) {

                existingEmails.add(
                    email
                );

            }


            if (phone) {

                existingPhones.add(
                    phone
                );

            }


            if (user.uid) {

                existingUids.add(
                    String(
                        user.uid
                    )
                );

            }

        }
    );


    importedRecords.forEach(
        (
            record,
            index
        ) => {

            const mapped =
                mapImportedRecord(
                    record,
                    mapping
                );


            const problems = [];


            /*
                NAME
            */

            if (
                !String(
                    mapped.name || ""
                ).trim()
            ) {

                problems.push(
                    "Missing name"
                );

            }


            /*
                EMAIL
            */

            const email =
                String(
                    mapped.email || ""
                )
                .trim()
                .toLowerCase();


            if (
                email &&
                !isValidImportEmail(
                    email
                )
            ) {

                problems.push(
                    "Invalid email"
                );

            }


            /*
                AGE
            */

            if (
                mapped.age !== "" &&
                mapped.age !== null &&
                mapped.age !== undefined
            ) {

                const age =
                    Number(
                        mapped.age
                    );


                if (
                    !Number.isFinite(
                        age
                    ) ||
                    age < 0 ||
                    age > 120
                ) {

                    problems.push(
                        "Invalid age"
                    );

                }

            }


            /*
                DUPLICATE EMAIL
            */

            if (email) {

                if (
                    seenEmails.has(
                        email
                    ) ||
                    existingEmails.has(
                        email
                    )
                ) {

                    problems.push(
                        "Duplicate email"
                    );

                }


                seenEmails.add(
                    email
                );

            }


            /*
                DUPLICATE PHONE
            */

            const phone =
                String(
                    mapped.phone || ""
                )
                .trim();


            if (phone) {

                if (
                    seenPhones.has(
                        phone
                    ) ||
                    existingPhones.has(
                        phone
                    )
                ) {

                    problems.push(
                        "Duplicate phone"
                    );

                }


                seenPhones.add(
                    phone
                );

            }


            /*
                DUPLICATE UID
            */

            const uid =
                String(
                    mapped.uid || ""
                ).trim();


            if (
                uid &&
                existingUids.has(
                    uid
                )
            ) {

                problems.push(
                    "Existing Firebase UID"
                );

            }


            const result = {

                row:
                    index + 2,

                original:
                    record,

                mapped,

                problems

            };


            if (
                problems.length
            ) {

                if (
                    problems.some(
                        problem =>
                            problem.includes(
                                "Duplicate"
                            ) ||
                            problem.includes(
                                "Existing Firebase UID"
                            )
                    )
                ) {

                    results.duplicates.push(
                        result
                    );

                } else {

                    results.invalid.push(
                        result
                    );

                }

            } else {

                results.valid.push(
                    result
                );

            }

        }
    );


    return results;

}

  /* =========================================
   MAP ONE IMPORTED RECORD
========================================= */

function mapImportedRecord(
    record,
    mapping
) {

    const mapped = {};


    Object.entries(
        mapping
    ).forEach(
        (
            [
                source,
                target
            ]
        ) => {

            mapped[
                target
            ] =
                record[
                    source
                ];

        }
    );


    return mapped;

}
/* =========================================
   BUILD FIREBASE IMPORT RECORD
========================================= */

function buildFirebaseImportRecord(
    mapped,
    originalUid = ""
) {

    const record = {};


    /*
        Firebase UID
    */

    if (
        originalUid
    ) {

        record.uid =
            String(
                originalUid
            ).trim();

    }


    /*
        PERSONAL INFORMATION
    */

    record.personalInformation = {

        fullName:
            String(
                mapped.name || ""
            ).trim(),

        email:
            String(
                mapped.email || ""
            ).trim(),

        phone:
            String(
                mapped.phone || ""
            ).trim(),

        gender:
            String(
                mapped.gender || ""
            ).trim(),

        dateOfBirth:
            String(
                mapped.dateOfBirth || ""
            ).trim(),

        age:
            mapped.age !== undefined &&
            mapped.age !== null &&
            mapped.age !== ""
                ? Number(
                    mapped.age
                )
                : "",

        religion:
            String(
                mapped.religion || ""
            ).trim(),

        tribe:
            String(
                mapped.tribe || ""
            ).trim(),

        education:
            String(
                mapped.education || ""
            ).trim(),

        occupation:
            String(
                mapped.occupation || ""
            ).trim(),

        maritalStatus:
            String(
                mapped.maritalStatus || ""
            ).trim(),

        username:
            String(
                mapped.username || ""
            ).trim()

    };


    /*
        PHONE COMPATIBILITY
    */

    if (
        record.personalInformation.phone
    ) {

        record.personalInformation.phoneNumber =
            record.personalInformation.phone;

    }


    /*
        LOCATION
    */

    if (
        mapped.district
    ) {

        record.location = {

            home: {

                district:
                    String(
                        mapped.district
                    ).trim()

            }

        };

    }


    /*
        PRESERVE IMPORTED UID
        when available.
    */

    if (
        mapped.uid
    ) {

        record.uid =
            String(
                mapped.uid
            ).trim();

    }


    return record;

}
/* =========================================
   GENERATE SAFE IMPORT UID
========================================= */

function generateImportUID() {

    const usersRef =
        ref(
            db,
            "users"
        );

    const newUserRef =
        push(
            usersRef
        );

    return newUserRef.key;

}
/* =========================================
   PREPARE IMPORTED USER
========================================= */

function prepareImportedFirebaseUser(
    validationResult
) {

    const mapped =
        validationResult.mapped;


    const importedUid =
        String(
            mapped.uid || ""
        ).trim();


    const uid =
        importedUid ||
        generateImportUID();


    const firebaseUser =
        buildFirebaseImportRecord(
            mapped,
            uid
        );


    /*
        Never allow the imported UID
        to remain inside the user object.
        The UID is the Firebase database key.
    */

    delete firebaseUser.uid;


    return {

        uid,

        data:
            firebaseUser

    };

}

/* =========================================
   IMPORT PROGRESS
========================================= */

function showImportProgress(
    current,
    total,
    message
) {

    let panel =
        document.getElementById(
            "databaseImportProgress"
        );


    if (!panel) {

        panel =
            document.createElement(
                "div"
            );

        panel.id =
            "databaseImportProgress";

        panel.className =
            "database-import-progress";


        const container =
            $("databaseImportMapping") ||
            document.body;


        container.appendChild(
            panel
        );

    }


    const percentage =
        total > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        current /
                        total
                    ) * 100
                )
            )
            : 0;


    panel.innerHTML = `

        <div class="import-progress-header">

            <div>

                <span>
                    DATABASE IMPORT
                </span>

                <strong>
                    ${message}
                </strong>

            </div>


            <b>
                ${percentage}%
            </b>

        </div>


        <div
            class="import-progress-track">

            <div
                class="import-progress-bar"
                style="width:${percentage}%">
            </div>

        </div>


        <div
            class="import-progress-count">

            ${current.toLocaleString()}
            /
            ${total.toLocaleString()}
            records

        </div>

    `;

}

/* =========================================
   IMPORT COMPLETION REPORT
========================================= */

function showImportCompletionReport({
    imported = 0,
    skipped = 0,
    invalid = 0,
    failed = 0,
    total = 0
}) {

    const oldReport =
        document.getElementById(
            "importCompletionReport"
        );

    if (oldReport) {
        oldReport.remove();
    }


    const report =
        document.createElement(
            "div"
        );


    report.id =
        "importCompletionReport";


    report.className =
        "import-completion-report";


    report.innerHTML = `

        <div class="completion-icon">
            ✓
        </div>


        <div class="completion-content">

            <span class="completion-kicker">
                DATABASE IMPORT
            </span>


            <h3>
                Import completed
            </h3>


            <p>
                The database import process has finished.
            </p>


            <div class="completion-stats">

                <div>
                    <strong>
                        ${imported.toLocaleString()}
                    </strong>

                    <span>
                        Imported
                    </span>
                </div>


                <div>
                    <strong>
                        ${skipped.toLocaleString()}
                    </strong>

                    <span>
                        Skipped
                    </span>
                </div>


                <div>
                    <strong>
                        ${invalid.toLocaleString()}
                    </strong>

                    <span>
                        Invalid
                    </span>
                </div>


                <div>
                    <strong>
                        ${failed.toLocaleString()}
                    </strong>

                    <span>
                        Failed
                    </span>
                </div>

            </div>


            <div class="completion-total">

                <span>
                    Total processed
                </span>

                <strong>
                    ${total.toLocaleString()}
                </strong>

            </div>


            <div class="completion-actions">

                <button
                    type="button"
                    id="closeImportCompletion"
                    class="secondary-btn">

                    Close

                </button>

            </div>

        </div>

    `;


    const container =
        $("databaseImportMapping");


    if (container) {

        container.appendChild(
            report
        );

    } else {

        document.body.appendChild(
            report
        );

    }


    report
        .querySelector(
            "#closeImportCompletion"
        )
        ?.addEventListener(
            "click",
            () => {

                report.remove();

            }
        );

}

/* =========================================
   IMPORT VALID RECORDS TO FIREBASE
========================================= */

async function startDatabaseImport(
    results,
    duplicateMode = "skip"
) {

    if (!results) {

        showImportMessage(
            "No import results were supplied.",
            "warning"
        );

        return;

    }


    /*
        Start with valid records.
    */

    const recordsToImport = [
        ...(results.valid || [])
    ];


    /*
        If admin selected
        "Import as new", include duplicates.
    */

    if (
        duplicateMode === "new"
    ) {

        recordsToImport.push(
            ...(results.duplicates || [])
        );

    }


    /*
        Nothing to import.
    */

    if (
        !recordsToImport.length
    ) {

        showImportMessage(
            "There are no records ready for import.",
            "warning"
        );

        return;

    }


    try {

        showImportMessage(
            "Preparing records for Firebase...",
            "info"
        );


        const BATCH_SIZE =
            200;


        let importedCount =
            0;


        let failedCount =
            0;


        const total =
            recordsToImport.length;


        /*
            Start progress.
        */

        showImportProgress(
            0,
            total,
            "Preparing records..."
        );


        /*
            Import in batches.
        */

        for (
            let start = 0;
            start < total;
            start += BATCH_SIZE
        ) {

            const batch =
                recordsToImport.slice(
                    start,
                    start + BATCH_SIZE
                );


            const updates = {};


            batch.forEach(
                validationResult => {

                    const prepared =
                        prepareImportedFirebaseUser(
                            validationResult
                        );


                    updates[
                        `users/${prepared.uid}`
                    ] =
                        prepared.data;

                }
            );


            /*
                Write batch to Firebase.
            */

            try {

                await update(
                    ref(db),
                    updates
                );


                /*
                    Count ONLY after
                    Firebase succeeds.
                */

                importedCount +=
                    batch.length;


            } catch (error) {

                console.error(
                    "Import batch failed:",
                    error
                );


                failedCount +=
                    batch.length;

            }


            /*
                Update real progress.
            */

            const processed =
                importedCount +
                failedCount;


            showImportProgress(
                processed,
                total,
                `Processed ${processed.toLocaleString()} of ${total.toLocaleString()} records`
            );

        }


        /*
            Import complete.
        */

        showImportProgress(
            total,
            total,
            "Import complete"
        );


        /*
            Show final report.
        */

        showImportCompletionReport({

            imported:
                importedCount,

            skipped:
                duplicateMode === "skip"
                    ? (
                        results.duplicates?.length ||
                        0
                    )
                    : 0,

            invalid:
                results.invalid?.length ||
                0,

            failed:
                failedCount,

            total:
                total +
                (
                    results.invalid?.length ||
                    0
                ) +
                (
                    duplicateMode === "skip"
                        ? (
                            results.duplicates?.length ||
                            0
                        )
                        : 0
                )

        });


        if (
            failedCount === 0
        ) {

            showImportMessage(
                `${importedCount.toLocaleString()} records imported successfully.`,
                "success"
            );

        } else {

            showImportMessage(
                `${importedCount.toLocaleString()} imported, ${failedCount.toLocaleString()} failed.`,
                "warning"
            );

        }


        /*
            Refresh database.
        */

        await loadDatabaseUsers();


        populateDatabaseFilters();


        showImportMessage(
            "Database refreshed successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Firebase database import failed:",
            error
        );


        showImportMessage(
            "Import failed. No further records were processed.",
            "error"
        );

    }

}
/* =========================================
   EMAIL VALIDATION
========================================= */

function isValidImportEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );

}


/* =========================================
   PHONE READER
========================================= */

function getPhoneForImport(
    user
) {

    const info =
        getPersonalInformation(
            user
        );


    return (
        info.phone ||
        info.phoneNumber ||
        user.phone ||
        user.phoneNumber ||
        ""
    );

}
/* =========================================
   SHOW VALIDATION RESULTS
========================================= */

function showImportValidationResults(
    results
) {

    const status =
        $("mappingStatus");


    if (status) {

        status.textContent =
            "Validation complete";

    }


    const existing =
        document.getElementById(
            "importValidationResults"
        );


    if (existing) {

        existing.remove();

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "importValidationResults";


    panel.className =
        "import-validation-results";


    panel.innerHTML = `

        <div
            class="validation-header">

            <div>

                <span>
                    Import Validation
                </span>

                <h3>
                    ${results.total.toLocaleString()}
                    records checked
                </h3>

            </div>

        </div>


        <div
            class="validation-stats">


            <div
                class="validation-stat valid">

                <strong>
                    ${results.valid.length.toLocaleString()}
                </strong>

                <span>
                    Valid
                </span>

            </div>


            <div
                class="validation-stat duplicate">

                <strong>
                    ${results.duplicates.length.toLocaleString()}
                </strong>

                <span>
                    Duplicates
                </span>

            </div>


            <div
                class="validation-stat invalid">

                <strong>
                    ${results.invalid.length.toLocaleString()}
                </strong>

                <span>
                    Invalid
                </span>

            </div>

        </div>


        <div
            class="validation-message">

            ${
                results.invalid.length === 0 &&
                results.duplicates.length === 0

                ?

                `
                    <span class="validation-check">
                        ✓
                    </span>

                    <div>

                        <strong>
                            Ready to import
                        </strong>

                        <p>
                            All records passed validation.
                        </p>

                    </div>
                `

                :

                `
                    <span class="validation-warning">
                        !
                    </span>

                    <div>

                        <strong>
                            Review required
                        </strong>

                        <p>
                            Some records need attention
                            before importing.
                        </p>

                    </div>
                `

            }

        </div>


        <div
            class="validation-actions">

            <button
                type="button"
                id="cancelImportValidationBtn"
                class="secondary-btn">

                Cancel

            </button>


            <button
                type="button"
                id="continueImportBtn"
                class="primary-btn"
                ${
                    results.valid.length === 0
                    ? "disabled"
                    : ""
                }>

                Continue Import

            </button>

        </div>

    `;


    const mappingPanel =
        $("databaseImportMapping");


    if (
        mappingPanel
    ) {

        mappingPanel.appendChild(
            panel
        );

    }


    /*
        Save results for next phase.
    */

    window.databaseImportValidation =
        results;


    /*
        Continue button.
    */
  panel
    .querySelector(
        "#continueImportBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            showImportDecisionPanel(
                results
            );

        }
    );
    /*
        Cancel.
    */

    panel
        .querySelector(
            "#cancelImportValidationBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                panel.remove();

            }
        );

}

/* =========================================
   IMPORT DECISION PANEL
========================================= */

function showImportDecisionPanel(
    results
) {

    const existing =
        document.getElementById(
            "importDecisionPanel"
        );


    if (existing) {

        existing.remove();

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "importDecisionPanel";


    panel.className =
        "import-decision-panel";


    panel.innerHTML = `

        <div
            class="decision-icon">

            ⇩

        </div>


        <div
            class="decision-content">

            <span
                class="decision-kicker">

                READY TO IMPORT

            </span>


            <h3>
                Choose how to handle duplicates
            </h3>


            <p>

                ${results.valid.length.toLocaleString()}
                clean records are ready.

                ${
                    results.duplicates.length
                        ? `${results.duplicates.length.toLocaleString()} duplicate records were detected.`
                        : "No duplicates were detected."
                }

            </p>


            <div
                class="decision-options">


                <label
                    class="decision-option selected">

                    <input
                        type="radio"
                        name="importDuplicateMode"
                        value="skip"
                        checked>

                    <span>

                        <strong>
                            Skip duplicates
                        </strong>

                        <small>
                            Keep existing Firebase accounts unchanged.
                        </small>

                    </span>

                </label>


                <label
                    class="decision-option">

                    <input
                        type="radio"
                        name="importDuplicateMode"
                        value="new">

                    <span>

                        <strong>
                            Import as new accounts
                        </strong>

                        <small>
                            Create new Firebase IDs for duplicate records.
                        </small>

                    </span>

                </label>


            </div>


            <div
                class="decision-actions">

                <button
                    type="button"
                    id="cancelImportDecisionBtn"
                    class="secondary-btn">

                    Back

                </button>


                <button
                    type="button"
                    id="confirmImportDecisionBtn"
                    class="primary-btn">

                    Import Records

                </button>

            </div>

        </div>

    `;


    const mappingPanel =
        $("databaseImportMapping");


    if (
        mappingPanel
    ) {

        mappingPanel.appendChild(
            panel
        );

    }


    /*
        Highlight selected option
    */

    panel
        .querySelectorAll(
            ".decision-option"
        )
        .forEach(
            option => {

                option
                    .addEventListener(
                        "click",
                        () => {

                            panel
                                .querySelectorAll(
                                    ".decision-option"
                                )
                                .forEach(
                                    item =>
                                        item.classList.remove(
                                            "selected"
                                        )
                                );


                            option.classList.add(
                                "selected"
                            );


                            const radio =
                                option.querySelector(
                                    "input"
                                );


                            if (radio) {

                                radio.checked =
                                    true;

                            }

                        }
                    );

            }
        );


    /*
        Cancel
    */

    panel
        .querySelector(
            "#cancelImportDecisionBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                panel.remove();

            }
        );


    /*
        Confirm
    */

    panel
        .querySelector(
            "#confirmImportDecisionBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                const selected =
                    panel.querySelector(
                        'input[name="importDuplicateMode"]:checked'
                    );


                const mode =
                    selected
                        ? selected.value
                        : "skip";


                panel.remove();


                startDatabaseImport(
                    results,
                    mode
                );

            }
        );

}


/* =========================================
   PROCESS IMPORT FILE
========================================= */

async function processImportFile(
    file
) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    console.log(
        "Import format:",
        extension
    );


    try {

        if (
            extension === "json"
        ) {

            await importJSONFile(
                file
            );

            return;

        }


        if (
            extension === "csv"
        ) {

            await importCSVFile(
                file
            );

            return;

        }


        if (
            extension === "xlsx" ||
            extension === "xls"
        ) {

            await importExcelFile(
                file
            );

            return;

        }


        /*
            These formats will have their
            own parsers later.
        */

        if (
            [
                "sql",
                "mdb",
                "accdb",
                "doc",
                "docx",
                "pdf",
                "txt"
            ].includes(
                extension
            )
        ) {
showImportMessage(
    `${extension.toUpperCase()} files are supported, but their importer is not enabled yet.`,
    "warning"
);
            return;

        }

showImportMessage(
    "This file format is not supported.",
    "error"
);

    } catch (error) {

        console.error(
            "Import processing failed:",
            error
        );

showImportMessage(
    "Unable to read this file. Please check the file and try again.",
    "error"
);
    }

}


/* =========================================
   JSON IMPORT
========================================= */

async function importJSONFile(
    file
) {

    const text =
        await file.text();


    const parsed =
        JSON.parse(
            text
        );


    let records;


    /*
        Our own exported JSON format
    */

    if (
        Array.isArray(
            parsed.users
        )
    ) {

        records =
            parsed.users;

    }


    /*
        Plain JSON array
    */

    else if (
        Array.isArray(
            parsed
        )
    ) {

        records =
            parsed;

    }


    /*
        Firebase backup
    */

    else if (
        parsed.data
    ) {

        records =
            convertFirebaseBackupToRecords(
                parsed.data
            );

    }


    else {

        throw new Error(
            "No readable records found in JSON."
        );

    }


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   CSV IMPORT
========================================= */

async function importCSVFile(
    file
) {

    const text =
        await file.text();


    const rows =
        parseCSV(
            text
        );


    if (
        rows.length < 2
    ) {

        throw new Error(
            "CSV does not contain enough records."
        );

    }


    const headers =
        rows[0];


    const records =
        rows
            .slice(1)
            .map(
                row => {

                    const record = {};


                    headers.forEach(
                        (
                            header,
                            index
                        ) => {

                            record[
                                header
                            ] =
                                row[
                                    index
                                ] ?? "";

                        }
                    );


                    return record;

                }
            );


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   EXCEL IMPORT
========================================= */

function loadExcelImportLibrary() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                window.XLSX
            ) {

                resolve(
                    window.XLSX
                );

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";


            script.onload =
                () => {

                    if (
                        window.XLSX
                    ) {

                        resolve(
                            window.XLSX
                        );

                    } else {

                        reject(
                            new Error(
                                "Excel library unavailable."
                            )
                        );

                    }

                };


            script.onerror =
                () => {

                    reject(
                        new Error(
                            "Could not load Excel reader."
                        )
                    );

                };


            document.head.appendChild(
                script
            );

        }
    );

}


async function importExcelFile(
    file
) {

    const XLSX =
        await loadExcelImportLibrary();


    const buffer =
        await file.arrayBuffer();


    const workbook =
        XLSX.read(
            buffer,
            {
                type: "array"
            }
        );


    /*
        Use the first worksheet initially.
    */

    const sheetName =
        workbook.SheetNames[0];


    const worksheet =
        workbook.Sheets[
            sheetName
        ];


    const records =
        XLSX.utils.sheet_to_json(
            worksheet,
            {
                defval: ""
            }
        );


    if (
        !records.length
    ) {

        throw new Error(
            "Excel sheet contains no records."
        );

    }


    importedRecords =
        normalizeImportedRecords(
            records
        );


    showImportPreview(
        importedRecords,
        file
    );

}


/* =========================================
   NORMALIZE IMPORTED RECORDS
========================================= */

function normalizeImportedRecords(
    records
) {

    return records
        .filter(
            record =>
                record &&
                typeof record ===
                "object"
        )
        .map(
            record => {

                const normalized = {};


                Object.entries(
                    record
                ).forEach(
                    (
                        [
                            key,
                            value
                        ]
                    ) => {

                        const cleanKey =
                            String(
                                key
                            )
                            .trim()
                            .toLowerCase();


                        normalized[
                            cleanKey
                        ] =
                            value;

                    }
                );


                return normalized;

            }
        );

}


/* =========================================
   IMPORT PREVIEW
========================================= */

function showImportPreview(
    records,
    file
) {

    const status =
        $("importStatus");


    const button =
        $("importDatabaseBtn");


    if (status) {

        status.textContent =
            `${records.length.toLocaleString()} records ready`;

    }


    if (button) {

        button.textContent =
            "File Ready";

    }


    /*
        Save the selected file
        information for the next stage.
    */

    selectedImportFile =
        file;


    console.log(
        "Imported records:",
        records
    );


    /*
        Temporary preview.
    */
createImportMapping();
  
}


/* =========================================
   SIMPLE CSV PARSER
========================================= */

function parseCSV(
    text
) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes =
        false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                value
            );

            value = "";

            continue;

        }


        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                value
            );

            rows.push(
                row
            );

            row = [];

            value = "";

            continue;

        }


        value += char;

    }


    if (
        value ||
        row.length
    ) {

        row.push(
            value
        );

        rows.push(
            row
        );

    }


    return rows;

}



/* =========================================
   IMPORT FIELD DEFINITIONS
========================================= */

const importFields = [

    {
        key: "name",
        label: "Full Name",
        required: true,

        aliases: [
            "name",
            "fullname",
            "full name",
            "full_name",
            "customer name",
            "customer",
            "user name",
            "user",
            "person name"
        ]
    },

    {
        key: "email",
        label: "Email",
        required: false,

        aliases: [
            "email",
            "email address",
            "emailaddress",
            "e-mail",
            "mail"
        ]
    },

    {
        key: "phone",
        label: "Phone",
        required: false,

        aliases: [
            "phone",
            "phone number",
            "phonenumber",
            "mobile",
            "mobile number",
            "telephone",
            "tel",
            "contact"
        ]
    },

    {
        key: "gender",
        label: "Gender",
        required: false,

        aliases: [
            "gender",
            "sex"
        ]
    },

    {
        key: "dateOfBirth",
        label: "Date of Birth",
        required: false,

        aliases: [
            "dob",
            "date of birth",
            "dateofbirth",
            "birth date",
            "birthdate",
            "birthday"
        ]
    },

    {
        key: "age",
        label: "Age",
        required: false,

        aliases: [
            "age",
            "years",
            "years old"
        ]
    },

    {
        key: "district",
        label: "District",
        required: false,

        aliases: [
            "district",
            "district name",
            "home district",
            "location district"
        ]
    },

    {
        key: "religion",
        label: "Religion",
        required: false,

        aliases: [
            "religion",
            "faith"
        ]
    },

    {
        key: "tribe",
        label: "Tribe",
        required: false,

        aliases: [
            "tribe",
            "ethnicity",
            "ethnic group"
        ]
    },

    {
        key: "education",
        label: "Education",
        required: false,

        aliases: [
            "education",
            "education level",
            "school",
            "qualification",
            "academic level"
        ]
    },

    {
        key: "occupation",
        label: "Occupation",
        required: false,

        aliases: [
            "occupation",
            "job",
            "job title",
            "profession",
            "work",
            "employment"
        ]
    },

    {
        key: "maritalStatus",
        label: "Marital Status",
        required: false,

        aliases: [
            "marital status",
            "maritalstatus",
            "married",
            "relationship status"
        ]
    },

    {
        key: "username",
        label: "Username",
        required: false,

        aliases: [
            "username",
            "user name",
            "login",
            "account name"
        ]
    },

    {
        key: "uid",
        label: "Firebase UID",
        required: false,

        aliases: [
            "uid",
            "firebase uid",
            "firebase id",
            "user id",
            "userid",
            "id"
        ]
    }

];

/* =========================================
   NORMALIZE FIELD NAME
========================================= */

function normalizeFieldName(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================
   DETECT FIELD
========================================= */

function detectImportField(
    column
) {

    const normalized =
        normalizeFieldName(
            column
        );


    /*
        Exact alias match
    */

    for (
        const field of importFields
    ) {

        const match =
            field.aliases.some(
                alias =>
                    normalizeFieldName(
                        alias
                    ) === normalized
            );


        if (match) {

            return field.key;

        }

    }


    return "";

}
/* =========================================
   CREATE IMPORT MAPPING
========================================= */

function createImportMapping() {

    const mappingPanel =
        $("databaseImportMapping");

    const mappingList =
        $("importMappingList");


    if (
        !mappingPanel ||
        !mappingList
    ) {

        return;

    }


    if (
        !importedRecords.length
    ) {

        return;

    }


    /*
        Get columns from the first
        imported record.
    */

    const columns =
        Object.keys(
            importedRecords[0]
        );


    mappingList.innerHTML =
        columns.map(
            column => {

                const detectedField =
                    detectImportField(
                        column
                    );


                return `

                    <div
                        class="import-mapping-row">

                        <div
                            class="import-source-column">

                            <span>
                                Old Database
                            </span>

                            <strong>

                                ${escapeHtml(
                                    column
                                )}

                            </strong>

                        </div>


                        <div
                            class="import-mapping-arrow">

                            →

                        </div>


                        <div
                            class="import-target-column">

                            <label>

                                Twagalane Field

                            </label>


                            <select
                                class="import-field-select"
                                data-source="${escapeHtml(
                                    column
                                )}">

                                <option value="">

                                    Do not import

                                </option>


                                ${importFields.map(
                                    field => `

                                        <option
                                            value="${field.key}"
                                            ${
                                                field.key ===
                                                detectedField
                                                ? "selected"
                                                : ""
                                            }>

                                            ${escapeHtml(
                                                field.label
                                            )}

                                            ${
                                                field.required
                                                ? " *"
                                                : ""
                                            }

                                        </option>

                                    `
                                ).join("")}

                            </select>

                        </div>

                    </div>

                `;

            }
        )
        .join("");


    mappingPanel.hidden =
        false;


    const status =
        $("mappingStatus");


    if (status) {

        status.textContent =
            `${columns.length} columns detected`;

    }

}
/* =========================================
   AUTO MAP
========================================= */

function autoMapImportedFields() {

    const selects =
        document.querySelectorAll(
            ".import-field-select"
        );


    selects.forEach(
        select => {

            const source =
                select.dataset.source;


            const detected =
                detectImportField(
                    source
                );


            select.value =
                detected;

        }
    );
    const status =
        $("mappingStatus");


    if (status) {

        status.textContent =
            "Fields automatically mapped";

    }

}

/* =========================================
   FIREBASE BACKUP CONVERTER
========================================= */

function convertFirebaseBackupToRecords(
    data
) {

    if (
        data.users &&
        typeof data.users ===
        "object"
    ) {

        return Object.entries(
            data.users
        ).map(
            (
                [
                    uid,
                    user
                ]
            ) => ({

                uid,

                ...user

            })
        );

    }


    return [];

}



/* =========================================
   IMPORT NOTIFICATION
========================================= */

function showImportMessage(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "databaseImportMessages"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "databaseImportMessages";

        container.className =
            "database-import-messages";


        const importSection =
            document.querySelector(
                ".database-import-main"
            )?.parentElement;


        if (importSection) {

            importSection.prepend(
                container
            );

        } else {

            document.body.prepend(
                container
            );

        }

    }


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        `database-import-message ${type}`;


    const icon =
        type === "error"
            ? "!"
            : type === "success"
                ? "✓"
                : type === "warning"
                    ? "!"
                    : "i";


    messageElement.innerHTML = `

        <span class="import-message-icon">

            ${icon}

        </span>

        <span class="import-message-text">

            ${escapeHtml(
                message
            )}

        </span>

        <button
            type="button"
            class="import-message-close"
            aria-label="Close">

            ×

        </button>

    `;


    container.appendChild(
        messageElement
    );


    messageElement
        .querySelector(
            ".import-message-close"
        )
        ?.addEventListener(
            "click",
            () => {

                messageElement.remove();

            }
        );


    setTimeout(
        () => {

            messageElement.classList.add(
                "hide"
            );


            setTimeout(
                () => {

                    messageElement.remove();

                },
                250
            );

        },
        5000
    );

}
/* =========================================
   PAGE READY
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initDatabaseCentre();

    }
);
/* =========================================
   MODULE EXPORTS
========================================= */

export {
    databaseState
};