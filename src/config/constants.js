// Application constants and configuration

window.CONFIG = {
  // API Configuration
  API: {
    BASE_URL: 'https://codeforces.com/api',
    ENDPOINTS: {
      PROBLEMS: '/problemset.problems',
      USER_INFO: '/user.info',
      USER_STATUS: '/user.status'
    },
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
  },

  // Cache Configuration
  CACHE: {
    DURATION_HOURS: 24,
    KEYS: {
      GLOBAL_PREFIX: 'cf-global-cache-',
      USER_PREFIX: 'cf-user-cache-',
      STREAK_PREFIX: 'cf-streak-',
      RATING_PREFIX: 'cf-user-rating-',
      CURRENT_USER: 'cf-current-user'
    }
  },

  // Problem Configuration
  PROBLEMS: {
    MIN_RATING: 800,
    MAX_RATING: 3500,
    RATING_BUFFER: {
      LOW: 100,
      HIGH: 300
    },
    DEFAULT_USER_RATING: 1200
  },

  // Streak Configuration
  STREAK: {
    CHECK_TIMES: ['00:00', '12:00'], // UTC times
    TIMEZONE: 'UTC'
  },

  // UI Configuration
  UI: {
    MODAL_ID: 'cf-daily-modal',
    BUTTON_ID: 'cf-daily-button',
    ANIMATION_DURATION: 200
  },

  // Extension Metadata
  EXTENSION: {
    NAME: 'Codeforces Daily Problems',
    VERSION: '1.0.0',
    HASH_SEED: 'cf-daily-2024'
  }
};

window.RATING_CLASSES = {
  NEWBIE: { min: 0, max: 1199, class: 'newbie', title: 'Newbie' },
  PUPIL: { min: 1200, max: 1399, class: 'pupil', title: 'Pupil' },
  SPECIALIST: { min: 1400, max: 1599, class: 'specialist', title: 'Specialist' },
  EXPERT: { min: 1600, max: 1899, class: 'expert', title: 'Expert' },
  CANDIDATE_MASTER: { min: 1900, max: 2099, class: 'candidate-master', title: 'Candidate Master' },
  MASTER: { min: 2100, max: 2299, class: 'master', title: 'Master' },
  INTERNATIONAL_MASTER: { min: 2300, max: 2399, class: 'international-master', title: 'International Master' },
  GRANDMASTER: { min: 2400, max: 2599, class: 'grandmaster', title: 'Grandmaster' },
  INTERNATIONAL_GRANDMASTER: { min: 2600, max: 2999, class: 'international-grandmaster', title: 'International Grandmaster' },
  LEGENDARY_GRANDMASTER: { min: 3000, max: Infinity, class: 'legendary-grandmaster', title: 'Legendary Grandmaster' }
};

window.ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'Failed to fetch data from Codeforces API.',
  USER_NOT_FOUND: 'User not found or verification failed.',
  NO_PROBLEMS: 'No suitable problems found.',
  CACHE_ERROR: 'Error accessing cached data.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
};