# Complete Redux State Usage Guide

## 1. THEME STATE ✅
**Location**: `lib/slices/themeSlice.ts`
**Status**: Fully implemented

### State:
```typescript
{
  mode: 'light' | 'dark';
  // Persists to localStorage automatically
}
```

### Components Using It:
- [app/components/ui/ThemeToggle.tsx](../../app/components/ui/ThemeToggle.tsx) — Toggle dark/light mode
- [app/chatbot/page.tsx](../../app/chatbot/page.tsx#L1) — Display chatbot in correct theme
- [app/layout.tsx](../../app/layout.tsx) — Apply theme to document

### Usage:
```typescript
const { mode } = useTheme();
dispatch(toggleTheme());
```

---

## 2. UI STATE ✅
**Location**: `lib/slices/uiSlice.ts`
**Status**: Partially implemented

### Complete State Model:
```typescript
interface UIState {
  // ── MODALS (8 total) ──
  showAddInternModal: boolean;        // ✅ Used in interns page
  showAddTaskModal: boolean;          // 🔄 Ready for use
  showImportModal: boolean;           // ✅ Used in interns page
  showExportModal: boolean;           // ✅ Used in interns page
  showDeleteModal: boolean;           // 🔄 Ready for use
  showDetailModal: boolean;           // 🔄 Ready for use (intern detail)
  showTaskDetailModal: boolean;       // ✅ Used in TaskDashboard
  showProfileEditModal: boolean;      // ✅ Used in profile page

  // ── SIDEBAR ──
  sidebarOpen: boolean;               // 🔄 Created but not bound to UI

  // ── FILTERS ──
  internFilters: {                    // ✅ Used in interns page
    search: string;
    department: string;
    college: string;
    status: string;
  };
  
  taskFilters: {                      // ✅ Used in TaskDashboard
    search: string;
    priority: string;
    status: string;
    department: string;
  };

  // ── SELECTED ITEMS ──
  selectedInternId: string | null;    // 🔄 Available for detail view
  selectedTaskId: string | null;      // 🔄 Available for detail view
}
```

### Modal Actions:
```typescript
// ACTIVE USAGE
dispatch(openAddInternModal());           // Interns page
dispatch(closeAddInternModal());          // Interns page
dispatch(openImportModal());              // Interns page
dispatch(closeImportModal());             // Interns page
dispatch(openExportModal());              // Interns page
dispatch(closeExportModal());             // Interns page
dispatch(openTaskDetailModal());          // TaskDashboard
dispatch(closeTaskDetailModal());         // TaskDashboard
dispatch(openProfileEditModal());         // Profile page
dispatch(closeProfileEditModal());        // Profile page

// READY FOR IMPLEMENTATION
dispatch(openAddTaskModal());             // For task creation
dispatch(closeAddTaskModal());            // For task creation
dispatch(openDeleteModal());              // For delete confirmation
dispatch(closeDeleteModal());             // For delete confirmation
dispatch(openDetailModal(internId));      // For intern detail view
dispatch(closeDetailModal());             // For intern detail view
```

### Filter Actions:
```typescript
dispatch(setInternFilters({ search: 'john' }));
dispatch(setInternFilters({ department: 'AI' }));
dispatch(setInternFilters({ status: 'active' }));
dispatch(clearInternFilters());

dispatch(setTaskFilters({ priority: 'high' }));
dispatch(setTaskFilters({ status: 'pending' }));
dispatch(clearTaskFilters());
```

### Sidebar Usage:
```typescript
const { sidebarOpen } = useUI();
dispatch(toggleSidebar());        // Toggle open/closed
dispatch(setSidebarOpen(true));   // Explicitly set state
```

### Selected Items:
```typescript
const { selectedInternId, selectedTaskId } = useUI();
dispatch(openDetailModal(internId));  // Uses internId in logic
// In reducer, could set selectedInternId for detail view
```

---

## 3. NOTIFICATIONS STATE 🔄
**Location**: `lib/slices/notificationSlice.ts`
**Status**: Created but NOT YET INTEGRATED

### State Model:
```typescript
interface NotificationState {
  items: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;  // ms before auto-dismiss
}
```

### Usage Pattern (Ready to implement):
```typescript
const dispatch = useAppDispatch();

// Show success toast
dispatch(addNotification({
  type: 'success',
  message: 'Intern added successfully!',
  duration: 4000,
}));

// Show error toast
dispatch(addNotification({
  type: 'error',
  message: 'Failed to add intern',
  duration: 5000,
}));

// Clear all
dispatch(clearNotifications());
```

### Where to Integrate:
1. **app/interns/page.tsx** — Show toast on intern add/delete
2. **app/interns/add/page.tsx** — Show toast on successful submission
3. **app/dashboard/TaskDashboard.tsx** — Show toast on task actions
4. **app/profile/page.tsx** — Show toast on profile update
5. Create **app/components/NotificationCenter.tsx** — Display all active notifications

---

## 4. CHATBOT STATE ✅
**Location**: `lib/slices/chatbotSlice.ts`
**Status**: Partially implemented

### State Model:
```typescript
interface ChatbotState {
  messages: SerializableChatMessage[];  // ✅ Used in chatbot page
  inputValue: string;                   // ✅ Used in chatbot page
  isLoading: boolean;                   // ✅ Used in chatbot page
  isOpen: boolean;                      // 🔄 Created but not used in widget
}
```

### Current Usage (chatbot/page.tsx):
```typescript
const { messages, inputValue, isLoading } = useChatbotState();
dispatch(addMessage(message));
dispatch(setInputValue(value));
dispatch(setIsLoading(true/false));
```

### Ready for Implementation:
```typescript
const { isOpen } = useChatbotState();
dispatch(toggleChat());      // Toggle widget visibility
dispatch(setIsOpen(true));   // Show chatbot
dispatch(setIsOpen(false));  // Hide chatbot
```

### Where to Use isOpen:
- **app/components/ChatbotWidget.tsx** — Float widget in corner
- Conditionally render based on `isOpen` state
- Button to toggle opens/closes widget

---

## COMPREHENSIVE REDUX STATE MAP

```
Redux Store
├── theme
│   └── mode: 'light' | 'dark'                    ✅ FULLY USED
│
├── ui
│   ├── Modal States (8 flags)                    ✅ 5 USED / 🔄 3 READY
│   ├── sidebarOpen: boolean                      🔄 READY
│   ├── internFilters: {...}                      ✅ USED
│   ├── taskFilters: {...}                        ✅ USED
│   ├── selectedInternId: string | null           🔄 READY
│   └── selectedTaskId: string | null             🔄 READY
│
├── notifications
│   └── items: Notification[]                     🔄 READY
│
└── chatbot
    ├── messages: SerializableChatMessage[]       ✅ USED
    ├── inputValue: string                        ✅ USED
    ├── isLoading: boolean                        ✅ USED
    └── isOpen: boolean                           🔄 READY
```

---

## NEXT STEPS TO USE ALL REDUX STATE

### Priority 1: Notifications (High Impact)
- [ ] Create `app/components/NotificationCenter.tsx`
- [ ] Integrate into `app/layout.tsx`
- [ ] Replace all `setToast()` calls with Redux dispatch
- [ ] Updates needed in: interns page, profile page, task dashboard

### Priority 2: Sidebar Integration
- [ ] Bind sidebar toggle button to Redux `toggleSidebar()`
- [ ] Use Redux `sidebarOpen` to control sidebar collapse/expand
- [ ] Updates: app/components/Sidebar.tsx

### Priority 3: Chatbot Widget
- [ ] Create floating `app/components/ChatbotWidget.tsx`
- [ ] Use Redux `isOpen` to control visibility
- [ ] Add button to toggle `setIsOpen()`

### Priority 4: Detail Views
- [ ] Implement intern detail view using `selectedInternId`
- [ ] Implement task detail view using `selectedTaskId`
- [ ] Use modals: `showDetailModal`, `showTaskDetailModal`

---

## IMPLEMENTATION CHECKLIST

```
THEME STATE
✅ ThemeToggle component
✅ ThemeInitializer hydration
✅ useTheme() hook throughout app
✅ Document theme persistence

UI STATE - MODALS
✅ showAddInternModal - interns/page.tsx, add/page.tsx
✅ showImportModal - interns/page.tsx
✅ showExportModal - interns/page.tsx
✅ showTaskDetailModal - TaskDashboard.tsx
✅ showProfileEditModal - profile/page.tsx
🔄 showDetailModal - Ready for intern detail view
🔄 showAddTaskModal - Ready for task creation
🔄 showDeleteModal - Ready for delete confirmation

UI STATE - FILTERS
✅ internFilters - interns/page.tsx, InternsView.tsx
✅ taskFilters - TaskDashboard.tsx

UI STATE - LAYOUT
🔄 sidebarOpen - Integrate with Sidebar.tsx
🔄 selectedInternId - Integrate with detail view
🔄 selectedTaskId - Integrate with detail view

NOTIFICATIONS STATE
🔄 notificationSlice created
🔄 Create NotificationCenter component
🔄 Replace useState toast calls with Redux dispatch
🔄 Integrate into app/layout.tsx

CHATBOT STATE
✅ chatbotSlice created
✅ messages, inputValue, isLoading used in page.tsx
🔄 isOpen - Create floating widget
🔄 toggleChat() - Add to Navbar or floating button
```

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Notifications** (Biggest user experience impact)
2. **Sidebar** (Immediate visual feedback)
3. **Chatbot Widget** (New feature integrating existing state)
4. **Detail Views** (selectedInternId/selectedTaskId)
5. **Remaining Modals** (showDeleteModal, showAddTaskModal)
