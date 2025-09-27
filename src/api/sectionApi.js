import { request } from './client';

export const fetchGuestSectionTemplates = async () => {
  // GET /v1/section/guest-templates → { guest_section_templates: [...] }
  return request('/v1/section/guest-templates', { method: 'GET' });
};

export const fetchGuestSections = async () => {
  // GET /v1/section/guest-sections → { guest_sections: [...] }
  return request('/v1/section/guest-sections', { method: 'GET' });
};

export default {
  fetchGuestSectionTemplates,
  fetchGuestSections,
};


