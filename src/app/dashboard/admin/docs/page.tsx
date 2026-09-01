import { redirect } from "next/navigation";

/**
 * FastAPI already serves Swagger UI in development. Redirecting there avoids
 * shipping a second Swagger renderer and its large, React-18-only dependency
 * tree in the frontend bundle.
 */
export default function Page() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is required to open the API docs");
  }

  redirect(`${backendUrl.replace(/\/$/, "")}/docs`);
}
