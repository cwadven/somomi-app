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

export default {
  fetchGuestInventoryItemTemplates,
  fetchInventoryItemsBySection,
  createInventoryItemInSection,
};


