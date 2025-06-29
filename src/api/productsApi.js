// 샘플 데이터 (나중에 실제 API로 대체)
const sampleProducts = [
  {
    id: '1',
    name: '바디워시',
    category: '화장품',
    categoryId: '2',
    purchaseDate: '2023-05-01',
    estimatedEndDate: '2023-07-15',
    expiryDate: '2024-05-01',
    image: null,
    brand: '도브',
    remainingPercentage: 65,
    memo: '샤워할 때 사용하는 바디워시',
  },
  {
    id: '2',
    name: '세탁세제',
    category: '세제',
    categoryId: '3',
    purchaseDate: '2023-04-15',
    estimatedEndDate: '2023-06-30',
    expiryDate: null,
    image: null,
    brand: '액츠',
    remainingPercentage: 45,
    memo: '드럼세탁기용',
  },
  {
    id: '3',
    name: '우유',
    category: '식품',
    categoryId: '1',
    purchaseDate: '2023-06-20',
    estimatedEndDate: null,
    expiryDate: '2023-06-30',
    image: null,
    brand: '서울우유',
    remainingPercentage: 20,
    memo: '아침 시리얼용',
  },
  {
    id: '4',
    name: '치약',
    category: '욕실용품',
    categoryId: '4',
    purchaseDate: '2023-05-10',
    estimatedEndDate: '2023-08-10',
    expiryDate: '2024-05-10',
    image: null,
    brand: '2080',
    remainingPercentage: 80,
    memo: '',
  },
  {
    id: '5',
    name: '주방세제',
    category: '세제',
    categoryId: '3',
    purchaseDate: '2023-05-20',
    estimatedEndDate: '2023-07-20',
    expiryDate: null,
    image: null,
    brand: '참그린',
    remainingPercentage: 50,
    memo: '설거지용',
  },
];

// 샘플 카테고리 데이터
const sampleCategories = [
  { id: '1', name: '식품', icon: 'fast-food' },
  { id: '2', name: '화장품', icon: 'color-palette' },
  { id: '3', name: '세제', icon: 'water' },
  { id: '4', name: '욕실용품', icon: 'water-outline' },
  { id: '5', name: '주방용품', icon: 'restaurant' },
];

// API 서비스 함수
// 실제 API 구현 시 이 함수들만 수정하면 됩니다.
export const fetchProductsApi = () => {
  return new Promise((resolve) => {
    // API 호출을 시뮬레이션 (0.5초 지연)
    setTimeout(() => {
      resolve(sampleProducts);
    }, 500);
  });
};

export const fetchProductByIdApi = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const product = sampleProducts.find(product => product.id === id);
      if (product) {
        resolve(product);
      } else {
        reject(new Error('Product not found'));
      }
    }, 300);
  });
};

export const addProductApi = (product) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 실제 API에서는 서버에서 ID를 생성합니다
      const newProduct = {
        ...product,
        id: (sampleProducts.length + 1).toString(),
      };
      sampleProducts.push(newProduct);
      resolve(newProduct);
    }, 500);
  });
};

export const updateProductApi = (product) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = sampleProducts.findIndex(p => p.id === product.id);
      if (index !== -1) {
        sampleProducts[index] = product;
        resolve(product);
      } else {
        reject(new Error('Product not found'));
      }
    }, 500);
  });
};

export const deleteProductApi = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = sampleProducts.findIndex(p => p.id === id);
      if (index !== -1) {
        sampleProducts.splice(index, 1);
        resolve({ success: true });
      } else {
        reject(new Error('Product not found'));
      }
    }, 500);
  });
};

export const fetchCategoriesApi = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(sampleCategories);
    }, 300);
  });
};

export const fetchPopularProductsApi = () => {
  return new Promise((resolve) => {
    // 인기 상품 데이터 (실제 구현 시 서버에서 가져옴)
    const popularProducts = [
      {
        id: '101',
        name: '바디워시',
        category: '화장품',
        categoryId: '2',
        image: null,
        brand: '도브',
        popularity: 95,
      },
      {
        id: '102',
        name: '세탁세제',
        category: '세제',
        categoryId: '3',
        image: null,
        brand: '액츠',
        popularity: 88,
      },
      {
        id: '103',
        name: '주방세제',
        category: '세제',
        categoryId: '3',
        image: null,
        brand: '참그린',
        popularity: 92,
      },
      {
        id: '104',
        name: '치약',
        category: '욕실용품',
        categoryId: '4',
        image: null,
        brand: '2080',
        popularity: 90,
      },
    ];
    
    setTimeout(() => {
      resolve(popularProducts);
    }, 500);
  });
}; 