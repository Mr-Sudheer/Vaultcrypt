import {
  createEncryptedVault,
  unlockEncryptedVault,
  updateEncryptedVault
} from "./core/vault-crypto.js";

import {
  uploadEncryptedVault,
  downloadEncryptedVault
} from "./core/worker-client.js";

//zxcvbn
const strengthColors = ['#ff4e4e', '#ff914d', '#ffd000', '#4caf50', '#1b7e34'];
const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

//DOM
const masterEl = document.getElementById("master");
const unlockBtn = document.getElementById("unlockBtn");
const appEl = document.getElementById("app");
const statusEl = document.getElementById("status");

const searchEl = document.getElementById("search");
const serviceEl = document.getElementById("service");
const userEl = document.getElementById("username");
const passEl = document.getElementById("password");

const addSaveBtn = document.getElementById('addSaveBtn');
const loadBtn = document.getElementById("loadBtn");

appEl.addEventListener("click", resetAutoLockTimer);
appEl.addEventListener("keydown", resetAutoLockTimer);

//STATE
let masterPassword = null;
let cid = null;
let vaultPayload = null;
let isUnlocked = false;
let autoLockTimer=null;
const AUTO_LOCK_MS=30*1000;

//zxcvbn 

document.getElementById('master').addEventListener('input', (e) => {
  const val = e.target.value;
  const bar = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');

  if (!val) {
    bar.style.width = '0%';
    label.textContent = '';
    unlockBtn.disabled = true;
    return;
  }

  const result = zxcvbn(val);
  const score = result.score; // 0–4
  bar.style.width = ((score + 1) * 20) + '%';
  bar.style.background = strengthColors[score];
  label.textContent = strengthLabels[score];
  label.style.color = strengthColors[score];
  unlockBtn.disabled = score < 3;
});

//STATUS
function showStatus(msg, type = "info") {
  if (msg === "Vault unlocked") return;
  statusEl.textContent = msg;
  statusEl.className = type;
}

//UNLOCK
unlockBtn.addEventListener("click", async () => {
  try {
    isUnlocked = false;
    masterPassword = masterEl.value;

    if (!masterPassword) {
      return showStatus("Master password required", "error");
    }

    const stored = await chrome.storage.local.get(["dpm_cid"]);
    cid = stored.dpm_cid || null;

    if (cid) {
      vaultPayload = await downloadEncryptedVault(cid);

      const test = await unlockEncryptedVault(
        masterPassword,
        vaultPayload
      );
      test.length = 0;
    } else {
      vaultPayload = null;
    }

    isUnlocked = true;
    resetAutoLockTimer();
    appEl.classList.remove("hidden");
    document.getElementById('unlock-section').classList.add('hidden');
    showStatus("", "");
    unlockBtn.disabled = true;
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

//DECRYPT
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

    entries.length = 0;

    if (!match) {
      return showStatus("No matching service", "error");
    }

    // TEMPORARY DISPLAY
    document.getElementById('res-service').textContent = match.service;
    document.getElementById('res-username').textContent = match.username;
    document.getElementById('res-password').textContent = match.password;
    document.getElementById('search-result').classList.remove('hidden');


    resetAutoLockTimer();
    showStatus("Entry shown temporarily", "success");

  } catch (e) {
    console.error(e);
    showStatus("Search failed", "error");
  }
});

document.getElementById('addSaveBtn').addEventListener('click', async () => {
  if (!isUnlocked) return showStatus("Unlock vault first", "error");

  const s = serviceEl.value.trim();
  const u = userEl.value.trim();
  const p = passEl.value.trim();

  if (!s || !p) return showStatus("Service and password required", "error");

  try {
    let entries = [];

    if (vaultPayload) {
      entries = await unlockEncryptedVault(masterPassword, vaultPayload);
    }

    entries.push({ service: s, username: u, password: p });

    if (!vaultPayload) {
      vaultPayload = await createEncryptedVault(masterPassword, entries);
    } else {
      vaultPayload = await updateEncryptedVault(masterPassword, vaultPayload, entries);
    }

    entries.length = 0;

    const res = await uploadEncryptedVault(vaultPayload);
    if (!res.success) throw new Error(res.error);

    cid = res.cid;
    await chrome.storage.local.set({ dpm_cid: cid });

    serviceEl.value = userEl.value = passEl.value = "";
    showStatus("Entry saved to cloud", "success");
    resetAutoLockTimer();

  } catch (e) {
    console.error(e);
    showStatus("Failed to save entry", "error");
  }
});

//LOCK VAULT
function lockVault(reason = "Vault locked") {
  masterPassword = null;
  vaultPayload = null;
  isUnlocked = false;

  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }

  document.getElementById('unlock-section').classList.remove('hidden');
  document.getElementById('search-result').classList.add('hidden');

  appEl.classList.add("hidden");
  masterEl.value = "";
  unlockBtn.disabled = true;
  searchEl.value = "";
  serviceEl.value = "";
  userEl.value = "";
  passEl.value = "";

  showStatus(reason, "info");
}

function resetAutoLockTimer() {
  if (!isUnlocked) return;

  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }

  autoLockTimer = setTimeout(() => {
    lockVault("Auto-locked due to inactivity");
  }, AUTO_LOCK_MS);
}

//LOAD
loadBtn.addEventListener("click", () => {
  unlockBtn.click();
});

//LOCK ON POPUP CLOSE
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isUnlocked) {
    lockVault("Vault locked (popup closed)");
  }
});
