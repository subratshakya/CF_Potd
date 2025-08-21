# Codeforces Daily Problems Extension

A production-grade Chrome extension that provides personalized daily coding problems for Codeforces users with advanced streak tracking and calendar features.

## Features

### 🎯 **Core Features**
- **Personalized Problems**: Tailored to your rating (rating-100 to rating+300)
- **Daily Random Challenge**: Universal problem for all users (800-3500 rating)
- **Dual Streak Tracking**: Separate streaks for personalized (🔥) and random (🚀) problems
- **Calendar History**: Visual calendar showing your solving history
- **Automatic Detection**: Seamless profile detection and rating fetching
- **Background Sync**: Automatic streak updates at 12:00 AM and 12:00 PM UTC

### 🛡️ **Technical Features**
- **Smart Caching**: Efficient daily problem caching with automatic cleanup
- **Error Handling**: Robust error handling with retry mechanisms
- **Responsive Design**: Mobile-optimized interface
- **Production Architecture**: Modular, maintainable codebase
- **Comprehensive Testing**: Unit tests with Jest
- **Code Quality**: ESLint + Prettier with pre-commit hooks

## Installation

### From Source (Development)
1. Download or clone this repository
2. Install dependencies: `npm install`
3. Run linting and tests: `npm run validate`
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the project folder
7. The extension will be installed and active on Codeforces pages

### Production Build
```bash
npm run build
npm run zip
```
This creates a `codeforces-daily-extension.zip` file ready for Chrome Web Store.

## Usage

### 🚀 **Getting Started**
1. **Visit Codeforces**: Go to any Codeforces page
2. **Find the Button**: Look for the floating "Daily" button (bottom right)
3. **Open Modal**: Click to see your daily problems
4. **Solve Problems**: Click "Solve" to open problems in new tabs
5. **Track Progress**: Your streaks update automatically!

### 📅 **Calendar Features**
- **View History**: Click the 📅 calendar icon to see your solving calendar
- **Navigate Months**: Use arrow buttons to browse different months
- **View Past Problems**: Click any past date to see that day's problems
- **Visual Indicators**: 🔥 for personalized, 🚀 for random problems

### 🔥 **Streak System**
- **🔥 Personalized Streak**: Consecutive days solving rating-based problems
- **🚀 Random Streak**: Consecutive days solving daily random problems
- **Independent Tracking**: Each streak is tracked separately
- **Best Records**: Shows your all-time best streaks
- **Automatic Updates**: Streaks update twice daily via background service

## How It Works

### 🎯 **Problem Selection Algorithm**
```javascript
// Personalized Problems
ratingRange = [userRating - 100, userRating + 300]

// Random Problems  
ratingRange = [800, 3500]

// Consistent daily selection using date-based hashing
selectedProblem = hashBasedSelection(problems, dateKey, problemType)
```

### ⏰ **Background Streak Checking**
- **12:00 AM UTC**: Post-contest check for new solutions
- **12:00 PM UTC**: Mid-day validation for early solvers
- **API Integration**: Fetches recent submissions automatically
- **Smart Validation**: Only counts AC (Accepted) submissions from today

### 💾 **Caching Strategy**
- **Global Cache**: Random problems cached globally (same for all users)
- **User Cache**: Personalized problems cached per user
- **24-Hour TTL**: Automatic cache expiration and cleanup
- **Efficient Storage**: Minimal API calls with intelligent caching

## Development

### 📁 **Project Structure**
```
src/
├── config/           # Configuration and constants
├── utils/            # Utility functions (date, hash, logger)
├── services/         # API, storage, and business logic services
├── models/           # Data models (StreakModel)
├── components/       # UI components (calendar, problem cards)
├── controllers/      # Main application controller
├── background/       # Background service worker
└── styles/           # CSS stylesheets

tests/                # Unit tests
├── utils/            # Utility function tests
├── models/           # Model tests
└── setup.js          # Jest configuration
```

### 🛠️ **Available Scripts**
```bash
npm run dev          # Development mode
npm run build        # Production build
npm run test         # Run tests
npm run test:watch   # Watch mode testing
npm run test:coverage # Coverage report
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
npm run format       # Prettier formatting
npm run validate     # Lint + test validation
npm run zip          # Create distribution zip
```

### 🧪 **Testing**
- **Framework**: Jest with jsdom environment
- **Coverage**: Comprehensive unit test coverage
- **Mocking**: Chrome APIs and external dependencies mocked
- **CI Ready**: Tests run in GitHub Actions

### 📋 **Code Quality**
- **ESLint**: Strict linting rules with Prettier integration
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality assurance
- **Lint-staged**: Only lint changed files

## Architecture

