# Vaultcrypt

Vaultcrypt is a lightweight, privacy-focused decentralized password manager that encrypts user credentials locally and stores only encrypted data on decentralized storage.

**Status:** Work in Progress

---

## Problem Statement

Most traditional password managers rely on centralized servers to store encrypted vaults.  
While encryption is used, users must still trust service providers with metadata handling, infrastructure security, and backend access control.

Centralized architectures also introduce single points of failure and attractive targets for attackers.

---

## Solution Overview

Vaultcrypt follows a **client-side encryption first** approach:

- All sensitive data is encrypted locally on the user’s device
- The master password never leaves the client
- Only encrypted vault data is uploaded to decentralized storage
- Backend services never have access to plaintext data or encryption keys

---

## Architecture / How It Works

1. User enters a master password
2. A symmetric encryption key is derived using **PBKDF2**
3. The vault is encrypted locally using **AES-256-GCM**
4. The encrypted vault is sent to a backend service (Cloudflare Worker)
5. The worker uploads the encrypted vault to **IPFS (via Pinata)**
6. The worker returns a **CID (Content Identifier)**
7. On retrieval, the vault is downloaded using the CID and decrypted locally using the master password

At no point is plaintext data or the master password transmitted or stored remotely.

---

## Security Design Decisions

- Master password is never transmitted or stored
- Encryption occurs before any network request
- Backend API keys are never exposed to the client
- Vault integrity is ensured using authenticated encryption (AES-GCM)
- Backend acts only as a relay for encrypted data

---

## Advantages

- No plaintext password storage
- Decentralized vault storage using IPFS
- Backend cannot read or decrypt user data
- No sensitive keys exposed to the extension

---

## Limitations

- No account recovery if the master password is lost
- No automatic multi-device sync yet
- Autofill functionality not implemented (planned)
- Internet connection required to retrieve vault data
