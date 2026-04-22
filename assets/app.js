import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_z5hziUxSeFlcmbhrCV-_vvaOBgyCAdw",
  authDomain: "steve-30-geburtstag.firebaseapp.com",
  projectId: "steve-30-geburtstag",
  storageBucket: "steve-30-geburtstag.firebasestorage.app",
  messagingSenderId: "824137549211",
  appId: "1:824137549211:web:36ba7af2a8c2cc917f0d3e",
  measurementId: "G-W6J6841KNZ"
};

// WICHTIG: HIER DEINE FIREBASE-LOGIN-MAIL EINTRAGEN
const ADMIN_EMAIL = "sscheifen@icloud.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");

const openAdminBtn = document.getElementById("openAdminBtn");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const adminModal = document.getElementById("adminModal");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminStatus = document.getElementById("adminStatus");

const guestBox = document.getElementById("guestlistBox");
const guestBody = document.getElementById("guestlistBody");

const yesCount = document.getElementById("yesCount");
const noCount = document.getElementById("noCount");
const guestCount = document.getElementById("guestCount");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: form.name.value.trim(),
    attendance: form.attendance.value,
    guests: Number(form.guests.value || 0),
    bring: form.bring.value.trim(),
    message: form.message.value.trim(),
    createdAt: serverTimestamp()
  };

  if (!data.name || !data.attendance) {
    if (formStatus) {
      formStatus.textContent = "Bitte Name und Teilnahme ausfüllen.";
    }
    return;
  }

  try {
    await addDoc(collection(db, "rsvps"), data);
    form.reset();

    if (formStatus) {
      formStatus.textContent = "Gespeichert 👍 Danke für deine Rückmeldung.";
    }
  } catch (err) {
    console.error("Fehler beim Speichern:", err);
    if (formStatus) {
      formStatus.textContent = "Fehler beim Speichern. Bitte später nochmal versuchen.";
    }
  }
});

openAdminBtn?.addEventListener("click", () => {
  adminModal?.classList.remove("hidden");
  if (adminStatus) {
    adminStatus.textContent = "";
  }
});

closeAdminBtn?.addEventListener("click", () => {
  adminModal?.classList.add("hidden");
});

adminModal?.addEventListener("click", (e) => {
  if (e.target === adminModal) {
    adminModal.classList.add("hidden");
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = adminEmail?.value.trim() || "";
  const password = adminPassword?.value.trim() || "";

  if (!email || !password) {
    if (adminStatus) {
      adminStatus.textContent = "Bitte E-Mail und Passwort eingeben.";
    }
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    adminModal?.classList.add("hidden");
    if (adminPassword) {
      adminPassword.value = "";
    }
  } catch (err) {
    console.error("Login fehlgeschlagen:", err);
    if (adminStatus) {
      adminStatus.textContent = "Login fehlgeschlagen.";
    }
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout fehlgeschlagen:", err);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    if (adminStatus) {
      adminStatus.textContent = `Eingeloggt als ${user.email}`;
    }
    guestBox?.classList.remove("hidden");
    await loadGuests();
  } else {
    if (adminStatus) {
      adminStatus.textContent = "Nicht eingeloggt";
    }
    guestBox?.classList.add("hidden");

    if (guestBody) {
      guestBody.innerHTML = `
        <tr>
          <td colspan="6">Bitte als Admin einloggen.</td>
        </tr>
      `;
    }

    if (yesCount) yesCount.textContent = "0";
    if (noCount) noCount.textContent = "0";
    if (guestCount) guestCount.textContent = "0";
  }
});

async function loadGuests() {
  try {
    const q = query(collection(db, "rsvps"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (!guestBody) return;

    guestBody.innerHTML = "";

    if (snap.empty) {
      guestBody.innerHTML = `
        <tr>
          <td colspan="6">Noch keine Einträge vorhanden.</td>
        </tr>
      `;
      if (yesCount) yesCount.textContent = "0";
      if (noCount) noCount.textContent = "0";
      if (guestCount) guestCount.textContent = "0";
      return;
    }

    let yes = 0;
    let no = 0;
    let companions = 0;

    snap.forEach((doc) => {
      const d = doc.data();

      if (d.attendance === "Ja") yes++;
      if (d.attendance === "Nein") no++;
      companions += Number(d.guests || 0);

      const createdAt = d.createdAt?.toDate
        ? d.createdAt.toDate().toLocaleString("de-DE")
        : "-";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(d.name || "-")}</td>
        <td>${escapeHtml(d.attendance || "-")}</td>
        <td>${escapeHtml(String(d.guests ?? 0))}</td>
        <td>${escapeHtml(d.bring || "-")}</td>
        <td>${escapeHtml(d.message || "-")}</td>
        <td>${escapeHtml(createdAt)}</td>
      `;
      guestBody.appendChild(row);
    });

    if (yesCount) yesCount.textContent = String(yes);
    if (noCount) noCount.textContent = String(no);
    if (guestCount) guestCount.textContent = String(companions);
  } catch (err) {
    console.error("Fehler beim Laden der Gästeliste:", err);

    if (guestBody) {
      guestBody.innerHTML = `
        <tr>
          <td colspan="6">Fehler beim Laden der Gästeliste.</td>
        </tr>
      `;
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}