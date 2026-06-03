'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error: string } | { success: string } | null

async function getSiteUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function signInWithEmail(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Invalid email or password.' }
  redirect('/home')
}

export async function signUpWithEmail(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  // With email confirmation OFF, an existing email returns an empty identities array and no session.
  if (data.user?.identities?.length === 0) {
    return { error: 'Account already exists. Please sign in.' }
  }

  redirect('/home')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const siteUrl = await getSiteUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/auth/signin?error=oauth')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}
