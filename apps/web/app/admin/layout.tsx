// import Navbar from '@/components/Navbar';
// import Footer from '@/components/Footer';

export default function AdminLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="bg-blue-500">{children}</main>
    </>
  );
}