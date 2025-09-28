import { request } from './client';

export const fetchGuestInventoryItemTemplates = async () => {
  // GET /v1/inventory/guest-templates → { guest_inventory_item_templates: [...] }
  return request('/v1/inventory/guest-templates', { method: 'GET' });
};

export default {
  fetchGuestInventoryItemTemplates,
};


