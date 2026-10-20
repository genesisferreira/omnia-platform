/**
 * DTOs estáveis do Omnia LMS — independentes do schema bruto do Moodle.
 * Frontend e BFF devem depender destes tipos, nunca do payload Moodle.
 */

export type LmsLinkStatus = 'active' | 'inactive' | 'pending' | 'error';
export type LmsSyncStatus = 'synced' | 'stale' | 'error' | 'never';

export type LmsProfileRole = 'student' | 'teacher' | 'manager' | 'admin';

export type LmsUser = {
  moodleUserId: number;
  username: string;
  fullName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type LmsCourse = {
  moodleCourseId: number;
  shortName: string;
  fullName: string;
  displayName: string;
  summary: string | null;
  categoryId: number | null;
  startDate: string | null;
  endDate: string | null;
  visible: boolean;
  format: string | null;
};

export type LmsEnrollment = {
  moodleCourseId: number;
  moodleUserId: number;
  role: string | null;
  enrolledAt: string | null;
  course: LmsCourse | null;
};

export type LmsActivity = {
  moodleActivityId: number;
  name: string;
  modName: string;
  instanceId: number | null;
  visible: boolean;
  url: string | null;
  completionEnabled: boolean;
};

export type LmsCourseSection = {
  sectionId: number;
  name: string;
  summary: string | null;
  visible: boolean;
  activities: LmsActivity[];
};

export type LmsProgress = {
  moodleCourseId: number;
  moodleUserId: number;
  activities: Array<{
    moodleActivityId: number;
    state: number;
    timeCompleted: string | null;
  }>;
};

export type LmsCompletion = {
  moodleCourseId: number;
  moodleUserId: number;
  completed: boolean;
  timeCompleted: string | null;
  aggregation: string | null;
};

export type LmsGrade = {
  moodleCourseId: number;
  moodleUserId: number;
  moodleActivityId: number | null;
  itemName: string;
  gradeFormatted: string | null;
  gradeRaw: number | null;
  gradeMax: number | null;
  percentage: number | null;
};

export type LmsIdentityLink = {
  omniaUserId: string;
  moodleUserId: number;
  moodleUsername: string | null;
  status: LmsLinkStatus;
  linkedAt: string | null;
  lastSyncedAt: string | null;
  syncStatus: LmsSyncStatus;
};

export type LmsNotLinked = {
  connected: false;
  reason: 'MOODLE_IDENTITY_NOT_LINKED';
};

export type LmsConnectedUser = {
  connected: true;
  identity: LmsIdentityLink;
  user: LmsUser;
};

export type LmsConnectorHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
  /** Versão da plataforma / connector (sem secrets). */
  version: string | null;
  readOnly: boolean;
  connector: {
    enabled: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
  };
  moodle: {
    reachable: boolean;
    authenticated: boolean;
    version: string | null;
    latencyMs: number | null;
    serviceName: string | null;
  };
  redis: {
    reachable: boolean;
    latencyMs: number | null;
  };
  database: {
    reachable: boolean;
    latencyMs: number | null;
  };
  identity: {
    engine: 'ok' | 'degraded';
    /** Contagem agregada — nunca IDs. */
    activeLinks: number | null;
  };
  cache: {
    reachable: boolean;
    hitRate: number | null;
  };
  sessions: {
    storeReachable: boolean;
    activeApprox: number | null;
  };
  policies: {
    engine: 'ok';
  };
  latency: {
    moodleMs: number | null;
    redisMs: number | null;
    totalMs: number | null;
  };
  /** @deprecated Preferir `sessions.storeReachable` — mantido por compatibilidade. */
  sessionStore: {
    reachable: boolean;
  };
  /** @deprecated Preferir `cache.reachable`. */
  cacheStore: {
    reachable: boolean;
  };
  mode: 'read_only' | 'read_write' | 'disabled';
  checkedAt: string;
};

export type LmsSessionRecord = {
  sessionId: string;
  sessionFamilyId: string;
  userId: string;
  role: LmsProfileRole;
  deviceId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  replacementSessionId: string | null;
};
