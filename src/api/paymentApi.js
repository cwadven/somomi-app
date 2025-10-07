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

// POST /v1/payment/product/buy/guest-template/point/{product_id}
export const buyGuestTemplateProductWithPoint = async (productId) => {
  return request(`/v1/payment/product/buy/guest-template/point/${productId}`, {
    method: 'POST',
  });
};

// GET /v1/payment/product/approve/kakao/{order_id}?pg_token=...
export const approveKakaoPayment = async (orderId, pgToken) => {
  const path = `/v1/payment/product/approve/kakao/${encodeURIComponent(orderId)}?pg_token=${encodeURIComponent(pgToken)}`;
  return request(path, { method: 'GET' });
};

// POST /v1/payment/product/cancel/kakao/{order_token}
export const cancelKakaoPayment = async (orderToken, reason) => {
  const path = `/v1/payment/product/cancel/kakao/${encodeURIComponent(orderToken)}`;
  const options = { method: 'POST' };
  if (reason) options.body = { reason };
  return request(path, options);
};

// POST /v1/payment/product/fail/kakao/{order_token}
export const failKakaoPayment = async (orderToken) => {
  const path = `/v1/payment/product/fail/kakao/${encodeURIComponent(orderToken)}`;
  return request(path, { method: 'POST' });
};

export default {
  buyPointWithKakao,
  buyGuestTemplateProductWithPoint,
  approveKakaoPayment,
  cancelKakaoPayment,
  failKakaoPayment,
};


