export type ToonType   = 'Rock' | 'Paper' | 'Scissors' 
export type ToonRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' 
export type BiomeZone  = 'Forest' | 'City' | 'Desert' | 'Ocean' | 'Shadow' 

export interface ToonTemplate { 
  id: string; name: string; emoji: string 
  type: ToonType; rarity: ToonRarity; zone: BiomeZone 
  specialMove: string; specialDesc: string 
  baseHP: number; baseAtk: number; baseDef: number; baseSpd: number 
  catchRate: number   // 0.0–1.0, higher = easier 
  gachaWeight: number // higher = more common in pulls 
}

export const TOON_TEMPLATES: ToonTemplate[] = [
  { id: 'cat', name: 'Cat', emoji: '🐱', type: 'Scissors', rarity: 'Common', zone: 'City', specialMove: 'Scratch Frenzy', specialDesc: 'Flurry of razor-sharp scratches', baseHP: 30, baseAtk: 11, baseDef: 6, baseSpd: 13, catchRate: 0.65, gachaWeight: 10 },
  { id: 'rat', name: 'Rat', emoji: '🐀', type: 'Scissors', rarity: 'Common', zone: 'City', specialMove: 'Gnaw', specialDesc: 'Bites through armor, ignores 30% defense', baseHP: 26, baseAtk: 10, baseDef: 5, baseSpd: 14, catchRate: 0.70, gachaWeight: 10 },
  { id: 'pigeon', name: 'Pigeon', emoji: '🕊️', type: 'Paper', rarity: 'Common', zone: 'City', specialMove: 'Aerial Bomb', specialDesc: 'Surprise attack from above', baseHP: 28, baseAtk: 9, baseDef: 7, baseSpd: 12, catchRate: 0.70, gachaWeight: 10 },
  { id: 'snail', name: 'Snail', emoji: '🐌', type: 'Rock', rarity: 'Common', zone: 'Forest', specialMove: 'Shell Lock', specialDesc: 'Retreats into shell, massively boosts defense', baseHP: 40, baseAtk: 7, baseDef: 16, baseSpd: 3, catchRate: 0.75, gachaWeight: 10 },
  { id: 'frog', name: 'Frog', emoji: '🐸', type: 'Paper', rarity: 'Common', zone: 'Forest', specialMove: 'Tongue Lash', specialDesc: 'Sticky tongue pulls enemy off balance', baseHP: 32, baseAtk: 10, baseDef: 8, baseSpd: 11, catchRate: 0.68, gachaWeight: 10 },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', type: 'Paper', rarity: 'Common', zone: 'Forest', specialMove: 'Quick Hop', specialDesc: 'Evade and counter in one swift move', baseHP: 28, baseAtk: 9, baseDef: 6, baseSpd: 16, catchRate: 0.65, gachaWeight: 10 },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', type: 'Rock', rarity: 'Common', zone: 'Forest', specialMove: 'Spore Cloud', specialDesc: 'Toxic spores drain HP each turn', baseHP: 35, baseAtk: 10, baseDef: 9, baseSpd: 5, catchRate: 0.72, gachaWeight: 10 },
  { id: 'goat', name: 'Goat', emoji: '🐐', type: 'Rock', rarity: 'Common', zone: 'Desert', specialMove: 'Headbutt', specialDesc: 'Bone-crushing forward charge', baseHP: 36, baseAtk: 12, baseDef: 9, baseSpd: 9, catchRate: 0.65, gachaWeight: 10 },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', type: 'Paper', rarity: 'Common', zone: 'City', specialMove: 'Cheese Smash', specialDesc: 'Slaps enemy with a hot gooey slice', baseHP: 33, baseAtk: 10, baseDef: 8, baseSpd: 8, catchRate: 0.72, gachaWeight: 10 },
  { id: 'butterfly', name: 'Butterfly', emoji: '🦋', type: 'Scissors', rarity: 'Common', zone: 'Forest', specialMove: 'Wing Dust', specialDesc: 'Confusion-inducing scale coating', baseHP: 24, baseAtk: 10, baseDef: 5, baseSpd: 15, catchRate: 0.68, gachaWeight: 10 },
  { id: 'koala', name: 'Koala', emoji: '🐨', type: 'Rock', rarity: 'Common', zone: 'Forest', specialMove: 'Bear Hug', specialDesc: 'Locks enemy in a crushing grip', baseHP: 38, baseAtk: 9, baseDef: 12, baseSpd: 6, catchRate: 0.65, gachaWeight: 10 },
  { id: 'lama', name: 'Lama', emoji: '🦙', type: 'Paper', rarity: 'Common', zone: 'Desert', specialMove: 'Spit Shot', specialDesc: 'Disgusting projectile spit', baseHP: 34, baseAtk: 10, baseDef: 8, baseSpd: 10, catchRate: 0.65, gachaWeight: 10 },
  { id: 'fox', name: 'Fox', emoji: '🦊', type: 'Scissors', rarity: 'Rare', zone: 'Forest', specialMove: 'Cunning Strike', specialDesc: 'Deceptive attack bypasses defense', baseHP: 30, baseAtk: 14, baseDef: 7, baseSpd: 15, catchRate: 0.45, gachaWeight: 5 },
  { id: 'owl', name: 'Owl', emoji: '🦉', type: 'Paper', rarity: 'Rare', zone: 'Forest', specialMove: 'Night Vision', specialDesc: 'Attacks with uncanny precision', baseHP: 32, baseAtk: 13, baseDef: 9, baseSpd: 13, catchRate: 0.45, gachaWeight: 5 },
  { id: 'bulldog', name: 'Bulldog', emoji: '🐶', type: 'Rock', rarity: 'Rare', zone: 'City', specialMove: 'Iron Jaw', specialDesc: 'Bites down hard and holds on', baseHP: 44, baseAtk: 13, baseDef: 13, baseSpd: 7, catchRate: 0.42, gachaWeight: 5 },
  { id: 'doberman', name: 'Doberman', emoji: '🐕', type: 'Scissors', rarity: 'Rare', zone: 'City', specialMove: 'Patrol Strike', specialDesc: 'Disciplined attack that hits twice', baseHP: 36, baseAtk: 15, baseDef: 8, baseSpd: 14, catchRate: 0.40, gachaWeight: 5 },
  { id: 'bear', name: 'Bear', emoji: '🐻', type: 'Rock', rarity: 'Rare', zone: 'Forest', specialMove: 'Maul', specialDesc: 'Rakes enemy with powerful claws', baseHP: 48, baseAtk: 15, baseDef: 11, baseSpd: 7, catchRate: 0.38, gachaWeight: 5 },
  { id: 'moose', name: 'Moose', emoji: '🫎', type: 'Rock', rarity: 'Rare', zone: 'Forest', specialMove: 'Antler Charge', specialDesc: 'Bulldozes forward with massive antlers', baseHP: 50, baseAtk: 14, baseDef: 12, baseSpd: 8, catchRate: 0.38, gachaWeight: 5 },
  { id: 'chameleon', name: 'Chameleon', emoji: '🦎', type: 'Paper', rarity: 'Rare', zone: 'Desert', specialMove: 'Vanish', specialDesc: 'Turns invisible, lands a surprise hit', baseHP: 30, baseAtk: 13, baseDef: 8, baseSpd: 12, catchRate: 0.42, gachaWeight: 5 },
  { id: 'ram', name: 'Ram', emoji: '🐏', type: 'Rock', rarity: 'Rare', zone: 'Desert', specialMove: 'Horn Slam', specialDesc: 'Spiraling horns deliver devastating blow', baseHP: 42, baseAtk: 15, baseDef: 10, baseSpd: 9, catchRate: 0.42, gachaWeight: 5 },
  { id: 'skull', name: 'Skull', emoji: '💀', type: 'Paper', rarity: 'Rare', zone: 'Shadow', specialMove: 'Bone Crush', specialDesc: 'Shatters bone with dark energy', baseHP: 34, baseAtk: 14, baseDef: 7, baseSpd: 12, catchRate: 0.40, gachaWeight: 5 },
  { id: 'ape', name: 'Ape', emoji: '🦍', type: 'Rock', rarity: 'Rare', zone: 'Forest', specialMove: 'Ground Pound', specialDesc: 'Slams ground sending a shockwave', baseHP: 46, baseAtk: 16, baseDef: 10, baseSpd: 8, catchRate: 0.38, gachaWeight: 5 },
  { id: 'wolf', name: 'Wolf', emoji: '🐺', type: 'Scissors', rarity: 'Epic', zone: 'Forest', specialMove: 'Howl Strike', specialDesc: 'Primal howl weakens resolve, then strikes', baseHP: 38, baseAtk: 18, baseDef: 9, baseSpd: 17, catchRate: 0.22, gachaWeight: 2 },
  { id: 'lion', name: 'Lion', emoji: '🦁', type: 'Scissors', rarity: 'Epic', zone: 'Desert', specialMove: "King's Roar", specialDesc: 'Terrifying roar weakens all defenses', baseHP: 42, baseAtk: 19, baseDef: 10, baseSpd: 15, catchRate: 0.20, gachaWeight: 2 },
  { id: 'bull', name: 'Bull', emoji: '🐂', type: 'Rock', rarity: 'Epic', zone: 'Desert', specialMove: 'Red Fury', specialDesc: 'Unstoppable charge, massive damage', baseHP: 54, baseAtk: 18, baseDef: 13, baseSpd: 10, catchRate: 0.20, gachaWeight: 2 },
  { id: 'gorilla', name: 'Gorilla', emoji: '🦍', type: 'Rock', rarity: 'Epic', zone: 'Forest', specialMove: 'Chest Thunder', specialDesc: 'Beats chest, releases sonic shockwave', baseHP: 56, baseAtk: 17, baseDef: 14, baseSpd: 9, catchRate: 0.20, gachaWeight: 2 },
  { id: 'devil', name: 'Devil', emoji: '😈', type: 'Scissors', rarity: 'Epic', zone: 'Shadow', specialMove: 'Hellfire', specialDesc: 'Dark flame that burns for 2 turns', baseHP: 40, baseAtk: 20, baseDef: 8, baseSpd: 14, catchRate: 0.18, gachaWeight: 2 },
  { id: 'robot', name: 'Robot', emoji: '🤖', type: 'Rock', rarity: 'Epic', zone: 'City', specialMove: 'Laser Core', specialDesc: 'Charges up, fires devastating energy beam', baseHP: 50, baseAtk: 17, baseDef: 15, baseSpd: 10, catchRate: 0.20, gachaWeight: 2 },
  { id: 'bigcat', name: 'Big Cat', emoji: '🐯', type: 'Scissors', rarity: 'Epic', zone: 'Desert', specialMove: 'Pounce', specialDesc: 'Leaps from cover, lands a critical strike', baseHP: 44, baseAtk: 20, baseDef: 10, baseSpd: 16, catchRate: 0.18, gachaWeight: 2 },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', type: 'Paper', rarity: 'Legendary', zone: 'Forest', specialMove: 'Rainbow Surge', specialDesc: 'Dazzling beam of pure magic overwhelms all', baseHP: 55, baseAtk: 22, baseDef: 14, baseSpd: 20, catchRate: 0.05, gachaWeight: 1 },
  { id: 'alien', name: 'Alien', emoji: '👽', type: 'Paper', rarity: 'Legendary', zone: 'Shadow', specialMove: 'Mind Warp', specialDesc: 'Bends reality, enemy hurts itself', baseHP: 50, baseAtk: 23, baseDef: 13, baseSpd: 18, catchRate: 0.05, gachaWeight: 1 },
  { id: 'angel', name: 'Angel', emoji: '👼', type: 'Paper', rarity: 'Legendary', zone: 'Shadow', specialMove: 'Divine Wrath', specialDesc: 'Celestial energy into unstoppable strike', baseHP: 52, baseAtk: 21, baseDef: 16, baseSpd: 17, catchRate: 0.05, gachaWeight: 1 },
]

