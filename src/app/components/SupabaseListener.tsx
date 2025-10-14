'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const isDevelopment = process.env.NODE_ENV === 'development'

export default function SupabaseListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isDevelopment) {
          console.log('🔔 [SupabaseListener] Auth event:', event)
          console.log('🔔 [SupabaseListener] Session exists:', !!session)
        }

        try {
          // サーバー側にセッション情報を同期
          const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ event, session }),
          })

          if (!response.ok) {
            if (isDevelopment) {
              console.error('❌ [SupabaseListener] Failed to sync session:', response.status)
            }
          } else {
            if (isDevelopment) {
              console.log('✅ [SupabaseListener] Session synced successfully')
            }
          }

          // サーバーコンポーネントの状態を更新
          router.refresh()
        } catch (error) {
          if (isDevelopment) {
            console.error('❌ [SupabaseListener] Error syncing session:', error)
          }
        }
      }
    )

    // クリーンアップ：購読解除
    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
