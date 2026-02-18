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
  jiraDomain?: string;
  jiraEmail?: string;
  jiraToken?: string;
  tgToken?: string;
  tgChatId?: string;
  slackToken?: string;
}

// ── LOADING STATE ─────────────────────────────────────────────────
export type LoadingState<T> = null | T; // null = loading, T = data
