# Pigeons by Carltoons

A responsive Progressive Web App (PWA) Pigeon Tamagotchi game with real-time multiplayer battles.

## Firebase Setup Instructions

To make the game fully functional (especially the Leaderboard, Nest, and Battles), you must configure your Firebase project with **Realtime Database**.

### Step-by-Step Configuration

Follow these steps to set up the required security rules and indexes for the multi-pigeon feature.

#### 1. Enable Realtime Database
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Select your project.
- Click on **Build > Realtime Database** in the left sidebar.
- Click **Create Database**, select a location, and start in **Locked Mode**.

#### 2. Apply Security Rules & Indexes
- Navigate to the **Rules** tab in the Realtime Database section.
- Copy the entire JSON block below and replace the existing rules.
- Click **Publish**.

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
        ".write": "auth != null && auth.uid == $uid",
        "$pigeonId": {
          ".write": "auth != null && auth.uid == $uid"
        }
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

### Understanding the Multi-Pigeon Structure

The game uses a nested structure to support multiple pigeons per user. This is handled at the `pigeons/{uid}/{pigeonId}` path.

- **Migration Support:** If you have data from a version where the pigeon was stored directly at `pigeons/{uid}`, the `getPigeons` logic in `js/db_adapter.js` will automatically detect and merge this "legacy" pigeon into your collection.
- **Access Control:** The security rules above allow you to read all player/pigeon data (required for the leaderboard and battles) but restrict writing only to your own profile and pigeons.
- **Performance:** The `.indexOn` properties ensure that the Leaderboard (`elo`), Player Search (`username`), and Matchmaking/Challenges (`status`, `guestId`, `hostId`) remain fast as the player base grows.

---

## Key Features
- **Deterministic Traits:** Every pigeon is unique based on the user's ID.
- **Bento Box UI:** A modern, card-based layout designed for mobile responsiveness.
- **Real-time Battles:** Multiplayer using Firebase Realtime Database for instant state synchronization.
- **Incubation System:** 3-day egg hatching cycle with stat-influencing actions.

### Troubleshooting Multi-Pigeon Issues

If you find that your eggs are hatching with the same traits or that your daily interactions are desynced (e.g., seeing egg actions for a hatched pigeon), follow these steps:

1. **Update Firebase Rules:** Ensure your security rules include the `$pigeonId` sub-node write permission as shown above.
2. **Hard Refresh:** Because this is a PWA, the Service Worker might be serving an old version of the JavaScript files. Perform a **Hard Refresh** (Cmd/Ctrl + Shift + R) or clear your browser site data to force the latest code.
3. **Legacy Migration:** The game automatically attempts to migrate old data structures. If your "Active" pigeon is stuck as an egg, try switching to another pigeon in the Nest and then back again to refresh the state.
4. **Matched Legs:** The breeding system matches `leg_far` and `leg_near`. If you are manually editing traits in the Firebase console, ensure these two variants match to avoid visual glitches.

### Manual Data Cleanup (Advanced)

If migration fails or your data is in a broken state, you can manually fix it in the Firebase Realtime Database Console:

1. **Migrate Root Data:** Copy any pigeon properties (traits, stats, incubationLog) from `pigeons/{uid}` into `pigeons/{uid}/{uid}`.
2. **Clear Root Keys:** Delete the `traits`, `stats`, and `incubationLog` keys from the root of `pigeons/{uid}`. Leave only the sub-nodes (e.g., `pigeon_1736...`).
3. **Set Active Pigeon:** Ensure `players/{uid}/activePigeonId` matches the ID of the pigeon you want to see on your home screen.

## Development
To run locally:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.
