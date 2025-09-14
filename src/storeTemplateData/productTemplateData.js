const productTemplateData = [
  {
    id: 'product_slot_5',
    category: 'productSlot',
    name: '제품 슬롯 5개',
    originalPointPrice: 1000,
    realPointPrice: 1000,
    templates: [
      // count 대신 동일 템플릿을 개수만큼 명시, validWhile.expiresAt 사용 가능
      { productSlotTemplateId: 'product_slot_tpl_basic_01', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_02', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_03', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_04', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_05', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
    ],
    description: '영역당 추가 제품 5개를 등록할 수 있습니다.'
  },
  {
    id: 'product_slot_10',
    category: 'productSlot',
    name: '제품 슬롯 10개',
    originalPointPrice: 2000,
    realPointPrice: 1800,
    templates: [
      { productSlotTemplateId: 'product_slot_tpl_basic_01', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_02', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_03', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_04', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_05', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_06', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_07', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_08', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_09', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
      { productSlotTemplateId: 'product_slot_tpl_basic_10', productSlotTemplateName: '추가 제품 슬롯', feature: { validWhile: { type: 'fixed', expiresAt: null } } },
    ],
    description: '영역당 추가 제품 10개를 등록할 수 있습니다.'
  },
];

export default productTemplateData;
