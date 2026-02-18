import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  User, Email, CalEvent, Task,
  JiraIssue, SlackData, SlackError, LoadingState
} from '../models';

export interface AppState {
  currentUser: User | null;
  gmailMessages: LoadingState<Email[]>;
  calEvents: LoadingState<CalEvent[]>;
  realTasks: LoadingState<Task[]>;
  jiraIssues: LoadingState<JiraIssue[]>;
  slackData: LoadingState<SlackData | SlackError | {}>;
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
  jiraIssues:    null,
  slackData:     null,
  currentDate:   new Date(),
  isLight:       false,
  lastSync:      null,
  syncing:       false,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
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
    setTasks(tasks: Task[]) {
      patchState(store, { realTasks: tasks });
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
