import { Suspense } from 'react';
import { TaskDashboard } from '@/app/dashboard/TaskDashboard';

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TaskDashboard />
    </Suspense>
  );
}
