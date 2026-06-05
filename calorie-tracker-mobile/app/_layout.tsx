import { createContext, useContext, useEffect, useState } from 'react'
import { Appearance } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const THEME_KEY = 'app_theme'

// Lets the onboarding screen signal completion without a full re-auth cycle.
type OnboardingCtxType = { setOnboardingDone: (v: boolean) => void }
const OnboardingContext = createContext<OnboardingCtxType>({ setOnboardingDone: () => {} })
export const useSetOnboardingDone = () => useContext(OnboardingContext).setOnboardingDone

async function checkOnboarding(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single()
  return data?.onboarding_completed ?? false
}

function useAuthGuard(
  session: Session | null,
  initialized: boolean,
  onboardingDone: boolean,
) {
  const segments = useSegments()

  useEffect(() => {
    if (!initialized) return

    const inAuth = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session) {
      // Not signed in → always land on sign-in
      if (!inAuth) router.replace('/(auth)/sign-in')
    } else if (inAuth) {
      // Just authenticated → route based on onboarding status
      router.replace(onboardingDone ? '/(tabs)' : '/onboarding')
    } else if (!onboardingDone && !inOnboarding) {
      // Signed in but onboarding not complete → always go to onboarding
      router.replace('/onboarding')
    }
    // onboardingDone=true on tabs → no redirect (normal returning user).
    // onboardingDone=true on /onboarding → no redirect (voluntary recalculate).
  }, [session, segments, initialized, onboardingDone])
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)

  useEffect(() => {
    // Load theme preference independently — doesn't affect auth guard timing.
    AsyncStorage.getItem(THEME_KEY).then((storedTheme) => {
      if (storedTheme === 'light' || storedTheme === 'dark') {
        Appearance.setColorScheme(storedTheme)
      } else {
        Appearance.setColorScheme(null)
      }
    })

    // Supabase fires INITIAL_SESSION on subscription (covers app startup) and
    // SIGNED_IN / SIGNED_OUT for subsequent auth events.  We resolve onboarding
    // status BEFORE updating session so the guard never sees half-state:
    // React 18 batches all three setters below into a single render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession) {
          const done = await checkOnboarding(newSession.user.id)
          setOnboardingDone(done)
          setSession(newSession)
        } else {
          setSession(null)
          setOnboardingDone(false)
        }
        setInitialized(true)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  useAuthGuard(session, initialized, onboardingDone)

  if (!initialized) return null

  return (
    <OnboardingContext.Provider value={{ setOnboardingDone }}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingContext.Provider>
  )
}
