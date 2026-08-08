/*==================================
        AI MATCH SYSTEM
==================================*/

import { db } from "./firebase.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
        DOM
==================================*/

const matchPhoto =
document.getElementById("matchPhoto");

const matchName =
document.getElementById("matchName");

const matchReason =
document.getElementById("matchReason");

const matchScore =
document.getElementById("matchScore");

const matchBio =
document.getElementById("matchBio");

const matchVerified =
document.getElementById("matchVerified");

const refreshMatch =
document.getElementById("refreshMatch");

const likeMatch =
document.getElementById("likeMatch");

const passMatch =
document.getElementById("passMatch");

/*==================================
        INITIALIZE
==================================*/

export async function initAIMatch(currentUid){

}

/*==================================
        LOAD ALL USERS
==================================*/

async function getAllUsers(){

}

/*==================================
        FIND CURRENT USER
==================================*/

function getCurrentUser(users,currentUid){

}

/*==================================
        FIND BEST MATCH
==================================*/

function findBestMatch(currentUser,users){

}

/*==================================
        CALCULATE SCORE
==================================*/

function calculateCompatibility(currentUser,candidate){

}

/*==================================
        COMPARE
==================================*/

function compareRelationshipGoal(){

}

function compareInterests(){

}

function comparePreferences(){

}

function compareReligion(){

}

function compareLifestyle(){

}

/*==================================
        RENDER
==================================*/

function renderAIMatch(match){

}

/*==================================
        EVENTS
==================================*/

function registerEvents(){

}