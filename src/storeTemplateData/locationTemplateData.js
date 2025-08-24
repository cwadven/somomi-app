const locationTemplateData = [
  // 영역 슬롯(번들) - templates 배열로 상세 정의
  {
    id: 'location_slot_1',
    category: 'locationTemplateBundle',
    name: '영역 슬롯 1개',
    originalPointPrice: 2000,
    realPointPrice: 2000,
    templates: [
      { locationTemplateId: 'basic_location_tpl_3', baseSlots: 3, locationTemplateName: '슬롯3개영역' },
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
      { locationTemplateId: 'basic_location_tpl_4', baseSlots: 4, locationTemplateName: '슬롯4개영역' },
      { locationTemplateId: 'basic_location_tpl_3_a', baseSlots: 3, locationTemplateName: '슬롯3개영역' },
      { locationTemplateId: 'basic_location_tpl_3_b', baseSlots: 3, locationTemplateName: '슬롯3개영역' },
    ],
    description: '기본 제품 슬롯:\n4개×1, 3개×2'
  },

  // 스페셜 영역: 30일 유효, 제품 슬롯 무제한 (durationDays를 templates 내부로 이동)
  {
    id: 'special_area_unlimited_30d',
    category: 'locationTemplateSpecial',
    name: '스페셜 영역 (30일, 무제한 슬롯)',
    originalPointPrice: 7000,
    realPointPrice: 7000,
    templates: [
      { locationTemplateId: 'special_location_tpl_unlimited', baseSlots: -1, locationTemplateName: '스페셜 영역', durationDays: 30 }
    ],
    description: '30일 동안 유효하며 제품 슬롯은 무제한입니다.'
  },
];

export default locationTemplateData;
