"use client"

import { FileText, UploadIcon, X } from "lucide-react"
import type { ReactNode } from "react"
import { createContext, useContext } from "react"
import type { DropEvent, DropzoneOptions, FileRejection } from "react-dropzone"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { cn, renderBytes } from "@/lib/utils"

type DropzoneContextType = {
  src?: File[]
  accept?: DropzoneOptions["accept"]
  maxSize?: DropzoneOptions["maxSize"]
  minSize?: DropzoneOptions["minSize"]
  maxFiles?: DropzoneOptions["maxFiles"]
}

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined)

export type DropzoneProps = Omit<DropzoneOptions, "onDrop"> & {
  src?: File[]
  className?: string
  onDrop?: (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
    event?: DropEvent
  ) => void
  children?: ReactNode
}

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: (acceptedFiles, fileRejections, event) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message
        onError?.(new Error(message))
        return
      }

      onDrop?.(acceptedFiles, fileRejections, event)
    },
    ...props,
  })

  const handleRemove = (idx: number) => {
    const base = src ?? []
    const next = base.filter((_, i) => i !== idx)
    onDrop?.(next, [], undefined)
  }

  return (
    <DropzoneContext.Provider
      key={JSON.stringify(src)}
      value={{ src, accept, maxSize, minSize, maxFiles }}
    >
      <Button
        className={cn(
          "hover:bg-background! hover:text-foreground! transition-none hover:shadow-none!",
          "relative h-auto w-full flex-col overflow-hidden rounded-2xl p-8 transition-colors",
          "border-muted-foreground/30 border-2 border-dashed",
          isDragActive && "border-primary bg-primary/5",
          className
        )}
        disabled={disabled}
        type="button"
        variant="ghost"
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </Button>

      {src && src?.length > 1 && (
        <div className="space-y-2">
          <ul className="space-y-2">
            {src.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="bg-card/50 flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {renderBytes(f.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleRemove(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DropzoneContext.Provider>
  )
}

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext)

  if (!context) {
    throw new Error("useDropzoneContext must be used within a Dropzone")
  }

  return context
}

export type DropzoneContentProps = {
  children?: ReactNode
  className?: string
}

const maxLabelItems = 3

export const DropzoneContent = ({
  children,
  className,
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext()

  if (!src) {
    return null
  }

  if (children) {
    return children
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="text-foreground flex size-8 items-center justify-center">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium">
        {src.length > maxLabelItems
          ? `${new Intl.ListFormat("en").format(
              src.slice(0, maxLabelItems).map((file) => file.name)
            )} and ${src.length - maxLabelItems} more`
          : new Intl.ListFormat("en").format(src.map((file) => file.name))}
      </p>
      <p className="text-muted-foreground w-full text-xs text-wrap">
        Drag and drop or click to replace
      </p>
    </div>
  )
}

export type DropzoneEmptyStateProps = {
  children?: ReactNode
  className?: string
}

export const DropzoneEmptyState = ({
  children,
  className,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext()

  if (src) {
    return null
  }

  if (children) {
    return children
  }

  let caption = ""

  if (accept) {
    caption += "Accepts "
    caption += new Intl.ListFormat("en").format(Object.keys(accept))
  }

  if (minSize && maxSize) {
    caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`
  } else if (minSize) {
    caption += ` at least ${renderBytes(minSize)}`
  } else if (maxSize) {
    caption += ` less than ${renderBytes(maxSize)}`
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="text-foreground flex size-8 items-center justify-center">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-sm font-medium text-wrap">
        Upload {maxFiles === 1 ? "a file" : "files"}
      </p>
      <p className="text-muted-foreground w-full truncate text-xs text-wrap">
        Drag and drop or click to upload
      </p>
      {caption && (
        <p className="text-muted-foreground text-xs text-wrap">{caption}.</p>
      )}
    </div>
  )
}
