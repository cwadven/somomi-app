const subscriptionTemplateData = [
  {
    id: 'standard',
    category: 'subscription',
    name: '스탠다드 플랜',
    originalPointPrice: 3500,
    realPointPrice: 2900,
    durationDays: 30,
    // 신규 스키마: 구독으로 부여되는 템플릿들 (feature.validWhile 사용)
    // - locationTemplate: 영역 템플릿 인스턴스 목록(예: 3개)
    // - productTemplate: 제품 슬롯 템플릿(개별 인스턴스)
    locationTemplate: [
      { locationTemplateId: 'sub_loc_tpl_basic_a', locationTemplateName: '구독 영역A', feature: { baseSlots: 10, validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { locationTemplateId: 'sub_loc_tpl_basic_b', locationTemplateName: '구독 영역B', feature: { baseSlots: 10, validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { locationTemplateId: 'sub_loc_tpl_basic_c', locationTemplateName: '구독 영역C', feature: { baseSlots: 10, validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
    ],
    productTemplate: [
      { productSlotTemplateId: 'sub_prod_tpl_basic_01', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_02', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_03', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_04', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_05', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_06', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_07', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_08', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_09', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } },
      { productSlotTemplateId: 'sub_prod_tpl_basic_10', productSlotTemplateName: '구독 제품 슬롯', feature: { validWhile: { type: 'subscriptionActive', plans: ['standard'], mode: 'any', expiresAt: null } } }
    ],
    description: '일반 사용자를 위한 플랜. 본 상품은 구매일로부터 30일간 유지됩니다.',
    features: ['영역 3개 (영역당 제품 10개)', '제품 슬롯 10개']
  }
];

export default subscriptionTemplateData;
