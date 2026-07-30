import { clsx, type ClassValue } from "clsx";
import {
  // merge,
  camelCase,
  snakeCase,
} from "lodash";
import { twMerge } from "tailwind-merge";
// import z from "zod";
import { addDays, format, startOfWeek } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fungsi untuk mengubah snake_case ke camelCase
export function convertKeysToCamelCase(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => convertKeysToCamelCase(item));
  } else if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        camelCase(key),
        convertKeysToCamelCase(value), // Rekursif untuk nested objects dan array
      ])
    );
  }
  return data;
}

// Fungsi untuk mengubah camelCase ke snake_case
export function convertKeysToSnakeCase(data: unknown): unknown {
  if (data instanceof FormData) {
    const fd = new FormData();
    data.forEach((value, key) => {
      fd.append(snakeCase(key).replace(/_(\d)/g, "$1"), value);
    });
    return fd;
  } else if (Array.isArray(data)) {
    return data.map((item) => convertKeysToSnakeCase(item));
  } else if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        snakeCase(key).replace(/_(\d)/g, "$1"),
        convertKeysToSnakeCase(value), // Rekursif untuk nested objects dan array
      ])
    );
  }
  return data;
}

export function getInitials(name?: string): string {
  return (
    name
      ?.trim()
      .split(" ")
      .slice(0, 2) // ambil 2 kata pertama
      .map((word) => word[0])
      .join("")
      .toUpperCase() ?? "?"
  );
}

export function renderBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)}${units[unitIndex]}`
}

export function intToDayName(day: number): string {
  if (day < 1 || day > 7 || Number.isNaN(day)) {
    return String(day);
  }
  const base = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday as start
  return format(addDays(base, day - 1), "EEEE"); // full day name, e.g. "Monday"
}

// export function createDefaultValues<T extends z.ZodRawShape>(
//   schema: z.ZodObject<T>,
//   overrides: Partial<z.infer<z.ZodObject<T>>> = {}
// ): z.infer<z.ZodObject<T>> {
//   const shape = schema.shape;
//   const defaults = {} as Record<keyof T, unknown>;

//   for (const key in shape) {
//     let field = shape[key];
//     let isNullable = false;
//     let isOptional = false;

//     // Handle default()
//     if (field instanceof z.ZodDefault) {
//       defaults[key] = field._def.defaultValue();
//       field = field._def.innerType;
//     }

//     // Unwrap nullable, optional, effects
//     let unwrapped: z.ZodTypeAny = field;
//     while (
//       unwrapped instanceof z.ZodNullable ||
//       unwrapped instanceof z.ZodOptional ||
//       unwrapped instanceof z.ZodEffects
//     ) {
//       if (unwrapped instanceof z.ZodNullable) {
//         isNullable = true;
//         unwrapped = unwrapped._def.innerType;
//       } else if (unwrapped instanceof z.ZodOptional) {
//         isOptional = true;
//         unwrapped = unwrapped._def.innerType;
//       } else if (unwrapped instanceof z.ZodEffects) {
//         unwrapped = unwrapped._def.schema;
//       }
//     }

//     // Set default null untuk nullable/optional
//     if (isNullable || isOptional) {
//       defaults[key] = null;
//       continue;
//     }

//     // Isi default sesuai tipe
//     if (unwrapped instanceof z.ZodString) {
//       defaults[key] = "";
//     } else if (unwrapped instanceof z.ZodNumber) {
//       defaults[key] = 0;
//     } else if (unwrapped instanceof z.ZodBoolean) {
//       defaults[key] = false;
//     } else if (unwrapped instanceof z.ZodDate) {
//       defaults[key] = new Date();
//     } else if (unwrapped instanceof z.ZodArray) {
//       defaults[key] = [];
//     } else if (unwrapped instanceof z.ZodEnum) {
//       defaults[key] = unwrapped._def.values[0];
//     } else if (unwrapped instanceof z.ZodObject) {
//       defaults[key] = createDefaultValues(unwrapped);
//     } else {
//       defaults[key] = null;
//     }
//   }

//   return merge(defaults, overrides) as z.infer<z.ZodObject<T>>;
// }
