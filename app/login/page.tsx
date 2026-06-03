import GoogleSignInButton from '@/components/GoogleSignInButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Calorie Snap</h1>
        <p className="mt-2 text-sm text-zinc-500">Sign in to start tracking</p>
      </div>
      <GoogleSignInButton />
    </main>
  )
}
