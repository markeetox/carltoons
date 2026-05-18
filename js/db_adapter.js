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
  async getIncomingChallenges(uid) {
    const snap = await db.ref('battles')
      .orderByChild('guestId')
      .equalTo(uid)
      .once('value');

    const challenges = [];
    snap.forEach(child => {
      const val = child.val();
      if (val.status === 'challenged') {
        challenges.push({ id: child.key, ...val });
      }
    });
    return challenges;
  },
  async getBattle(battleId) {
    const snap = await db.ref(`battles/${battleId}`).once('value');
    return snap.exists() ? { id: snap.key, ...snap.val() } : null;
  }
};
