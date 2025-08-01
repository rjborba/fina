import { onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import "./index.css";
import { indexedDBStorage } from "@/data/IndexedDBStorage";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // keep 1 day
      staleTime: 1, // fresh for 5 minutes
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

createRoot(document.getElementById("root")!).render(
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
