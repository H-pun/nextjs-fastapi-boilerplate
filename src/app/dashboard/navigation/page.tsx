"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { useSortable, isSortableOperation } from "@dnd-kit/react/sortable";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxCollection,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  ArrowUpFromLine,
  ArrowDownFromLine,
} from "lucide-react";
import { iconNames } from "lucide-react/dynamic";
import { NavIcon } from "@/components/nav-icon";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { navigationFormSchema, NavigationForm } from "@/lib/types/navigation";
import { getNavigation, saveNavigation } from "@/lib/api/navigation";
import { cn } from "@/lib/utils";

export default function Page() {
  const form = useForm({
    resolver: zodResolver(navigationFormSchema),
    defaultValues: {
      roleId: "",
      navigations: [
        {
          id: crypto.randomUUID(),
          title: "",
          url: "/",
          order: 0,
          children: [],
        },
      ],
    },
    mode: "onChange",
  });

  const root = useFieldArray({
    control: form.control,
    name: "navigations",
    keyName: "_key",
  });

  const queryClient = useQueryClient();
  const roleId = useWatch({ control: form.control, name: "roleId" });

  const { data, isFetching } = useQuery({
    queryKey: ["navigation", roleId],
    queryFn: () => getNavigation(roleId),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: saveNavigation,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["navigation", roleId] });
      toast.success("Navigation updated successfully");
    },
  });

  const isLoading = isFetching || isPending;

  useEffect(() => {
    if (data) {
      form.reset({ roleId, navigations: data });
    }
  }, [data, form, roleId]);

  const onSubmit = async () => {
    const navs = form.getValues("navigations");
    navs.forEach((nav, i) => {
      form.setValue(`navigations.${i}.order`, i, { shouldDirty: true });
      (nav.children ?? []).forEach((_, j) => {
        form.setValue(`navigations.${i}.children.${j}.order`, j, { shouldDirty: true });
      });
    });
    await mutateAsync(form.getValues());
  };

  return (
    <div className="space-y-6 p-6">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sidebar Menu Manager</h1>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>

        <Controller
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <Field className="max-w-xs">
              <FieldLabel>Role</FieldLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <DragDropProvider
          sensors={[PointerSensor]}
          onDragEnd={({ operation, canceled }) => {
            if (canceled || !isSortableOperation(operation)) return;
            const { source, target } = operation;
            if (!source || !target || source.initialIndex === target.index) return;
            root.move(source.initialIndex, target.index);
          }}
        >
          <div className="space-y-2">
            {root.fields.map((field, i) => (
              <RootItem
                key={field._key}
                index={i}
                form={form}
                isLoading={isLoading}
                remove={() => root.remove(i)}
                moveUp={() => { if (i > 0) root.move(i, i - 1); }}
                moveDown={() => { if (i < root.fields.length - 1) root.move(i, i + 1); }}
              />
            ))}
          </div>
        </DragDropProvider>

        <div className="mt-4">
          <Button type="button" onClick={() => {
            root.append({
              id: crypto.randomUUID(),
              title: "",
              url: "/",
              order: root.fields.length,
              external: false,
            });
          }} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Add Menu
          </Button>
        </div>
      </form>
    </div>
  );
}

