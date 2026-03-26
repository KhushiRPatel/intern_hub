export function StatCard({
    label, value, color, icon,
}: {
    label: string; value: number | string; color: string; icon: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
            </div>
        </div>
    );
}
