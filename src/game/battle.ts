import { ToonType, TYPE_BEATS } from './toons'

export type BattleAction = 'attack' | 'defend' | 'special' | 'catch' | 'run'

export interface BattleToon {
  name: string
  type: ToonType
  atk: number
  def: number
  spd: number
  hp: number
  maxHP: number
  _defending?: boolean
}

export function typeMultiplier(attackerType: ToonType, defenderType: ToonType): number {
  if (TYPE_BEATS[attackerType] === defenderType) return 1.5
  if (TYPE_BEATS[defenderType] === attackerType) return 0.7
  return 1.0
}

export function calcDamage(
  attacker: BattleToon,
  defender: BattleToon,
  action: BattleAction
): { dmg: number; crit: boolean; effectiveness: number } {
  const defMult = defender._defending ? 0.55 : 0.3
  const base = Math.max(1, attacker.atk - Math.floor(defender.def * defMult))
  const eff = typeMultiplier(attacker.type, defender.type)
  const crit = Math.random() < 0.1
  const variance = 0.9 + Math.random() * 0.2
  const actionMod = action === 'special' ? 1.4 : 1.0
  return {
    dmg: Math.max(1, Math.round(base * eff * (crit ? 1.5 : 1.0) * actionMod * variance)),
    crit,
    effectiveness: eff
  }
}

export interface BattleState {
  player: BattleToon
  enemy: BattleToon
  log: string
  isOver: boolean
  winner?: 'player' | 'enemy'
  caught?: boolean
  escaped?: boolean
}

export function processTurn(
  player: BattleToon,
  enemy: BattleToon,
  action: BattleAction,
  catchRate: number
): { state: BattleState; message: string } {
  let log = ''
  let winner: 'player' | 'enemy' | undefined
  let isOver = false
  let caught = false
  let escaped = false

  player._defending = false
  enemy._defending = false

  if (action === 'run') {
    const chance = player.spd > enemy.spd ? 0.75 : 0.40
    if (Math.random() < chance) {
      return {
        state: { player, enemy, log: 'Escaped successfully!', isOver: true, escaped: true },
        message: 'Escaped!'
      }
    } else {
      log = 'Failed to escape! '
    }
  } else if (action === 'defend') {
    player._defending = true
    log = `${player.name} is defending! `
  } else if (action === 'catch') {
    const hpRatio = enemy.hp / enemy.maxHP
    const chance = catchRate * 0.35 * (1 - hpRatio * 0.6)
    if (Math.random() < chance) {
      caught = true
      log = `Gotcha! ${enemy.name} was caught! `
    } else {
      log = `The catch failed! `
    }
  } else {
    // attack or special
    const { dmg, crit, effectiveness } = calcDamage(player, enemy, action)
    enemy.hp = Math.max(0, enemy.hp - dmg)
    log = `${player.name} used ${action}! `
    if (crit) log += '⚡ Critical! '
    if (effectiveness > 1) log += '🔥 Super effective! '
    if (effectiveness < 1) log += '💧 Not very effective. '
    log += `Dealt ${dmg} damage. `

    if (enemy.hp <= 0) {
      return {
        state: { player, enemy, log: log + `${enemy.name} fainted!`, isOver: true, winner: 'player' },
        message: 'Victory!'
      }
    }
  }

  // Enemy attacks back if battle not over
  const enemyAction: BattleAction = Math.random() < 0.2 ? 'special' : 'attack'
  const { dmg: eDmg, crit: eCrit, effectiveness: eEff } = calcDamage(enemy, player, enemyAction)
  player.hp = Math.max(0, player.hp - eDmg)
  log += `${enemy.name} used ${enemyAction}! `
  if (eCrit) log += '⚡ Critical! '
  if (eEff > 1) log += '🔥 Super effective! '
  if (eEff < 1) log += '💧 Not very effective. '
  log += `Dealt ${eDmg} damage.`

  if (caught) {
    isOver = true
    winner = 'player'
  } else if (player.hp <= 0) {
    isOver = true
    winner = 'enemy'
    log += ` ${player.name} fainted!`
  }

  return {
    state: { player, enemy, log, isOver, winner },
    message: ''
  }
}
