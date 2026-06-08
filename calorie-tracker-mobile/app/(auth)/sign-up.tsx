import { useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import { useTheme, type AppColors } from '../../constants/colors'

export default function SignUpScreen() {
  const c = useTheme()
  const s = useMemo(() => makeStyles(c), [c])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignUp() {
    if (!email.trim() || !password) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }
    // Supabase returns an empty identities array for duplicate emails with email confirmation OFF
    if (data.user?.identities?.length === 0) {
      setError('Account already exists. Please sign in.')
      return
    }
    // Success → handled by onAuthStateChange in _layout.tsx
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.container}>
        <View style={s.card}>
          <Text style={s.appName}>Calorie Snap</Text>
          <Text style={s.subtitle}>Create an account to get started</Text>

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
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={s.buttonText}>
              {loading ? 'Creating account…' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <GoogleSignInButton />

          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity style={s.linkRow}>
              <Text style={s.linkText}>
                Already have an account?{' '}
                <Text style={s.linkBold}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.authBg },
    container: {
      flex: 1,
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