### 🏗️ **Design Patterns**
- **MVC Pattern**: Clear separation of concerns
- **Service Layer**: Business logic abstraction
- **Repository Pattern**: Data access abstraction
- **Observer Pattern**: Event-driven updates
- **Singleton Pattern**: Shared service instances

### 🔧 **Key Components**

#### **MainController**
- Orchestrates the entire application
- Manages user detection and verification
- Handles UI interactions and modal display

#### **ProblemService**
- Fetches and caches daily problems
- Validates user solutions
- Manages problem selection algorithms

#### **StreakModel**
- Tracks personalized and random streaks
- Manages completion history
- Validates streak consistency

#### **BackgroundService**
- Handles automatic streak checking
- Manages Chrome extension lifecycle
- Performs cache cleanup

### 🔐 **Security & Privacy**
- **No Data Collection**: Only uses public Codeforces API
- **Local Storage**: All data stored locally in browser
- **API Rate Limiting**: Intelligent request throttling
- **Error Boundaries**: Graceful error handling

## API Reference

### 🌐 **Codeforces API Endpoints**
```javascript
// Get all problems
GET https://codeforces.com/api/problemset.problems

// Get user information
GET https://codeforces.com/api/user.info?handles={username}

// Get user submissions
GET https://codeforces.com/api/user.status?handle={username}&from=1&count=100
```

### 📊 **Data Models**

#### **Problem Object**
```javascript
{
  contestId: number,
  index: string,
  name: string,
  rating: number,
  tags: string[]
}
```

#### **Streak Data**
```javascript
{
  personalizedStreak: number,
  randomStreak: number,
  maxPersonalizedStreak: number,
  maxRandomStreak: number,
  completedDays: {
    [dateString]: {
      solved: boolean,
      timestamp: number,
      problems: string[],
      solvedPersonalized: boolean,
      solvedRandom: boolean
    }
  },
  lastPersonalizedDate: string,
  lastRandomDate: string
}
```

## Contributing

### 🤝 **How to Contribute**
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Install** dependencies: `npm install`
4. **Make** your changes following the coding standards
5. **Test** your changes: `npm run validate`
6. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
7. **Push** to your branch: `git push origin feature/amazing-feature`
8. **Create** a Pull Request

### 📝 **Coding Standards**
- Follow ESLint and Prettier configurations
- Write unit tests for new features
- Use conventional commit messages
- Update documentation for API changes
- Ensure all tests pass before submitting

### 🐛 **Bug Reports**
Please include:
- Chrome version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## Roadmap

### 🚀 **Upcoming Features**
- [ ] **TypeScript Migration**: Full TypeScript support
- [ ] **Contest Integration**: Live contest problem suggestions
- [ ] **Statistics Dashboard**: Detailed solving analytics
- [ ] **Export/Import**: Backup and restore streak data
- [ ] **Themes**: Dark mode and custom themes
- [ ] **Notifications**: Browser notifications for streaks
- [ ] **Social Features**: Share achievements
- [ ] **Multi-language**: Internationalization support

### 🔧 **Technical Improvements**
- [ ] **Manifest V3**: Full Manifest V3 compliance
- [ ] **Performance**: Further optimization
- [ ] **Offline Support**: Service worker caching
- [ ] **Analytics**: Usage analytics (privacy-focused)

## Changelog

### v1.0.0 (Current)
- ✅ **Initial Release**: Core functionality
- ✅ **Dual Streak Tracking**: Separate personalized and random streaks
- ✅ **Calendar Feature**: Visual history with clickable dates
- ✅ **Background Service**: Automatic streak updates
- ✅ **Production Architecture**: Modular, testable codebase
- ✅ **Code Quality**: ESLint, Prettier, Jest setup

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

### 📞 **Get Help**
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@cfextension.com

### ❤️ **Show Support**
- ⭐ **Star** the repository
- 🐛 **Report** bugs and issues
- 💡 **Suggest** new features
- 🤝 **Contribute** code improvements
- 📢 **Share** with fellow competitive programmers

---

**Made with ❤️ for the competitive programming community**

*Happy coding and keep those streaks alive! 🔥🚀*


### Daily Random Problems
- Same problem for all users on the same day
- Uses date-based seeding for consistency
- Rating range: 800-3500 to include all skill levels

### Smart Caching
- Problems are cached for 24 hours to reduce API calls
- Automatic cleanup of old cached data
- Fresh problems every day

## Technical Details

- **Manifest V3** Chrome extension
- **Vanilla JavaScript** for optimal performance
- **Modern CSS** with glassmorphism design
- **Codeforces API** integration
- **Local Storage** for caching

## Privacy

This extension:
- Only works on Codeforces pages
- Uses only public Codeforces API endpoints
- Stores only problem cache data locally
- Does not collect or transmit personal data

## Support

If you encounter any issues or have suggestions, please create an issue in the repository.

## License

MIT License - feel free to modify and distribute!
#