/**
 * db_adapter.js
 * A small wrapper to make switching from Firestore to Realtime DB easier.
 */

const DB = {
  // players/{uid}
  async getPlayer(uid) {
    const snap = await db.ref(`players/${uid}`).once('value');
    return snap.exists() ? snap.val() : null;
  },
  async setPlayer(uid, data) {
    await db.ref(`players/${uid}`).set(data);
  },
  async updatePlayer(uid, data) {
    await db.ref(`players/${uid}`).update(data);
  },

  // pigeons/{uid}
  async getPigeon(uid) {
    const snap = await db.ref(`pigeons/${uid}`).once('value');
    return snap.exists() ? snap.val() : null;
  },
  async setPigeon(uid, data) {
    await db.ref(`pigeons/${uid}`).set(data);
  },
  async updatePigeon(uid, data) {
    await db.ref(`pigeons/${uid}`).update(data);
  },

  // battles
  async getWaitingBattles() {
    // RTDB doesn't have multiple inequality filters well,
    // but we can query by status.
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
  },
  async createBattle(data) {
    const ref = db.ref('battles').push();
    await ref.set(data);
    return ref;
  },
  async getLeaderboard() {
    const snap = await db.ref('players')
      .orderByChild('elo')
      .limitToLast(10)
      .once('value');

    const list = [];
    snap.forEach(child => {
      list.push(child.val());
    });
    return list.reverse(); // Highest ELO first
  },
  async searchPlayers(query) {
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
  },
  async getMyBattles(uid) {
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
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    const active = [];
    for (const b of battles) {
      if (b.status === 'done') continue;

      // Handle 2-day timeout
      const last = b.lastActivity || b.createdAt || now;
      if (now - last > TWO_DAYS_MS) {
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
  },
  async getBattle(battleId) {
    const snap = await db.ref(`battles/${battleId}`).once('value');
    return snap.exists() ? { id: snap.key, ...snap.val() } : null;
  },
  async awardEarthworm(uid) {
    if (!uid) return;
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
