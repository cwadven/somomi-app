// 매우 단순한 in-app pub/sub 이벤트 버스
// - 외부 의존성 없이 동작
// - 화면 전환/포커스 시점에 "부분 갱신"을 트리거하는 용도로 사용

const listeners = new Map(); // eventName -> Set<handler>

export const onEvent = (eventName, handler) => {
  if (!eventName || typeof handler !== 'function') return () => {};
  const set = listeners.get(eventName) || new Set();
  set.add(handler);
  listeners.set(eventName, set);
  return () => {
    const cur = listeners.get(eventName);
    if (!cur) return;
    cur.delete(handler);
    if (cur.size === 0) listeners.delete(eventName);
  };
};

export const emitEvent = (eventName, payload) => {
  const set = listeners.get(eventName);
  if (!set) return;
  // 핸들러가 emit 중에 unsubscribe/subscribe 해도 안전하게
  Array.from(set).forEach((handler) => {
    try {
      handler(payload);
    } catch (e) {
      // ignore
    }
  });
};

export const EVENT_NAMES = {
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_CREATED: 'product.created',
};


