import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { ToonTemplate, ToonType, ToonRarity, BiomeZone, scaleStat, TOON_TEMPLATES } from '@/game/toons'

export interface UserProfile {
  uid: string
  username: string
  level: number
  xp: number
  xpToNext: number
  coins: number
  gems: number
  lastLoginDate: string
  loginStreak: number
  totalCaught: number
  createdAt: any
}

export interface OwnedToon {
  id?: string
  templateId: string
  name: string
  emoji: string
  type: ToonType
  rarity: ToonRarity
  zone: BiomeZone
  specialMove: string
  specialDesc: string
  evoTier: number
  level: number
  xp: number
  xpToNext: number
  hp: number
  maxHP: number
  atk: number
  def: number
  spd: number
  catchDate: string
  isStarter: boolean
}

export async function getOrCreatePlayer(uid: string, username: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)

  if (snap.exists()) {
    return snap.data() as UserProfile
  }

  const newUser: UserProfile = {
    uid,
    username,
    level: 1,
    xp: 0,
    xpToNext: 100,
    coins: 100,
    gems: 10,
    lastLoginDate: new Date().toISOString().split('T')[0],
    loginStreak: 1,
    totalCaught: 0,
    createdAt: serverTimestamp()
  }

  await setDoc(userRef, newUser)
  return newUser
}

export async function getToons(uid: string): Promise<OwnedToon[]> {
  const toonsCol = collection(db, 'users', uid, 'toons')
  const snap = await getDocs(toonsCol)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OwnedToon))
}

export async function createOwnedToon(uid: string, template: ToonTemplate, isStarter: boolean = false): Promise<OwnedToon> {
  const newToon: OwnedToon = {
    templateId: template.id,
    name: template.name,
    emoji: template.emoji,
    type: template.type,
    rarity: template.rarity,
    zone: template.zone,
    specialMove: template.specialMove,
    specialDesc: template.specialDesc,
    evoTier: 1,
    level: 1,
    xp: 0,
    xpToNext: 100,
    hp: template.baseHP,
    maxHP: template.baseHP,
    atk: template.baseAtk,
    def: template.baseDef,
    spd: template.baseSpd,
    catchDate: new Date().toISOString(),
    isStarter
  }

  const docRef = await addDoc(collection(db, 'users', uid, 'toons'), newToon)
  return { ...newToon, id: docRef.id }
}

export async function updateToon(uid: string, toonId: string, updates: Partial<OwnedToon>) {
  const toonRef = doc(db, 'users', uid, 'toons', toonId)
  await updateDoc(toonRef, updates)
}

export async function updateProfile(uid: string, updates: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, updates)
}
