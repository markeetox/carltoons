'use client'

import React, { useState } from 'react'
import { OwnedToon } from '@/lib/firestore'
import { EVO_XP_REQUIRED, RARITY_COLOR, RARITY_BG } from '@/game/toons'

interface CollectionProps {
  toons: OwnedToon[]
  activeToonId: string | null
  onClose: () => void
  onSetActive: (id: string) => void
  onEvolve: (id: string) => void
}

export default function CollectionScreen({ toons, activeToonId, onClose, onSetActive, onEvolve }: CollectionProps) {
  const [filter, setFilter] = useState('All')
  const [selectedToon, setSelectedToon] = useState<OwnedToon | null>(null)

  const filtered = toons.filter(t => filter === 'All' || t.rarity === filter)

  const rarities = ['All', 'Common', 'Rare', 'Epic', 'Legendary']

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: '#080810', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px' }}>My Toons</h2>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>{toons.length} collected</div>
        </div>
        <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', padding: '15px', overflowX: 'auto' }}>
        {rarities.map(r => (
          <button 
            key={r} 
            onClick={() => setFilter(r)}
            style={{
              padding: '6px 16px',
              borderRadius: '99px',
              border: 'none',
              backgroundColor: filter === r ? '#3b82f6' : '#1f2937',
              color: 'white',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {filtered.map(toon => {
          const isEvolvable = toon.evoTier < 5 && toon.xp >= EVO_XP_REQUIRED[toon.evoTier]
          return (
            <div 
              key={toon.id} 
              onClick={() => setSelectedToon(toon)}
              style={{
                backgroundColor: '#111827',
                borderRadius: '12px',
                padding: '12px',
                border: `2px solid ${toon.id === activeToonId ? '#4ade80' : 'transparent'}`,
                position: 'relative'
              }}
            >
              {toon.id === activeToonId && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80' }} />}
              {isEvolvable && <div style={{ position: 'absolute', top: 8, right: 24, fontSize: '14px' }}>⬆️</div>}
              <div style={{ width: '100%', aspectRatio: '1', backgroundColor: (RARITY_BG as any)[toon.rarity], borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '8px' }}>
                {toon.emoji}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{toon.name}</div>
              <div style={{ fontSize: '12px', color: (RARITY_COLOR as any)[toon.rarity] }}>{toon.rarity}</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Lv.{toon.level} • Tier {toon.evoTier}</div>
            </div>
          )
        })}
      </div>

      {selectedToon && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
          <button onClick={() => setSelectedToon(null)} style={{ alignSelf: 'flex-end', fontSize: '24px', background: 'none', border: 'none', color: 'white' }}>✕</button>
          
          <div style={{ width: '120px', height: '120px', backgroundColor: (RARITY_BG as any)[selectedToon.rarity], borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px', border: `4px solid ${(RARITY_COLOR as any)[selectedToon.rarity]}`, margin: '20px 0' }}>
            {selectedToon.emoji}
          </div>

          <h2 style={{ fontSize: '28px' }}>{selectedToon.name}</h2>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <span style={{ padding: '4px 10px', backgroundColor: '#333', borderRadius: '4px', fontSize: '12px' }}>{selectedToon.type}</span>
            <span style={{ padding: '4px 10px', backgroundColor: (RARITY_BG as any)[selectedToon.rarity], borderRadius: '4px', fontSize: '12px', border: `1px solid ${(RARITY_COLOR as any)[selectedToon.rarity]}` }}>{selectedToon.rarity}</span>
            <span style={{ padding: '4px 10px', backgroundColor: '#333', borderRadius: '4px', fontSize: '12px' }}>Tier {selectedToon.evoTier}</span>
          </div>

          <div style={{ width: '100%', maxWidth: '300px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '30px 0' }}>
            {[
              { label: 'HP', value: `${selectedToon.hp}/${selectedToon.maxHP}` },
              { label: 'ATK', value: selectedToon.atk },
              { label: 'DEF', value: selectedToon.def },
              { label: 'SPD', value: selectedToon.spd },
              { label: 'Level', value: selectedToon.level },
              { label: 'XP', value: `${selectedToon.xp}/${selectedToon.xpToNext}` },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: '#111827', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', borderRadius: '12px', padding: '15px', width: '100%', maxWidth: '300px', marginBottom: '30px' }}>
            <div style={{ fontWeight: 'bold', color: '#a855f7' }}>✨ {selectedToon.specialMove}</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#d8b4fe' }}>{selectedToon.specialDesc}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
            {selectedToon.id !== activeToonId && (
              <button 
                onClick={() => { onSetActive(selectedToon.id!); setSelectedToon(null) }}
                style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
              >
                Set Active
              </button>
            )}
            
            {selectedToon.evoTier < 5 && (
              <button 
                onClick={() => { onEvolve(selectedToon.id!); setSelectedToon(null) }}
                disabled={selectedToon.xp < EVO_XP_REQUIRED[selectedToon.evoTier]}
                style={{ padding: '12px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: selectedToon.xp < EVO_XP_REQUIRED[selectedToon.evoTier] ? 0.5 : 1 }}
              >
                ⬆️ Evolve! {selectedToon.xp < EVO_XP_REQUIRED[selectedToon.evoTier] ? `(${selectedToon.xp}/${EVO_XP_REQUIRED[selectedToon.evoTier]} XP)` : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
