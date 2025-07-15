// Problem fetching and caching for Codeforces Daily Problems Extension

class ProblemFetcher {
  static getUniversalDateKey(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  static formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  static async loadDailyProblems(currentUser, currentUserRating, userVerified, date = new Date()) {
    try {
      const universalDateKey = this.getUniversalDateKey(date);
      
      // Check for global random problem cache
      const globalCacheKey = `cf-global-cache-${universalDateKey}`;
      const globalCache = await StorageManager.getStorageData(globalCacheKey);
      
      // Check for user-specific rating problem cache
      let userRatingCache = null;
      if (currentUser && currentUserRating) {
        const userCacheKey = `cf-user-cache-${currentUser}-${universalDateKey}`;
        userRatingCache = await StorageManager.getStorageData(userCacheKey);
      }
      
      // If we have both caches, use them
      if (globalCache && (!currentUser || userRatingCache)) {
        const dailyProblems = {
          userRating: currentUserRating || 1200,
          isLoggedIn: !!(currentUser && userVerified),
          ratingBased: userRatingCache?.ratingProblem || null,
          random: globalCache.randomProblem,
          date: this.formatDateKey(date)
        };
        console.log('Loaded problems from cache');
        return dailyProblems;
      }

      // Fetch new problems for the specific date
      return await this.fetchDailyProblems(currentUser, currentUserRating, userVerified, date);
    } catch (error) {
      console.error('Error loading daily problems:', error);
      return { error: 'Failed to load problems. Please try again later.' };
    }
  }

  static async fetchDailyProblems(currentUser, currentUserRating, userVerified, date = new Date()) {
    try {
      const userRating = currentUserRating || 1200;

      // Fetch all problems
      const problemsResponse = await fetch('https://codeforces.com/api/problemset.problems');
      const problemsData = await problemsResponse.json();
      
      if (problemsData.status !== 'OK') {
        throw new Error('Failed to fetch problems');
      }

      const problems = problemsData.result.problems;
      
      // Filter problems for user rating range (x-100 to x+300)
      const ratingBasedProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= (userRating - 100) && 
        problem.rating <= (userRating + 300)
      );

      // Filter problems for random selection (800-3500)
      const allProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= 800 && 
        problem.rating <= 3500
      );

      // Use universal date key for consistent problem selection globally
      const universalDateKey = this.getUniversalDateKey(date);
      
      // Select problems based on universal date
      const ratingProblem = this.selectDailyProblem(ratingBasedProblems, universalDateKey, 'rating');
      const randomProblem = this.selectDailyProblem(allProblems, universalDateKey, 'random');

      const dailyProblems = {
        userRating,
        isLoggedIn: !!(currentUser && userVerified),
        ratingBased: ratingProblem,
        random: randomProblem,
        date: this.formatDateKey(date)
      };

      // Cache the problems separately
      const globalCacheKey = `cf-global-cache-${universalDateKey}`;
      await StorageManager.setStorageData(globalCacheKey, {
        randomProblem: randomProblem,
        cachedAt: Date.now()
      });

      // Cache user-specific rating problem if logged in
      if (currentUser && currentUserRating) {
        const userCacheKey = `cf-user-cache-${currentUser}-${universalDateKey}`;
        await StorageManager.setStorageData(userCacheKey, {
          ratingProblem: ratingProblem,
          userRating: userRating,
          cachedAt: Date.now()
        });
      }

      console.log('Fetched and cached new problems');
      return dailyProblems;

    } catch (error) {
      console.error('Error fetching daily problems:', error);
      return { error: 'Failed to load problems. Please try again later.' };
    }
  }

  static selectDailyProblem(problems, dateKey, type) {
    if (problems.length === 0) return null;
    const seed = this.hashCode(dateKey + type + 'cf-daily-2024');
    const index = Math.abs(seed) % problems.length;
    return problems[index];
  }

  static hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  static async checkTodaysSolutions(currentUser, userVerified, dailyProblems, streakManager) {
    if (!currentUser || !userVerified || !dailyProblems) {
      console.log('Cannot check solutions - user not verified or no problems loaded');
      return false;
    }

    const today = streakManager.getUTCDateString();
    
    // If already marked as completed today, don't check again
    if (streakManager.streakData.completedDays[today]) {
      console.log('Today already marked as completed');
      return true;
    }

    console.log('Checking if user solved today\'s problems...');
    
    try {
      const response = await fetch(`https://codeforces.com/api/user.status?handle=${currentUser}&from=1&count=100`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error('Failed to fetch submissions:', data);
        return false;
      }

      const submissions = data.result;
      const { ratingBased, random } = dailyProblems;
      
      const todayUTC = streakManager.getUTCDateString();
      const solvedProblems = [];
      let solvedPersonalized = false;
      let solvedRandom = false;
      
      for (const submission of submissions) {
        const submissionTime = new Date(submission.creationTimeSeconds * 1000);
        const submissionUTCDate = streakManager.getUTCDateString(submissionTime);
        
        if (submissionUTCDate === todayUTC && submission.verdict === 'OK') {
          const problemId = `${submission.problem.contestId}${submission.problem.index}`;
          
          if (ratingBased && `${ratingBased.contestId}${ratingBased.index}` === problemId) {
            solvedProblems.push(problemId);
            solvedPersonalized = true;
            console.log('Found solved rating-based problem:', problemId);
          }
          
          if (random && `${random.contestId}${random.index}` === problemId) {
            solvedProblems.push(problemId);
            solvedRandom = true;
            console.log('Found solved random problem:', problemId);
          }
        }
      }

      if (solvedProblems.length > 0) {
        console.log('User solved daily problems today:', solvedProblems);
        await streakManager.markDayCompleted(today, solvedProblems, solvedPersonalized, solvedRandom, currentUser);
        return true;
      }

      console.log('No daily problems solved today');
      return false;
    } catch (error) {
      console.error('Error checking today\'s solutions:', error);
      return false;
    }
  }
}

// Export for use in other files
window.ProblemFetcher = ProblemFetcher;