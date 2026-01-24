import { request } from './client';

export const fetchGuestSectionTemplates = async () => {
  // GET /v1/section/guest-templates → { guest_section_templates: [...] }
  return request('/v1/section/guest-templates', { method: 'GET' });
};

export const fetchGuestSections = async () => {
  // GET /v1/section/guest-sections → { guest_sections: [...] }
  return request('/v1/section/guest-sections', { method: 'GET' });
};

export const fetchGuestSectionsExpiredCount = async () => {
  // GET /v1/section/guest-sections/expired-count → { total_count, guest_sections: [{ guest_section_id, count }] }
  return request('/v1/section/guest-sections/expired-count', { method: 'GET' });
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

export const deleteGuestSection = async (guest_section_id) => {
  // DELETE /v1/section/guest-sections/{guest_section_id}
  return request(`/v1/section/guest-sections/${guest_section_id}`, {
    method: 'DELETE',
  });
};

export default {
  fetchGuestSectionTemplates,
  fetchGuestSections,
  fetchGuestSectionsExpiredCount,
  createGuestSection,
  updateGuestSection,
  deleteGuestSection,
};


