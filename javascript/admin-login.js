import { auth, db } from "../javascript/firebase.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginBtn = document.getElementById("loginBtn");
const toastContainer = document.getElementById("toastContainer");

/* PASSWORD TOGGLE */

togglePassword.onclick = () => {

    if(password.type==="password"){

        password.type="text";
        togglePassword.innerHTML='<i class="fa-solid fa-eye-slash"></i>';

    }else{

        password.type="password";
        togglePassword.innerHTML='<i class="fa-solid fa-eye"></i>';

    }

};

/* TOAST */

function showToast(message,type="success"){

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    toast.innerHTML=`<span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(()=>{

        toast.remove();

    },3000);

}

/* LOGIN */

form.addEventListener("submit",async(e)=>{

    e.preventDefault();

    loginBtn.disabled=true;
    loginBtn.innerHTML="Signing In...";

    try{

        const credential=await signInWithEmailAndPassword(

            auth,

            email.value.trim(),

            password.value

        );

        const uid=credential.user.uid;

        const snapshot=await get(ref(db,"admins/"+uid));

        if(!snapshot.exists()){

            await signOut(auth);

            showToast("Access denied.","error");

            loginBtn.disabled=false;
            loginBtn.innerHTML="Login";

            return;

        }

        const admin=snapshot.val();

        
if(!admin.active){

    await signOut(auth);

    showToast("Account disabled.","error");

    loginBtn.disabled=false;
    loginBtn.innerHTML="Login";

    return;

}
        await update(ref(db,"admins/"+uid),{

            lastLogin:Date.now()

        });

        sessionStorage.setItem("adminUid",uid);
        sessionStorage.setItem("adminRole",admin.role);
        sessionStorage.setItem("adminName",admin.fullName);

        showToast("Login successful.");

        setTimeout(()=>{

            location.href="superadmin.html";

        },1000);

    }catch(error){

        console.error(error);

        showToast(error.message,"error");

        loginBtn.disabled=false;
        loginBtn.innerHTML="Login";

    }

});