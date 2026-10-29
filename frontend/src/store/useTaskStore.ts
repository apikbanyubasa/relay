import { create } from "zustand";
import type { Department, Task } from "../types";

interface ConflictState {
  isOpen: boolean;
  message: string;
  taskTitle: string;
  onRefresh: () => void;
}

interface TaskState {
  searchTerm: string;
  departmentFilter: Department | "ALL";
  selectedTask: Task | null;
  isCreateModalOpen: boolean;
  conflictState: ConflictState;

  onlyMyTasks: boolean;
  setSearchTerm: (term: string) => void;
  setDepartmentFilter: (dep: Department | "ALL") => void;
  setOnlyMyTasks: (only: boolean) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  openConflictModal: (
    message: string,
    taskTitle: string,
    onRefresh: () => void,
  ) => void;
  closeConflictModal: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  searchTerm: "",
  departmentFilter: "ALL",
  onlyMyTasks: false,
  selectedTask: null,
  isCreateModalOpen: false,
  conflictState: {
    isOpen: false,
    message: "",
    taskTitle: "",
    onRefresh: () => {},
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setDepartmentFilter: (dep) => set({ departmentFilter: dep }),
  setOnlyMyTasks: (only) => set({ onlyMyTasks: only }),
  setSelectedTask: (task) => set({ selectedTask: task }),
  setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  openConflictModal: (message, taskTitle, onRefresh) =>
    set({
      conflictState: {
        isOpen: true,
        message,
        taskTitle,
        onRefresh,
      },
    }),
  closeConflictModal: () =>
    set((state) => ({
      conflictState: {
        ...state.conflictState,
        isOpen: false,
      },
    })),
}));
