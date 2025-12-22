import {
  createEncryptedVault,
  unlockEncryptedVault,
  updateEncryptedVault
} from "./core/vault-crypto.js";

import {
  uploadEncryptedVault,
  downloadEncryptedVault
} from "./core/worker-client.js";

/* ============================
   DOM
============================= */
const masterEl = document.getElementById("master");
const unlockBtn = document.getElementById("unlockBtn");
const appEl = document.getElementById("app");
const statusEl = document.getElementById("status");

const searchEl = document.getElementById("search");
const serviceEl = document.getElementById("service");
const userEl = document.getElementById("username");
const passEl = document.getElementById("password");

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");

/* ============================
   STATE (STRICT)
============================= */
let masterPassword = null;   // user secret
let cid = null;             // IPFS CID
let vaultPayload = null;    // ENCRYPTED ONLY
let isUnlocked = false;     // cryptographically verified

/* ============================
   STATUS
============================= */
function showStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.className = type;
}

/* ============================
   UNLOCK (VERIFY PASSWORD)
============================= */
unlockBtn.addEventListener("click", async () => {
  try {
    isUnlocked = false;
    masterPassword = masterEl.value.trim();

    if (!masterPassword) {
      return showStatus("Master password required", "error");
    }

    const stored = await chrome.storage.local.get(["dpm_cid"]);
    cid = stored.dpm_cid || null;

    if (cid) {
      vaultPayload = await downloadEncryptedVault(cid);

      // 🔐 VERIFY PASSWORD (TEST DECRYPT)
      const test = await unlockEncryptedVault(
        masterPassword,
        vaultPayload
      );
      test.length = 0; // wipe immediately
    } else {
      vaultPayload = null; // new vault
    }

    isUnlocked = true;
    appEl.classList.remove("hidden");
    showStatus("Vault unlocked", "success");

  } catch (e) {
    console.error(e);

    masterPassword = null;
    vaultPayload = null;
    isUnlocked = false;

    appEl.classList.add("hidden");
    showStatus("Wrong master password", "error");
  }
});

/* ============================
   SEARCH (DECRYPT ON DEMAND)
============================= */
searchEl.addEventListener("change", async () => {
  if (!isUnlocked) {
    return showStatus("Vault locked", "error");
  }

  const query = searchEl.value.trim();
  if (!query || !vaultPayload) return;

  try {
    const entries = await unlockEncryptedVault(
      masterPassword,
      vaultPayload
    );

    const match = entries.find(e => e.service === query);

    entries.length = 0; // wipe plaintext

    if (!match) {
      return showStatus("No matching service", "error");
    }

    // TEMPORARY DISPLAY (replace later with secure UI)
    alert(
      `Service: ${match.service}\n` +
      `Username: ${match.username}\n` +
      `Password: ${match.password}`
    );

    showStatus("Entry shown temporarily", "success");

  } catch (e) {
    console.error(e);
    showStatus("Search failed", "error");
  }
});

/* ============================
   ADD ENTRY
============================= */
addBtn.addEventListener("click", async () => {
  if (!isUnlocked) {
    return showStatus("Unlock vault first", "error");
  }

  const s = serviceEl.value.trim();
  const u = userEl.value.trim();
  const p = passEl.value.trim();

  if (!s || !p) {
    return showStatus("Service and password required", "error");
  }

  try {
    let entries = [];

    if (vaultPayload) {
      entries = await unlockEncryptedVault(
        masterPassword,
        vaultPayload
      );
    }

    entries.push({ service: s, username: u, password: p });

    if (!vaultPayload) {
      vaultPayload = await createEncryptedVault(
        masterPassword,
        entries
      );
    } else {
      vaultPayload = await updateEncryptedVault(
        masterPassword,
        vaultPayload,
        entries
      );
    }

    entries.length = 0; // wipe plaintext

    serviceEl.value = userEl.value = passEl.value = "";
    showStatus("Entry added (not yet saved)", "success");

  } catch (e) {
    console.error(e);
    showStatus("Add failed", "error");
  }
});

/* ============================
   SAVE (SAFE)
============================= */
saveBtn.addEventListener("click", async () => {
  if (!isUnlocked) {
    return showStatus("Vault locked. Cannot save.", "error");
  }

  if (!vaultPayload) {
    return showStatus("Nothing to save", "error");
  }

  try {
    const res = await uploadEncryptedVault(vaultPayload);
    if (!res.success) throw new Error(res.error);

    cid = res.cid;
    await chrome.storage.local.set({ dpm_cid: cid });

    showStatus("Vault saved securely", "success");

  } catch (e) {
    console.error(e);
    showStatus("Save failed", "error");
  }
});

/* ============================
   LOAD (RE-UNLOCK)
============================= */
loadBtn.addEventListener("click", () => {
  unlockBtn.click();
});
