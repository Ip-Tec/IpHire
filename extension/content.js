// IpHire Autofill Agent - Content Script

(function () {
  let isFloatingButtonInjected = false;
  let activeData = null;

  // Run form detection on load and on DOM updates
  function init() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Check if we are on the dashboard, we can capture profile updates or auto-sync
      listenToPageEvents();
    }
    
    detectFormAndInjectButton();
    
    // Watch for dynamic DOM changes (single-page applications)
    const observer = new MutationObserver(() => {
      detectFormAndInjectButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function listenToPageEvents() {
    // If the local dashboard updates the profile, we can trigger an auto-sync for the extension
    window.addEventListener('profile_updated', () => {
      chrome.runtime.sendMessage({ action: 'sync_data', host: window.location.origin });
    });
  }

  function detectFormAndInjectButton() {
    if (isFloatingButtonInjected) return;

    // Scan for typical job application elements
    const inputs = document.querySelectorAll('input, textarea, select');
    if (inputs.length < 3) return; // Only show if there's a real form

    injectFloatingButton();
  }

  function injectFloatingButton() {
    isFloatingButtonInjected = true;

    // Create container
    const container = document.createElement('div');
    container.id = 'iphire-extension-trigger-root';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '999999';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    // Inject styles
    const style = document.createElement('style');
    style.innerHTML = `
      .iphire-btn {
        background: linear-gradient(135deg, #005f73 0%, #006d77 100%);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 10px 20px;
        font-weight: 600;
        font-size: 13px;
        box-shadow: 0 4px 14px rgba(0, 109, 119, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease-in-out;
      }
      .iphire-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 109, 119, 0.6);
      }
      .iphire-btn:active {
        transform: translateY(0);
      }
      .iphire-logo-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #83c5be;
        animation: iphire-pulse 2s infinite;
      }
      @keyframes iphire-pulse {
        0% { transform: scale(0.9); opacity: 0.6; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.6; }
      }
      .iphire-panel {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        width: 280px;
        padding: 16px;
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        animation: iphire-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes iphire-slide-in {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .iphire-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #f3f4f6;
        padding-bottom: 8px;
      }
      .iphire-title {
        font-weight: 700;
        font-size: 13px;
        color: #111827;
      }
      .iphire-close-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
      }
      .iphire-close-btn:hover {
        color: #374151;
      }
      .iphire-fill-btn {
        background: #006d77;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: background 0.15s ease;
      }
      .iphire-fill-btn:hover {
        background: #005f73;
      }
      .iphire-status {
        font-size: 11px;
        color: #6b7280;
        line-height: 1.4;
      }
    `;

    // Floating Button element
    const btn = document.createElement('button');
    btn.className = 'iphire-btn';
    btn.innerHTML = `<span class="iphire-logo-dot"></span> Fill Application`;

    // Hidden Panel element
    const panel = document.createElement('div');
    panel.className = 'iphire-panel';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div class="iphire-header">
        <span class="iphire-title">✨ IpHire Autofill Agent</span>
        <button class="iphire-close-btn">&times;</button>
      </div>
      <div class="iphire-status" id="iphire-status-text">
        Ready to optimize fields. Make sure to sync your profile inside IpHire App first.
      </div>
      <button class="iphire-fill-btn" id="iphire-autofill-action">Apply Autofill Now</button>
    `;

    container.appendChild(style);
    container.appendChild(panel);
    container.appendChild(btn);
    document.body.appendChild(container);

    // Wire events
    btn.addEventListener('click', () => {
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        checkExtensionData();
      } else {
        panel.style.display = 'none';
      }
    });

    panel.querySelector('.iphire-close-btn').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    panel.querySelector('#iphire-autofill-action').addEventListener('click', () => {
      runAutofillProcess();
    });
  }

  function checkExtensionData() {
    const statusText = document.getElementById('iphire-status-text');
    if (!statusText) return;

    statusText.innerText = 'Retrieving profile metrics…';

    chrome.runtime.sendMessage({ action: 'get_stored_data' }, (response) => {
      if (response && response.iphire_data) {
        activeData = response.iphire_data;
        const profile = activeData.settings?.user_profile || {};
        const resumes = activeData.resumes || [];
        const primaryResume = resumes[0] ? resumes[0].name : 'No resumes synced';
        
        statusText.innerHTML = `
          <strong>Profile:</strong> ${profile.name || 'Anonymous User'}<br/>
          <strong>Active CV:</strong> ${primaryResume}<br/>
          <strong>Cloud Sync:</strong> ${new Date(response.sync_time).toLocaleDateString()}
        `;
      } else {
        statusText.innerHTML = `
          <span style="color:#b45309;">⚠️ No profile data found.</span><br/>
          Open the <a href="http://localhost:3000/dashboard" target="_blank" style="color:#006d77;font-weight:600;">IpHire Dashboard</a>, configure settings, and run a cloud sync.
        `;
      }
    });
  }

  function runAutofillProcess() {
    if (!activeData) {
      alert('Please sync your IpHire profile data first.');
      return;
    }

    const profile = activeData.settings?.user_profile || {};
    const resumes = activeData.resumes || [];
    const masterResume = resumes[0] || null;

    // Compile match map
    const fieldsMap = {
      name: profile.name || '',
      fullname: profile.name || '',
      firstname: (profile.name || '').split(' ')[0] || '',
      lastname: (profile.name || '').split(' ').slice(1).join(' ') || '',
      email: profile.email || '',
      phone: profile.phone || '',
      telephone: profile.phone || '',
      tel: profile.phone || '',
      mobile: profile.phone || '',
      contact: profile.phone || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
      portfolio: profile.portfolio || '',
      website: profile.portfolio || '',
      location: profile.location || '',
      city: (profile.location || '').split(',')[0] || '',
      state: (profile.location || '').split(',')[1]?.trim() || '',
      experience: profile.experience || '',
      education: profile.education || '',
      salary: profile.salaryExpectations || '',
      languages: (profile.languages || []).join(', '),
    };

    let filledCount = 0;

    // Scan input, textarea, and select fields
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      // Skip hidden inputs
      if (input.type === 'hidden' || input.style.display === 'none' || input.style.visibility === 'hidden') return;

      const label = findLabelText(input).toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const id = (input.id || '').toLowerCase();

      // Determine matching keys
      let matchedKey = null;
      for (const key of Object.keys(fieldsMap)) {
        if (
          label.includes(key) ||
          placeholder.includes(key) ||
          name.includes(key) ||
          id.includes(key)
        ) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        const val = fieldsMap[matchedKey];
        if (input.tagName === 'SELECT') {
          // Select dropdown value matching
          const options = input.options;
          for (let i = 0; i < options.length; i++) {
            if (options[i].text.toLowerCase().includes(val.toLowerCase()) || options[i].value.toLowerCase().includes(val.toLowerCase())) {
              input.selectedIndex = i;
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
              break;
            }
          }
        } else if (input.type === 'checkbox' || input.type === 'radio') {
          // Skip or default to yes
        } else if (input.type === 'file') {
          // Handle resume uploads programmatically if PDF is available
          if (matchedKey.includes('resume') || matchedKey.includes('cv') || label.includes('resume') || label.includes('cv')) {
            uploadResumeFile(input, masterResume);
            filledCount++;
          }
        } else {
          // standard text, email, tel, etc.
          input.value = val;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        }
      }
    });

    const statusText = document.getElementById('iphire-status-text');
    if (statusText) {
      statusText.innerHTML = `<span style="color:#0f766e;font-weight:bold;">🚀 Completed! Filled ${filledCount} fields automatically.</span>`;
    }
  }

  function uploadResumeFile(input, resumeObj) {
    if (!resumeObj) return;

    // Convert markdown content to a dummy file or fetch structured version
    const textContent = resumeObj.content || '';
    const blob = new Blob([textContent], { type: 'text/markdown' });
    const file = new File([blob], `${resumeObj.name.replace(/\s+/g, '_')}_v${resumeObj.version}.md`, { type: 'text/markdown' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findLabelText(el) {
    // 1. Check direct label parent
    if (el.parentElement && el.parentElement.tagName === 'LABEL') {
      return el.parentElement.textContent || '';
    }

    // 2. Check referencing labels via id
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent || '';
    }

    // 3. Check preceding elements or labels
    let prev = el.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.classList.contains('label'))) {
      return prev.textContent || '';
    }

    // 4. Fallback search up the tree for sibling titles
    let parent = el.parentElement;
    for (let depth = 0; depth < 3; depth++) {
      if (!parent) break;
      const text = parent.querySelector('span, label, p')?.textContent;
      if (text) return text;
      parent = parent.parentElement;
    }

    return '';
  }

  // Load extension script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
