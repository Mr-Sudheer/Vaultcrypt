//core/worker-client.js
const WORKER_ENDPOINT = "https://withered-snow-4a6f.dotsudheer.workers.dev";

/* =============================
    UPLOAD ENCRYPTED VAULT
============================= */
export async function uploadEncryptedVault(payload) {
  try {
    const res = await fetch(`${WORKER_ENDPOINT}/upload-vault`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ payload })
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.error("Upload error:", err);
    return { success: false, error: err.message };
  }
}

/* =============================
    DOWNLOAD ENCRYPTED VAULT
============================= */
export async function downloadEncryptedVault(cid) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to download encrypted vault");
    }

    return await res.json();

  } catch (err) {
    console.error("Download error:", err);
    throw err;
  }
}
