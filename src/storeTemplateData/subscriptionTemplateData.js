const subscriptionTemplateData = [
  {
    id: 'standard',
    category: 'subscription',
    name: '스탠다드 플랜',
    originalPointPrice: 3500,
    realPointPrice: 2900,
    durationDays: 30,
    // 신규 스키마: 구독으로 부여되는 템플릿들
    // - locationTemplate: 영역 템플릿 인스턴스 목록(예: 3개)
    // - productTemplate: 영역당 기본 제공 제품 슬롯 정책
    locationTemplate: [
      { locationTemplateId: 'sub_loc_tpl_basic_a', baseSlots: 10, locationTemplateName: '구독 영역A', durationDays: 30 },
      { locationTemplateId: 'sub_loc_tpl_basic_b', baseSlots: 10, locationTemplateName: '구독 영역B', durationDays: 30 },
      { locationTemplateId: 'sub_loc_tpl_basic_c', baseSlots: 10, locationTemplateName: '구독 영역C', durationDays: 30 },
    ],
    productTemplate: [
      { productSlotTemplateId: 'sub_prod_tpl_basic_01', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_02', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_03', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_04', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_05', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_06', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_07', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_08', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_09', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 },
      { productSlotTemplateId: 'sub_prod_tpl_basic_10', productSlotTemplateName: '구독 제품 슬롯', durationDays: 30 }
    ],
    description: '일반 사용자를 위한 플랜. 본 상품은 구매일로부터 30일간 유지됩니다.',
    features: ['영역 3개 (영역당 제품 10개)', '제품 슬롯 10개']
  }
];

export default subscriptionTemplateData;
