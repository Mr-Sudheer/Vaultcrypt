// core/vault-crypto.js
import { VAULT_VERSION, KDF_CONFIG } from "./constants.js";

import {
  deriveKeyPBKDF2,
  encryptVault,
  decryptVault,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  generateSalt
} from "./crypto.js";

/* =============================
   VALIDATE PAYLOAD
============================= */
function validatePayload(p) {
  if (
    p.version !== VAULT_VERSION ||
    p.kdf !== KDF_CONFIG.name ||
    typeof p.iterations !== "number" ||
    !p.salt ||
    !p.iv ||
    !p.ciphertext
  ) {
    throw new Error("Invalid or incompatible vault");
  }
}

/* =============================
   CREATE NEW VAULT
============================= */
export async function createEncryptedVault(masterPassword, entries = []) {
  const salt = generateSalt();

  const key = await deriveKeyPBKDF2(
    masterPassword,
    salt,
    KDF_CONFIG.iterations
  );

  const encrypted = await encryptVault(entries, key);

  return {
    version: VAULT_VERSION,
    kdf: KDF_CONFIG.name,
    iterations: KDF_CONFIG.iterations,
    salt: arrayBufferToBase64(salt.buffer),
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext
  };
}

/* =============================
   UNLOCK EXISTING VAULT
============================= */
export async function unlockEncryptedVault(masterPassword, payload) {
  validatePayload(payload);

  const salt = new Uint8Array(
    base64ToArrayBuffer(payload.salt)
  );

  const key = await deriveKeyPBKDF2(
    masterPassword,
    salt,
    KDF_CONFIG.iterations
  );

  return await decryptVault(payload, key);
}

/* =============================
   UPDATE VAULT
============================= */
export async function updateEncryptedVault(masterPassword, payload, entries) {
  validatePayload(payload);

  const salt = new Uint8Array(
    base64ToArrayBuffer(payload.salt)
  );

  const key = await deriveKeyPBKDF2(
    masterPassword,
    salt,
    KDF_CONFIG.iterations
  );

  const encrypted = await encryptVault(entries, key);

  return {
    ...payload,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext
  };
}
