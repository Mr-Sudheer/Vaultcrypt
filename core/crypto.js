// core/crypto.js

export function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// PBKDF2 → AES-GCM key
export async function deriveKeyPBKDF2(master, salt, iterations = 300000) {
  const enc = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(master),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVault(vault, cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(vault));

  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext);

  return {
    iv: arrayBufferToBase64(iv.buffer),            // FIXED
    ciphertext: arrayBufferToBase64(ct)            // OK
  };
}

export async function decryptVault(payload, cryptoKey) {
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ct = new Uint8Array(base64ToArrayBuffer(payload.ciphertext));  // FIXED

  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ct);

  return JSON.parse(new TextDecoder().decode(pt));
}

export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}