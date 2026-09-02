"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dropzone,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

import { updateAvatar } from "@/lib/api/user";
import { cn } from "@/lib/utils";

import {
  Lightbulb,
  RotateCcw,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

const CROP_SIZE = 360;
const OUTPUT_SIZE = 512;

type AvatarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AvatarDialog({
  open,
  onOpenChange,
}: AvatarDialogProps) {
  const { data: session, update } = useSession();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [useBlackGrid, setUseBlackGrid] = useState(false);

  const closeDialog = () => {
    onOpenChange(false);
    resetEditor();
  };

  const { mutate: uploadAvatar, isPending: uploading } = useMutation({
    mutationFn: (file: File) => updateAvatar(file),
    onSuccess: async ({ avatar }) => {
      await update({
        ...session,
        user: {
          ...session?.user,
          avatar,
        },
      });
      closeDialog();
      toast.success("Avatar updated successfully");
    },
    onError: () => toast.error("Failed to upload avatar"),
  });

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const resetEditor = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setImageSize({ width: 0, height: 0 });
    setOffset({ x: 0, y: 0 });
    setZoom(0);
    setRotation(0);
  };

  const handleDrop = (files: File[]) => {
    const nextFile = files[0];

    if (!nextFile) {
      resetEditor();
      return;
    }

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(nextFile);
    setImageUrl(URL.createObjectURL(nextFile));
    setImageSize({ width: 0, height: 0 });
    setOffset({ x: 0, y: 0 });
    setZoom(0);
    setRotation(0);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!file || uploading) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setOffset({
      x: dragStart.offsetX + event.clientX - dragStart.x,
      y: dragStart.offsetY + event.clientY - dragStart.y,
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!(file && imageRef.current && imageSize.width && imageSize.height)) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Failed to prepare cropped avatar");
      return;
    }

    const baseScale = getBaseScale(imageSize.width, imageSize.height);
    const outputRatio = OUTPUT_SIZE / CROP_SIZE;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.translate(
      OUTPUT_SIZE / 2 + offset.x * outputRatio,
      OUTPUT_SIZE / 2 + offset.y * outputRatio
    );
    context.rotate((rotation * Math.PI) / 180);
    context.scale(
      baseScale * zoomScale * outputRatio,
      baseScale * zoomScale * outputRatio
    );
    context.drawImage(
      imageRef.current,
      -imageSize.width / 2,
      -imageSize.height / 2
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to crop avatar");
        return;
      }

      uploadAvatar(new File([blob], "avatar.png", { type: "image/png" }));
    }, "image/png");
  };

  const baseScale = imageSize.width && imageSize.height
    ? getBaseScale(imageSize.width, imageSize.height)
    : 1;
  const displayedWidth = imageSize.width * baseScale;
  const displayedHeight = imageSize.height * baseScale;
  const zoomScale = getZoomScale(zoom);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true);
        else closeDialog();
      }}
    >
      <DialogContent className="gap-4 p-0 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="px-6 pt-6">Update Avatar</DialogTitle>
          <DialogDescription className="sr-only">
            Crop and upload a new profile picture.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          {!file ? (
            <Dropzone
              accept={{ "image/*": [] }}
              maxFiles={1}
              maxSize={5 * 1024 * 1024}
              onDrop={handleDrop}
              onError={(error) => toast.error(error.message)}
              disabled={uploading}
            >
              <DropzoneEmptyState />
            </Dropzone>
          ) : (
            <div className="grid gap-5 md:grid-cols-[3fr_2fr]">
              <div className="flex min-w-0 justify-center rounded-md bg-muted p-4">
                <div
                  className={cn(
                    "relative overflow-hidden bg-background shadow-inner",
                    uploading ? "cursor-wait" : "cursor-grab active:cursor-grabbing"
                  )}
                  style={{ height: CROP_SIZE, width: CROP_SIZE }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Avatar crop preview"
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        height: displayedHeight || "auto",
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoomScale})`,
                        transformOrigin: "center",
                        width: displayedWidth || "auto",
                      }}
                      onLoad={(event) =>
                        setImageSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        })
                      }
                    />
                  )}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 ring-2",
                      useBlackGrid ? "ring-black/80" : "ring-white/90"
                    )}
                  />
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "border",
                          useBlackGrid ? "border-black/45" : "border-white/45"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      setOffset({ x: 0, y: 0 });
                      setZoom(0);
                      setRotation(0);
                    }}
                    disabled={uploading}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={resetEditor}
                    disabled={uploading}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <label className="flex items-center gap-2">
                      <ZoomIn className="h-4 w-4" />
                      Zoom
                    </label>
                    <span className="text-muted-foreground">
                      {zoom}%
                    </span>
                  </div>
                  <Slider
                    min={-100}
                    max={200}
                    step={1}
                    value={[zoom]}
                    onValueChange={([value]) => setZoom(value ?? 0)}
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <label>Straighten</label>
                    <span className="text-muted-foreground">{rotation}°</span>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[rotation]}
                    onValueChange={([value]) => setRotation(value ?? 0)}
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span>Black grid</span>
                    <Switch
                      checked={useBlackGrid}
                      onCheckedChange={setUseBlackGrid}
                      disabled={uploading}
                    />
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="mb-2 font-medium text-foreground">Anchor</div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-muted-foreground">
                    <span>X: {Math.round(offset.x)}px</span>
                    <span>Y: {Math.round(offset.y)}px</span>
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex w-fit cursor-pointer items-center gap-1 text-sm text-muted-foreground"
                      >
                        Tips
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span className="sr-only">Show avatar crop tips</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex w-80 max-w-80 flex-col gap-3 p-3"
                    >
                      <Image
                        src="/images/avatar-crop-guide.svg"
                        alt="Avatar crop guide"
                        width={400}
                        height={400}
                        className="w-full rounded-md object-contain"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          Avatar crop guide
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Keep the face centered in the middle column. Place
                          the eyes near the upper third, and leave a little
                          space above the head so the avatar still feels
                          balanced after cropping.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t p-4">
          <Button variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!file || uploading}>
            {uploading && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getBaseScale(width: number, height: number) {
  return Math.max(CROP_SIZE / width, CROP_SIZE / height);
}

function getZoomScale(zoom: number) {
  return 1 + zoom / 200;
}
