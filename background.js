// Background script for Codeforces Daily Problems Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Codeforces Daily Problems extension installed');
  
  // Set up periodic streak checks
  setupPeriodicStreakChecks();
});

// Handle extension lifecycle and data management
chrome.runtime.onStartup.addListener(() => {
  // Clean up old cached data on startup
  cleanupOldCache();
  
  // Set up periodic streak checks
  setupPeriodicStreakChecks();
});

// Set up alarms for streak checking
function setupPeriodicStreakChecks() {
  // Clear existing alarms
  chrome.alarms.clearAll();
  
  // Create alarms for 12:00 AM and 12:00 PM UTC
  chrome.alarms.create('streak-check-midnight', {
    when: getNextAlarmTime(0, 0), // 12:00 AM UTC
    periodInMinutes: 24 * 60 // Every 24 hours
  });
  
  chrome.alarms.create('streak-check-noon', {
    when: getNextAlarmTime(12, 0), // 12:00 PM UTC
    periodInMinutes: 24 * 60 // Every 24 hours
  });
  
  console.log('Periodic streak checks scheduled');
}

// Calculate next alarm time for given hour and minute (UTC)
function getNextAlarmTime(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(hour, minute, 0, 0);
  
  // If target time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  
  return target.getTime();
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'streak-check-midnight' || alarm.name === 'streak-check-noon') {
    console.log(`Streak check triggered: ${alarm.name}`);
    await performStreakCheck();
  }
});

// Perform streak validation and updates
async function performStreakCheck() {
  try {
    // Get all users who have streak data
    const result = await chrome.storage.local.get(null);
    const streakKeys = Object.keys(result).filter(key => key.startsWith('cf-streak-'));
    
    for (const streakKey of streakKeys) {
      const username = streakKey.replace('cf-streak-', '');
      if (username === 'guest') continue; // Skip guest users
      
      console.log(`Checking streak for user: ${username}`);
      await checkUserStreak(username, result[streakKey]);
    }
  } catch (error) {
    console.error('Error during streak check:', error);
  }
}

// Check individual user's streak
async function checkUserStreak(username, streakData) {
  try {
    const today = getUTCDateString();
    const yesterday = getUTCDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    // If today is already marked as completed, skip
    if (streakData.completedDays[today]) {
      console.log(`${username}: Today already completed`);
      return;
    }
    
    // Check if user solved problems today
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=50`);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error(`Failed to fetch submissions for ${username}:`, data);
      return;
    }
    
    // Get today's problems
    const todayProblems = await getTodayProblems(username);
    if (!todayProblems) return;
    
    const submissions = data.result;
    let solvedPersonalized = false;
    let solvedRandom = false;
    const solvedProblems = [];
    
    // Check submissions from today
    for (const submission of submissions) {
      const submissionTime = new Date(submission.creationTimeSeconds * 1000);
      const submissionDate = getUTCDateString(submissionTime);
      
      if (submissionDate === today && submission.verdict === 'OK') {
        const problemId = `${submission.problem.contestId}${submission.problem.index}`;
        
        if (todayProblems.ratingBased && 
            `${todayProblems.ratingBased.contestId}${todayProblems.ratingBased.index}` === problemId) {
          solvedPersonalized = true;
          solvedProblems.push(problemId);
        }
        
        if (todayProblems.random && 
            `${todayProblems.random.contestId}${todayProblems.random.index}` === problemId) {
          solvedRandom = true;
          solvedProblems.push(problemId);
        }
      }
    }
    
    // Update streak if problems were solved
    if (solvedProblems.length > 0) {
      console.log(`${username}: Solved problems today:`, solvedProblems);
      await updateUserStreak(username, streakData, today, solvedProblems, solvedPersonalized, solvedRandom);
    } else {
      console.log(`${username}: No problems solved today`);
    }
    
  } catch (error) {
    console.error(`Error checking streak for ${username}:`, error);
  }
}

// Get today's problems for a user
async function getTodayProblems(username) {
  try {
    const today = getUTCDateString();
    
    // Try to get from cache first
    const globalCacheKey = `cf-global-cache-${today}`;
    const userCacheKey = `cf-user-cache-${username}-${today}`;
    
    const globalCache = await chrome.storage.local.get([globalCacheKey]);
    const userCache = await chrome.storage.local.get([userCacheKey]);
    
    if (globalCache[globalCacheKey] && userCache[userCacheKey]) {
      return {
        ratingBased: userCache[userCacheKey].ratingProblem,
        random: globalCache[globalCacheKey].randomProblem
      };
    }
    
    return null; // Problems not cached yet
  } catch (error) {
    console.error('Error getting today\'s problems:', error);
    return null;
  }
}

// Update user streak data
async function updateUserStreak(username, streakData, dateString, solvedProblems, solvedPersonalized, solvedRandom) {
  // Mark day as completed
  streakData.completedDays[dateString] = {
    solved: true,
    timestamp: Date.now(),
    problems: solvedProblems,
    solvedPersonalized,
    solvedRandom
  };
  
  // Update personalized streak
  if (solvedPersonalized) {
    let isPersonalizedConsecutive = false;
    
    if (streakData.personalizedStreak === 0) {
      isPersonalizedConsecutive = true;
    } else if (streakData.lastPersonalizedDate) {
      const lastDate = new Date(streakData.lastPersonalizedDate + 'T00:00:00.000Z');
      const currentDate = new Date(dateString + 'T00:00:00.000Z');
      const daysDifference = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      isPersonalizedConsecutive = daysDifference === 1;
    }
    
    if (isPersonalizedConsecutive) {
      streakData.personalizedStreak += 1;
    } else {
      streakData.personalizedStreak = 1;
    }
    
    streakData.lastPersonalizedDate = dateString;
    streakData.maxPersonalizedStreak = Math.max(streakData.maxPersonalizedStreak, streakData.personalizedStreak);
  }
  
  // Update random streak
  if (solvedRandom) {
    let isRandomConsecutive = false;
    
    if (streakData.randomStreak === 0) {
      isRandomConsecutive = true;
    } else if (streakData.lastRandomDate) {
      const lastDate = new Date(streakData.lastRandomDate + 'T00:00:00.000Z');
      const currentDate = new Date(dateString + 'T00:00:00.000Z');
      const daysDifference = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      isRandomConsecutive = daysDifference === 1;
    }
    
    if (isRandomConsecutive) {
      streakData.randomStreak += 1;
    } else {
      streakData.randomStreak = 1;
    }
    
    streakData.lastRandomDate = dateString;
    streakData.maxRandomStreak = Math.max(streakData.maxRandomStreak, streakData.randomStreak);
  }
  
  // Save updated streak data
  const streakKey = `cf-streak-${username}`;
  await chrome.storage.local.set({ [streakKey]: streakData });
  
  console.log(`Updated streak for ${username}:`, {
    personalizedStreak: streakData.personalizedStreak,
    randomStreak: streakData.randomStreak
  });
}

// Utility function to get UTC date string
function getUTCDateString(date = new Date()) {
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  return utcDate.toISOString().split('T')[0];
}


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