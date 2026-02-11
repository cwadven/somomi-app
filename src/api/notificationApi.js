import { request } from './client';

// GET /v1/notification/guest-notifications?size=20&next_cursor=...
// → { guest_notification_items: [...], has_more: boolean, next_cursor: string|null }
export const fetchGuestNotifications = async ({ size = 20, nextCursor = null } = {}) => {
  const qs = [];
  if (size != null) qs.push(`size=${encodeURIComponent(String(size))}`);
  if (nextCursor) qs.push(`next_cursor=${encodeURIComponent(String(nextCursor))}`);
  const query = qs.length ? `?${qs.join('&')}` : '';
  return request(`/v1/notification/guest-notifications${query}`, { method: 'GET' });
};

// GET /v1/notification/guest-notifications/check
// → { has_unread: boolean }
export const checkUnreadGuestNotifications = async () => {
  return request('/v1/notification/guest-notifications/check', { method: 'GET' });
};

// GET /v1/notification/guest-notifications/{guest_notification_id}
// → { id, title, message, is_read, created_at }
// NOTE: 조회 시 읽음 처리
export const fetchGuestNotificationDetail = async (guestNotificationId) => {
  if (guestNotificationId == null || String(guestNotificationId).trim() === '') {
    throw new Error('guestNotificationId is required');
  }
  return request(`/v1/notification/guest-notifications/${encodeURIComponent(String(guestNotificationId))}`, { method: 'GET' });
};

export default { fetchGuestNotifications, checkUnreadGuestNotifications, fetchGuestNotificationDetail };

