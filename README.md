# Tooniseum — Rumble Heroes Pixel Edition

A responsive Progressive Web App (PWA) Pigeon Tamagotchi game with real-time multiplayer battles and an open-world exploration mode.

## 🎮 Key Features
- **Deterministic Traits:** Every pigeon is unique based on the user's ID.
- **Bento Box UI:** A modern, card-based layout designed for mobile responsiveness.
- **Real-time Battles:** Multiplayer using Firebase Realtime Database for instant state synchronization.
- **Incubation System:** 3-day egg hatching cycle with stat-influencing actions.
- **Explore The Wilds:** A Rumble Heroes style exploration mode with virtual joystick controls, resource gathering (worms), and flock building.

## 🚀 Installation & Deployment

### 1. GitHub & Vercel (Automatic Deployment)
1. **Fork this repository** to your own GitHub account.
2. **Create a new project on Vercel** and connect it to your forked repository.
3. Vercel will automatically detect the configuration and deploy the site. Every push to your `main` branch will trigger a fresh build.

### 2. Firebase Setup (Realtime Database)
To make the game fully functional (Leaderboard, Battles, and Profile syncing), you must configure a Firebase project.

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password).
3. Enable **Realtime Database**.
4. Update `js/config.js` with your project's Firebase configuration object.

#### Security Rules
Copy and paste these into your **Realtime Database > Rules** tab. These rules ensure that players can only modify their own data and that battles are handled safely.

```json
{
  "rules": {
    "players": {
      ".read": "auth != null",
      ".indexOn": ["elo", "username"],
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "pigeons": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "battles": {
      ".read": "auth != null",
      ".indexOn": ["status", "guestId", "hostId"],
      "$battleId": {
        ".write": "auth != null && (!data.exists() || data.child('hostId').val() == auth.uid || data.child('guestId').val() == auth.uid || !data.child('guestId').exists())"
      }
    }
  }
}
```

## 🛠️ Local Development
To run the game locally for testing:
1. Ensure you have Python installed.
2. Run the following command in the root directory:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

## 📱 Mobile Friendly
This game is a PWA. To "install" it on your phone:
- **iOS:** Open in Safari, tap "Share", and select "Add to Home Screen".
- **Android:** Open in Chrome, tap the three dots, and select "Install App".

---
*Created by Carltoons — Pixel Art & Code.*
