## somomi — Claude Code 가이드 (읽고 시작)

이 문서는 Claude Code(또는 다른 에이전트)가 이 프로젝트를 빠르게 이해하고 **안전하게 수정**할 수 있도록 만든 “레포 전용 런북”입니다.

---

## 에이전트 작업 제한(필수)

이 레포에서는 기본 정책으로 **코드/문서 수정만** 수행합니다.

- **금지(사용자 명시 요청 없으면 절대 실행하지 않음)**:
  - 실행/빌드/배포: `npx expo start`, `expo run:*`, `./build_script.sh`, `gradlew`, `eas update` 등
  - ADB/디바이스 명령: `adb logcat/install/pull` 등
  - 의존성 설치/업데이트: `npm install` 등
- **허용**:
  - 파일 수정/추가/삭제(코드/문서)
  - “사용자가 직접 실행할 커맨드”를 텍스트로 안내

---

## 환경/시크릿 규칙(필수)

- **시크릿을 코드/문서에 하드코딩하지 않기**
  - 토큰/키/비밀번호/서비스 계정 키 등은 커밋 금지
- **설정 위치**
  - `app.json`의 `expo.extra`: 앱 런타임 설정(예: `apiBaseUrl`, `kakaoNativeAppKey`, `googleWebClientId`)
  - 로컬 환경 변수(예: `.env`): 개발자 로컬에서만 관리 (레포에 커밋하지 않음)

---

## 핵심 요약 (30초)

- **앱 타입**: Expo SDK 50 기반 React Native 앱 (Android 중심), Redux Toolkit 사용
- **네비게이션**: `RootStack(modal) + MainTabs(Home/Locations/Profile)`
  - 루트 모달: `RootLogin`, `RootLocationDetail`, `RootMyNotificationDetail` 등
- **서버 통신**: `src/api/client.js`의 `request()`를 공통 사용 (JWT + refresh 동시성 제어)
- **중요 UX**:
  - **튜토리얼**: 로그인 후 `user.seenTutorial === false`면 자동 시작(세션 단위)
  - **딥링크(마크다운 링크)**: `somomi://location/detail/:id`는 탭 전환 없이 `RootLocationDetail` 모달로 열림
  - **푸시 디바이스 토큰**: 로그아웃/리프레시토큰 만료 시 서버에 DELETE 호출로 비활성화
  - **모든 제품(all)**: API-only로 조회 (로컬 스토리지 폴백 금지)

---

## 어디를 보면 되나 (핵심 파일 맵)

### 진입/초기화
- `App.js`
  - 앱 초기화/업데이트 게이트/딥링크 linking
  - **튜토리얼 자동 시작 트리거** 포함(`seenTutorial === false`)

### 네비게이션(가장 중요)
- `src/navigation/AppNavigator.js`
  - `MainTabs`: `Home`, `Locations`, `Profile`
  - `RootStack` 모달:
    - `RootLogin` → `src/screens/LoginScreen.js`
    - `RootLocationDetail` → `LocationDetailScreen`을 “새창(모달)”처럼 띄움

### 인증/세션
- `src/api/client.js`: `request()` (JWT 주입, refresh 실패 시 logout 처리)
- `src/redux/slices/authSlice.js`: 로그인 상태(`isLoggedIn/isAnonymous/user`)

### “내 카테고리 / 모든 제품”
- `src/screens/LocationsScreen.js`: 로그인 게이트(로그인 모달 오픈), 카테고리/모든 제품 진입
- `src/screens/LocationDetailScreen.js`: `locationId === 'all'`이면 “모든 제품” UI
- `src/redux/slices/productsSlice.js`
  - `fetchProductsByLocation({ locationId: 'all' })`는 **API-only**
  - **로그아웃(`auth/logout`) 시 products 캐시 리셋** (계정 전환 데이터 섞임 방지)

### 튜토리얼(Overlay/차단)
- `src/redux/slices/tutorialSlice.js`
- `src/components/TutorialTouchBlocker.js`
- `src/screens/*Screen.tutorial.js`

### 알림/마크다운 렌더링/딥링크
- `src/components/MarkdownMessageText.js`: 링크 클릭 → `RootLocationDetail` 모달 네비게이션
- `src/screens/MyNotificationDetailScreen.js`, `src/screens/MyNotificationsScreen.js`

### 리워드 광고(AdMob)
- JS 진입: `src/screens/ProfileScreen.js` (리워드 룰 조회/SSV 요청 생성/광고 show)
- 네이티브: `android/app/src/main/java/com/nextstory/somomi/SomomiRewardedAdModule.kt`
  - `LoadAdError.code == 3` → `NO_FILL`
  - `SomomiRewardedAd` 태그로 상세 로그 출력

### OTA 업데이트(EAS)
- `app.json`
  - `runtimeVersion.policy = appVersion`
  - `expo.version` 변경 시 새 바이너리부터 업데이트 적용
- Android 네이티브 값은 `a/`에도 미러 구조가 있음(프로젝트 규칙 참고)

---

## 실행/개발 커맨드

### 개발 서버
- `npm install`
- `npx expo start --reset-cache`

### Android 로컬 빌드(레포 스크립트)
- `./build_script.sh`

### EAS Update
- `npm run update:dev`
- `npm run update:prod`

---

## 작업 원칙(중요)

### 1) “모든 제품(all)”은 로컬 폴백 금지
계정 전환(A→B)에서 로컬/캐시 “찌꺼기”가 섞이기 쉬워서,
`locationId === 'all'` 경로는 **항상 API 결과만** 보여야 합니다.

### 2) 로그아웃 시에는 캐시/토큰 정리가 최우선
- 서버: `DELETE /v1/push/device-token` 시도(실패해도 로그아웃 진행)
- 클라이언트: products/location 캐시가 계정 간 섞이지 않도록 리셋

### 3) 튜토리얼은 “흐름 이탈 시 즉시 종료”가 기본
`AppNavigator`의 `onStateChange`에서 튜토리얼 화면 집합을 벗어나면 세션에서 종료됩니다.

---

## 빠른 디버깅 레시피

### Android logcat (우리 앱 + 광고만 보기)
```bash
adb logcat -c
PID="$(adb shell pidof -s com.nextstory.somomi)"
adb logcat -v time --pid "$PID" SomomiRewardedAd:I Ads:I '*:S'
```

### 딥링크 테스트
- 마크다운 링크: `[해야할 일](somomi://location/detail/13)`
- 기대 동작: 탭 전환 없이 `RootLocationDetail` 모달로 열림 → 뒤로가기 시 모달 닫힘

---

## 문서 더 보기
- 설정/빌드/배포: `SETTING_README.md`
- 로컬 데이터/ID/엔터티 설명(구버전 개념 포함): `DATA_EXPLAING.md`

