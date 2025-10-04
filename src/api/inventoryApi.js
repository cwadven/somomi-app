import { request } from './client';

export const fetchGuestInventoryItemTemplates = async () => {
  // GET /v1/inventory/guest-templates → { guest_inventory_item_templates: [...] }
  return request('/v1/inventory/guest-templates', { method: 'GET' });
};

export const fetchInventoryItemsBySection = async (guest_section_id) => {
  // GET /v1/inventory/section/{guest_section_id} → { guest_inventory_items: [...] }
  return request(`/v1/inventory/section/${guest_section_id}`, { method: 'GET' });
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

export const fetchConsumedInventoryItems = async () => {
  // GET /v1/inventory/items/consumed → { guest_inventory_items: [...] }
  return request('/v1/inventory/items/consumed', { method: 'GET' });
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

export default {
  fetchGuestInventoryItemTemplates,
  fetchInventoryItemsBySection,
  createInventoryItemInSection,
  consumeInventoryItem,
  revokeConsumeInventoryItem,
  fetchConsumedInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
};


