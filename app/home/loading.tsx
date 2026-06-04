export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-start justify-between px-5 pt-12 pb-2">
        <div>
          <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-7 w-20 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-200" />
      </header>

      <section className="flex justify-center py-8">
        <div className="h-44 w-44 animate-pulse rounded-full bg-zinc-200" />
      </section>

      <div className="mx-5 h-px bg-zinc-200" />

      <section className="flex-1 px-5 pt-5">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </section>
    </main>
  )
}
