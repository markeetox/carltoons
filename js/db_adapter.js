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

  // pigeons/{uid}/{pigeonId}
  async getPigeon(uid, pigeonId) {
    if (!uid || !auth.currentUser) return null;
    const id = pigeonId || uid;
    try {
      // 1. Try the specific sub-node (new format)
      const snap = await db.ref(`pigeons/${uid}/${id}`).once('value');
      let pigeon = snap.exists() ? { id, ...snap.val() } : null;

      // 2. Check root (legacy) if it's the primary pigeon
      if (id === uid) {
        const rootSnap = await db.ref(`pigeons/${uid}`).once('value');
        if (rootSnap.exists()) {
          const val = rootSnap.val();
          // Clean legacy data: remove any sub-nodes that are actually other pigeons
          const cleaned = {};
          Object.keys(val).forEach(k => {
            if (typeof val[k] !== 'object' || k === 'stats' || k === 'traits' || k === 'incubationLog') {
              cleaned[k] = val[k];
            }
          });

          if (cleaned.stats || cleaned.incubationLog) {
            if (pigeon) {
              return { ...cleaned, ...pigeon, id: uid }; // pigeon sub-node wins on conflicts
            } else {
              return { id: uid, ...cleaned };
            }
          }
        }
      }
      return pigeon;
    } catch (err) {
      console.error("[DB] getPigeon failed:", err);
      return null;
    }
  },
  async getPigeons(uid) {
    if (!uid || !auth.currentUser) return [];
    try {
      const snap = await db.ref(`pigeons/${uid}`).once('value');
      if (!snap.exists()) return [];
      const data = snap.val();

      const results = new Map();

      // 1. Check for nested pigeons (multi-pigeon format)
      Object.keys(data).forEach(k => {
        const val = data[k];
        // A pigeon sub-node must be an object with stats OR an incubationLog
        if (val && typeof val === 'object' && (val.stats || val.incubationLog)) {
          results.set(k, { id: k, ...val });
        }
      });

      // 2. Check for legacy pigeon at root
      if ((data.stats || data.incubationLog)) {
        // Clean legacy data
        const cleaned = {};
        Object.keys(data).forEach(k => {
          // Keep only non-pigeon properties for the legacy pigeon object
          if (!results.has(k) && (typeof data[k] !== 'object' || k === 'stats' || k === 'traits' || k === 'incubationLog')) {
            cleaned[k] = data[k];
          }
        });

        // If we already have a sub-node for this ID, merge them (sub-node wins)
        const existing = results.get(uid);
        if (existing) {
          results.set(uid, { ...cleaned, ...existing, id: uid });
        } else {
          results.set(uid, { id: uid, ...cleaned });
        }
      }

      return Array.from(results.values());
    } catch (err) {
      console.error("[DB] getPigeons failed:", err);
      return [];
    }
  },
  async setPigeon(uid, pigeonId, data) {
    if (!uid || !auth.currentUser) return;
    const id = pigeonId || uid;
    try {
      await db.ref(`pigeons/${uid}/${id}`).set(data);
    } catch (err) {
      console.error("[DB] setPigeon failed:", err);
    }
  },
  async updatePigeon(uid, pigeonId, data) {
    if (!uid || !auth.currentUser) return;
    const id = pigeonId || uid;
    try {
      await db.ref(`pigeons/${uid}/${id}`).update(data);
    } catch (err) {
      console.error("[DB] updatePigeon failed:", err);
    }
  },
  async deletePigeon(uid, pigeonId) {
    if (!uid || !auth.currentUser) return;
    try {
      await db.ref(`pigeons/${uid}/${pigeonId}`).remove();
    } catch (err) {
      console.error("[DB] deletePigeon failed:", err);
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
    return battles.filter(b => b.status !== 'done');
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
