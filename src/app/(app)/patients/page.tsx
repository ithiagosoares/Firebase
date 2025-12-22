import { Suspense } from 'react';
import PatientsView from './patients-view';
import { Loader2 } from 'lucide-react';

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PatientsView />
    </Suspense>
  );
}
