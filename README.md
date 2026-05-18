# Pigeons by Carltoons

A responsive Progressive Web App (PWA) Pigeon Tamagotchi game with real-time multiplayer battles.

## Firebase Setup Instructions

To make the game fully functional (especially the Leaderboard and Battles), you must configure your Firebase project with **Realtime Database**.

> **IMPORTANT:** You must deploy the Realtime Database Security Rules and Indexes below to avoid "Missing or insufficient permissions" errors on the leaderboard and battle screens.

### 1. Realtime Database Security Rules

Copy and paste these into your **Realtime Database > Rules** tab. These rules ensure that players can only modify their own data and that battles are handled safely.

```json
{
  "rules": {
    "players": {
      ".read": "auth != null",
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
      "$battleId": {
        ".write": "auth != null && (!data.exists() || data.child('hostId').val() == auth.uid || data.child('guestId').val() == auth.uid || !data.child('guestId').exists())"
      }
    }
  }
}
```

### 2. Indexes

Realtime Database requires explicit indexing for high-performance queries. Update your rules to include `.indexOn` for `elo` and `status`:

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

---

## Key Features
- **Deterministic Traits:** Every pigeon is unique based on the user's ID.
- **Bento Box UI:** A modern, card-based layout designed for mobile responsiveness.
- **Real-time Battles:** Multiplayer using Firebase Realtime Database for instant state synchronization.
- **Incubation System:** 3-day egg hatching cycle with stat-influencing actions.

## Development
To run locally:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.
