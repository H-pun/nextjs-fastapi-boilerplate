"use client";

import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function Page() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const token = session?.user?.accessToken;

  useEffect(() => {
    const html = document.documentElement.classList;
    html.toggle("dark-mode", resolvedTheme === "dark");

    // Cleanup function to remove the class when the component unmounts (page changes)
    return () => {
      html.remove("dark-mode");
    }
  }, [resolvedTheme])

  const { data, isFetching } = useQuery({
    queryKey: ["openapi"],
    queryFn: async () => {
      const res = await fetch(
        "/api/openapi.json",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        delete data.components?.securitySchemes;
        return data;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!token,
  });

  if (isFetching)
    return (
      <div className="mx-auto my-auto">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading API docs…</p>
        </div>
      </div>
    );

  return (
    <SwaggerUI
      filter
      spec={data}
      docExpansion="none"
      displayRequestDuration
      requestInterceptor={async (request) => {
        request.headers["Authorization"] = `Bearer ${token}`;
        return request;
      }}
    />
  );
}