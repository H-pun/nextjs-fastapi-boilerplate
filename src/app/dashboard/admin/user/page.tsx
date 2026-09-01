"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataTable } from "@/hooks/use-server-data-table";

import { cn } from "@/lib/utils";
import { getRoles } from "@/lib/api/access";
import { RoleChecklist } from "./_components/role-checklist";
import { getColumns } from "./columns";
import {
  changeRole,
  createUser,
  deleteUser,
  getUsers,
  resetPassword,
  updateUser,
} from "@/lib/api/user";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSettingsMenu } from "@/components/data-table/data-table-settings-menu";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
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

import { Plus, Search } from "lucide-react";
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
  roleIds: [],
};

const TITLE = "User Management";
const DESCRIPTION =
  "Manage accounts, roles, and access for everyone in this workspace.";

export default function Page() {
  const queryClient = useQueryClient();

  // Shared with RoleChecklist through the query cache, so the filter and the
  // form always offer the same list.
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 1000 * 60 * 5,
  });

  const [openFilters, setOpenFilters] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetPasswordDialog, setOpenResetPasswordDialog] = useState(false);
  const [openChangeRoleDialog, setOpenChangeRoleDialog] = useState(false);
  const [selectedData, setSelectedData] = useState<UserData | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<UserData | null>(
    null
  );

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
    defaultValues: { roleIds: [] as string[] },
  });

  const {
    data,
    filter,
    table,
    isFetching,
    refetch,
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
          roleIds: data.roles.map((role) => role.id),
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
        setChangeRoleValue(
          "roleIds",
          data.roles.map((role) => role.id)
        );
        setOpenChangeRoleDialog(true);
      }
    ),
    hiddenColumns: ["id", "email", "createdAt", "updatedAt"],
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

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

  const { mutateAsync: changeRoleAsync, isPending: isChangingRole } =
    useMutation({
      mutationFn: (data: ChangeRoleForm) =>
        changeRole(changeRoleTarget!.id, data),
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

  const toolbar = (
    <div className="flex w-full flex-col gap-2 p-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search users..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-8 pl-8"
          />
        </div>

        <Filter open={openFilters} onOpenChange={setOpenFilters}>
          <FilterTrigger disabled={isFetching} activeCount={activeQueryCount} />

          <FilterContent align="start" className="w-72">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={queryParams.roleId ?? ""}
                  onValueChange={(value) => setQueryValue("roleId", value)}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
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
                  <SelectTrigger id="updated-within" className="w-full">
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
      </div>

      <div className="flex items-center justify-end gap-2">
        <DataTableSettingsMenu
          table={table}
          onRefresh={refetch}
          isRefreshing={isFetching}
        />
        <Button
          onClick={() => {
            setOpenSheet(true);
            reset(defaultValues);
          }}
          disabled={isLoading}
          size="sm"
        >
          <Plus />
          Add user
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeader title={TITLE} description={DESCRIPTION} />

        {!data && isFetching ? (
          <DataTableSkeleton columnCount={6} filterCount={2} />
        ) : (
          <DataTable
            table={table}
            className={cn(isFetching && "opacity-60 transition-opacity")}
          >
            {toolbar}
          </DataTable>
        )}
      </div>

      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent className="flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>{state} user</SheetTitle>
            <SheetDescription>
              {state === "Add"
                ? "Create an account and assign its initial access."
                : "Update this user's account information."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
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
                      name="roleIds"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.roleIds}>
                          <FieldLabel htmlFor="roles">Roles</FieldLabel>
                          <RoleChecklist
                            id="roles"
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isLoading}
                          />
                          <FieldDescription>
                            A user may hold more than one.
                          </FieldDescription>
                          <FieldError errors={[errors.roleIds]} />
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

      <Dialog
        open={openChangeRoleDialog}
        onOpenChange={setOpenChangeRoleDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Roles</DialogTitle>
            <DialogDescription>
              Set which roles {changeRoleTarget?.name} holds.
            </DialogDescription>
          </DialogHeader>
          <form
            id="change-role-form"
            onSubmit={handleSubmitChangeRole(onChangeRoleSubmit)}
            noValidate
          >
            <Controller
              control={changeRoleControl}
              name="roleIds"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="change-roles">Roles</FieldLabel>
                  <RoleChecklist
                    id="change-roles"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isChangingRole}
                  />
                  <FieldError errors={[fieldState.error]} />
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
    </>
  );
}
