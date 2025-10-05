import { request } from './client';

// GET /v1/product/section-templates → { guest_section_template_products: [...] }
export const fetchSectionTemplateProducts = async () => {
  return request('/v1/product/section-templates', { method: 'GET' });
};

// GET /v1/product/point → { point_products: [...] }
export const fetchPointProducts = async () => {
  return request('/v1/product/point', { method: 'GET' });
};

export default { fetchSectionTemplateProducts };


