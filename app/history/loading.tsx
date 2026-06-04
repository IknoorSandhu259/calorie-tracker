export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-50 px-5 pt-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-10 w-24 animate-pulse rounded-xl bg-zinc-200" />
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-4 mx-auto h-5 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="grid grid-cols-7 gap-y-2">
          {Array.from({ length: 35 }, (_, i) => (
            <div
              key={i}
              className="mx-auto h-8 w-8 animate-pulse rounded-full bg-zinc-100"
            />
          ))}
        </div>
      </div>

      <section>
        <div className="mb-3 h-3 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
      </section>
    </main>
  )
}
