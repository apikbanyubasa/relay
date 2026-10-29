"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { RefreshCw, ShieldAlert, X } from "lucide-react";
import { useTaskStore } from "../../store/useTaskStore";

export function ConflictModal() {
  const { conflictState, closeConflictModal } = useTaskStore();

  return (
    <Dialog.Root
      open={conflictState.isOpen}
      onOpenChange={(open) => !open && closeConflictModal()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content className="pointer-events-auto relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 space-y-5 animate-in zoom-in-95 duration-200">
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full mb-1">
                  HTTP 409 Conflict Detected
                </span>
                <Dialog.Title className="text-lg font-bold text-slate-100">
                  Concurrency Conflict (Optimistic Lock)
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-300 mt-2 leading-relaxed">
                  {conflictState.message ||
                    `The task "${conflictState.taskTitle}" was modified concurrently by another team member while you were preparing changes. To prevent data overwrites, your mutation was safely rejected.`}
                </Dialog.Description>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">
                Enterprise Concurrency Protection:
              </div>
              <div>
                • Database versioning verified via{" "}
                <code className="text-cyan-400">Task.version</code>
              </div>
              <div>• Data collision prevented without loss of updates</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => {
                  conflictState.onRefresh();
                  closeConflictModal();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all duration-200 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Latest State
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
