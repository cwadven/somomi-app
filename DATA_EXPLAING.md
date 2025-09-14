## 로컬 우선 데이터/템플릿 관리 개요

- **핵심 원칙**: 조회는 로컬 데이터 기준. 생성/수정/삭제 시에만 선택적으로 최신화 트리거(향후 서버 연동 시 확장).
- **ID 전략**: `localId`(내부 참조) + `remoteId`(선택적 서버 통신용) 공존. 내부 관계는 항상 `localId` 우선.
- **공통 메타(Meta)**: `localId`, `remoteId?`, `createdAt`, `updatedAt`, `deviceId`, `ownerUserId?`
- **동기화 큐/오프라인 모드**: 사용하지 않음(제거됨).
- **삭제 정책**: 로컬에서 즉시 삭제(톰브스톤 미사용).

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
  "processedAt": "..."            // 실제 소진 처리 시각(정렬 기준)
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
- `somomi_app_prefs`: 앱/알림 설정
- (그 외) 알림/카테고리/처리 로그 등

---

## 동기화(현재 정책)
- 서버 연동은 추후 도입 예정입니다. 현재는 로컬 퍼시스턴스만 사용합니다.
- 변경 작업 이후에만 선택적으로 최신화 유틸(`refreshAfterMutation(dispatch)`)을 호출할 수 있고, 일반 조회는 로컬 데이터를 그대로 사용합니다.

---

## 알림/스케줄러 연동(간단)
- 내부 딥링크/알림 데이터는 `localId`만 저장 → 원격 매핑 변경에도 끊기지 않음
- 9시/20시 리마인더 스케줄, 디버그 즉시 발송 시에도 비활성/만료 영역/제품을 필터링

---

## Export (업데이트 디버깅)
- "영역/제품/소진된 제품" 각각을 JSON 배열로 내보냅니다(`somomi_export_<type>_<ts>.json`).
- 플랫폼별 저장 방식
  - Web: 브라우저 다운로드(Blob + a[download])
  - Android: SAF(저장소 접근 프레임워크)로 사용자 위치 선택, 실패 시 공유 시트로 대체
  - iOS: 문서 디렉토리에 저장 후 공유 시트로 내보내기
- Import 기능은 제거되었습니다(디버그 UI에서도 "데이터 가져오기" 섹션 삭제).

---

## 참고 사항
- 내부 참조는 점진적으로 `localId`만 사용하도록 이행 중입니다(`id` 병행 구간 존재).
- 로그아웃 시 로컬 초기화 정책을 적용(현 구성). 정책 변경 시 "이 디바이스에 남기기" 옵션 고려 가능합니다.
