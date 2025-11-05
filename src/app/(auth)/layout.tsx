
import { FirebaseClientProvider } from "@/firebase";
import Icon from "@/app/icon";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </main>
    </FirebaseClientProvider>
  );
}
