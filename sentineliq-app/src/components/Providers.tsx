"use client";

// Client boundary for app-wide providers + the global breach listener, so the
// root layout can stay a server component.
import { AuthProvider } from "@/lib/AuthContext";
import BreachWatcher from "@/components/BreachWatcher";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <BreachWatcher />
    </AuthProvider>
  );
}
