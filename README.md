# ⚓ One Piece TCG Tracker

A beautiful, feature-rich web application for tracking your One Piece Trading Card Game matches, statistics, and performance.

![One Piece TCG Tracker](https://via.placeholder.com/800x400/667eea/ffffff?text=One+Piece+TCG+Tracker)

## 🌟 Features

### Match Tracking
- **Record Matches** - Track matches with detailed information:
  - Your leader vs opponent's leader
  - Turn order (first/second)
  - Win/Loss result
  - Game format (OP-01 through OP-14, EB blocks)
  - Match notes (up to 500 characters)
- **Edit & Delete** - Modify or remove matches anytime
- **Complete History** - View all your matches with card images

### Statistics & Analytics
- **Your Leaders** - Track performance with each leader you play
  - Win/Loss records
  - Win rate percentages
  - Color-coded performance indicators
- **Matchup Statistics** - Analyze matchups against opponent leaders
  - Overall win rates
  - Turn order breakdown (going first vs second)
  - Color-coordinated win rate displays (red → yellow → green)
- **Leader Detail View** - Deep dive into specific leader performance
  - Matchup breakdowns
  - Filterable match history
  - Alternate art card display

### Advanced Filtering
- **Multi-Select Filters** - Filter matches by:
  - Your leader
  - Game format
  - Leader colors
  - Match result (Win/Loss)
  - Turn order
- **Mobile-Friendly** - Checkbox-based filters (no Ctrl-clicking needed)
- **Collapsible Sections** - Keep your interface clean and organized

### Personalization
- **Custom Backgrounds** - Select up to 10 favorite leader artworks
  - Includes all parallels, alternate arts, and special editions
  - Smooth fade transitions every 10 seconds
  - Search functionality to find specific cards
- **Personal Name** - Add your name to the title
- **Persistent Settings** - All preferences saved in localStorage

### Visual Design
- **Color-Coded Win Rates**
  - Red (0-50%) → Yellow (50%) → Green (50-100%)
  - Applied to all statistics displays
- **Card Images** - Full leader card artwork throughout the app
- **Smooth Animations** - Polished transitions and interactions
- **Responsive Design** - Works great on desktop and mobile

## 🚀 Getting Started

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/one-piece-tcg-tracker.git
   ```

2. Open `index.html` in your web browser

That's it! No installation or build process required.

### Usage
1. **Record a Match**
   - Select your leader and opponent's leader
   - Choose turn order and result
   - Add optional notes and format
   - Click "Save Match"

2. **View Statistics**
   - Check "Your Leaders" section for your performance
   - Review "Matchup Statistics" to see how you fare against opponents
   - Click any leader to see detailed breakdowns

3. **Customize**
   - Click 🎨 Background to select favorite card artworks
   - Click ✏️ to add your name to the title

## 📊 Data Storage

All data is stored locally in your browser using `localStorage`:
- Match history
- Background card selections
- User preferences
- Personal name

**Note:** Clearing browser data will delete your match history. Consider exporting your data periodically (feature coming soon!).

## 🎨 API Integration

This app uses the [One Piece TCG API](https://www.optcgapi.com/) to fetch:
- All leader cards
- Card images
- Set information
- Parallel and alternate art versions

## 🛠️ Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling with modern features (Grid, Flexbox, Animations)
- **JavaScript (ES6+)** - Application logic
- **LocalStorage API** - Data persistence
- **Fetch API** - Card data retrieval

## 📱 Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome! Feel free to open an issue.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- One Piece TCG API for providing card data
- Bandai for creating the One Piece Trading Card Game
- Eiichiro Oda for One Piece

## 📧 Contact

Created by Luke Budenberg - Feel free to reach out!

---

**Enjoy tracking your One Piece TCG journey!** ⚓🎴
