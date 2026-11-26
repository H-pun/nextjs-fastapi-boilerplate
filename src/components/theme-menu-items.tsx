"use client";

import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

const keepMenuOpen = (event: Event) => event.preventDefault();

/** Light, dark, and operating-system modes for an account-menu submenu. */
export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        Mode
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
        <DropdownMenuRadioItem value="light" onSelect={keepMenuOpen}>
          <Sun />
          Light
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark" onSelect={keepMenuOpen}>
          <Moon />
          Dark
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system" onSelect={keepMenuOpen}>
          <Laptop />
          System
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  );
}
