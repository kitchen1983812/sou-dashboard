export type GA4Period = "7d" | "30d" | "90d" | "fy";

export interface GA4ChannelRow {
  channel: string;
  sessions: number;
  users: number;
  keyEvents: number;
}

export interface GA4DayRow {
  date: string; // YYYYMMDD
  sessions: number;
  keyEvents: number;
}

export interface GA4DeviceRow {
  device: string;
  sessions: number;
}

export interface GA4Summary {
  sessions: number;
  users: number;
  keyEvents: number;
  prevSessions: number;
  prevUsers: number;
  prevKeyEvents: number;
}

export interface GA4Data {
  summary: GA4Summary;
  channels: GA4ChannelRow[];
  daily: GA4DayRow[];
  devices: GA4DeviceRow[];
}
