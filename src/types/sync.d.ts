/**
 * 동기화 메타 정보 공용 타입 정의 (JSDoc 기반 typedef)
 * JS 프로젝트에서 타입 힌트와 문서화를 제공하기 위해 .d.ts 형태로 제공합니다.
 */

export type SyncStatus = 'synced' | 'dirty' | 'pending' | 'conflicted' | 'deleted';

export interface SyncMeta {
  localId: string;
  remoteId?: string;
  syncStatus: SyncStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastSyncedAt?: string; // ISO string
  version?: number; // or server ETag
  deviceId: string;
  ownerUserId?: string;
  deletedAt?: string; // ISO, tombstone
}


