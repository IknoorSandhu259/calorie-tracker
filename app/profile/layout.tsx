import BottomNav from '@/components/BottomNav'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-[calc(env(safe-area-inset-bottom)+5rem)]">{children}</div>
      <BottomNav />
    </>
  )
}
