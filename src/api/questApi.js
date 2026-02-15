import { request } from './client';

// GET /v1/quest/:questType → { quests: QuestItemResponse[] }
export const fetchQuests = async (questType) => {
  return request(`/v1/quest/${questType}`, { method: 'GET' });
};

// POST /v1/quest/:questId/complete
export const completeQuest = async (questId) => {
  return request(`/v1/quest/${questId}/complete`, { method: 'POST' });
};
