const fs = require('fs');
const path = require('path');

let firestore = null;

function initFirebase() {
    const hasJsonFile = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
    const hasInlineCreds = Boolean(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
    );

    if (!hasJsonFile && !hasInlineCreds) {
        console.log('⚠️ Firebase ยังไม่ได้ตั้งค่า — เก็บข้อมูลใน SQLite อย่างเดียว');
        return;
    }

    const admin = require('firebase-admin');
    if (admin.apps.length) {
        firestore = admin.firestore();
        return;
    }

    let credential;
    if (hasJsonFile) {
        const jsonPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
    } else {
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
    }

    admin.initializeApp({ credential });
    firestore = admin.firestore();
    console.log('🔥 Firebase Firestore พร้อมซิงค์ข้อมูลจาก SQLite');
}

async function mirror(collection, id, data) {
    if (!firestore) return;
    try {
        await firestore.collection(collection).doc(String(id)).set(
            { ...data, syncedAt: new Date().toISOString() },
            { merge: true }
        );
    } catch (err) {
        console.error(`Firebase sync (${collection}/${id}) ล้มเหลว:`, err.message);
    }
}

async function deleteDoc(collection, id) {
    if (!firestore) return;
    try {
        await firestore.collection(collection).doc(String(id)).delete();
    } catch (err) {
        console.error(`Firebase delete (${collection}/${id}) ล้มเหลว:`, err.message);
    }
}

function isFirebaseEnabled() {
    return Boolean(firestore);
}

module.exports = { initFirebase, mirror, deleteDoc, isFirebaseEnabled };
