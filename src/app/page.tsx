export default function HomePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Pipeline Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your sales pipeline with AI-powered insights</p>
        </div>
      </div>
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">Kanban board loading...</p>
        <p className="text-sm mt-2">Pipeline data will appear here once connected to the database.</p>
      </div>
    </div>
  );
}
