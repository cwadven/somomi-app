import { request } from './client';

// GET /v1/product/section-templates → { guest_section_template_products: [...] }
export const fetchSectionTemplateProducts = async () => {
  return request('/v1/product/section-templates', { method: 'GET' });
};

// GET /v1/product/point → { point_products: [...] }
export const fetchPointProducts = async () => {
  return request('/v1/product/point', { method: 'GET' });
};

// GET /v1/product/inventory-item-templates → { guest_inventory_item_template_products: [...] }
export const fetchInventoryItemTemplateProducts = async () => {
  return request('/v1/product/inventory-item-templates', { method: 'GET' });
};

export default { fetchSectionTemplateProducts };


