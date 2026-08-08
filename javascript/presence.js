/*==================================
            PRESENCE.JS
==================================*/

import { auth, db } from "./firebase.js";

import {
    ref,
    update,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*==================================
        SETUP PRESENCE
==================================*/

export function setupPresence(){

    const user = auth.currentUser;

    if(!user) return;

    const connectedRef = ref(db, ".info/connected");

    const presenceRef = ref(
        db,
        "users/" + user.uid + "/presence"
    );

    onValue(connectedRef, async(snapshot)=>{

        if(snapshot.val() !== true){
            return;
        }

        await onDisconnect(presenceRef).update({

            online:false,

            lastSeen:Date.now()

        });

        await update(presenceRef,{

            online:true,

            lastSeen:Date.now()

        });

    });

}