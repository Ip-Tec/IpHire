// Background script for IpHire Autofill Extension
const DEFAULT_HOST = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sync_data') {
    const host = message.host || DEFAULT_HOST;
    fetch(`${host}/api/db/sync`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        return res.json();
      })
      .then(syncData => {
        if (syncData.success) {
          chrome.storage.local.set({ iphire_data: syncData.data, sync_time: Date.now(), sync_host: host }, () => {
            sendResponse({ success: true, message: 'Data synced successfully.' });
          });
        } else {
          sendResponse({ success: false, message: syncData.message || 'Sync failed.' });
        }
      })
      .catch(err => {
        console.error('Extension sync error:', err);
        sendResponse({ success: false, message: err.message || 'Network error connecting to IpHire web.' });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'get_stored_data') {
    chrome.storage.local.get(['iphire_data', 'sync_time', 'sync_host'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});
