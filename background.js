// Background script for Codeforces Daily Problems Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Codeforces Daily Problems extension installed');
});

// Handle extension lifecycle and data management
chrome.runtime.onStartup.addListener(() => {
  // Clean up old cached data on startup
  cleanupOldCache();
});



async function cleanupOldCache() {
  try {
    const result = await chrome.storage.local.get(['cf-daily-cache']);
    const cachedData = result['cf-daily-cache'];
    
    if (cachedData) {
      const today = new Date().toDateString();
      const cachedDate = cachedData.date;
      
      // If cached data is from a previous day, remove it
      if (cachedDate !== today) {
        await chrome.storage.local.remove(['cf-daily-cache']);
        console.log('Cleaned up old cached problems');
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

// Listen for tab updates to inject content script on Codeforces pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('codeforces.com')) {
    // The content script will be automatically injected via manifest
    console.log('Codeforces page loaded, content script should be active');
  }
});

// Handle any messages from content script if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getCachedProblems') {
    chrome.storage.local.get(['cf-daily-cache'], (result) => {
      sendResponse(result['cf-daily-cache']);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === 'setCachedProblems') {
    chrome.storage.local.set({ 'cf-daily-cache': message.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});