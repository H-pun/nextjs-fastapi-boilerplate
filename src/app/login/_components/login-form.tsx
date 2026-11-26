"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, TriangleAlert, User } from "lucide-react";

import { NavIcon } from "@/components/nav-icon";
import type { PublicProvider } from "@/lib/auth-providers";

import {
  hasAdminScope,
  loginSchema,
  type LoginForm as LoginFormValues,
} from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm({
  callbackUrl,
  providers = [],
}: {
  callbackUrl: string;
  /** Extra ways in, beyond username and password. Empty means there are none. */
  providers?: PublicProvider[];
}) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  // Which provider the browser is on its way to, if any.
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const res = await signIn("credentials", { redirect: false, ...data });

    if (!res?.ok) {
      form.setError("root", { message: res?.error || "Something went wrong" });
      return;
    }

    if (callbackUrl === "/dashboard") {
      const session = await getSession();
      router.replace(
        hasAdminScope(session?.user) ? "/dashboard/admin/user" : "/dashboard"
      );
      return;
    }

    router.replace(callbackUrl);
  };

  const { errors, isSubmitting } = form.formState;
  const password = form.register("password");

  return (
    <div className="mt-8 flex flex-col gap-5">
      <form
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <Field data-invalid={!!errors.username}>
          <FieldLabel htmlFor="username" className="text-sm">
            Username or email
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon className="pl-3">
              <User />
            </InputGroupAddon>
            <InputGroupInput
              id="username"
              autoComplete="username"
              autoFocus
              placeholder="Username"
              aria-invalid={!!errors.username}
              className="text-sm"
              {...form.register("username")}
            />
          </InputGroup>
          <FieldError errors={[errors.username]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password" className="text-sm">
            Password
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupAddon className="pl-3">
              <Lock />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="text-sm"
              {...password}
              onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onBlur={(e) => {
                setCapsLock(false);
                return password.onBlur(e);
              }}
            />
            <InputGroupAddon align="inline-end" className="pr-2">
              <InputGroupButton
                size="icon-sm"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {capsLock ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-500"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              Caps Lock is on
            </p>
          ) : null}
          <FieldError errors={[errors.password]} />
        </Field>

        {errors.root ? (
          <p
            role="alert"
            className="text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5 text-sm"
          >
            {errors.root.message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || !!pendingProvider}
          className="h-11 w-full"
        >
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {providers.length > 0 ? (
        <>
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">or</span>
            <span className="bg-border h-px flex-1" />
          </div>

          {providers.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              size="lg"
              disabled={isSubmitting || !!pendingProvider}
              className="h-11 w-full"
              onClick={() => {
                // A full redirect out and back, so there is nothing to await —
                // the pending state only has to survive until the browser
                // leaves.
                setPendingProvider(provider.id);
                void signIn(provider.id, { callbackUrl });
              }}
            >
              {pendingProvider === provider.id ? (
                <Spinner />
              ) : (
                <NavIcon name={provider.icon} />
              )}
              {pendingProvider === provider.id
                ? "Redirecting…"
                : `Sign in with ${provider.label}`}
            </Button>
          ))}
        </>
      ) : null}
    </div>
  );
}
