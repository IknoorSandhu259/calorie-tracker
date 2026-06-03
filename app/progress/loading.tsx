export default function ProgressLoading() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <div className="mb-8 h-8 w-32 animate-pulse rounded-lg bg-zinc-200" />
      {[0, 1].map((i) => (
        <div key={i} className="mb-8">
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-zinc-200" />
          <div className="h-56 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      ))}
    </main>
  )
}
