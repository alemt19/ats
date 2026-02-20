import PublicLayoutShell from "./public-layout-shell"

export default function PublicLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicLayoutShell>{children}</PublicLayoutShell>;
}