"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  const { data: session } = useSession();

  if (session) redirect("/dashboard");

  return (
    <section className="bg-gradient-to-br from-blue-950 from-50%  to-blue-700  h-screen flex  items-center justify-center">
      <div className="md:w-4/12 xs:w-11/12 p-16 rounded bg-white flex flex-col items-center justify-center">
        <img src={"Icon Button.png"} alt="Logo" />
        <h1 className="text-3xl">Mesh</h1>
        <Link href={"/login"}>
          <Button className="mt-5">Login</Button>
        </Link>
      </div>
    </section>
  );
}
