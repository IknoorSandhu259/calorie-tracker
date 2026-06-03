import WeightLogForm from '@/components/WeightLogForm'

export default function LogWeightPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-6">Log weight</h1>
      <WeightLogForm />
    </main>
  )
}
