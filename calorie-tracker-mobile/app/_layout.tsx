import { useEffect, useState } from 'react'
import { Appearance } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const THEME_KEY = 'app_theme'

function useAuthGuard(session: Session | null, initialized: boolean) {
  const segments = useSegments()

  useEffect(() => {
    if (!initialized) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, segments, initialized])
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, storedTheme] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(THEME_KEY),
      ])
      setSession(session)
      if (storedTheme === 'light' || storedTheme === 'dark') {
        Appearance.setColorScheme(storedTheme)
      } else {
        Appearance.setColorScheme(null) // follow system
      }
      setInitialized(true)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useAuthGuard(session, initialized)

  if (!initialized) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
