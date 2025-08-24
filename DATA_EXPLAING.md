## 데이터/템플릿 관리 개요 (Offline-First)

- **핵심 원칙**: 오프라인 우선. 모든 엔터티는 로컬에서 정상 동작하고, 온라인 모드에서 동기화됨.
- **ID 전략**: `localId`(오프라인 내부 참조) + `remoteId`(서버 통신용) 공존. 내부 관계는 항상 `localId` 기반.
- **공통 메타(SyncMeta)**: `syncStatus`, `createdAt`, `updatedAt`, `lastSyncedAt`, `version?`, `deviceId`, `ownerUserId?`, `deletedAt?`
- **동기화 큐**: 오프라인에서 발생한 C/U/D를 `SyncQueue`에 적재. 온라인 전환 시 순서대로 처리.
- **삭제 정책**: Tombstone(소프트 삭제). `syncStatus='deleted'`, `deletedAt` 설정 후 서버 반영 → GC.

---

## 주요 엔터티와 관계

### 1) 템플릿(사용자 보유 인스턴스)
- 두 가지 축으로 관리
  - `userLocationTemplateInstances`: 영역에 연결 가능한 "영역 템플릿" 인스턴스
  - `userProductSlotTemplateInstances`: 영역의 기본 슬롯을 넘어서는 "추가 제품 슬롯 템플릿" 인스턴스
- 공통 필드(예)
```json
{
  "id": "tmpl_inst_xxx",          // 기존 id(점진적 이행), 내부 참조는 localId가 우선
  "localId": "tmpl_local_xxx",
  "remoteId": null,
  "productId": "basic_location",  // 템플릿 제품/플랜 식별용
  "feature": { "baseSlots": 3 },  // 영역 템플릿의 기본 제품 슬롯 수 (-1: 무제한)
  "used": false,                    // 영역 템플릿의 사용 여부
  "usedInLocationId": null,         // 사용 중인 영역의 localId(id → 점진 이행 구간)
  "assignedLocationId": null,       // (추가 제품 슬롯 템플릿) 배정된 영역의 localId
  "usedByProductId": null,          // (추가 제품 슬롯 템플릿) 실제 사용 중인 제품 id
  "subscriptionExpiresAt": null,    // 구독 만료일(있다면 우선 사용)
  "expiresAt": null,                // 일반 만료일
  "syncStatus": "synced",
  "createdAt": "...",
  "updatedAt": "...",
  "deviceId": "...",
  "ownerUserId": null
}
```

### 2) 영역(Locations)
- 특정 템플릿 인스턴스에 의해 허용 슬롯/만료 상태가 결정됨
- 관계: `templateInstanceId`(또는 `usedInLocationId` 역참조), 내부 로직은 `localId` 우선
```json
{
  "id": "loc_abc",               
  "localId": "loc_local_01",
  "title": "냉장고",
  "description": "메인 냉장고",
  "icon": "cube-outline",
  "feature": { "baseSlots": 3 },  // 연결된 템플릿에서 파생
  "templateInstanceId": "tmpl_inst_xxx",
  "disabled": false,               // 템플릿 미연동/만료 등 비활성 상태 표현
  "syncStatus": "dirty",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 3) 제품(Products)
- 관계: `locationId`(점진 이행), 내부 처리와 알림 데이터는 `localId` 우선
```json
{
  "id": "prod_abc",
  "localId": "prod_local_01",
  "name": "요거트",
  "category": { "id": "cat_01", "name": "식품" },
  "purchasePlace": "마트",
  "price": 4900,
  "locationId": "loc_local_01",
  "purchaseDate": "...",
  "expiryDate": "...",
  "estimatedEndDate": null,
  "isConsumed": false,
  "syncStatus": "synced",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 4) 소진 처리된 제품(ConsumedProducts)
- 정렬/표시용 `processedAt`(소진 처리 시각) 유지, 복원 시 영역 선택 가능
```json
{
  "id": "consumed_001",
  "originalProductId": "prod_abc",
  "name": "요거트",
  "locationId": "loc_local_01",   // 소진 당시 영역(localId 기준이 이상적)
  "consumptionDate": "...",       // 사용자 지정 소진일
  "processedAt": "...",           // 실제 소진 처리 시각(정렬 기준)
  "syncStatus": "synced"
}
```

---

## 슬롯 관리 규칙(기본 슬롯 vs 추가 슬롯)
- **기본 슬롯**: 영역 템플릿의 `feature.baseSlots`
- **추가 슬롯**: `userProductSlotTemplateInstances`를 영역에 `assignedLocationId`로 배정하여 허용 범위를 확장
- **사용 처리**: 제품 등록 시 기본 슬롯 초과분은 해당 영역에 배정되어 있고 아직 미사용인 추가 슬롯 인스턴스를 `usedByProductId`로 소모
- **무제한**: `baseSlots === -1`이면 추가 슬롯 없이 무제한 등록 가능

