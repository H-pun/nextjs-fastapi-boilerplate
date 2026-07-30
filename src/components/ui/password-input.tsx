"use client";

import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<"input">, "type">
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <InputGroup>
      <InputGroupInput
        type={showPassword ? "text" : "password"}
        className={className}
        ref={ref}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-transparent!"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
});

PasswordInput.displayName = "PasswordInput";
