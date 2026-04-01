import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Modal states
  showAddInternModal: boolean;
  showAddTaskModal: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  showDeleteModal: boolean;
  showDetailModal: boolean;
  showTaskDetailModal: boolean;
  showProfileEditModal: boolean;

  // Sidebar/Navigation
  sidebarOpen: boolean;

  // Page filters
  internFilters: {
    search: string;
    department: string;
    college: string;
    status: string;
  };

  taskFilters: {
    search: string;
    priority: string;
    status: string;
    department: string;
  };

  // Selected items
  selectedInternId: string | null;
  selectedTaskId: string | null;
}

const initialState: UIState = {
  showAddInternModal: false,
  showAddTaskModal: false,
  showImportModal: false,
  showExportModal: false,
  showDeleteModal: false,
  showDetailModal: false,
  showTaskDetailModal: false,
  showProfileEditModal: false,
  sidebarOpen: true,
  internFilters: { search: '', department: '', college: '', status: '' },
  taskFilters: { search: '', priority: '', status: '', department: '' },
  selectedInternId: null,
  selectedTaskId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modals
    openAddInternModal: (state) => {
      state.showAddInternModal = true;
    },
    closeAddInternModal: (state) => {
      state.showAddInternModal = false;
    },
    openAddTaskModal: (state) => {
      state.showAddTaskModal = true;
    },
    closeAddTaskModal: (state) => {
      state.showAddTaskModal = false;
    },
    openImportModal: (state) => {
      state.showImportModal = true;
    },
    closeImportModal: (state) => {
      state.showImportModal = false;
    },
    openExportModal: (state) => {
      state.showExportModal = true;
    },
    closeExportModal: (state) => {
      state.showExportModal = false;
    },
    openDeleteModal: (state) => {
      state.showDeleteModal = true;
    },
    closeDeleteModal: (state) => {
      state.showDeleteModal = false;
    },
    openDetailModal: (state, action: PayloadAction<string>) => {
      state.showDetailModal = true;
      state.selectedInternId = action.payload;
    },
    closeDetailModal: (state) => {
      state.showDetailModal = false;
    },
    openTaskDetailModal: (state) => {
      state.showTaskDetailModal = true;
    },
    closeTaskDetailModal: (state) => {
      state.showTaskDetailModal = false;
    },
    openProfileEditModal: (state) => {
      state.showProfileEditModal = true;
    },
    closeProfileEditModal: (state) => {
      state.showProfileEditModal = false;
    },

    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Intern filters
    setInternFilters: (state, action: PayloadAction<Partial<UIState['internFilters']>>) => {
      state.internFilters = { ...state.internFilters, ...action.payload };
    },
    clearInternFilters: (state) => {
      state.internFilters = initialState.internFilters;
    },

    // Task filters
    setTaskFilters: (state, action: PayloadAction<Partial<UIState['taskFilters']>>) => {
      state.taskFilters = { ...state.taskFilters, ...action.payload };
    },
    clearTaskFilters: (state) => {
      state.taskFilters = initialState.taskFilters;
    },

    // Reset all UI state on logout
    resetUIState: () => initialState,
  },
});

export const {
  openAddInternModal,
  closeAddInternModal,
  openAddTaskModal,
  closeAddTaskModal,
  openImportModal,
  closeImportModal,
  openExportModal,
  closeExportModal,
  openDeleteModal,
  closeDeleteModal,
  openDetailModal,
  closeDetailModal,
  openTaskDetailModal,
  closeTaskDetailModal,
  openProfileEditModal,
  closeProfileEditModal,
  toggleSidebar,
  setSidebarOpen,
  setInternFilters,
  clearInternFilters,
  setTaskFilters,
  clearTaskFilters,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;
