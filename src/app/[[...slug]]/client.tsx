"use client";

import React from "react";
import dynamic from "next/dynamic";
import { StrictMode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router";
import { indexedDBStorage } from "@/data/IndexedDBStorage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";

const App = dynamic(() => import("../../App"), { ssr: false });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // keep 1 day
      staleTime: 1000 * 60 * 5, // fresh for 5 minutes
      retry: (failureCount) => onlineManager.isOnline() && failureCount < 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount) => onlineManager.isOnline() && failureCount < 3,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: indexedDBStorage,
});

export function ClientOnly() {
  return (
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 }}
      >
        <BrowserRouter>
          <ThemeProvider defaultTheme="system" storageKey="fina-ui-theme">
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </StrictMode>
  );
}
