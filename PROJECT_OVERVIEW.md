## 프로젝트 개요 (somomi)

### 기술 스택
- **App**: Expo SDK 50 / React Native 0.73
- **상태관리**: Redux Toolkit (`src/redux/*`)
- **네비게이션**: React Navigation
  - `MainTabs`: `Home`, `Locations(내 카테고리)`, `Profile`
  - `RootStack` 모달: `RootLogin`, `RootLocationDetail`, `RootMyNotificationDetail` 등
- **푸시**: FCM(`@react-native-firebase/messaging`) + Notifee
- **마크다운 렌더링**: `react-native-markdown-display`
- **소셜 로그인(Android)**: Kakao, Google
- **OTA 업데이트**: `expo-updates` + EAS Update (runtimeVersion = appVersion)

---

### 디렉토리 구조(핵심만)
- `App.js`: 앱 초기화/게이트/딥링크 linking/튜토리얼 자동 시작 트리거
- `src/navigation/AppNavigator.js`: RootStack + Tab 구성, 튜토리얼 이탈 감지
- `src/screens/*`: 화면
  - `HomeScreen.js`: 홈 헤더 알림 레드닷(미읽음 체크)
  - `LocationsScreen.js`: 로그인 게이트, 카테고리 목록, “모든 제품” 진입
  - `LocationDetailScreen.js`: 카테고리 상세 + “모든 제품(all)”
  - `LoginScreen.js`: 로그인 모달(성공 시 goBack)
  - `ProfileScreen.js`: 로그아웃, 광고 리워드, 프로필 설정
- `src/api/*`: API 래퍼
  - `client.js`: 공통 request (JWT/refresh/logout)
- `src/components/*`: 공통 UI(모달/튜토리얼/마크다운)
- `android/*`: 네이티브(Android) + 커스텀 모듈(리워드 광고)

---

### 중요 기능 흐름 요약

#### 1) 로그인 모달 흐름
- “내 카테고리”에서 로그인 필요 시 **탭 이동 없이** `RootLogin` 모달을 띄움
- 로그인 완료 시 `LoginScreen`이 `goBack()` → 원래 있던 탭/화면 유지

#### 2) 튜토리얼 자동 시작
- 로그인 후 `user.seenTutorial === false`이면 세션에서 튜토리얼 시작
- 튜토리얼 중 의도된 화면 집합 밖으로 이동하면 세션에서 즉시 종료(완료 처리)

#### 3) “모든 제품(all)”
- `locationId === 'all'` 경로는 **API-only**
- 계정 전환(A→B) 시 캐시가 섞이지 않도록
  - `productsSlice`는 `auth/logout`에서 초기화
  - `LocationDetailScreen`은 all에서 캐시 스킵을 하지 않도록 구성

#### 4) 알림 메시지
- 알림 상세 메시지는 마크다운 렌더링
- `somomi://location/detail/:id` 링크는 OS openURL이 아니라 **Root 모달 네비게이션**으로 처리

#### 5) 광고 리워드(AdMob)
- `ProfileScreen`에서 SSV 요청 생성 → 네이티브 리워드 광고 show
- `NO_FILL`(code=3)은 “광고 인벤토리 없음”으로 사용자 안내
- 디버그 빌드에서는 테스트 유닛을 우선 사용해 기능 흐름 검증

