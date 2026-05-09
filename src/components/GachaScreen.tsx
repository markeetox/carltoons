'use client'

import React, { useState } from 'react'
import { RARITY_COLOR, RARITY_BG } from '@/game/toons'

interface GachaProps {
  gems: number
  onPull: (count: number) => Promise<any[] | undefined>
  onClose: () => void
}

export default function GachaScreen({ gems, onPull, onClose }: GachaProps) {
  const [pulling, setPulling] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)

  const handlePull = async (count: number) => {
    if (pulling) return
    setPulling(true)
    const newToons = await onPull(count)
    if (newToons) {
      setResults(newToons)
    }
    setPulling(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: '#080810', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px' }}>Summon Toons</h2>
        <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
      </div>

      {!results ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#1f2937', fontSize: '10px' }}>Common 60%</span>
            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#1e3a5f', fontSize: '10px' }}>Rare 25%</span>
            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#2e1a47', fontSize: '10px' }}>Epic 12%</span>
            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#422006', fontSize: '10px' }}>Legendary 3%</span>
          </div>

          <div style={{ fontSize: '120px', marginBottom: '50px', filter: pulling ? 'hue-rotate(90deg)' : 'none', transition: 'filter 1s' }}>🔮</div>

          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '400px' }}>
            <button
              onClick={() => handlePull(1)}
              disabled={gems < 5 || pulling}
              style={{ flex: 1, padding: '15px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: gems < 5 ? 0.5 : 1 }}
            >
              Pull 1<br/><span style={{ fontSize: '12px', opacity: 0.8 }}>💎 5</span>
            </button>
            <button
              onClick={() => handlePull(10)}
              disabled={gems < 45 || pulling}
              style={{ flex: 1, padding: '15px', backgroundColor: '#a855f7', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: gems < 45 ? 0.5 : 1 }}
            >
              Pull 10<br/><span style={{ fontSize: '12px', opacity: 0.8 }}>💎 45</span>
            </button>
          </div>
          <div style={{ marginTop: '20px', color: '#9ca3af' }}>Your Gems: 💎 {gems}</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
            {results.map((toon, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#111827',
                  borderRadius: '12px',
                  padding: '10px',
                  animation: `reveal 0.5s ease-out ${i * 0.15}s forwards`,
                  opacity: 0,
                  transform: 'scale(0.8)',
                  textAlign: 'center'
                }}
              >
                <style>{`@keyframes reveal { to { opacity: 1; transform: scale(1); } }`}</style>
                <div style={{ width: '100%', aspectRatio: '1', backgroundColor: (RARITY_BG as any)[toon.rarity], borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '8px' }}>
                  {toon.emoji}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{toon.name}</div>
                <div style={{ fontSize: '10px', color: (RARITY_COLOR as any)[toon.rarity] }}>{toon.rarity}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setResults(null)}
            style={{ display: 'block', width: '200px', margin: '40px auto', padding: '12px', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '99px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
