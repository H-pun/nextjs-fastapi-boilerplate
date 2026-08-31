"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataTable } from "@/hooks/use-data-table";

import { getColumns } from "./columns";
import {
  changeRole,
  createUser,
  deleteUser,
  getUsers,
  resetPassword,
  updateUser,
} from "@/lib/api/user";
import { ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Filter,
  FilterActions,
  FilterContent,
  FilterTrigger,
} from "@/components/filter";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { Plus } from "lucide-react";
import {
  UserData,
  UserForm,
  userSchema,
  ChangeRoleForm,
  changeRoleSchema,
  ResetPasswordForm,
  resetPasswordSchema,
} from "@/lib/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const defaultValues: UserForm = {
  name: "",
  identifier: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  roleId: "",
};

export default function Page() {
  const queryClient = useQueryClient();

  const [openFilters, setOpenFilters] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetPasswordDialog, setOpenResetPasswordDialog] = useState(false);
  const [openChangeRoleDialog, setOpenChangeRoleDialog] = useState(false);
  const [selectedData, setSelectedData] = useState<UserData | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<UserData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const {
    register: registerResetPassword,
    handleSubmit: handleSubmitResetPassword,
    reset: resetResetPasswordForm,
    formState: { errors: resetPasswordErrors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  const {
    handleSubmit: handleSubmitChangeRole,
    control: changeRoleControl,
    setValue: setChangeRoleValue,
  } = useForm({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { roleId: "" as const },
  });

  const {
    filter,
    table,
    isFetching,
    queryParams,
    activeQueryCount,
    setFilter,
    setQueryValue,
    resetQuery,
    applyQuery,
  } = useDataTable({
    key: "users",
    fetch: getUsers,
    columns: getColumns(
      (data) => {
        reset({
          id: data.id,
          identifier: data.identifier,
          name: data.name,
          email: data.email || "",
          username: data.username,
          phone: data.phone || "",
          password: "",
          roleId: data.role.id,
        });
        setOpenSheet(true);
      },
      (data) => {
        setSelectedData(data);
        setOpenDeleteDialog(true);
      },
      (data) => {
        setSelectedData(data);
        resetResetPasswordForm({ newPassword: "" });
        setOpenResetPasswordDialog(true);
      },
      (data) => {
        setChangeRoleTarget(data);
        setChangeRoleValue("roleId", data.role.id);
        setOpenChangeRoleDialog(true);
      }
    ),
    hiddenColumns: ["id", "email", "createdAt", "updatedAt"],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const { mutateAsync: createAsync, isPending: isCreating } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidate();
      toast.success("User created successfully");
      setOpenSheet(false);
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    },
  });

  const { mutateAsync: updateAsync, isPending: isUpdating } = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      invalidate();
      toast.success("User updated successfully");
      setOpenSheet(false);
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    },
  });

  const { mutateAsync: deleteAsync, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      invalidate();
      toast.success("User deleted successfully");
      setOpenDeleteDialog(false);
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    },
  });

  const { mutateAsync: resetPasswordAsync, isPending: isResettingPassword } =
    useMutation({
      mutationFn: (data: ResetPasswordForm) =>
        resetPassword(selectedData!.id, data),
      onSuccess: () => {
        toast.success("Password reset successfully");
        setOpenResetPasswordDialog(false);
      },
      onError: (error) => {
        console.error("Error resetting password:", error);
        toast.error("Failed to reset password");
      },
    });

  const { mutateAsync: changeRoleAsync, isPending: isChangingRole } = useMutation({
    mutationFn: (data: ChangeRoleForm) => changeRole(changeRoleTarget!.id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Role changed successfully");
      setOpenChangeRoleDialog(false);
    },
    onError: (error) => {
      console.error("Error changing role:", error);
      toast.error("Failed to change role");
    },
  });

  const onSubmit = async (data: UserForm) => {
    if (data.id) {
      await updateAsync(data);
    } else {
      if (!data.password) {
        toast.error("Password is required when creating a user");
        return;
      }
      await createAsync(data);
    }
  };

  const onResetPasswordSubmit = async (data: ResetPasswordForm) => {
    if (selectedData?.id) {
      await resetPasswordAsync(data);
    }
  };

  const onChangeRoleSubmit = async (data: ChangeRoleForm) => {
    if (changeRoleTarget?.id) {
      await changeRoleAsync(data);
    }
  };

  const onDelete = async () => {
    if (selectedData?.id) {
      await deleteAsync(selectedData.id);
    }
  };

  const state = getValues("id") ? "Edit" : "Add";
  const isLoading =
    isFetching ||
    isCreating ||
    isUpdating ||
    isDeleting ||
    isResettingPassword ||
    isChangingRole;

  return (
    <section className="mx-auto w-full max-w-7xl p-6">
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="mt-4 flex items-center justify-between gap-2 py-2">
        <Input
          placeholder="Filter user..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="h-8 max-w-60"
        />
        <ColumnVisibilityToggle table={table} />
        <Filter open={openFilters} onOpenChange={setOpenFilters}>
          <FilterTrigger disabled={isFetching} activeCount={activeQueryCount} />

          <FilterContent align="end">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={queryParams.roleId ?? ""}
                  onValueChange={(value) =>
                    setQueryValue("roleId", value)
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin-id">Admin</SelectItem>
                    <SelectItem value="user-id">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="updated-within">Updated within</Label>
                <Select
                  value={String(queryParams.updatedWithin ?? "")}
                  onValueChange={(value) =>
                    setQueryValue("updatedWithin", Number(value))
                  }
                >
                  <SelectTrigger id="updated-within">
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FilterActions
                onReset={resetQuery}
                onApply={() => {
                  applyQuery();
                  setOpenFilters(false);
                }}
              />
            </div>
          </FilterContent>
        </Filter>
        <Button
          onClick={() => {
            setOpenSheet(true);
            reset(defaultValues);
          }}
          disabled={isLoading}
          size="sm"
        >
          <Plus />
          Add User
        </Button>
      </div>
      <DataTable table={table} loading={isFetching} />

      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent className="flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>{state} Data</SheetTitle>
            <SheetDescription>
              {state} user information and settings here. Click save when you
              are done.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4">
              <form
                id="user-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <Field data-invalid={!!errors.identifier}>
                  <FieldLabel htmlFor="identifier">Identifier</FieldLabel>
                  <Input
                    id="identifier"
                    type="text"
                    maxLength={50}
                    disabled={isLoading}
                    {...register("identifier")}
                  />
                  <FieldError errors={[errors.identifier]} />
                </Field>

                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    maxLength={50}
                    disabled={isLoading}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    maxLength={50}
                    disabled={isLoading}
                    {...register("email")}
                  />
                  <FieldError errors={[errors.email]} />
                </Field>

                <Field data-invalid={!!errors.username}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    maxLength={25}
                    disabled={isLoading}
                    {...register("username")}
                  />
                  <FieldError errors={[errors.username]} />
                </Field>

                <Field data-invalid={!!errors.phone}>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={15}
                    disabled={isLoading}
                    {...register("phone")}
                  />
                  <FieldDescription>
                    Enter with country code, e.g., +628123456789
                  </FieldDescription>
                  <FieldError errors={[errors.phone]} />
                </Field>

                {state === "Add" && (
                  <>
                    <Field data-invalid={!!errors.password}>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        id="password"
                        type="password"
                        disabled={isLoading}
                        {...register("password")}
                      />
                      <FieldError errors={[errors.password]} />
                    </Field>

                    <Controller
                      control={control}
                      name="roleId"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.roleId}>
                          <FieldLabel htmlFor="role">Role</FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                          >
                            <SelectTrigger id="role" className="w-full">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user-id">User</SelectItem>
                              <SelectItem value="admin-id">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={[errors.roleId]} />
                        </Field>
                      )}
                    />
                  </>
                )}
              </form>
            </div>
          </ScrollArea>
          <SheetFooter>
            <Button form="user-form" type="submit" disabled={isLoading}>
              Save changes
            </Button>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete user
              and related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isLoading}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={openResetPasswordDialog}
        onOpenChange={setOpenResetPasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedData?.name}.
            </DialogDescription>
          </DialogHeader>
          <form
            id="reset-password-form"
            onSubmit={handleSubmitResetPassword(onResetPasswordSubmit)}
            noValidate
          >
            <Field data-invalid={!!resetPasswordErrors.newPassword}>
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <Input
                id="new-password"
                type="password"
                disabled={isLoading}
                {...registerResetPassword("newPassword")}
              />
              <FieldError errors={[resetPasswordErrors.newPassword]} />
            </Field>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenResetPasswordDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              form="reset-password-form"
              type="submit"
              disabled={isLoading}
            >
              {isResettingPassword && <Spinner />}
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openChangeRoleDialog} onOpenChange={setOpenChangeRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role for {changeRoleTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <form
            id="change-role-form"
            onSubmit={handleSubmitChangeRole(onChangeRoleSubmit)}
            noValidate
          >
            <Controller
              control={changeRoleControl}
              name="roleId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="change-role">Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="change-roleId" className="w-full">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user-id">User</SelectItem>
                      <SelectItem value="admin-id">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenChangeRoleDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button form="change-role-form" type="submit" disabled={isLoading}>
              {isChangingRole && <Spinner />}
              Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
