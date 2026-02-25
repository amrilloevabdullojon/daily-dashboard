import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  User, Email, CalEvent, Task,
  JiraIssue, SlackData, SlackError, LoadingState
} from '../models';

export type DataKey = 'gmail' | 'calendar' | 'tasks' | 'sheets' | 'jira' | 'slack';

export interface AppState {
  currentUser: User | null;
  gmailMessages: LoadingState<Email[]>;
  calEvents: LoadingState<CalEvent[]>;
  realTasks: LoadingState<Task[]>;
  sheetTasks: LoadingState<Task[]>;
  jiraIssues: LoadingState<JiraIssue[]>;
  slackData: LoadingState<SlackData | SlackError | {}>;
  dataErrors: Partial<Record<DataKey, string>>;
  currentDate: Date;
  isLight: boolean;
  lastSync: Date | null;
  syncing: boolean;
}

const initialState: AppState = {
  currentUser:   null,
  gmailMessages: null,
  calEvents:     null,
  realTasks:     null,
  sheetTasks:    null,
  jiraIssues:    null,
  slackData:     null,
  dataErrors:    {},
  currentDate:   new Date(),
  isLight:       false,
  lastSync:      null,
  syncing:       false,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    unreadEmailCount: computed(() => {
      const msgs = store.gmailMessages();
      return Array.isArray(msgs) ? msgs.filter((m: Email) => m.unread).length : 0;
    }),
    activeTaskCount: computed(() => {
      const tasks = store.realTasks();
      return Array.isArray(tasks) ? tasks.filter((t: Task) => !t.done).length : 0;
    }),
    activeJiraCount: computed(() => {
      const issues = store.jiraIssues();
      if (!Array.isArray(issues)) return 0;
      return issues.filter((i: JiraIssue) => {
        const s = i.status?.toLowerCase() || '';
        return s.includes('progress') || s.includes('review');
      }).length;
    }),
    slackUnreadCount: computed(() => {
      const data = store.slackData() as any;
      if (!data?.ok) return 0;
      return (data.unreads?.length || 0) + (data.mentions?.length || 0);
    }),
    upcomingEventCount: computed(() => {
      const events = store.calEvents();
      if (!Array.isArray(events)) return 0;
      const now = new Date();
      return events.filter((e: CalEvent) => !e.allDay && new Date(e.start) > now).length;
    }),
  })),
  withMethods((store) => ({
    // ── USER ──────────────────────────────────────────────────────
    setUser(user: User | null) {
      patchState(store, { currentUser: user });
    },

    // ── DATA SETTERS ──────────────────────────────────────────────
    setEmails(msgs: Email[]) {
      patchState(store, { gmailMessages: msgs });
    },
    setCalEvents(events: CalEvent[]) {
      patchState(store, { calEvents: events });
    },
    resetCalEvents() {
      patchState(store, { calEvents: null });
    },
    setTasks(tasks: Task[]) {
      patchState(store, { realTasks: tasks });
    },
    setSheetTasks(tasks: Task[]) {
      patchState(store, { sheetTasks: tasks });
    },
    resetSheetTasks() {
      patchState(store, { sheetTasks: null });
    },
    toggleSheetTaskOptimistic(taskId: string) {
      const tasks = store.sheetTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, {
        sheetTasks: tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      });
    },
    addSheetTask(task: Task) {
      const tasks = store.sheetTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, { sheetTasks: [...tasks, task] });
    },
    setJiraIssues(issues: JiraIssue[]) {
      patchState(store, { jiraIssues: issues });
    },
    setSlackData(data: SlackData | SlackError | {}) {
      patchState(store, { slackData: data });
    },

    // ── OPTIMISTIC EMAIL UPDATES ──────────────────────────────────
    markEmailRead(id: string) {
      const msgs = store.gmailMessages();
      if (!Array.isArray(msgs)) return;
      patchState(store, {
        gmailMessages: msgs.map(m => m.id === id ? { ...m, unread: false } : m)
      });
    },
    removeEmail(id: string) {
      const msgs = store.gmailMessages();
      if (!Array.isArray(msgs)) return;
      patchState(store, {
        gmailMessages: msgs.filter(m => m.id !== id)
      });
    },

    // ── ERROR TRACKING ────────────────────────────────────────────
    setDataError(key: DataKey, msg: string) {
      patchState(store, { dataErrors: { ...store.dataErrors(), [key]: msg } });
    },
    clearDataError(key: DataKey) {
      const errs = { ...store.dataErrors() };
      delete errs[key];
      patchState(store, { dataErrors: errs });
    },

    // ── OPTIMISTIC TASK UPDATES ───────────────────────────────────
    toggleTaskOptimistic(taskId: string) {
      const tasks = store.realTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, {
        realTasks: tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      });
    },
    addTask(task: Task) {
      const tasks = store.realTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, { realTasks: [task, ...tasks] });
    },
    removeTask(taskId: string) {
      const tasks = store.realTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, { realTasks: tasks.filter(t => t.id !== taskId) });
    },
    removeSheetTask(taskId: string) {
      const tasks = store.sheetTasks();
      if (!Array.isArray(tasks)) return;
      patchState(store, { sheetTasks: tasks.filter(t => t.id !== taskId) });
    },

    // ── DATE NAV ──────────────────────────────────────────────────
    setDate(date: Date) {
      patchState(store, { currentDate: date });
    },
    shiftDate(days: number) {
      const d = new Date(store.currentDate());
      d.setDate(d.getDate() + days);
      patchState(store, { currentDate: d });
    },

    // ── THEME ─────────────────────────────────────────────────────
    toggleTheme() {
      const isLight = !store.isLight();
      patchState(store, { isLight });
      document.body.classList.toggle('light', isLight);
      localStorage.setItem('drTheme', isLight ? 'light' : 'dark');
    },

    // ── SYNC STATE ────────────────────────────────────────────────
    setSyncing(syncing: boolean) {
      patchState(store, { syncing });
    },
    setSynced() {
      patchState(store, { syncing: false, lastSync: new Date() });
    },
  }))
);
