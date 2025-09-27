import { request } from './client';

export const fetchGuestSectionTemplates = async () => {
  // GET /v1/section/guest-templates → { guest_section_templates: [...] }
  return request('/v1/section/guest-templates', { method: 'GET' });
};

export const fetchGuestSections = async () => {
  // GET /v1/section/guest-sections → { guest_sections: [...] }
  return request('/v1/section/guest-sections', { method: 'GET' });
};

export const createGuestSection = async ({ title, description = null, icon = null, guest_section_template_id }) => {
  // POST /v1/section/guest-sections → { guest_section_id }
  return request('/v1/section/guest-sections', {
    method: 'POST',
    body: { title, description, icon, guest_section_template_id },
  });
};

export const updateGuestSection = async (guest_section_id, { title, description = null, icon = null, guest_section_template_id }) => {
  // PUT /v1/section/guest-sections/{guest_section_id}
  return request(`/v1/section/guest-sections/${guest_section_id}`, {
    method: 'PUT',
    body: { title, description, icon, guest_section_template_id },
  });
};

export default {
  fetchGuestSectionTemplates,
  fetchGuestSections,
  createGuestSection,
  updateGuestSection,
};


