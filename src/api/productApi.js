import { request } from './client';

// GET /v1/product/section-templates → { guest_section_template_products: [...] }
export const fetchSectionTemplateProducts = async () => {
  return request('/v1/product/section-templates', { method: 'GET' });
};

export default { fetchSectionTemplateProducts };


