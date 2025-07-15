// Calendar functionality for Codeforces Daily Problems Extension

class Calendar {
  static generateCalendar(streakManager, currentDate = new Date()) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const todayStr = streakManager.getUTCDateString(today);
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let calendarHTML = `
      <div class="cf-calendar-header">
        <button class="cf-calendar-nav" onclick="window.cfDaily.changeCalendarMonth(-1)">‹</button>
        <h3>${monthNames[month]} ${year}</h3>
        <button class="cf-calendar-nav" onclick="window.cfDaily.changeCalendarMonth(1)">›</button>
      </div>
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
      calendarHTML += '<div class="cf-calendar-day cf-calendar-day-empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = streakManager.getUTCDateString(date);
      const dayData = streakManager.streakData.completedDays[dateStr];
      const isToday = dateStr === todayStr;
      const isFuture = date > today;
      
      let dayClass = 'cf-calendar-day';
      if (isToday) dayClass += ' cf-calendar-day-today';
      if (isFuture) dayClass += ' cf-calendar-day-future';
      if (!isFuture && !dayData) dayClass += ' cf-calendar-day-clickable';
      if (dayData) dayClass += ' cf-calendar-day-clickable';
      
      let symbols = '';
      if (dayData) {
        if (dayData.solvedPersonalized) symbols += '🔥';
        if (dayData.solvedRandom) symbols += '🚀';
      }
      
      const clickHandler = (!isFuture) ? `onclick="window.cfDaily.viewDateProblems('${dateStr}')"` : '';
      
      calendarHTML += `
        <div class="${dayClass}" ${clickHandler}>
          <span class="cf-calendar-day-number">${day}</span>
          <span class="cf-calendar-day-symbols">${symbols}</span>
        </div>
      `;
    }
    
    calendarHTML += `
      </div>
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
      <div class="cf-calendar-actions">
        <button class="cf-calendar-back-btn" onclick="window.cfDaily.toggleCalendarView()">
          ← Back to Today
        </button>
      </div>
    `;
    
    return calendarHTML;
  }
}

// Export for use in other files
window.Calendar = Calendar;