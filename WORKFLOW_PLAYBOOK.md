## Workflow Playbook (개발/수정 절차)

Claude Code가 작업할 때 “어떤 순서로” 접근하면 안전한지 정리한 체크리스트입니다.

---

## 1) 서버 API 추가/변경할 때

- **API 함수 추가**: `src/api/<domain>Api.js`
  - 공통 호출은 `request()`(`src/api/client.js`) 사용
- **Redux thunk 연결**: `src/redux/slices/<domain>Slice.js`
  - UI에서 필요한 형태로 payload normalize (id는 문자열로 통일 권장)
- **화면 연결**: `src/screens/<Screen>.js`
  - 포커스/진입 시점(특히 “탭 이동 vs 모달”)을 명확히
- **캐시/계정 전환 고려**
  - “all(모든 제품)” 같은 전역 캐시는 계정 전환 시 섞임 방지 필요
  - `auth/logout` 시 슬라이스 리셋 필요 여부 체크

---

## 2) “로그인 유도” UX를 바꿀 때(중요)

원칙: **탭을 바꾸지 말고 Root 모달을 띄운다**

- 띄우기: `RootLogin` (RootStack modal)
- 닫히기: 로그인 성공 시 `LoginScreen`에서 `navigation.goBack()`

체크:
- 로그인 성공 후 사용자가 원래 화면(예: 내 카테고리)에 남는가
- 로그인 성공 후 `seenTutorial === false`면 튜토리얼 자동 시작이 자연스러운가

---

## 3) 튜토리얼 수정할 때

구성요소:
- 상태: `src/redux/slices/tutorialSlice.js`
- 차단/하이라이트: `src/components/TutorialTouchBlocker.js`
- 화면별 측정/로직: `src/screens/*Screen.tutorial.js`
- 전역 이탈 감지: `src/navigation/AppNavigator.js`의 `onStateChange`

체크:
- “뒤로가기/제스처”가 의도대로 차단되는가
- TutorialTouchBlocker holeRect 측정이 안정적인가(레이아웃 타이밍)
- 튜토리얼 화면 집합 밖으로 나가면 즉시 종료되는가

---

## 4) “모든 제품(all)” 관련 수정할 때

원칙:
- **API-only** (로컬 AsyncStorage/Redux 캐시 폴백 금지)
- 계정 전환(A→B) 시 A 캐시가 절대 보이면 안 됨

체크:
- `fetchProductsByLocation({ locationId: 'all' })`는 API 실패 시 reject 되는가
- `LocationDetailScreen`에서 all은 캐시 스킵 로직이 없는가
- `productsSlice`가 `auth/logout`에서 초기화되는가

---

## 5) Android 로그/디버깅

### logcat (우리 앱 PID + 광고 태그)
```bash
adb logcat -c
PID="$(adb shell pidof -s com.nextstory.somomi)"
adb logcat -v time --pid "$PID" SomomiRewardedAd:I Ads:I ReactNativeJS:I AndroidRuntime:E '*:S'
```

### zsh에서 `*:S` 에러가 날 때
`'*:S'`처럼 따옴표로 감싸거나 `noglob`를 사용.

---

## 6) OTA 업데이트(EAS) 운영 규칙

- `app.json`은 `runtimeVersion.policy = appVersion`
- 따라서 **새 바이너리(스토어/사이드로드)로 배포한 버전만** 해당 runtimeVersion 업데이트를 받음
- `npm run update:prod`는 “같은 runtimeVersion” 사용자에게만 반영됨