export const TYPE_BEATS: Record<ToonType, ToonType> = { 
  Rock: 'Scissors', Scissors: 'Paper', Paper: 'Rock' 
}

export const EVO_MULTIPLIER = [1.0, 1.35, 1.75, 2.2, 2.8]  // index = evoTier - 1 
 
export function scaleStat(base: number, evoTier: number, level: number): number { 
  return Math.floor(base * EVO_MULTIPLIER[evoTier - 1] * (1 + (level - 1) * 0.08)) 
} 
 
export function xpToNextLevel(level: number): number { 
  return Math.floor(80 * Math.pow(level, 1.4)) 
} 
 
// Evolution XP thresholds (cumulative toon XP required) 
export const EVO_XP_REQUIRED = [0, 500, 1200, 2500, 5000]  // index = evoTier 

export const RARITY_COLOR = { Common: '#6b7280', Rare: '#3b82f6', Epic: '#a855f7', Legendary: '#f59e0b' } 
export const RARITY_BG    = { Common: '#1f2937', Rare: '#1e3a5f', Epic: '#2e1a47', Legendary: '#422006' } 
export const TYPE_COLOR   = { Rock: '#78716c',   Paper: '#a8a29e', Scissors: '#dc2626' } 
export const ZONE_COLOR   = { Forest: '#166534', City: '#1e3a5f', Desert: '#92400e', Ocean: '#164e63', Shadow: '#1a0a2e' }