/** =============== Root Item (Parent) =============== */
function RootItem({
  index,
  form,
  isLoading,
  remove,
  moveUp,
  moveDown,
}: {
  index: number;
  form: ReturnType<typeof useForm<NavigationForm>>;
  isLoading: boolean;
  remove: () => void;
  moveUp: () => void;
  moveDown: () => void;
}) {
  const id = form.watch(`navigations.${index}.id`) ?? index;

  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    disabled: isLoading,
  });

  const children = useFieldArray({
    control: form.control,
    name: `navigations.${index}.children`,
    keyName: "_key",
  });

  const errors = form.formState.errors.navigations?.[index];

  return (
    <div
      ref={ref}
      className={cn(
        "cursor-default rounded-md border p-3 dark:bg-neutral-900",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-2 pr-2">
        <div className="flex items-center gap-2">
          <div ref={handleRef} aria-label="Drag handle">
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field data-invalid={!!errors?.title}>
              <FieldLabel>Title</FieldLabel>
              <Input
                placeholder="e.g. Dashboard"
                disabled={isLoading}
                {...form.register(`navigations.${index}.title`)}
              />
              <FieldError errors={[errors?.title]} />
            </Field>

            <Field data-invalid={!!errors?.url}>
              <FieldLabel>URL</FieldLabel>
              <Input
                placeholder="/dashboard"
                disabled={isLoading}
                {...form.register(`navigations.${index}.url`)}
              />
              <FieldError errors={[errors?.url]} />
            </Field>

            <Controller
              control={form.control}
              name={`navigations.${index}.icon`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Icon</FieldLabel>
                  <Combobox
                    value={field.value ?? null}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                    items={iconNames}
                    limit={50}
                  >
                    <ComboboxTrigger
                      render={<Button variant="outline" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")} />}
                    >
                      {field.value ? (
                        <span className="flex items-center gap-2">
                          <NavIcon name={field.value} className="size-4" />
                          {field.value}
                        </span>
                      ) : (
                        "Select icon..."
                      )}
                    </ComboboxTrigger>
                    <ComboboxContent>
                      <ComboboxInput
                        showTrigger={false}
                        placeholder="Search icon..."
                      />
                      <ComboboxList>
                        <ComboboxEmpty>No icons found.</ComboboxEmpty>
                        <ComboboxCollection>
                          {(name) => (
                            <ComboboxItem key={name} value={name}>
                              <NavIcon name={name} className="size-4" />
                              {name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name={`navigations.${index}.external`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>External</FieldLabel>
                  <div className="flex h-9 items-center">
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </div>
                </Field>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 px-2">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={moveUp}
              disabled={isLoading}
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={moveDown}
              disabled={isLoading}
            >
              <ArrowDownFromLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={remove}
              disabled={
                form.getValues(`navigations.${index}.title`) === "Navigation" ||
                isLoading
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Order: {index}
          </div>
        </div>
      </div>

      {/* CHILDREN */}
      <Accordion type="single" collapsible className="mt-2">
        <AccordionItem value="children" className="border-0">
          <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
            Submenu ({children.fields.length})
          </AccordionTrigger>
          <AccordionContent className="h-auto">
            <div className="space-y-2 border-l pl-4">
              <DragDropProvider
                sensors={[PointerSensor]}
                onDragEnd={({ operation, canceled }) => {
                  if (canceled || !isSortableOperation(operation)) return;
                  const { source, target } = operation;
                  if (!source || !target || source.initialIndex === target.index) return;
                  children.move(source.initialIndex, target.index);
                }}
              >
                {children.fields.map((field, j) => (
                  <ChildItem
                    key={field._key}
                    form={form}
                    i={index}
                    j={j}
                    isLoading={isLoading}
                    remove={() => children.remove(j)}
                    moveUp={() => { if (j > 0) children.move(j, j - 1); }}
                    moveDown={() => { if (j < children.fields.length - 1) children.move(j, j + 1); }}
                  />
                ))}
              </DragDropProvider>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  children.append({
                    id: crypto.randomUUID(),
                    title: "",
                    url: "/",
                    order: children.fields.length,
                    external: false,
                  });
                }}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Submenu
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** =============== Child Item (1-level) =============== */
function ChildItem({
  form,
  i,
  j,
  isLoading,
  remove,
  moveUp,
  moveDown,
}: {
  form: ReturnType<typeof useForm<NavigationForm>>;
  i: number;
  j: number;
  isLoading: boolean;
  remove: () => void;
  moveUp: () => void;
  moveDown: () => void;
}) {
  const id = form.watch(`navigations.${i}.children.${j}.id`) ?? `${i}-${j}`;
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index: j,
    disabled: isLoading,
  });

  const errors = form.formState.errors.navigations?.[i]?.children?.[j];

  return (
    <div
      ref={ref}
      className={cn(
        "flex cursor-default items-center justify-between gap-2 rounded border bg-muted p-2",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <div ref={handleRef} aria-label="Drag handle">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field data-invalid={!!errors?.title}>
            <FieldLabel>Title</FieldLabel>
            <Input
              className="dark:border-white/20"
              placeholder="e.g. Overview"
              disabled={isLoading}
              {...form.register(`navigations.${i}.children.${j}.title`)}
            />
            <FieldError errors={[errors?.title]} />
          </Field>

          <Field data-invalid={!!errors?.url}>
            <FieldLabel>URL</FieldLabel>
            <Input
              className="dark:border-white/20"
              placeholder="/overview"
              disabled={isLoading}
              {...form.register(`navigations.${i}.children.${j}.url`)}
            />
            <FieldError errors={[errors?.url]} />
          </Field>

          <Controller
            control={form.control}
            name={`navigations.${i}.children.${j}.external`}
            render={({ field }) => (
              <Field>
                <FieldLabel>External</FieldLabel>
                <div className="flex h-9 items-center">
                  <Switch
                    className="dark:bg-white/20"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </div>
              </Field>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 px-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-background dark:hover:bg-neutral-900"
            disabled={isLoading}
            onClick={moveUp}
          >
            <ArrowUpFromLine className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-background dark:hover:bg-neutral-900"
            onClick={moveDown}
            disabled={isLoading}
          >
            <ArrowDownFromLine className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-background dark:hover:bg-neutral-900"
            onClick={remove}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Order: {j}
        </div>
      </div>
    </div>
  );
}
