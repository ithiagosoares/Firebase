
import { Suspense } from 'react';
import AppLayoutClient from './app-layout-client';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AppLayoutClient>{children}</AppLayoutClient>
    </Suspense>
  );
}
