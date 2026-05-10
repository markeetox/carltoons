'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlayerState } from '@/hooks/usePlayerState'
import BattleUI from './BattleUI'
import CollectionScreen from './CollectionScreen'
import GachaScreen from './GachaScreen'
import DailyRewardPopup from './DailyRewardPopup'
import { TOON_TEMPLATES } from '@/game/toons'

export default function Game() {
  const { user, signOut } = useAuth()
  const {
    profile, toons, activeToon, activeToonId, setActiveToonId,
    dailyReward, claimDaily, syncAfterBattle, evolveToon, pullGacha, loading
  } = usePlayerState(user)

  const [battle, setBattle] = useState<any>(null)
  const [showCollection, setShowCollection] = useState(false)
  const [showGacha, setShowGacha] = useState(false)
  const gameRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let game: any;
    const initPhaser = async () => {
      if (!containerRef.current) return
      const Phaser = (await import('phaser')).default
      const { GameScene } = await import('@/game/GameScene')

      const sceneInstance = new GameScene()

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: containerRef.current!,
        physics: {
          default: 'arcade',
          arcade: { debug: false }
        },
        scene: {
          init: function() { sceneInstance.init(this) },
          preload: function() { sceneInstance.preload() },
          create: function() { sceneInstance.create() },
          update: function(time: number) { sceneInstance.update(time) }
        }
      }

      game = new Phaser.Game(config)
      ;(window as any).Phaser = Phaser
      gameRef.current = game

      game.events.on('encounter', (zone: string) => {
        // Pick random toon from zone
        const zoneToons = TOON_TEMPLATES.filter(t => t.zone === zone || t.zone === 'Shadow')
        const enemyTemplate = zoneToons[Math.floor(Math.random() * zoneToons.length)]

        // Scale enemy to player level approx
        const level = Math.max(1, (profile?.level || 1) + Math.floor(Math.random() * 3) - 1)

        setBattle({
          enemy: {
            ...enemyTemplate,
            level,
            hp: enemyTemplate.baseHP, // scaled later in BattleUI or here
            maxHP: enemyTemplate.baseHP,
            atk: enemyTemplate.baseAtk,
            def: enemyTemplate.baseDef,
            spd: enemyTemplate.baseSpd,
          },
          zone
        })
      })
    }

    initPhaser()

    return () => {
      if (game) game.destroy(true)
    }
  }, [profile?.level])

  const handleBattleEnd = async (result: any) => {
    setBattle(null)
    if (result) {
      await syncAfterBattle(result)
    }
    if (gameRef.current) {
      gameRef.current.events.emit('battleEnd')
    }
  }

  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

  if (loading || !profile) return <div style={{ color: 'white', padding: '20px' }}>Loading Player Data...</div>

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

      {/* HUD */}
      <div style={{ position: 'absolute', top: 10, left: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '8px', color: 'white', pointerEvents: 'auto' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Trainer Lv.{profile.level}</div>
          <div style={{ display: 'flex', gap: '15px', marginTop: '4px' }}>
            <span>🪙 {profile.coins}</span>
            <span>💎 {profile.gems}</span>
          </div>
        </div>

        {activeToon && (
          <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '8px', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
            <div style={{ fontSize: '24px' }}>{activeToon.emoji}</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{activeToon.name}</div>
              <div style={{ fontSize: '10px' }}>Lv.{activeToon.level} HP: {activeToon.hp}/{activeToon.maxHP}</div>
              <div style={{ width: '100px', height: '4px', backgroundColor: '#333', marginTop: '2px', borderRadius: '2px' }}>
                <div style={{ width: `${(activeToon.hp/activeToon.maxHP)*100}%`, height: '100%', backgroundColor: '#4ade80', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '10px' }}>
        <button onClick={() => setShowGacha(true)} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid #a855f7', color: 'white', fontSize: '20px', cursor: 'pointer' }}>🔮</button>
        <button onClick={() => setShowCollection(true)} style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid #3b82f6', color: 'white', fontSize: '20px', cursor: 'pointer' }}>📦</button>
      </div>

      <button
        onClick={signOut}
        style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', color: '#9ca3af', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
      >
        Sign out
      </button>

      {/* Joystick */}
      {isTouch && (
        <div
          style={{ position: 'absolute', bottom: 40, left: 40, width: '110px', height: '110px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', touchAction: 'none' }}
          onTouchMove={(e) => {
            const touch = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            const x = (touch.clientX - (rect.left + 55)) / 55
            const y = (touch.clientY - (rect.top + 55)) / 55
            const dist = Math.sqrt(x*x + y*y)
            const nx = dist > 1 ? x/dist : x
            const ny = dist > 1 ? y/dist : y
            if ((window as any).__setJoy) (window as any).__setJoy(nx, ny)
          }}
          onTouchEnd={() => {
            if ((window as any).__setJoy) (window as any).__setJoy(0, 0)
          }}
        />
      )}

      {battle && (
        <BattleUI
          playerToon={activeToon}
          enemyTemplate={battle.enemy}
          onEnd={handleBattleEnd}
        />
      )}

      {showCollection && (
        <CollectionScreen
          toons={toons}
          activeToonId={activeToonId}
          onClose={() => setShowCollection(false)}
          onSetActive={setActiveToonId}
          onEvolve={evolveToon}
        />
      )}

      {showGacha && (
        <GachaScreen
          gems={profile.gems}
          onPull={pullGacha}
          onClose={() => setShowGacha(false)}
        />
      )}

      {dailyReward && !dailyReward.alreadyClaimed && (
        <DailyRewardPopup
          reward={dailyReward}
          onClaim={claimDaily}
        />
      )}
    </div>
  )
}
