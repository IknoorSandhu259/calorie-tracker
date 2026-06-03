import { signOut } from '@/lib/actions/auth'

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        Sign out
      </button>
    </form>
  )
}
