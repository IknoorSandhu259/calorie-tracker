export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <div className="mb-8 h-8 w-28 animate-pulse rounded bg-zinc-200" />

      <section className="mb-8">
        <div className="mb-3 h-3 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </section>

      <section>
        <div className="mb-3 h-3 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </section>
    </main>
  )
}
