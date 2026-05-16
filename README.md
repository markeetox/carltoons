# Pigeons by Carltoons

A responsive Progressive Web App (PWA) Pigeon Tamagotchi game with real-time multiplayer battles.

## Firebase Setup Instructions

To make the game fully functional (especially the Leaderboard and Battles), you must configure your Firebase project with the following rules and indexes.

### 1. Firestore Security Rules

Copy and paste these into your **Firestore > Rules** tab. These rules ensure that players can only modify their own data and that battles are handled safely.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Players can read any profile (for leaderboard/battle), but only write their own
    match /players/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Pigeons are tied to userIds
    match /pigeons/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Battles require more complex logic
    match /battles/{battleId} {
      allow read: if request.auth != null;

      // Allow creating a battle if the hostId matches the authenticated user
      allow create: if request.auth != null && request.resource.data.hostId == request.auth.uid;

      // Allow joining/updating a battle if you are the host or the guest
      allow update: if request.auth != null && (
        resource.data.hostId == request.auth.uid ||
        resource.data.guestId == request.auth.uid ||
        resource.data.guestId == null // allow joining
      );

      allow delete: if request.auth != null && resource.data.hostId == request.auth.uid;
    }
  }
}
```

### 2. Firestore Composite Indexes

Firestore requires indexes for queries that use `where` and `orderBy` together. You need to create these in the **Firestore > Indexes** tab:

| Collection | Fields to Index |
| :--- | :--- |
| **players** | `elo` (Descending), `__name__` (Ascending) |
| **battles** | `status` (Ascending), `createdAt` (Ascending) |

**Note:** If the app says "Leaderboard unavailable", it usually means the `players` index for ELO is still being built or was not created.

---

## Key Features
- **Deterministic Traits:** Every pigeon is unique based on the user's ID.
- **Bento Box UI:** A modern, card-based layout designed for mobile responsiveness.
- **Real-time Battles:** Multiplayer using Firestore as a message bus.
- **Incubation System:** 3-day egg hatching cycle with stat-influencing actions.

## Development
To run locally:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.
