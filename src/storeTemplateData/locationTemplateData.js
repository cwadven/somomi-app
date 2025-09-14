const locationTemplateData = [
  // 영역 슬롯(번들) - templates 배열로 상세 정의
  {
    id: 'location_slot_1',
    category: 'locationTemplateBundle',
    name: '영역 슬롯 1개',
    originalPointPrice: 2000,
    realPointPrice: 2000,
    templates: [
      { locationTemplateId: 'basic_location_tpl_3', locationTemplateName: '슬롯3개영역', feature: { baseSlots: 3, expiresAt: null } },
    ],
    description: '기본 제품 슬롯:\n3개'
  },
  {
    id: 'location_slot_3',
    category: 'locationTemplateBundle',
    name: '영역 슬롯 3개',
    originalPointPrice: 5000,
    realPointPrice: 5000,
    templates: [
      { locationTemplateId: 'basic_location_tpl_4', locationTemplateName: '슬롯4개영역', feature: { baseSlots: 4, expiresAt: null } },
      { locationTemplateId: 'basic_location_tpl_3_a', locationTemplateName: '슬롯3개영역', feature: { baseSlots: 3, expiresAt: null } },
      { locationTemplateId: 'basic_location_tpl_3_b', locationTemplateName: '슬롯3개영역', feature: { baseSlots: 3, expiresAt: null } },
    ],
    description: '기본 제품 슬롯:\n4개×1, 3개×2'
  },

  // 스페셜 영역: 30일 유효, 제품 슬롯 무제한 (만료는 feature.expiresAt로 제공)
  {
    id: 'special_area_unlimited_30d',
    category: 'locationTemplateSpecial',
    name: '스페셜 영역 (30일, 무제한 슬롯)',
    originalPointPrice: 7000,
    realPointPrice: 7000,
    templates: [
      // expiresAt는 구매 시점에서 +30일의 "하루 끝(23:59:59.999)"로 계산하여 주입
      { locationTemplateId: 'special_location_tpl_unlimited', locationTemplateName: '스페셜 영역', feature: { baseSlots: -1, expiresAt: null } }
    ],
    description: '30일 동안 유효하며 제품 슬롯은 무제한입니다.'
  },
];

export default locationTemplateData;
