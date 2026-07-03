// Extension Popup Controller

document.addEventListener('DOMContentLoaded', () => {
  const hostInput = document.getElementById('host-url');
  const syncBtn = document.getElementById('sync-btn');
  
  const nameVal = document.getElementById('profile-name');
  const countVal = document.getElementById('resumes-count');
  const timeVal = document.getElementById('sync-time');

  // Load current storage metrics
  loadMetrics();

  syncBtn.addEventListener('click', () => {
    const host = hostInput.value.trim() || 'http://localhost:3000';
    syncBtn.disabled = true;
    syncBtn.innerText = 'Syncing…';

    chrome.runtime.sendMessage({ action: 'sync_data', host }, (response) => {
      syncBtn.disabled = false;
      syncBtn.innerText = 'Sync Web Storage';

      if (response && response.success) {
        alert('Sync complete! Extension data is now updated with IpHire Cloud.');
        loadMetrics();
      } else {
        alert(`Sync failed: ${response ? response.message : 'No response from background agent.'}`);
      }
    });
  });

  function loadMetrics() {
    chrome.runtime.sendMessage({ action: 'get_stored_data' }, (result) => {
      if (result) {
        if (result.sync_host) {
          hostInput.value = result.sync_host;
        }

        if (result.iphire_data) {
          const data = result.iphire_data;
          const profile = data.settings?.user_profile || {};
          nameVal.innerText = profile.name || 'Synced User';
          countVal.innerText = `${(data.resumes || []).length} resumes`;
          timeVal.innerText = result.sync_time ? new Date(result.sync_time).toLocaleTimeString() : 'Recent';
        } else {
          nameVal.innerText = 'Not Synced';
          countVal.innerText = '0 resumes';
          timeVal.innerText = 'Never';
        }
      }
    });
  }
});
