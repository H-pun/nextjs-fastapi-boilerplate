"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime: 1000 * 60 * 5, // 5 minutes
        // gcTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 3,
      },
    },
  });

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
};

export default Provider;
