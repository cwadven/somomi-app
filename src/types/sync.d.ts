/**
 * 동기화 메타 정보 공용 타입 정의 (JSDoc 기반 typedef)
 * JS 프로젝트에서 타입 힌트와 문서화를 제공하기 위해 .d.ts 형태로 제공합니다.
 */

/**
 * 동기화 상태 의미
 * - 'synced': 로컬과 서버가 일치하는 상태
 * - 'dirty': 로컬에서 변경되었고 아직 서버에 반영되지 않은 상태(동기화 대상)
 * - 'pending': 서버로 전송(업로드) 시도 중인 상태
 * - 'conflicted': 서버와 로컬 변경이 충돌한 상태(수동/자동 병합 필요)
 * - 'deleted': 삭제(tombstone) 처리된 상태(목록 비노출, 서버 반영 후 GC 가능)
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


