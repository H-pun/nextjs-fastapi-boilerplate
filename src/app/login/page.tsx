"use client"

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import {
  Banner,
  BannerClose,
  BannerIcon,
  BannerTitle,
} from "@/components/ui/banner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

import { Loader2, AlertCircle } from "lucide-react";
import { loginSchema, LoginForm } from "@/lib/types/user";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    await signIn("credentials", {
      redirect: false,
      ...data,
    }).then((res) => {
      if (res?.ok) {
        router.replace(callbackUrl || "/dashboard");
      } else {
        form.setError("root", {
          message: res?.error || "Something went wrong",
        });
      }
    });
  };

  const isLoading = form.formState.isSubmitting;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-login">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href={"/"} className="self-center">
          <Image
            src="/images/logo-nyamping.png"
            alt="Logo"
            width={128}
            height={48}
            className="h-auto object-contain"
          />
        </Link>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Login with your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Username"
                      {...form.register("username")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      {...form.register("password")}
                    />
                  </Field>
                  {form.formState.errors.root && (
                    <Banner className="border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                      <BannerIcon icon={AlertCircle} />
                      <BannerTitle>{form.formState.errors.root.message}</BannerTitle>
                      <BannerClose className="hover:text-current" />
                    </Banner>
                  )}
                  <Field>
                    <Button type="submit" disabled={isLoading} className="bg-linear-to-r from-sky-500 to-teal-400 text-white hover:from-sky-600 hover:to-teal-500 dark:from-sky-800 dark:to-teal-700 dark:hover:from-sky-700 dark:hover:to-teal-600">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center">
            By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
            and <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
