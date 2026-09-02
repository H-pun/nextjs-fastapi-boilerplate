"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataTable } from "@/hooks/use-data-table";
import { toQueryParams, useTableUrlState } from "@/hooks/use-table-url-state";

import { getRoles } from "@/lib/api/access";
import { RoleChecklist } from "./_components/role-checklist";
import { RoleFilter } from "./_components/role-filter";
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
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
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
  password: "",
  roleIds: [],
};

const TITLE = "User Management";
const DESCRIPTION =
  "Manage accounts, roles, and access for everyone in this workspace.";

export default function Page() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tableUrlState = useTableUrlState();

  // Shared with RoleChecklist through the query cache, so the filter and the
  // form always offer the same list.
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 1000 * 60 * 5,
  });

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
    reset: resetChangeRoleForm,
    formState: { errors: changeRoleErrors },
  } = useForm({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { roleIds: [] as string[] },
  });

  const actions = useMemo(
    () => ({
      onEdit: (data: UserData) => {
        reset({
          id: data.id,
          identifier: data.identifier,
          name: data.name,
          email: data.email,
          username: data.username || "",
          password: "",
          roleIds: data.roles.map((role) => role.id),
        });
        setOpenSheet(true);
      },
      onDelete: (data: UserData) => {
        setSelectedData(data);
        setOpenDeleteDialog(true);
      },
      onResetPassword: (data: UserData) => {
        setSelectedData(data);
        resetResetPasswordForm({ newPassword: "" });
        setOpenResetPasswordDialog(true);
      },
      onChangeRole: (data: UserData) => {
        setChangeRoleTarget(data);
        // reset, not setValue: the dialog is unmounted at this point, so the
        // Controller holding `roleIds` has not registered yet and a setValue
        // lands on a field that does not exist. reset replaces the form's
        // defaults, which is what the Controller reads when it does mount.
        resetChangeRoleForm({ roleIds: data.roles.map((role) => role.id) });
        setOpenChangeRoleDialog(true);
      },
    }),
    [reset, resetResetPasswordForm, resetChangeRoleForm]
  );

  const columns = useMemo(() => getColumns(actions), [actions]);
  const roleId = searchParams.get("roleId") ?? "";

  const { data, isPending, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: [
      "users",
      tableUrlState.page,
      tableUrlState.perPage,
      tableUrlState.search,
      tableUrlState.sort,
      tableUrlState.filters,
      tableUrlState.joinOperator,
      roleId,
    ],
    queryFn: () =>
      getUsers({
        ...toQueryParams(tableUrlState),
        ...(roleId && { roleId }),
      }),
    placeholderData: (previous) => previous,
  });

  const { table } = useDataTable({
    data: data?.items ?? [],
    columns,
    pageCount: data?.totalPages ?? -1,
    rowCount: data?.totalItems ?? 0,
    enableAdvancedFilter: true,
    shallow: false,
    getRowId: (row) => row.id,
    initialState: {
      columnVisibility: {
        id: false,
        email: false,
        createdAt: false,
        updatedAt: false,
      },
      columnPinning: { right: ["actions"] },
    },
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

  // Zod refuses an empty list, and an error on `roleIds` has nowhere obvious to
  // land — the checklist is not an input. Without this the button looks broken:
  // nothing submits, nothing turns red, nothing says why.
  const onChangeRoleInvalid = () => {
    // The checklist is not an input, so an error on `roleIds` has nowhere to
    // render. Without this the button looks broken: nothing submits, nothing
    // turns red, nothing says why.
    toast.error(changeRoleErrors.roleIds?.message ?? "Pick at least one role");
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

  const dimWhileFetching = isPlaceholderData
    ? "opacity-60 transition-opacity"
    : "";

  const toolbar = (
    <div className="flex w-full items-start gap-2 p-1">
      <DataTableAdvancedToolbar
        table={table}
        className="flex-1 p-0"
        onRefresh={refetch}
        isRefreshing={isFetching}
      >
        <DataTableSearch
          placeholder="Search name, email, username..."
          label="Search users"
        />
        <DataTableFilterList table={table} shallow={false} />
        <DataTableSortList table={table} />
        <RoleFilter roles={roles} />
      </DataTableAdvancedToolbar>
      <Button
        onClick={() => {
          setOpenSheet(true);
          reset(defaultValues);
        }}
        disabled={isLoading}
      >
        <Plus />
        Add user
      </Button>
    </div>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeader title={TITLE} description={DESCRIPTION} />

        {isPending ? (
          <DataTableSkeleton columnCount={6} filterCount={2} />
        ) : (
          <DataTable
            table={table}
            className={dimWhileFetching}
            onRowClick={actions.onEdit}
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
                  <FieldDescription>
                    Optional. A staff or student number, if this workspace uses
                    them.
                  </FieldDescription>
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
                  <FieldDescription>
                    Optional. They can sign in with their email address, and
                    pick a username themselves later.
                  </FieldDescription>
                  <FieldError errors={[errors.username]} />
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
            onSubmit={handleSubmitChangeRole(
              onChangeRoleSubmit,
              onChangeRoleInvalid
            )}
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
                    value={field.value ?? []}
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
