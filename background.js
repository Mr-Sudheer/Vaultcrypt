// background.js - MV3 service worker

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {

      // Save CID
      if (msg.action === "saveCID") {
        await chrome.storage.local.set({ dpm_cid: msg.cid });
        sendResponse({ success: true });
        return;
      }

      // Get CID
      if (msg.action === "getCID") {
        const data = await chrome.storage.local.get("dpm_cid");
        sendResponse({ success: true, cid: data.dpm_cid || null });
        return;
      }

      // Fetch encrypted payload from IPFS Gateway
      if (msg.action === "fetchPayload") {
        if (!msg.cid) throw new Error("CID missing");

        const url = `https://gateway.pinata.cloud/ipfs/${msg.cid}`;
        const resp = await fetch(url);

        if (!resp.ok) throw new Error("Failed to fetch CID: " + resp.status);
        const json = await resp.json();

        sendResponse({ success: true, payload: json });
        return;
      }

      sendResponse({ success: false, error: "Unknown action" });

    } catch (err) {
      console.error(err);
      sendResponse({ success: false, error: err.toString() });
    }
  })();

  return true;
});
