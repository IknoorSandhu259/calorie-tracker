import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { supabase } from '../lib/supabase'

function useAuthGuard() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuth = segments[0] === '(auth)'
      if (!session && !inAuth) router.replace('/(auth)/sign-in')
      else if (session && inAuth) router.replace('/(tabs)')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.replace('/(auth)/sign-in')
      else if (segments[0] === '(auth)') router.replace('/(tabs)')
    })

    return () => subscription.unsubscribe()
  }, [])
}

export default function RootLayout() {
  useAuthGuard()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="add-meal"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="camera"
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack>
  )
}
