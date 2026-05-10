'use client'

import React from 'react'

interface DailyRewardProps {
  reward: { gems: number; coins: number; streak: number }
  onClaim: () => void
}

export default function DailyRewardPopup({ reward, onClaim }: DailyRewardProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#111827', width: '100%', maxWidth: '350px', borderRadius: '24px', padding: '30px', textAlign: 'center', border: '2px solid #f59e0b', boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)' }}>
        <div style={{ fontSize: '64px', marginBottom: '10px' }}>🎁</div>
        <h2 style={{ fontSize: '28px', color: 'white', marginBottom: '5px' }}>Daily Reward!</h2>
        <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '25px' }}>Day {reward.streak} Streak</div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px' }}>
            <div style={{ fontSize: '24px' }}>💎</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{reward.gems}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>Gems</div>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '16px' }}>
            <div style={{ fontSize: '24px' }}>🪙</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{reward.coins}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>Coins</div>
          </div>
        </div>

        <button 
          onClick={onClaim}
          style={{ width: '100%', padding: '14px', backgroundColor: '#f59e0b', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
        >
          Claim & Play!
        </button>
      </div>
    </div>
  )
}
