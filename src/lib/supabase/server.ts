import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll()
          console.log('🍪 [server.ts] getAll() called, found:', allCookies.length, 'cookies')
          return allCookies
        },
        setAll(cookiesToSet) {
          try {
            console.log('🍪 [server.ts] setAll() called with', cookiesToSet.length, 'cookies')
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component or API Route.
            // This can be ignored if you have middleware refreshing user sessions.
            console.warn('⚠️ [server.ts] Cookie set failed (expected in API Routes):', error instanceof Error ? error.message : 'Unknown error')
          }
        },
      },
    }
  )
}