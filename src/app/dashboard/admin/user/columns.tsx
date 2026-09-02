import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { ColumnDef } from "@tanstack/react-table";

import type { UserData } from "@/lib/types/user";
import { AtSign, CalendarDays, Text } from "lucide-react";
import { format } from "date-fns";
import {
  UserRowActions,
  type UserRowActionsConfig,
} from "./_components/user-row-actions";

export const getColumns = (
  actions: UserRowActionsConfig
): ColumnDef<UserData>[] => [
  {
    id: "id",
    accessorKey: "id",
    header: "ID",
    enableSorting: false,
    meta: { label: "ID" },
  },
  {
    id: "identifier",
    accessorKey: "identifier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Identifier" />
    ),
    enableColumnFilter: true,
    enableHiding: false,
    meta: {
      label: "Identifier",
      placeholder: "Search identifier...",
      variant: "text",
      icon: Text,
    },
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Name" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    enableColumnFilter: true,
    enableHiding: false,
    meta: {
      label: "Name",
      placeholder: "Search name...",
      variant: "text",
      icon: Text,
    },
  },
  {
    id: "email",
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Email" />
    ),
    cell: ({ row }) => row.original.email || "—",
    enableColumnFilter: true,
    meta: {
      label: "Email",
      placeholder: "Search email...",
      variant: "text",
      icon: AtSign,
    },
  },
  {
    id: "username",
    accessorKey: "username",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Username" />
    ),
    enableColumnFilter: true,
    meta: {
      label: "Username",
      placeholder: "Search username...",
      variant: "text",
      icon: Text,
    },
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
    id: "createdAt",
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Created" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "d MMM yyyy HH:mm"),
    enableColumnFilter: true,
    meta: { label: "Created at", variant: "date", icon: CalendarDays },
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} label="Updated" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.updatedAt), "d MMM yyyy HH:mm"),
    enableColumnFilter: true,
    meta: { label: "Updated at", variant: "date", icon: CalendarDays },
  },
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    size: 48,
    meta: { fitContent: true },
    cell: ({ row }) => <UserRowActions user={row.original} {...actions} />,
  },
];
