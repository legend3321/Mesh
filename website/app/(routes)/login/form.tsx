"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const FormSchema = z.object({
  userEmail: z.string().email({
    message: "Invalid email address.",
  }),
  userPassword: z.string().min(5, {
    message: "Password must be at least 6 characters.",
  }),
});

type FormData = z.infer<typeof FormSchema>;

export default function LoginForm() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userEmail: "",
      userPassword: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const { userEmail, userPassword } = data;

    try {
      const response = await signIn("credentials", {
        userEmail,
        userPassword,
        redirect: false,
      });

      if (!response?.error) {
        router.push("/");
        router.refresh();
      }

      if (!response?.ok) {
        toast({ description: "Invalid Email and Password" });
        return;
      }
      // Process response here
      toast({ title: "Login Successful" });
    } catch (error: any) {
      console.error("Login Failed:", error);
      toast({ title: "Login Failed", description: error.message });
    }
    return false;
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-white p-4 md:p-16 border-[1.5px] rounded-lg border-gray-300 flex flex-col items-center justify-center gap-y-6"
      >
        <img src={"Icon Button.png"} alt="Logo" />
        <h1 className="text-3xl">Mesh</h1>
        <div className="w-10/12 flex flex-col justify-left my-6 ">
          <h4 className="text-2xl">Welcome Back</h4>
          <p className="text-xs">Use Email and Password to Sign In </p>
        </div>
        <FormField
          control={form.control}
          name="userEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provide Email</FormLabel>
              <FormControl>
                <Input
                  className="text-black"
                  placeholder="example@gmail.com"
                  {...field}
                  type="text"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provide Password</FormLabel>
              <FormControl>
                <Input
                  className="text-black"
                  placeholder="Hasło"
                  {...field}
                  type="password"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="hover:scale-110 hover:bg-cyan-700"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Please Wait...." : "Login"}
        </Button>
      </form>
      <Toaster />
    </Form>
  );
}
