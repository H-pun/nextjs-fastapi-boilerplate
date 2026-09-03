"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataTable } from "@/hooks/use-data-table";
import { useInfiniteTableQuery } from "@/hooks/use-infinite-table-query";
import { toInfiniteQueryParams, useTableUrlState } from "@/hooks/use-table-url-state";

import { getRoles } from "@/lib/api/access";
import { RoleChecklist } from "./_components/role-checklist";
import { RoleFilter } from "./_components/role-filter";
import { UserRowContextMenu } from "./_components/user-row-actions";
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
import { DataTableSearch } from "@/components/data-table/data-table-search";
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
import { CommandItem } from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";

import { Plus } from "lucide-react";
import {
  UserData,
  UserForm,
  userSchema,
  ResetPasswordForm,
  resetPasswordSchema,
} from "@/lib/types/user";
import { Pagination } from "@/lib/types/pagination";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

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
  const [selectedData, setSelectedData] = useState<UserData | null>(null);
  const [originalRoleIds, setOriginalRoleIds] = useState<string[]>([]);
  const [roleChipAdded, setRoleChipAdded] = useState(() =>
    searchParams.has("roleId")
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
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

  const actions = useMemo(
    () => ({
      onEdit: (data: UserData) => {
        const roleIds = data.roles.map((role) => role.id);
        setOriginalRoleIds(roleIds);
        reset({
          id: data.id,
          identifier: data.identifier,
          name: data.name,
          email: data.email,
          username: data.username || "",
          password: "",
          roleIds,
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
    }),
    [reset, resetResetPasswordForm]
  );

  const columns = useMemo(() => getColumns(actions), [actions]);
  const roleId = searchParams.get("roleId") ?? "";
  const roleChipVisible = Boolean(roleId) || roleChipAdded;

  const usersQueryKey = useMemo(
    () => [
      "users",
      tableUrlState.search,
      tableUrlState.sort,
      tableUrlState.filters,
      tableUrlState.joinOperator,
      tableUrlState.groupBy,
      roleId,
    ],
    [
      tableUrlState.search,
      tableUrlState.sort,
      tableUrlState.filters,
      tableUrlState.joinOperator,
      tableUrlState.groupBy,
      roleId,
    ]
  );

  const {
    rows,
    totalItems,
    groupSummaries,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isUsersLoading,
    isFetching,
    refetch,
  } = useInfiniteTableQuery<UserData>({
    queryKey: usersQueryKey,
    queryFn: async (page) => {
      const result = await getUsers({
        ...toInfiniteQueryParams(tableUrlState, page),
        ...(roleId && { roleId }),
      });
      if (!result) {
        throw new Error("Failed to fetch users");
      }
      return result;
    },
  });

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount: -1,
    rowCount: totalItems,
    enableAdvancedFilter: true,
    paginationMode: "infinite",
    shallow: false,
    memoryKeys: ["roleId"],
    getRowId: (row) =>
      row.groupKey ? `${row.id}::${row.groupKey}` : row.id,
    initialState: {
      columnVisibility: {
        id: false,
        createdAt: false,
      },
      columnPinning: { right: ["actions"] },
    },
  });

  const infiniteState = useMemo(
    () => ({
      onLoadMore: () => {
        void fetchNextPage();
      },
      hasNextPage: Boolean(hasNextPage),
      isFetchingNextPage,
      totalItems,
      loadedCount: rows.length,
    }),
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      rows.length,
      totalItems,
    ]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

  const patchUserInListCache = useCallback(
    (form: UserForm) => {
      if (!form.id) return;

      const nextRoles = form.roleIds
        .map((roleId) => roles.find((role) => role.id === roleId))
        .filter((role): role is NonNullable<typeof role> => Boolean(role));

      queryClient.setQueriesData<Pagination<UserData>>(
        { queryKey: ["users"] },
        (current) => {
          if (!current?.items) return current;

          return {
            ...current,
            items: current.items.map((user) =>
              user.id === form.id
                ? {
                    ...user,
                    name: form.name ?? user.name,
                    identifier: form.identifier ?? user.identifier,
                    username: form.username ?? user.username,
                    email: form.email || undefined,
                    roles: nextRoles.length > 0 ? nextRoles : user.roles,
                  }
                : user
            ),
          };
        }
      );
    },
    [queryClient, roles]
  );

  const { mutateAsync: createAsync, isPending: isCreating } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidate();
      toast.success("User created successfully");
      setOpenSheet(false);
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast.error(getApiErrorMessage(error, "Failed to create user"));
    },
  });

  const { mutateAsync: updateAsync, isPending: isUpdating } = useMutation({
    mutationFn: updateUser,
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

  const onInvalid = (fieldErrors: typeof errors) => {
    const message = Object.values(fieldErrors).find((error) => error?.message)
      ?.message;
    if (message) toast.error(message);
  };

  const onSubmit = async (data: UserForm) => {
    if (data.id) {
      try {
        await updateAsync(data);
        const rolesChanged =
          data.roleIds.length !== originalRoleIds.length ||
          data.roleIds.some((id) => !originalRoleIds.includes(id));
        if (rolesChanged) {
          await changeRole(data.id, { roleIds: data.roleIds });
        }
        patchUserInListCache(data);
        await refetch();
        toast.success("User updated successfully");
        setOpenSheet(false);
      } catch (error) {
        console.error("Error updating user:", error);
        toast.error(getApiErrorMessage(error, "Failed to update user"));
      }
      return;
    }

    if (!data.password) {
      toast.error("Password is required when creating a user");
      return;
    }
    await createAsync(data);
  };

  const onResetPasswordSubmit = async (data: ResetPasswordForm) => {
    if (selectedData?.id) {
      await resetPasswordAsync(data);
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
    isResettingPassword;

  const dimWhileFetching =
    isFetching && !isFetchingNextPage ? "opacity-60 transition-opacity" : "";

  const toolbar = (
    <DataTableAdvancedToolbar
      table={table}
      className="p-1"
      onRefresh={refetch}
      isRefreshing={isFetching}
      shallow={false}
      propertyBarOpenKeys={["roleId"]}
      filterMenuExtras={
        !roleChipVisible ? (
          <CommandItem
            value="Roles"
            onSelect={() => setRoleChipAdded(true)}
          >
            <Shield className="size-3.5 shrink-0" />
            Roles
          </CommandItem>
        ) : null
      }
      propertyBar={
        roleChipVisible ? (
          <RoleFilter
            roles={roles}
            onRemove={() => setRoleChipAdded(false)}
          />
        ) : null
      }
      trailing={
        <Button
          onClick={() => {
            setOriginalRoleIds([]);
            setOpenSheet(true);
            reset(defaultValues);
          }}
          disabled={isLoading}
        >
          <Plus />
          Add user
        </Button>
      }
    >
      <DataTableSearch
        placeholder="Search name, email, username..."
        label="Search users"
      />
    </DataTableAdvancedToolbar>
  );

  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
        <PageHeader title={TITLE} description={DESCRIPTION} />

        {isUsersLoading ? (
          <DataTableSkeleton columnCount={6} filterCount={2} />
        ) : (
          <DataTable
            table={table}
            groupSummaries={groupSummaries}
            infinite={infiniteState}
            className={dimWhileFetching}
            onRowClick={actions.onEdit}
            renderRowContextMenu={(user) => (
              <UserRowContextMenu user={user} {...actions} />
            )}
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
                : "Update this user's account information and roles."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-4">
              <form
                id="user-form"
                onSubmit={handleSubmit(onSubmit, onInvalid)}
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

                {state === "Add" ? (
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
                ) : null}

                <Controller
                  control={control}
                  name="roleIds"
                  defaultValue={[]}
                  render={({ field }) => {
                    const roleCount = field.value?.length ?? 0;
                    const showRoleError = isSubmitted && roleCount === 0;

                    return (
                      <Field data-invalid={showRoleError}>
                        <FieldLabel htmlFor="roles">Roles</FieldLabel>
                        <RoleChecklist
                          id="roles"
                          value={field.value ?? []}
                          onChange={(roleIds) => {
                            field.onChange(roleIds);
                            if (roleIds.length > 0) clearErrors("roleIds");
                          }}
                          disabled={isLoading}
                        />
                        <FieldDescription>
                          A user may hold more than one.
                        </FieldDescription>
                        <FieldError
                          errors={
                            showRoleError
                              ? [
                                  errors.roleIds ?? {
                                    message: "Pick at least one role",
                                  },
                                ]
                              : []
                          }
                        />
                      </Field>
                    );
                  }}
                />
              </form>
            </div>
          </ScrollArea>
          <SheetFooter>
            <Button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit(onSubmit, onInvalid)}
            >
              {(isUpdating || isCreating) && <Spinner />}
              {state === "Add" ? "Create user" : "Save changes"}
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
    </>
  );
}
