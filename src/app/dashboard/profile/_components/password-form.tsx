"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

import { passwordSchema } from "@/lib/types/user";
import { updatePassword } from "@/lib/api/user";

import { Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

export default function SecurityForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("Password updated successfully");
      reset();
    },
    onError: (error) => {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((d) => mutate(d))}>
      <Field>
        <FieldLabel htmlFor="oldPassword">Current Password</FieldLabel>
        <PasswordInput id="oldPassword" {...register("oldPassword")} disabled={isPending} />
        <FieldError errors={[errors.oldPassword]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
        <PasswordInput id="newPassword" {...register("newPassword")} disabled={isPending} />
        <FieldError errors={[errors.newPassword]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="confirmPassword">Verify Password</FieldLabel>
        <PasswordInput id="confirmPassword" {...register("confirmPassword")} disabled={isPending} />
        <FieldError errors={[errors.confirmPassword]} />
      </Field>

      <Button type="submit" disabled={isPending}>
        <Lock className="mr-2 h-4 w-4" />
        Change Password
      </Button>
    </form>
  );
}
