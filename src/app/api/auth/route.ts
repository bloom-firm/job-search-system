import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    const { event, session } = await request.json()

    if (isDevelopment) {
      console.log('🔐 [auth] Received event:', event)
      console.log('🔐 [auth] Session exists:', !!session)
    }

    // 入力検証
    if (!event) {
      if (isDevelopment) {
        console.error('❌ [auth] Missing event')
      }
      return NextResponse.json(
        { error: 'Missing event' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // サインイン or トークンリフレッシュの場合
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (!session?.access_token || !session?.refresh_token) {
        if (isDevelopment) {
          console.error('❌ [auth] Missing tokens in session')
        }
        return NextResponse.json(
          { error: 'Missing tokens' },
          { status: 400 }
        )
      }

      if (isDevelopment) {
        console.log('🔑 [auth] Setting session with tokens')
      }

      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })

      if (error) {
        if (isDevelopment) {
          console.error('❌ [auth] Failed to set session:', error)
        }
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      if (isDevelopment) {
        console.log('✅ [auth] Session set successfully')
      }
    }
    // サインアウトの場合
    else if (event === 'SIGNED_OUT') {
      if (isDevelopment) {
        console.log('🚪 [auth] Signing out')
      }

      const { error } = await supabase.auth.signOut()

      if (error) {
        if (isDevelopment) {
          console.error('❌ [auth] Failed to sign out:', error)
        }
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      if (isDevelopment) {
        console.log('✅ [auth] Signed out successfully')
      }
    }
    // その他のイベント（INITIAL_SESSION, USER_UPDATED など）
    else {
      if (isDevelopment) {
        console.log('ℹ️ [auth] Event ignored:', event)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    if (isDevelopment) {
      console.error('💥 [auth] Fatal error:', error)
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
