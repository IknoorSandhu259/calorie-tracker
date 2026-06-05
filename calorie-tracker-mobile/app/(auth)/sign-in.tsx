import { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import { useTheme, type AppColors } from '../../constants/colors'

export default function SignInScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (authError) setError('Invalid email or password.')
    // Success → handled by onAuthStateChange in _layout.tsx
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          <Text style={s.appName}>Calorie Snap</Text>
          <Text style={s.subtitle}>Sign in to start tracking</Text>

          {error && <Text style={s.error}>{error}</Text>}

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={c.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={c.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={s.buttonText}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <GoogleSignInButton />

          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity style={s.linkRow}>
              <Text style={s.linkText}>
                Don't have an account?{' '}
                <Text style={s.linkBold}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.authBg },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: c.cardBg,
      borderRadius: 16,
      padding: 32,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    appName: {
      fontSize: 24,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    error: {
      fontSize: 13,
      color: c.error,
      backgroundColor: c.errorBg,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: c.borderInput,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 14,
      color: c.textPrimary,
      backgroundColor: c.inputBg,
      marginBottom: 12,
    },
    button: {
      backgroundColor: c.primaryBg,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.divider },
    dividerText: { fontSize: 12, color: c.textLabel },
    linkRow: { marginTop: 16, alignItems: 'center' },
    linkText: { fontSize: 14, color: c.textMuted },
    linkBold: { fontWeight: '600', color: c.textPrimary },
  })
}
