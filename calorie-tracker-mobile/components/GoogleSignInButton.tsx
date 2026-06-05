import { useMemo, useState } from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Svg, { Path } from 'react-native-svg'
import { supabase } from '../lib/supabase'
import { useTheme, type AppColors } from '../constants/colors'

// NOTE: maybeCompleteAuthSession() is only needed for the useAuthRequest/AuthSession
// proxy pattern. It is NOT needed here — openAuthSessionAsync returns the result
// directly as an async value, so no module-level call is required.

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.7 37.5 46.5 31.6 46.5 24.5z"/>
      <Path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/>
      <Path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.3-5.7c-2 1.4-4.7 2.3-8.2 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </Svg>
  )
}

export default function GoogleSignInButton() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePress() {
    setLoading(true)
    setError(null)

    // Linking.createURL resolves to the correct scheme for each runtime:
    //   Development build / production → calorietrackermobile://auth/callback
    //   Expo Go                        → exp://127.0.0.1:<port>/--/auth/callback
    // The hardcoded 'calorietrackermobile://' scheme is not registered in Expo Go,
    // which causes iOS ASWebAuthenticationSession to reject the session immediately
    // (before Google's account picker appears) and causes Android Custom Tabs to
    // fail to return the callback. Use a development build for reliable OAuth.
    const redirectUrl = Linking.createURL('auth/callback')

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    })

    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'Could not start Google sign-in.')
      setLoading(false)
      return
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

    if (result.type === 'success') {
      // result.url holds the deep-link with the PKCE code.
      // exchangeCodeForSession exchanges it for a session;
      // onAuthStateChange in _layout.tsx then handles navigation.
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
      if (sessionError) {
        setError('Sign-in failed. Please try again.')
      }
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      // User closed the browser — not an error, just reset state.
    }

    setLoading(false)
  }

  return (
    <>
      {error && (
        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
          {error}
        </Text>
      )}
      <TouchableOpacity
        style={[s.button, loading && s.disabled]}
        onPress={handlePress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.textMuted} />
        ) : (
          <>
            <GoogleLogo />
            <Text style={s.label}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingVertical: 12,
      backgroundColor: c.cardBg,
    },
    disabled: { opacity: 0.5 },
    label: { fontSize: 14, fontWeight: '500', color: c.textSecondary },
  })
}