---

## 만료/비활성 로직
- 만료 판단: `subscriptionExpiresAt` → `expiresAt` → `feature.expiresAt` 순서로 평가
- 만료되면 해당 영역의 "일부 UI 액션" 제한(삭제/소진 처리 등), 템플릿 변경/제품 이동은 허용
- 템플릿 미연동(초기/로그아웃 후)은 `disabled === true`로 취급하여 동일한 필터 경로 통일

---

## 화면별 핵심 동작 흐름

### A) 영역 생성/수정 (`AddLocationScreen`)
- 생성: 사용 가능한 `userLocationTemplateInstances` 중 선택 → 영역 생성 시 선택 템플릿을 `usedInLocationId=해당 영역`으로 마킹
- 수정: 템플릿 변경, "추가 제품 슬롯" 등록/해제는 **스테이징** 후 "영역 수정" 버튼으로 일괄 반영
- UI는 등록/해제 예정 목록과 배너로 스테이징 상태를 안내
- 만료된 템플릿이 연결된 영역은 "영역 정보" 편집이 제한되며, 템플릿 변경/제품 슬롯만 허용

### B) 제품 등록/수정 (`ProductFormScreen`)
- 등록 시 슬롯 한도 검사: `baseSlots + (assigned extra)` 대비 현재 미소진 제품 수 비교
- 한도 초과 시 배정된 추가 슬롯(미사용)이 있으면 자동 소모(`usedByProductId` 세팅)
- 수정 모드에서는 "영역 위치" 변경만 허용(만료 영역 회피 및 이동 처리)
- 폼 초안 자동 저장/복원(앱 재진입 시 복원, 동일 세션 뒤로가기 시 초기화)

### C) 제품 상세/소진 처리 (`ProductDetailScreen`)
- 소진 처리 시 날짜 선택 모달 표시(연/월/일 중앙 정렬), 처리 후 `processedAt` 기록
- 만료된 템플릿 연결 영역은 소진/삭제 버튼 비활성(안내 모달 제공)

---

## 저장소(AsyncStorage) 키
- `somomi_locations`: 영역 목록
- `somomi_products`: 제품 목록
- `somomi_consumed_products`: 소진된 제품 목록
- `somomi_user_location_templates`: 사용자 보유 영역 템플릿 인스턴스
- `somomi_user_product_slot_templates`: 사용자 보유 추가 제품 슬롯 인스턴스
- `somomi_app_prefs`: 앱/알림/오프라인 설정(예: `offlineMode`, `syncMode` 등)
- `somomi_id_map`: 원격/로컬 ID 매핑(선택)
- `somomi_sync_queue`: 오프라인 작업 큐(C/U/D)
- (그 외) 알림/카테고리/처리 로그 등

---

## 동기화(요약)
- 오프라인: 모든 변경은 로컬 즉시 반영 + `SyncQueue`에 기록
- 온라인: 큐를 엔터티 의존 순서대로 업로드(템플릿 → 영역 → 제품 → 추가 슬롯 → 알림 규칙)
- 서버 응답의 `remoteId`, `updatedAt`, `version/ETag` 등을 반영하여 `syncStatus='synced'`
- 충돌: 기본 LWW(Last-Write-Wins, `updatedAt`)로 해소. 집계/제약은 서버 유효성 우선.

---

## 알림/스케줄러 연동(간단)
- 내부 딥링크/알림 데이터는 `localId`만 저장 → 원격 매핑 변경에도 끊기지 않음
- 9시/20시 리마인더 스케줄, 디버그 즉시 발송 시에도 비활성/만료 영역/제품을 필터링

---

## Import / Export (업데이트 디버깅)
- Export: "영역/제품/소진된 제품" 각각 JSON 배열로 저장(`somomi_export_<type>_<ts>.json`)
- Import: JSON 파일 선택 → 배열 구조 유효성 검사 후 해당 스토리지 키에 저장 → 관련 목록 즉시 리프레시
- 웹 환경은 파일 저장 미지원: 콘솔/디버그 로그로 대체

---

## 참고 사항
- 내부 참조는 점진적으로 `localId`만 사용하도록 이행 중입니다(`id` 병행 구간 존재).
- 로그아웃 시 로컬 초기화 정책을 적용(현 구성). 정책 변경 시 "이 디바이스에 남기기" 옵션 고려 가능합니다.
