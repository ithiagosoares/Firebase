
import { Suspense } from 'react';
import CalendarView from './calendar-view';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CalendarView />
    </Suspense>
  );
}
