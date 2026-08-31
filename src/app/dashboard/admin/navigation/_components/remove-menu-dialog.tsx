"use client";

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

/**
 * Removal is offered from the detail pane and from the toolbar, and both have
 * to warn about the same thing — submenus going with their parent, and nothing
 * actually leaving the database until Save.
 */
export function RemoveMenuDialog({
  open,
  title,
  isChild,
  submenuCount,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  isChild: boolean;
  submenuCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {title || (isChild ? "this submenu" : "this menu")}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {!isChild && submenuCount > 0
              ? `Its ${submenuCount} submenu${submenuCount > 1 ? "s go" : " goes"} with it. Nothing is deleted until you save.`
              : "It disappears from the sidebar once you save. Nothing is deleted until then."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
