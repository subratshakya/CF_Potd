// UI rendering functions for Codeforces Daily Problems Extension

class UIRenderer {
  static getRatingClass(rating) {
    if (rating < 1200) return 'newbie';
    if (rating < 1400) return 'pupil';
    if (rating < 1600) return 'specialist';
    if (rating < 1900) return 'expert';
    if (rating < 2100) return 'candidate-master';
    if (rating < 2300) return 'master';
    if (rating < 2400) return 'international-master';
    if (rating < 2600) return 'grandmaster';
    if (rating < 3000) return 'international-grandmaster';
    return 'legendary-grandmaster';
  }

  static getRankTitle(rating) {
    if (rating < 1200) return 'Newbie';
    if (rating < 1400) return 'Pupil';
    if (rating < 1600) return 'Specialist';
    if (rating < 1900) return 'Expert';
    if (rating < 2100) return 'Candidate Master';
    if (rating < 2300) return 'Master';
    if (rating < 2400) return 'International Master';
    if (rating < 2600) return 'Grandmaster';
    if (rating < 3000) return 'International Grandmaster';
    return 'Legendary Grandmaster';
  }

  static renderProblemCard(problem, type, isSolved = false) {
    if (!problem) {
      return `
        <div class="cf-problem-card cf-problem-unavailable">
          <p>No suitable problem found.</p>
        </div>
      `;
    }

    const ratingClass = `cf-rating-${Math.floor(problem.rating / 100) * 100}`;
    const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
    
    return `
      <div class="cf-problem-card ${isSolved ? 'cf-problem-solved' : ''}" data-type="${type}">
        <div class="cf-problem-header">
          <a href="${problemUrl}" target="_blank" class="cf-problem-title">${problem.name}</a>
          <div class="cf-problem-header-right">
            <span class="cf-problem-rating ${ratingClass}">${problem.rating}</span>
            ${isSolved ? '<span class="cf-solved-badge">✓</span>' : ''}
          </div>
        </div>
        <div class="cf-problem-meta">
          <span class="cf-problem-id">${problem.contestId}${problem.index}</span>
          <div class="cf-problem-tags">
            ${problem.tags.slice(0, 3).map(tag => `<a href="#" class="cf-tag">${tag}</a>`).join(', ')}
          </div>
        </div>
        <div class="cf-problem-actions">
          <a href="${problemUrl}" target="_blank" class="cf-solve-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Solve
          </a>
          ${isSolved ? `
            <span class="cf-solved-status">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Solved
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  static renderLoadingState() {
    return `
      <div class="cf-loading">
        <div class="cf-spinner"></div>
        <p>Loading problems...</p>
      </div>
    `;
  }

  static renderErrorState(error) {
    return `
      <div class="cf-error">
        <p>${error}</p>
        <button onclick="location.reload()" class="cf-retry-btn">Retry</button>
      </div>
    `;
  }
}

// Export for use in other files
window.UIRenderer = UIRenderer;