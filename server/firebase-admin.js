import "dotenv/config";
import admin from "firebase-admin";
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, "\n")
};

if (!serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey) {

    throw new Error(
        "Firebase Admin environment variables are missing."
    );
}

admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),

    databaseURL:
        "https://nansubuga-869c6-default-rtdb.firebaseio.com"

});

export const auth = admin.auth();
export const db = admin.database();