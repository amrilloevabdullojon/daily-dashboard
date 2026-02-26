import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import {
  User, Email, CalEvent, Task,
  JiraIssue, SlackData, SlackError,
  RemoteData, remoteLoading, remoteOk,
} from '../models';

export type DataKey = 'gmail' | 'calendar' | 'tasks' | 'sheets' | 'jira' | 'slack';

export interface AppState {
  currentUser:   User | null;
  gmailMessages: RemoteData<Email[]>;
  calEvents:     RemoteData<CalEvent[]>;
  realTasks:     RemoteData<Task[]>;
  sheetTasks:    RemoteData<Task[]>;
  jiraIssues:    RemoteData<JiraIssue[]>;
  slackData:     RemoteData<SlackData | SlackError | {}>;
  dataErrors:    Partial<Record<DataKey, string>>;
  currentDate:   Date;
  isLight:       boolean;
  lastSync:      Date | null;
  syncing:       boolean;
}

const initialState: AppState = {
  currentUser:   null,
  gmailMessages: remoteLoading,
  calEvents:     remoteLoading,
  realTasks:     remoteLoading,
  sheetTasks:    remoteLoading,
  jiraIssues:    remoteLoading,
  slackData:     remoteLoading,
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
      const rd = store.gmailMessages();
      return rd.status === 'ok' ? rd.data.filter((m: Email) => m.unread).length : 0;
    }),
    activeTaskCount: computed(() => {
      const rd = store.realTasks();
      return rd.status === 'ok' ? rd.data.filter((t: Task) => !t.done).length : 0;
    }),
    activeJiraCount: computed(() => {
      const rd = store.jiraIssues();
      if (rd.status !== 'ok') return 0;
      return rd.data.filter((i: JiraIssue) => {
        const s = i.status?.toLowerCase() || '';
        return s.includes('progress') || s.includes('review');
      }).length;
    }),
    slackUnreadCount: computed(() => {
      const rd = store.slackData();
      if (rd.status !== 'ok') return 0;
      const data = rd.data as any;
      if (!data?.ok) return 0;
      return (data.unreads?.length || 0) + (data.mentions?.length || 0);
    }),
    upcomingEventCount: computed(() => {
      const rd = store.calEvents();
      if (rd.status !== 'ok') return 0;
      const now = new Date();
      return rd.data.filter((e: CalEvent) => !e.allDay && new Date(e.start) > now).length;
    }),
    /** Per-service status: 'loading' | 'ok' | 'error' */
    integrationStatuses: computed((): Record<DataKey, 'loading' | 'ok' | 'error'> => {
      const errors = store.dataErrors();
      const status = (key: DataKey, rd: RemoteData<unknown>): 'loading' | 'ok' | 'error' => {
        if (errors[key]) return 'error';
        if (rd.status === 'loading') return 'loading';
        if (rd.status === 'error')   return 'error';
        return 'ok';
      };
      return {
        gmail:    status('gmail',    store.gmailMessages()),
        calendar: status('calendar', store.calEvents()),
        tasks:    status('tasks',    store.realTasks()),
        sheets:   status('sheets',   store.sheetTasks()),
        jira:     status('jira',     store.jiraIssues()),
        slack:    status('slack',    store.slackData()),
      };
    }),
  })),
  withMethods((store) => ({
    // ── USER ──────────────────────────────────────────────────────
    setUser(user: User | null) {
      patchState(store, { currentUser: user });
    },

    // ── DATA SETTERS (accept plain arrays, wrap internally) ───────
    setEmails(msgs: Email[]) {
      patchState(store, { gmailMessages: remoteOk(msgs) });
    },
    setCalEvents(events: CalEvent[]) {
      patchState(store, { calEvents: remoteOk(events) });
    },
    resetCalEvents() {
      patchState(store, { calEvents: remoteLoading });
    },
    setTasks(tasks: Task[]) {
      patchState(store, { realTasks: remoteOk(tasks) });
    },
    setSheetTasks(tasks: Task[]) {
      patchState(store, { sheetTasks: remoteOk(tasks) });
    },
    resetSheetTasks() {
      patchState(store, { sheetTasks: remoteLoading });
    },
    toggleSheetTaskOptimistic(taskId: string) {
      const rd = store.sheetTasks();
      if (rd.status !== 'ok') return;
      patchState(store, {
        sheetTasks: remoteOk(rd.data.map(t => t.id === taskId ? { ...t, done: !t.done } : t))
      });
    },
    addSheetTask(task: Task) {
      const rd = store.sheetTasks();
      if (rd.status !== 'ok') return;
      patchState(store, { sheetTasks: remoteOk([...rd.data, task]) });
    },
    setJiraIssues(issues: JiraIssue[]) {
      patchState(store, { jiraIssues: remoteOk(issues) });
    },
    appendJiraIssues(issues: JiraIssue[]) {
      const rd = store.jiraIssues();
      const existing = rd.status === 'ok' ? rd.data : [];
      patchState(store, { jiraIssues: remoteOk([...existing, ...issues]) });
    },
    setSlackData(data: SlackData | SlackError | {}) {
      patchState(store, { slackData: remoteOk(data) });
    },

    // ── OPTIMISTIC EMAIL UPDATES ──────────────────────────────────
    markEmailRead(id: string) {
      const rd = store.gmailMessages();
      if (rd.status !== 'ok') return;
      patchState(store, {
        gmailMessages: remoteOk(rd.data.map(m => m.id === id ? { ...m, unread: false } : m))
      });
    },
    removeEmail(id: string) {
      const rd = store.gmailMessages();
      if (rd.status !== 'ok') return;
      patchState(store, {
        gmailMessages: remoteOk(rd.data.filter(m => m.id !== id))
      });
    },
    appendEmails(msgs: Email[], nextPageToken: string | null) {
      const rd = store.gmailMessages();
      const existing = rd.status === 'ok' ? rd.data : [];
      patchState(store, {
        gmailMessages: remoteOk([...existing, ...msgs]),
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
      const rd = store.realTasks();
      if (rd.status !== 'ok') return;
      patchState(store, {
        realTasks: remoteOk(rd.data.map(t => t.id === taskId ? { ...t, done: !t.done } : t))
      });
    },
    addTask(task: Task) {
      const rd = store.realTasks();
      if (rd.status !== 'ok') return;
      patchState(store, { realTasks: remoteOk([task, ...rd.data]) });
    },
    removeTask(taskId: string) {
      const rd = store.realTasks();
      if (rd.status !== 'ok') return;
      patchState(store, { realTasks: remoteOk(rd.data.filter(t => t.id !== taskId)) });
    },
    removeSheetTask(taskId: string) {
      const rd = store.sheetTasks();
      if (rd.status !== 'ok') return;
      patchState(store, { sheetTasks: remoteOk(rd.data.filter(t => t.id !== taskId)) });
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
