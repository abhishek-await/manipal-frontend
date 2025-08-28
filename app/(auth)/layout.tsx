import Header from "@/features/layout/components/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* fixed header (keeps header visible) */}
      <div className="top-0 left-0 w-full z-50 bg-white/100">
        <Header showMenu={false} />
      </div>

      {/* page content — pad top so header doesn't overlap */}
      <main className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 w-full max-w-5xl mx-auto items-center justify-center">
          {children}
        </div>

      </main>
    </>
  );
}