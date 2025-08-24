const productTemplateData = [
  {
    id: 'product_slot_5',
    category: 'productSlot',
    name: '제품 슬롯 5개',
    originalPointPrice: 1000,
    realPointPrice: 1000,
    templates: [
      { productSlotTemplateId: 'product_slot_tpl_basic', count: 5, productSlotTemplateName: '추가 제품 슬롯' }
    ],
    description: '영역당 추가 제품 5개를 등록할 수 있습니다.'
  },
  {
    id: 'product_slot_10',
    category: 'productSlot',
    name: '제품 슬롯 10개',
    originalPointPrice: 2200,
    realPointPrice: 1800,
    templates: [
      { productSlotTemplateId: 'product_slot_tpl_basic', count: 10, productSlotTemplateName: '추가 제품 슬롯' }
    ],
    description: '영역당 추가 제품 10개를 등록할 수 있습니다.'
  },
];

export default productTemplateData;
