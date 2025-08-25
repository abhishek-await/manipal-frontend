import Header from "@/features/layout/components/Header";
import Footer from "@/features/layout/components/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />
      {children}
      <Footer />
    </main>
  );
}