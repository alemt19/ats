// import Navbar from '@/components/Navbar';
// import Footer from '@/components/Footer';

import Navbar from "react/components/layout/navbar";

export default function PublicLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}