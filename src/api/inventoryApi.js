import { request } from './client';

export const fetchGuestInventoryItemTemplates = async () => {
  // GET /v1/inventory/guest-templates → { guest_inventory_item_templates: [...] }
  return request('/v1/inventory/guest-templates', { method: 'GET' });
};

export const fetchInventoryItemsBySection = async (guest_section_id, { nextCursor = null, size = null, sort = null } = {}) => {
  // GET /v1/inventory/section/{guest_section_id}?next_cursor=...&size=... 
  // → { guest_inventory_items: [...], has_more: boolean, next_cursor: string|null }
  let path = `/v1/inventory/section/${guest_section_id}`;
  const qs = [];
  if (nextCursor) qs.push(`next_cursor=${encodeURIComponent(nextCursor)}`);
  if (size != null) qs.push(`size=${encodeURIComponent(String(size))}`);
  if (sort) qs.push(`sort=${encodeURIComponent(String(sort))}`);
  if (qs.length) path += `?${qs.join('&')}`;
  return request(path, { method: 'GET' });
};

export const createInventoryItemInSection = async (guest_section_id, body) => {
  // POST /v1/inventory/section/{guest_section_id}
  return request(`/v1/inventory/section/${guest_section_id}`, {
    method: 'POST',
    body,
  });
};

export const consumeInventoryItem = async (guest_inventory_item_id, consumed_at) => {
  // POST /v1/inventory/item/{guest_inventory_item_id}/consume
  return request(`/v1/inventory/item/${guest_inventory_item_id}/consume`, {
    method: 'POST',
    body: { consumed_at },
  });
};

export const revokeConsumeInventoryItem = async (guest_inventory_item_id, body = {}) => {
  // POST /v1/inventory/item/{guest_inventory_item_id}/revoke-consume
  return request(`/v1/inventory/item/${guest_inventory_item_id}/revoke-consume`, {
    method: 'POST',
    body,
  });
};

export const fetchConsumedInventoryItems = async ({ nextCursor = null, size = null, sort = null } = {}) => {
  // GET /v1/inventory/items/consumed?next_cursor=...&size=...&sort=... 
  // → { guest_inventory_consumed_items: [...], has_more: boolean, next_cursor: string|null }
  let path = '/v1/inventory/items/consumed';
  const qs = [];
  if (nextCursor) qs.push(`next_cursor=${encodeURIComponent(nextCursor)}`);
  if (size != null) qs.push(`size=${encodeURIComponent(String(size))}`);
  if (sort) qs.push(`sort=${encodeURIComponent(String(sort))}`);
  if (qs.length) path += `?${qs.join('&')}`;
  return request(path, { method: 'GET' });
};

export const fetchAllInventoryItems = async ({ nextCursor = null, size = null, sort = null } = {}) => {
  // GET /v1/inventory/items?next_cursor=...&size=...&sort=...
  // → { guest_inventory_items: [...], has_more: boolean, next_cursor: string|null }
  let path = '/v1/inventory/items';
  const qs = [];
  if (nextCursor) qs.push(`next_cursor=${encodeURIComponent(nextCursor)}`);
  if (size != null) qs.push(`size=${encodeURIComponent(String(size))}`);
  if (sort) qs.push(`sort=${encodeURIComponent(String(sort))}`);
  if (qs.length) path += `?${qs.join('&')}`;
  return request(path, { method: 'GET' });
};

export const updateInventoryItem = async (guest_inventory_item_id, body) => {
  // PUT /v1/inventory/item/{guest_inventory_item_id}
  return request(`/v1/inventory/item/${guest_inventory_item_id}`, {
    method: 'PUT',
    body,
  });
};

export const deleteInventoryItem = async (guest_inventory_item_id) => {
  // DELETE /v1/inventory/item/{guest_inventory_item_id}
  return request(`/v1/inventory/item/${guest_inventory_item_id}`, {
    method: 'DELETE',
  });
};

// POST /v1/inventory/section/{guest_section_id}/templates/assign
export const assignGuestInventoryItemTemplatesToSection = async (guest_section_id, { assign = [], revoke = [] }) => {
  return request(`/v1/inventory/section/${guest_section_id}/templates/assign`, {
    method: 'POST',
    body: { assign, revoke },
  });
};

export default {
  fetchGuestInventoryItemTemplates,
  fetchInventoryItemsBySection,
  createInventoryItemInSection,
  consumeInventoryItem,
  revokeConsumeInventoryItem,
  fetchConsumedInventoryItems,
  fetchAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  assignGuestInventoryItemTemplatesToSection,
};


