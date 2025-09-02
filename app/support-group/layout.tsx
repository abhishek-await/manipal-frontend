export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* page content — pad top so header doesn't overlap */}
      <main className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 w-full max-w-5xl mx-auto items-center justify-center">
          {children}
        </div>
      </main>
    </>
  );
}
