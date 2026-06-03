import Link from 'next/link'
import SignUpForm from '@/components/SignUpForm'
import GoogleSignInButton from '@/components/GoogleSignInButton'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Calorie Snap</h1>
          <p className="mt-2 text-sm text-zinc-500">Create an account to get started</p>
        </div>
        <div className="flex flex-col gap-4">
          <SignUpForm />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <GoogleSignInButton />
          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-zinc-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
