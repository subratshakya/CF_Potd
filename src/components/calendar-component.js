// Calendar component for displaying problem history

window.CalendarComponent = class {
  /**
   * Generate calendar HTML for a given month
   * @param {Object} streakModel - Streak model instance
   * @param {Date} currentDate - Current date to display
   * @returns {string} Calendar HTML
   */
  static generateCalendar(streakModel, currentDate = new Date()) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const todayStr = window.DateUtils.getUTCDateString(today);
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let calendarHTML = this.renderCalendarHeader(monthNames[month], year);
    calendarHTML += this.renderCalendarGrid(
      year, month, daysInMonth, startingDayOfWeek, 
      streakModel, today, todayStr
    );
    calendarHTML += this.renderCalendarLegend();
    calendarHTML += this.renderCalendarActions();
    
    return calendarHTML;
  }

  /**
   * Render calendar header with navigation
   * @param {string} monthName - Month name
   * @param {number} year - Year
   * @returns {string} Header HTML
   */
  static renderCalendarHeader(monthName, year) {
    return `
      <div class="cf-calendar-header">
        <button class="cf-calendar-nav" onclick="window.cfDaily.changeCalendarMonth(-1)">‹</button>
        <h3>${monthName} ${year}</h3>
        <button class="cf-calendar-nav" onclick="window.cfDaily.changeCalendarMonth(1)">›</button>
      </div>
    `;
  }

  /**
   * Render calendar grid with days
   * @param {number} year - Year
   * @param {number} month - Month (0-indexed)
   * @param {number} daysInMonth - Number of days in month
   * @param {number} startingDayOfWeek - Starting day of week (0-6)
   * @param {Object} streakModel - Streak model instance
   * @param {Date} today - Today's date
   * @param {string} todayStr - Today's date string
   * @returns {string} Grid HTML
   */
  static renderCalendarGrid(year, month, daysInMonth, startingDayOfWeek, streakModel, today, todayStr) {
    let gridHTML = `
      <div class="cf-calendar-grid">
        <div class="cf-calendar-day-header">Sun</div>
        <div class="cf-calendar-day-header">Mon</div>
        <div class="cf-calendar-day-header">Tue</div>
        <div class="cf-calendar-day-header">Wed</div>
        <div class="cf-calendar-day-header">Thu</div>
        <div class="cf-calendar-day-header">Fri</div>
        <div class="cf-calendar-day-header">Sat</div>
    `;
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      gridHTML += '<div class="cf-calendar-day cf-calendar-day-empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = window.DateUtils.getUTCDateString(date);
      const dayData = streakModel.streakData.completedDays[dateStr];
      const isToday = dateStr === todayStr;
      const isFuture = date > today;
      
      gridHTML += this.renderCalendarDay(day, dateStr, dayData, isToday, isFuture);
    }
    
    gridHTML += '</div>';
    return gridHTML;
  }

  /**
   * Render individual calendar day
   * @param {number} day - Day number
   * @param {string} dateStr - Date string
   * @param {Object} dayData - Day completion data
   * @param {boolean} isToday - Whether this is today
   * @param {boolean} isFuture - Whether this is a future date
   * @returns {string} Day HTML
   */
  static renderCalendarDay(day, dateStr, dayData, isToday, isFuture) {
    let dayClass = 'cf-calendar-day';
    if (isToday) dayClass += ' cf-calendar-day-today';
    if (isFuture) dayClass += ' cf-calendar-day-future';
    if (!isFuture) dayClass += ' cf-calendar-day-clickable';
    
    let symbols = '';
    if (dayData) {
      if (dayData.solvedPersonalized) symbols += '🔥';
      if (dayData.solvedRandom) symbols += '🚀';
    }
    
    const clickHandler = (!isFuture) ? `onclick="window.cfDaily.viewDateProblems('${dateStr}')"` : '';
    
    return `
      <div class="${dayClass}" ${clickHandler}>
        <span class="cf-calendar-day-number">${day}</span>
        <span class="cf-calendar-day-symbols">${symbols}</span>
      </div>
    `;
  }

  /**
   * Render calendar legend
   * @returns {string} Legend HTML
   */
  static renderCalendarLegend() {
    return `
      <div class="cf-calendar-legend">
        <div class="cf-calendar-legend-item">
          <span class="cf-calendar-legend-symbol">🔥</span>
          <span class="cf-calendar-legend-text">Personalized Problem</span>
        </div>
        <div class="cf-calendar-legend-item">
          <span class="cf-calendar-legend-symbol">🚀</span>
          <span class="cf-calendar-legend-text">Random Problem</span>
        </div>
      </div>
    `;
  }

  /**
   * Render calendar actions
   * @returns {string} Actions HTML
   */
  static renderCalendarActions() {
    return `
      <div class="cf-calendar-actions">
        <button class="cf-calendar-back-btn" onclick="window.cfDaily.toggleCalendarView()">
          ← Back to Today
        </button>
      </div>
    `;
  }