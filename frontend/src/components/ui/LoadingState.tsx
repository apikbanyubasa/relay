export function LoadingCardSkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg animate-pulse space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-slate-800 rounded-md" />
        <div className="h-5 w-16 bg-slate-800 rounded-md" />
      </div>
      <div className="h-6 w-3/4 bg-slate-700/60 rounded-md" />
      <div className="h-4 w-full bg-slate-800/80 rounded-md" />
      <div className="h-4 w-2/3 bg-slate-800/80 rounded-md" />
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="h-6 w-28 bg-slate-800 rounded-md" />
        <div className="h-7 w-7 rounded-full bg-slate-800" />
      </div>
    </div>
  );
}

export function KanbanLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {[1, 2, 3, 4].map((col) => (
        <div
          key={col}
          className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="h-6 w-28 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-6 w-8 bg-slate-800 rounded-full animate-pulse" />
          </div>
          <LoadingCardSkeleton />
          <LoadingCardSkeleton />
        </div>
      ))}
    </div>
  );
}
