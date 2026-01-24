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

export default { fetchGuestNotifications };

