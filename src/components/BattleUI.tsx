'use client'

import React, { useState, useEffect } from 'react'
import { BattleToon, BattleAction, processTurn } from '@/game/battle'
import { ToonTemplate, scaleStat } from '@/game/toons'

interface BattleUIProps {
  playerToon: any
  enemyTemplate: ToonTemplate & { level: number }
  onEnd: (result: any) => void
}

export default function BattleUI({ playerToon, enemyTemplate, onEnd }: BattleUIProps) {
  const [battleState, setBattleState] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [enemyShake, setEnemyShake] = useState(false)
  const [playerFlash, setPlayerFlash] = useState(false)

  useEffect(() => {
    const enemy: BattleToon = {
      name: enemyTemplate.name,
      type: enemyTemplate.type,
      atk: scaleStat(enemyTemplate.baseAtk, 1, enemyTemplate.level),
      def: scaleStat(enemyTemplate.baseDef, 1, enemyTemplate.level),
      spd: scaleStat(enemyTemplate.baseSpd, 1, enemyTemplate.level),
      hp: scaleStat(enemyTemplate.baseHP, 1, enemyTemplate.level),
      maxHP: scaleStat(enemyTemplate.baseHP, 1, enemyTemplate.level),
    }

    const player: BattleToon = {
      name: playerToon.name,
      type: playerToon.type,
      atk: playerToon.atk,
      def: playerToon.def,
      spd: playerToon.spd,
      hp: playerToon.hp,
      maxHP: playerToon.maxHP,
    }

    setBattleState({
      player,
      enemy,
      log: `A wild ${enemy.name} appeared!`,
      isOver: false
    })
  }, [])

  const handleAction = async (action: BattleAction) => {
    if (isProcessing || battleState.isOver) return
    setIsProcessing(true)

    const result = processTurn(
      { ...battleState.player },
      { ...battleState.enemy },
      action,
      enemyTemplate.catchRate
    )

    // Rough animation timing
    if (action === 'attack' || action === 'special') setEnemyShake(true)
    setTimeout(() => setEnemyShake(false), 500)

    setTimeout(() => {
      setPlayerFlash(true)
      setBattleState(result.state)
      setTimeout(() => setPlayerFlash(false), 500)
      setIsProcessing(false)
    }, 600)
  }

  if (!battleState) return null

  const getHPColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return '#4ade80'
    if (ratio > 0.25) return '#facc15'
    return '#ef4444'
  }

  const rarities: any = { Common: '#6b7280', Rare: '#3b82f6', Epic: '#a855f7', Legendary: '#f59e0b' }
  const rarityBgs: any = { Common: '#1f2937', Rare: '#1e3a5f', Epic: '#2e1a47', Legendary: '#422006' }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(8, 8, 20, 0.97)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      color: 'white'
    }}>
      {/* Enemy */}
      <div style={{ alignSelf: 'flex-end', width: '80%', maxWidth: '300px', transform: enemyShake ? 'translateX(10px)' : 'none', transition: 'transform 0.1s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>{battleState.enemy.name}</span>
              <span style={{ fontSize: '12px' }}>Lv.{enemyTemplate.level}</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(battleState.enemy.hp / battleState.enemy.maxHP) * 100}%`, height: '100%', backgroundColor: getHPColor(battleState.enemy.hp, battleState.enemy.maxHP), transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ width: '60px', height: '60px', backgroundColor: rarityBgs[enemyTemplate.rarity], borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${rarities[enemyTemplate.rarity]}` }}>
            {enemyTemplate.emoji}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Player */}
      <div style={{ alignSelf: 'flex-start', width: '80%', maxWidth: '300px', opacity: playerFlash ? 0.5 : 1, transition: 'opacity 0.1s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: rarityBgs[playerToon.rarity], borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `2px solid ${rarities[playerToon.rarity]}` }}>
            {playerToon.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>{playerToon.name}</span>
              <span style={{ fontSize: '12px' }}>Lv.{playerToon.level}</span>
            </div>
            <div style={{ height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(battleState.player.hp / battleState.player.maxHP) * 100}%`, height: '100%', backgroundColor: getHPColor(battleState.player.hp, battleState.player.maxHP), transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px', textAlign: 'right' }}>{battleState.player.hp} / {battleState.player.maxHP}</div>
          </div>
        </div>
      </div>

      {/* Log */}
      <div style={{ height: '60px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px', marginTop: '20px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
        {battleState.log}
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
        <button onClick={() => handleAction('attack')} disabled={isProcessing || battleState.isOver} style={{ height: '48px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>⚔️ Attack</button>
        <button onClick={() => handleAction('defend')} disabled={isProcessing || battleState.isOver} style={{ height: '48px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🛡️ Defend</button>
        <button onClick={() => handleAction('special')} disabled={isProcessing || battleState.isOver} style={{ height: '48px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✨ {playerToon.specialMove.split(' ')[0]}</button>
        <button onClick={() => handleAction('catch')} disabled={isProcessing || battleState.isOver} style={{ height: '48px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🪤 Catch</button>
        <button onClick={() => handleAction('run')} disabled={isProcessing || battleState.isOver} style={{ gridColumn: 'span 2', height: '40px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #4b5563', borderRadius: '8px', cursor: 'pointer' }}>🏃 Run</button>
      </div>
      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>Mid-battle catch = low chance · Win for higher rate</div>

      {/* Result Overlay */}
      {battleState.isOver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ fontSize: '64px' }}>{battleState.winner === 'player' ? '🏆' : '💀'}</div>
          <h2 style={{ fontSize: '32px', margin: '20px 0' }}>{battleState.winner === 'player' ? (battleState.caught ? 'Caught!' : 'Victory!') : 'Defeated!'}</h2>

          <button
            onClick={() => onEnd({
              playerHP: battleState.player.hp,
              xpGained: battleState.winner === 'player' ? 50 : 10,
              coinsGained: battleState.winner === 'player' ? 20 : 5,
              caughtToon: battleState.caught ? enemyTemplate : null
            })}
            style={{ padding: '12px 40px', backgroundColor: '#4ade80', color: 'black', border: 'none', borderRadius: '99px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
