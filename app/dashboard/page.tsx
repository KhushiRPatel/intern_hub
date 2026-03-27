'use client';
import { useNavigation } from '@/app/context/NavigationContext';
import { DashboardView } from './DashboardView';
import { InternsView } from './InternsView';
import { AddInternView } from './AddInternView';
import { AddDeptPersonView } from './AddDeptPersonView';
import { TaskDashboard } from './TaskDashboard';

export default function DashboardPage() {
    const { currentView } = useNavigation();

    return (
        <>
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'interns' && <InternsView />}
            {currentView === 'add-intern' && <AddInternView />}
            {currentView === 'add-dept-person' && <AddDeptPersonView />}
            {currentView === 'tasks' && <TaskDashboard />}
        </>
    ); 
}