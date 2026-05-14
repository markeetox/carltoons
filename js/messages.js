/* ════════════════════════════════════════════════════════════
   messages.js  —  Pigeon daily fortune messages by mood
   ════════════════════════════════════════════════════════════ */

const PIGEON_MESSAGES = {

  /* ── Happy (bond >= 65, no missed days) ── */
  happy: [
    "Today is a great day to poop on something expensive.",
    "I dreamed of infinite breadcrumbs. It was beautiful.",
    "You came back! I knew you would. I definitely wasn't worried.",
    "I've been practicing my battle stare. Pretty intimidating, right?",
    "Feeling strong today. Could probably peck through concrete.",
    "Woke up and chose violence. Also chose you. You're welcome.",
    "My feathers are immaculate. I am at peak pigeon.",
    "I have decided today is MY day. Not yours. Mine.",
    "Just flexed in the mirror for 20 minutes. No notes.",
    "I forgive the pigeons who wronged me. But I remember.",
    "Some call it strutting. I call it excellence.",
    "Today's forecast: 100% chance of winning.",
    "I've been thinking. What if I just… won everything?",
    "Slept 14 hours. Ready to do absolutely nothing productively.",
    "The park bench is mine. Has always been mine.",
  ],

  /* ── Neutral (bond 35–64, or missed 1 day) ── */
  neutral: [
    "You showed up. That's… something.",
    "I'm not mad. I'm just observing your choices.",
    "Fine. We do this again.",
    "I've seen better. I've also seen worse. You're somewhere in there.",
    "My feelings are complicated. Like a pretzel. A confused pretzel.",
    "I didn't miss you specifically. I missed having someone to judge.",
    "Things could be better. Things could be worse. Things are things.",
    "I've been staring at the wall. Don't ask.",
    "Whatever. Let's get this over with.",
    "I am neutral about today. Like Switzerland, but feathery.",
    "Existing. That's the vibe.",
    "Don't read too much into me being here.",
    "My opinion of you is pending further data.",
    "We're fine. Probably.",
    "I've made peace with the situation. Mostly.",
  ],

  /* ── Upset (bond 15–34, missed 2–3 days) ── */
  upset: [
    "Oh. It's you. How convenient that you remember me now.",
    "I counted the ceiling tiles while you were gone. Twice.",
    "My therapist says I shouldn't bottle things up. I disagree.",
    "You know what I did yesterday? Sat here. JUST SAT HERE.",
    "I've been leaving passive aggressive crumbs everywhere.",
    "Don't smile at me right now. I'm in my era.",
    "I ate alone. Again. It was fine. (It wasn't fine.)",
    "I've mentally rehearsed this conversation 40 times.",
    "Other pigeons have attentive owners. Not naming names.",
    "I'm not giving you the silent treatment. I'm just… quiet.",
    "My FOMO stat dropped. I wonder why. No I don't.",
    "I have made a list of grievances. It's long.",
    "You think I didn't notice? I noticed everything.",
    "The audacity. Truly. The audacity.",
    "I've been surviving. No thanks to anyone in particular.",
  ],

  /* ── Feral (bond < 15, missed 4+ days) ── */
  feral: [
    "WHO ARE YOU. WHY ARE YOU IN MY SPACE.",
    "I have returned to the wild. This is my domain now.",
    "I've formed an alliance with the rats. We have a pact.",
    "I don't remember you. I choose not to remember you.",
    "I eat garbage now. It's actually fine. Better than fine.",
    "The streets have taught me things. Dark things.",
    "I have no owner. I have only the wind and vengeance.",
    "My bond with humanity: severed. My bond with chaos: growing.",
    "I survived without you. I THRIVED without you.",
    "This is what happens. This is what always happens.",
    "Come closer. I dare you. I DARE YOU.",
    "I've pecked a hole in the wall. It's a door now. My door.",
    "The moon is my only companion. And she doesn't forget me.",
    "I've been feral for days. My feathers tell the tale.",
    "Some pigeons become pets. Others become legends. Guess which one I am.",
  ],

  /* ── Rehab (returning from feral, 1–2 days into recovery) ── */
  rehab: [
    "…you came back. I won't make it weird. (It's a little weird.)",
    "I'm still feral in my heart. But I'm listening.",
    "Three days. That's all I ask. Show me you mean it.",
    "Don't celebrate yet. I'm still processing.",
    "The rats said I should give you another chance. Fine.",
    "I'm cautiously un-feral. Emphasis on cautiously.",
    "Baby steps. For both of us.",
    "I ate your food. It doesn't mean anything. Yet.",
    "I've decided to be civil. Don't test this decision.",
    "Recovery is a journey. You're on thin ice, but it's a journey.",
  ],
};

/* ──────────────────────────────────────────────────────────
   getMood(bond, missedDays, rehabDay)
   Returns mood string based on pigeon state.
────────────────────────────────────────────────────────────── */
function getMood(bond, missedDays, rehabDay) {
  if (rehabDay > 0)    return "rehab";
  if (bond < 15)       return "feral";
  if (bond < 35)       return "upset";
  if (bond < 65)       return "neutral";
  return "happy";
}

/* ──────────────────────────────────────────────────────────
   getDailyMessage(bond, missedDays, rehabDay, seed)
   Returns a deterministic-but-daily message string.
   Changes every day (based on date) but is consistent
   within the same day even on refresh.
────────────────────────────────────────────────────────────── */
function getDailyMessage(bond, missedDays, rehabDay, seed) {
  const mood = getMood(bond, missedDays, rehabDay);
  const pool = PIGEON_MESSAGES[mood];
  // Seed index on date + uid so it's different per day per user
  const dateNum = parseInt(new Date().toISOString().slice(0,10).replace(/-/g,""));
  const seedNum = seed ? seed.split("").reduce((a,c) => a + c.charCodeAt(0), 0) : 0;
  const idx = (dateNum + seedNum) % pool.length;
  return { mood, message: pool[idx] };
}
