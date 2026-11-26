"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

import { AvatarCropDialog } from "./avatar-crop-dialog";

const MAX_SIZE = 5 * 1024 * 1024;

type AvatarUploadProps = {
  name: string;
  avatarSrc?: string;
};

export function AvatarUpload({ name, avatarSrc }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    setPendingFile(file);
    setCropOpen(true);
  };

  const handleCropOpenChange = (open: boolean) => {
    setCropOpen(open);
    if (!open) setPendingFile(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="group relative cursor-pointer rounded-full"
        onClick={() => inputRef.current?.click()}
      >
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarSrc} alt={name} />
          <AvatarFallback className="bg-muted text-2xl">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-6 text-white" />
        </div>
        <span className="sr-only">Upload profile picture</span>
      </button>

      <AvatarCropDialog
        open={cropOpen}
        onOpenChange={handleCropOpenChange}
        initialFile={pendingFile}
      />
    </>
  );
}
