import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { ColumnDef } from "@tanstack/react-table";

import type { UserData } from "@/lib/types/user";
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export const getColumns = (
  onEdit: (data: UserData) => void,
  onDelete: (data: UserData) => void,
  onResetPassword: (data: UserData) => void,
  onChangeRole: (data: UserData) => void
): ColumnDef<UserData>[] => [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: false,
    meta: { label: "ID" },
  },
  {
    accessorKey: "identifier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Identifier" />
    ),
    enableHiding: false,
    meta: { label: "Identifier" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    enableHiding: false,
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Email" />
    ),
    cell: ({ row }) => row.original.email || "—",
    meta: { label: "Email" },
  },
  {
    accessorKey: "username",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Username" />
    ),
    meta: { label: "Username" },
  },
  {
    id: "roles",
    header: "Roles",
    enableSorting: false,
    meta: { label: "Roles" },
    cell: ({ row }) =>
      row.original.roles?.length ? (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((role) => (
            <Badge key={role.id} variant="secondary" className="capitalize">
              {role.name}
            </Badge>
          ))}
        </div>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Phone" />
    ),
    cell: ({ row }) => row.original.phone || "—",
    meta: { label: "Phone" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Created" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "d MMM yyyy HH:mm"),
    meta: { label: "Created at" },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Updated" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.updatedAt), "d MMM yyyy HH:mm"),
    meta: { label: "Updated at" },
  },
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    size: 48,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="text-muted-foreground">
            <Ellipsis />
            <span className="sr-only">Actions for {row.original.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(row.original)}
          >
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onResetPassword(row.original)}>
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChangeRole(row.original)}>
            Change Role
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
