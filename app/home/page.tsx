import SignOutButton from '@/components/SignOutButton'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Welcome to Calorie Snap</h1>
      <SignOutButton />
    </main>
  )
}
