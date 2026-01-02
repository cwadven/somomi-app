import { request } from './client';

// POST /v1/common/image/{constance_type}/{transaction_pk}/url
// constance_type: 'member-image' | 'inventory-item-image'
export const givePresignedUrl = async (constance_type, transaction_pk, file_name) => {
  if (!constance_type) throw new Error('constance_type is required');
  if (transaction_pk == null) throw new Error('transaction_pk is required');
  if (!file_name) throw new Error('file_name is required');

  return request(`/v1/common/image/${encodeURIComponent(constance_type)}/${encodeURIComponent(String(transaction_pk))}/url`, {
    method: 'POST',
    body: { file_name },
  });
};

export default { givePresignedUrl };


