// Streak management for Codeforces Daily Problems Extension

class StreakManager {
  constructor() {
    this.streakData = null;
  }

  async loadStreakData(currentUser) {
    try {
      const streakKey = currentUser ? `cf-streak-${currentUser}` : 'cf-streak-guest';
      const streakData = await StorageManager.getStorageData(streakKey);
      
      this.streakData = streakData || {
        personalizedStreak: 0,
        randomStreak: 0,
        maxPersonalizedStreak: 0,
        maxRandomStreak: 0,
        completedDays: {},
        lastPersonalizedDate: null,
        lastRandomDate: null
      };

      console.log('Loaded streak data:', this.streakData);
    } catch (error) {
      console.error('Error loading streak data:', error);
      this.streakData = {
        personalizedStreak: 0,
        randomStreak: 0,
        maxPersonalizedStreak: 0,
        maxRandomStreak: 0,
        completedDays: {},
        lastPersonalizedDate: null,
        lastRandomDate: null
      };
    }
  }

  async saveStreakData(currentUser) {
    try {
      const streakKey = currentUser ? `cf-streak-${currentUser}` : 'cf-streak-guest';
      await StorageManager.setStorageData(streakKey, this.streakData);
      console.log('Streak data saved:', this.streakData);
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }

  getUTCDateString(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  getTimeUntilNextUTCDay() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    
    const nextDay = new Date(utcNow);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    nextDay.setUTCHours(0, 0, 0, 0);
    
    const timeLeft = nextDay.getTime() - utcNow.getTime();
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      totalMs: timeLeft
    };
  }

  async markDayCompleted(dateString, solvedProblems = [], solvedPersonalized = false, solvedRandom = false, currentUser) {
    console.log('Marking day completed:', dateString, 'with problems:', solvedProblems);
    
    const now = Date.now();
    
    this.streakData.completedDays[dateString] = {
      solved: true,
      timestamp: now,
      problems: solvedProblems,
      solvedPersonalized,
      solvedRandom
    };
    
    // Update personalized streak
    if (solvedPersonalized) {
      let isPersonalizedConsecutive = false;
      
      if (this.streakData.personalizedStreak === 0) {
        isPersonalizedConsecutive = true;
      } else if (this.streakData.lastPersonalizedDate) {
        const lastDate = new Date(this.streakData.lastPersonalizedDate + 'T00:00:00.000Z');
        const currentDate = new Date(dateString + 'T00:00:00.000Z');
        const daysDifference = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        isPersonalizedConsecutive = daysDifference === 1;
      }
      
      if (isPersonalizedConsecutive) {
        this.streakData.personalizedStreak += 1;
      } else {
        this.streakData.personalizedStreak = 1;
      }
      
      this.streakData.lastPersonalizedDate = dateString;
      this.streakData.maxPersonalizedStreak = Math.max(this.streakData.maxPersonalizedStreak, this.streakData.personalizedStreak);
    }
    
    // Update random streak
    if (solvedRandom) {
      let isRandomConsecutive = false;
      
      if (this.streakData.randomStreak === 0) {
        isRandomConsecutive = true;
      } else if (this.streakData.lastRandomDate) {
        const lastDate = new Date(this.streakData.lastRandomDate + 'T00:00:00.000Z');
        const currentDate = new Date(dateString + 'T00:00:00.000Z');
        const daysDifference = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
        isRandomConsecutive = daysDifference === 1;
      }
      
      if (isRandomConsecutive) {
        this.streakData.randomStreak += 1;
      } else {
        this.streakData.randomStreak = 1;
      }
      
      this.streakData.lastRandomDate = dateString;
      this.streakData.maxRandomStreak = Math.max(this.streakData.maxRandomStreak, this.streakData.randomStreak);
    }
    
    console.log('Streak calculation:', {
      dateString,
      solvedPersonalized,
      solvedRandom,
      personalizedStreak: this.streakData.personalizedStreak,
      randomStreak: this.streakData.randomStreak
    });
    
    await this.saveStreakData(currentUser);
  }

  isTodayCompleted() {
    const today = this.getUTCDateString();
    const todayData = this.streakData.completedDays[today];
    return {
      any: !!todayData,
      personalized: !!(todayData && todayData.solvedPersonalized),
      random: !!(todayData && todayData.solvedRandom)
    };
  }
}

// Export for use in other files
window.StreakManager = StreakManager;