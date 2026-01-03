// 화면이 unmount 되더라도 스크롤 위치를 간단히 기억하기 위한 메모리 저장소
// (앱 재시작까지 영구 저장은 필요 없고, "뒤로가기 복귀"에서만 유지하면 충분)

const offsets = new Map(); // key -> number

export const setScrollOffset = (key, offset) => {
  if (!key) return;
  const v = typeof offset === 'number' && isFinite(offset) ? offset : 0;
  offsets.set(String(key), v);
};

export const getScrollOffset = (key) => {
  if (!key) return 0;
  const v = offsets.get(String(key));
  return typeof v === 'number' && isFinite(v) ? v : 0;
};


