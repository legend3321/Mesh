import Sidenav from "@/app/components/Sidenav";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidenav />
      <div className="p-4 sm:ml-64 sm:mr-64 bg-gray-50 h-screen border-r-2 border-gray-200">
        {children}
      </div>
    </>
  );
}
