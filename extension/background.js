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

  if (message.action === 'AUTO_APPLY') {
    console.log("Received AUTO_APPLY request from content script for URL:", message.url);
    chrome.tabs.create({ url: message.url, active: false }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(tabId, { action: 'START_AUTO_APPLY' });
        }
      });
    });
    sendResponse({ success: true, message: 'Auto-apply tab launched.' });
    return true;
  }
});

// Listen for messages from the IpHire web application
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTO_APPLY') {
    console.log("Received AUTO_APPLY request from web app for URL:", request.url);
    
    // Open the job URL in a new tab
    chrome.tabs.create({ url: request.url, active: false }, (tab) => {
      // Wait for the tab to finish loading
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          // Send a message to the content script in that tab to begin auto-filling
          chrome.tabs.sendMessage(tabId, { action: 'START_AUTO_APPLY' });
        }
      });
    });
    sendResponse({ success: true, message: 'Auto-apply tab launched.' });
  }
});
