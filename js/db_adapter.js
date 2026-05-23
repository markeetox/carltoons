/**
 * db_adapter.js
 * A small wrapper to make switching from Firestore to Realtime DB easier.
 */

const DB = {
  // players/{uid}
  async getPlayer(uid) {
    if (!uid || !auth.currentUser) return null;
    try {
      const snap = await db.ref(`players/${uid}`).once('value');
      return snap.exists() ? snap.val() : null;
    } catch (err) {
      console.error("[DB] getPlayer failed:", err);
      return null;
    }
  },
  async setPlayer(uid, data) {
    if (!uid || !auth.currentUser) return;
    try {
      await db.ref(`players/${uid}`).set(data);
    } catch (err) {
      console.error("[DB] setPlayer failed:", err);
    }
  },
  async updatePlayer(uid, data) {
    if (!uid || !auth.currentUser) return;
    try {
      await db.ref(`players/${uid}`).update(data);
    } catch (err) {
      console.error("[DB] updatePlayer failed:", err);
    }
  },

  // pigeons/{uid}
  async getPigeon(uid) {
    if (!uid || !auth.currentUser) return null;
    try {
      const snap = await db.ref(`pigeons/${uid}`).once('value');
      return snap.exists() ? snap.val() : null;
    } catch (err) {
      console.error("[DB] getPigeon failed:", err);
      return null;
    }
  },
  async setPigeon(uid, data) {
    if (!uid || !auth.currentUser) return;
    try {
      await db.ref(`pigeons/${uid}`).set(data);
    } catch (err) {
      console.error("[DB] setPigeon failed:", err);
    }
  },
  async updatePigeon(uid, data) {
    if (!uid || !auth.currentUser) return;
    try {
      await db.ref(`pigeons/${uid}`).update(data);
    } catch (err) {
      console.error("[DB] updatePigeon failed:", err);
    }
  },

  // battles
  async getWaitingBattles() {
    if (!auth.currentUser) return [];
    try {
      const snap = await db.ref('battles')
        .orderByChild('status')
        .equalTo('waiting')
        .limitToFirst(20)
        .once('value');

      const battles = [];
      snap.forEach(child => {
        battles.push({ id: child.key, ref: child.ref, ...child.val() });
      });
      return battles;
    } catch (err) {
      console.error("[DB] getWaitingBattles failed:", err);
      return [];
    }
  },
  async createBattle(data) {
    if (!auth.currentUser) return null;
    try {
      const ref = db.ref('battles').push();
      await ref.set(data);
      return ref;
    } catch (err) {
      console.error("[DB] createBattle failed:", err);
      return null;
    }
  },
  async getLeaderboard() {
    if (!auth.currentUser) return [];
    try {
      const snap = await db.ref('players')
        .orderByChild('elo')
        .limitToLast(10)
        .once('value');

      const list = [];
      snap.forEach(child => {
        list.push(child.val());
      });
      return list.reverse(); // Highest ELO first
    } catch (err) {
      console.error("[DB] getLeaderboard failed:", err);
      return [];
    }
  },
  async searchPlayers(query) {
    if (!auth.currentUser) return [];
    try {
      const snap = await db.ref('players')
        .orderByChild('username')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limitToFirst(10)
        .once('value');

      const list = [];
      snap.forEach(child => {
        list.push(child.val());
      });
      return list;
    } catch (err) {
      console.error("[DB] searchPlayers failed:", err);
      return [];
    }
  },
  async getMyBattles(uid) {
    if (!uid || !auth.currentUser) return [];
    try {
      // RTDB limited querying: fetch by guestId, then by hostId, then merge.
      const [asGuest, asHost] = await Promise.all([
        db.ref('battles').orderByChild('guestId').equalTo(uid).once('value'),
        db.ref('battles').orderByChild('hostId').equalTo(uid).once('value')
      ]);

      const results = new Map();
    [asGuest, asHost].forEach(snap => {
      snap.forEach(child => {
        results.set(child.key, { id: child.key, ...child.val() });
      });
    });

    const battles = Array.from(results.values());
    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    const active = [];
    for (const b of battles) {
      if (b.status === 'done') continue;

      // Handle 3-day timeout
      const last = b.lastActivity || b.createdAt || now;
      if (now - last > THREE_DAYS_MS) {
        // Determine winner: last player who interacted.
        // If guestMove exists but host hasn't moved, guest was last.
        // If both moved, host resolves (shouldn't happen with both, but fallback to host).
        let winnerId = b.hostId;
        if (b.status === 'challenged') winnerId = b.hostId; // guest never accepted
        else if (b.guestMove && !b.hostMove) winnerId = b.guestId;
        else if (b.hostMove && !b.guestMove) winnerId = b.hostId;

        try {
          await db.ref(`battles/${b.id}`).update({
            status: 'done',
            winnerId,
            fullLog: [...(b.fullLog || []), "⏱️ Battle ended due to 2 days of inactivity."]
          });
        } catch (_) {}
        continue; // Filter out from list
      }
      active.push(b);
    }

      return active;
    } catch (err) {
      console.error("[DB] getMyBattles failed:", err);
      return [];
    }
  },
  async getBattle(battleId) {
    if (!auth.currentUser) return null;
    try {
      const snap = await db.ref(`battles/${battleId}`).once('value');
      return snap.exists() ? { id: snap.key, ...snap.val() } : null;
    } catch (err) {
      console.error("[DB] getBattle failed:", err);
      return null;
    }
  },
  async awardEarthworm(uid) {
    if (!uid || !auth.currentUser) return;
    try {
      const ref = db.ref(`players/${uid}/earthworms`);
      await ref.transaction((current) => {
        return (current || 0) + 1;
      });
    } catch (err) {
      console.error("[DB] Failed to award earthworm:", err);
    }
  }
};
