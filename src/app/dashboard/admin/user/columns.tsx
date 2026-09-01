import { Button } from "@/components/ui/button";

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
  },
  {
    accessorKey: "identifier",
    header: "Identifier",
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    id: "roles",
    header: "Roles",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.roles?.map((role) => role.name).join(", ") || "—",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM yyyy HH:mm"),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => format(new Date(row.original.updatedAt), "d MMM yyyy HH:mm"),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="text-muted-foreground">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(row.original)}>
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
