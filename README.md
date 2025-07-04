# Codeforces Daily Problems Extension

A beautiful Chrome extension that provides personalized daily coding problems for Codeforces users.

## Features

- **Personalized Recommendations**: Get problems tailored to your current rating (±200 range)
- **Daily Random Challenge**: Same random problem for all users each day (800-3500 rating)
- **Seamless Integration**: Beautiful floating button on all Codeforces pages
- **Automatic Profile Detection**: Fetches your rating automatically when logged in
- **Smart Caching**: Problems are cached daily to reduce API calls
- **Responsive Design**: Works perfectly on all screen sizes

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and active on Codeforces pages

## Usage

1. Visit any Codeforces page while logged in
2. Look for the floating "Daily" button in the bottom right corner
3. Click the button to open your daily problems modal
4. Solve your personalized and random daily problems!

## How It Works

### Rating-Based Problems
- Detects your current Codeforces rating
- Selects problems in the range of (your_rating - 100) to (your_rating + 300)
- Provides appropriate challenge level for skill improvement

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