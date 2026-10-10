// >app>login>page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginForm from "./form";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <section className="bg-gradient-to-br from-blue-950 from-50%  to-blue-700  h-screen flex items-center justify-center">
      <div className="w-[400px]">
        <LoginForm />
      </div>
    </section>
  );
}
