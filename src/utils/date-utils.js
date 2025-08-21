// Date utility functions

export class DateUtils {
  /**
   * Get UTC date string in YYYY-MM-DD format
   * @param {Date} date - Date object (defaults to current date)
   * @returns {string} UTC date string
   */
  static getUTCDateString(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDateForDisplay(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get time until next UTC day
   * @returns {Object} Time remaining object
   */
  static getTimeUntilNextUTCDay() {
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

  /**
   * Get next alarm time for given hour and minute (UTC)
   * @param {number} hour - Hour in UTC
   * @param {number} minute - Minute
   * @returns {number} Timestamp for next alarm
   */
  static getNextAlarmTime(hour, minute) {
    const now = new Date();
    const target = new Date();
    target.setUTCHours(hour, minute, 0, 0);
    
    // If target time has passed today, schedule for tomorrow
    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    
    return target.getTime();
  }

  /**
   * Check if two dates are the same day (UTC)
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} True if same day
   */
  static isSameUTCDay(date1, date2) {
    return this.getUTCDateString(date1) === this.getUTCDateString(date2);
  }

  /**
   * Get days difference between two dates
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Days difference
   */
  static getDaysDifference(date1, date2) {
    const utcDate1 = new Date(this.getUTCDateString(date1) + 'T00:00:00.000Z');
    const utcDate2 = new Date(this.getUTCDateString(date2) + 'T00:00:00.000Z');
    return Math.floor((utcDate2 - utcDate1) / (1000 * 60 * 60 * 24));
  }
}