import { request } from './client';

export const fetchGuestSectionTemplates = async () => {
  // GET /v1/section/guest-templates → { guest_section_templates: [...] }
  return request('/v1/section/guest-templates', { method: 'GET' });
};

export default {
  fetchGuestSectionTemplates,
};


