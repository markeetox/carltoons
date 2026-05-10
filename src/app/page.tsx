'use client'

import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import LoginScreen from '@/components/LoginScreen'

const Game = dynamic(() => import('@/components/Game'), { ssr: false })

export default function Page() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#080810',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px'
      }}>
        Loading CarlToons...
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <Game />
}
