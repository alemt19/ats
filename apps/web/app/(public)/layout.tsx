import NavbarClient from "./navbar-client"

export default function PublicLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NavbarClient />
      <main>{children}</main>
    </>
  );
}