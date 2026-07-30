"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { userSchema } from "@/lib/types/user";
import { getCurrentUser, updateUser } from "@/lib/api/user";

import { Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

export default function ProfileForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      username: "",
      phone: "",
    },
  });

  const { data, isFetching } = useQuery({
    queryKey: ["user/me"],
    queryFn: getCurrentUser,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user/me"] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        id: data.id,
        email: data.email || "",
        username: data.username,
        phone: data.phone || "",
      });
    }
  }, [data, reset]);

  const isLoading = isFetching || isPending;

  return (
    <form className="space-y-4" onSubmit={handleSubmit((d) => mutate(d))} noValidate>
      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input id="username" {...register("username")} disabled={isLoading} />
        <FieldDescription>Change your username. This will be used for login.</FieldDescription>
        <FieldError errors={[errors.username]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" {...register("email")} disabled={isLoading} />
        <FieldError errors={[errors.email]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" type="tel" inputMode="numeric" {...register("phone")} disabled={isLoading} />
        <FieldDescription>Enter with country code, e.g., +628123456789</FieldDescription>
        <FieldError errors={[errors.phone]} />
      </Field>

      <Button type="submit" disabled={isLoading}>
        <Save className="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </form>
  );
}
