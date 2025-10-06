import { request } from './client';

// POST /v1/payment/product/buy/kakao
// body: { product_id: number, product_type: 'POINT', payment_type: 'KAKAO' }
export const buyPointWithKakao = async (productId) => {
  return request('/v1/payment/product/buy/kakao', {
    method: 'POST',
    body: {
      product_id: productId,
      product_type: 'POINT',
      payment_type: 'KAKAO',
    },
  });
};

export default {
  buyPointWithKakao,
};


