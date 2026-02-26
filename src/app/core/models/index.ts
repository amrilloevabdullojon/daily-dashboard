// ── AUTH ──────────────────────────────────────────────────────────
export interface User {
  name: string;
  email: string;
  picture?: string;
}

// ── EMAIL / GMAIL ─────────────────────────────────────────────────
export interface Email {
  id: string;
  from: string;
  email: string;
  subject: string;
  snippet?: string;
  date: string;
  unread: boolean;
  starred: boolean;
  avatar?: string;
  avatarColor?: string;
}

// ── CALENDAR ─────────────────────────────────────────────────────
export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  attendeesCount?: number;
  color?: string;
  hangoutLink?: string;
}

export interface FocusSlot {
  start: number; // minutes from midnight
  end: number;
  duration: number;
}

// ── TASKS ─────────────────────────────────────────────────────────
export interface Task {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  due?: string;
  notes?: string;
  source?: 'tasks' | 'sheets'; // origin of the task
  rowIndex?: number;            // Google Sheets row (1-based), sheets source only
}

// ── JIRA ─────────────────────────────────────────────────────────
export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  project: string;
  projectKey: string;
  assignee?: string;
  reporter?: string;
  updated: string;
  type: string;
  url: string;
}

// ── SLACK ─────────────────────────────────────────────────────────
export type SlackMessageType = 'dm' | 'mention' | 'unread' | 'channel';

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  from?: string;
  avatar?: string;
  text: string;
  ts: string;
  type: SlackMessageType;
  unread?: boolean;
}

export interface SlackData {
  ok: true;
  workspace: string;
  dms: SlackMessage[];
  mentions: SlackMessage[];
  unreads: SlackMessage[];
  channels: SlackChannel[];
}

export interface SlackChannel {
  id: string;
  name: string;
  unread_count?: number;
}

export interface SlackError {
  ok: false;
  error: string;
}

// ── APP CONFIG ────────────────────────────────────────────────────
export interface AppConfig {
  // Non-sensitive fields stored in localStorage
  jiraDomain?:          string;
  jiraEmail?:           string;
  jiraProjectKey?:      string;
  tgChatId?:            string;
  sheetsSpreadsheetId?: string;
  workdayStart?:        number; // hour 0-23, default 9
  workdayEnd?:          number; // hour 0-23, default 18

  // Boolean flags (localStorage): true when token exists in httpOnly cookie
  jiraTokenSet?:        boolean;
  slackTokenSet?:       boolean;
  tgTokenSet?:          boolean;

  // Sensitive tokens — sent to API only, never stored in localStorage
  jiraToken?:           string;
  slackToken?:          string;
  tgToken?:             string;
}

// ── REMOTE DATA (three-state loading) ─────────────────────────────
export type RemoteData<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ok';    readonly data: T }
  | { readonly status: 'error'; readonly message: string };

export const remoteLoading: RemoteData<never> = { status: 'loading' };
export function remoteOk<T>(data: T): RemoteData<T>         { return { status: 'ok', data }; }
export function remoteError<T>(message: string): RemoteData<T> { return { status: 'error', message }; }
export function remoteData<T>(rd: RemoteData<T>): T | null  {
  return rd.status === 'ok' ? rd.data : null;
}

/** @deprecated Use RemoteData<T> for new code */
export type LoadingState<T> = null | T; // null = loading, T = data
