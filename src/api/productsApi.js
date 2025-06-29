// 샘플 데이터 (나중에 실제 API로 대체)
let sampleProducts = [
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
    locationId: '2', // 화장실
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
    locationId: '3', // 세탁실
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
    locationId: '1', // 주방
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
    locationId: '2', // 화장실
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
    locationId: '1', // 주방
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

// 샘플 영역(Location) 데이터
let sampleLocations = [
  { 
    id: '1', 
    title: '주방', 
    description: '부엌에 있는 생활용품들', 
    image: null,
    icon: 'restaurant-outline'
  },
  { 
    id: '2', 
    title: '화장실', 
    description: '화장실에 있는 생활용품들', 
    image: null,
    icon: 'water-outline'
  },
  { 
    id: '3', 
    title: '세탁실', 
    description: '세탁실에 있는 생활용품들', 
    image: null,
    icon: 'shirt-outline'
  },
  { 
    id: '4', 
    title: '거실', 
    description: '거실에 있는 생활용품들', 
    image: null,
    icon: 'tv-outline'
  },
];

// API 서비스 함수
// 실제 API 구현 시 이 함수들만 수정하면 됩니다.
export const fetchProductsApi = () => {
  return new Promise((resolve) => {
    // API 호출을 시뮬레이션 (0.5초 지연)
    setTimeout(() => {
      resolve([...sampleProducts]); // 배열 복사본 반환
    }, 500);
  });
};

export const fetchProductByIdApi = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const product = sampleProducts.find(product => product.id === id);
      if (product) {
        resolve({...product}); // 객체 복사본 반환
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
      const newId = (Math.max(...sampleProducts.map(p => parseInt(p.id))) + 1).toString();
      const newProduct = {
        ...product,
        id: newId,
        remainingPercentage: 100, // 새 제품은 100% 남음
      };
      
      // 데이터베이스에 추가
      sampleProducts = [...sampleProducts, newProduct];
      
      resolve({...newProduct}); // 객체 복사본 반환
    }, 500);
  });
};

export const updateProductApi = (product) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = sampleProducts.findIndex(p => p.id === product.id);
      if (index !== -1) {
        // 데이터베이스 업데이트
        sampleProducts = [
          ...sampleProducts.slice(0, index),
          {...product},
          ...sampleProducts.slice(index + 1)
        ];
        resolve({...product}); // 객체 복사본 반환
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
        // 데이터베이스에서 삭제
        sampleProducts = [
          ...sampleProducts.slice(0, index),
          ...sampleProducts.slice(index + 1)
        ];
        resolve({ success: true, id });
      } else {
        reject(new Error('Product not found'));
      }
    }, 500);
  });
};

export const fetchCategoriesApi = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...sampleCategories]); // 배열 복사본 반환
    }, 300);
  });
};

// 영역(Location) 관련 API 함수
export const fetchLocationsApi = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...sampleLocations]); // 배열 복사본 반환
    }, 300);
  });
};

export const fetchLocationByIdApi = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const location = sampleLocations.find(location => location.id === id);
      if (location) {
        resolve({...location}); // 객체 복사본 반환
      } else {
        reject(new Error('Location not found'));
      }
    }, 300);
  });
};

export const addLocationApi = (location) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 실제 API에서는 서버에서 ID를 생성합니다
      const newId = (Math.max(...sampleLocations.map(l => parseInt(l.id))) + 1).toString();
      const newLocation = {
        ...location,
        id: newId,
      };
      
      // 데이터베이스에 추가
      sampleLocations = [...sampleLocations, newLocation];
      
      resolve({...newLocation}); // 객체 복사본 반환
    }, 500);
  });
};

export const updateLocationApi = (location) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = sampleLocations.findIndex(l => l.id === location.id);
      if (index !== -1) {
        // 데이터베이스 업데이트
        sampleLocations = [
          ...sampleLocations.slice(0, index),
          {...location},
          ...sampleLocations.slice(index + 1)
        ];
        resolve({...location}); // 객체 복사본 반환
      } else {
        reject(new Error('Location not found'));
      }
    }, 500);
  });
};

export const deleteLocationApi = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = sampleLocations.findIndex(l => l.id === id);
      if (index !== -1) {
        // 데이터베이스에서 삭제
        sampleLocations = [
          ...sampleLocations.slice(0, index),
          ...sampleLocations.slice(index + 1)
        ];
        resolve({ success: true, id });
      } else {
        reject(new Error('Location not found'));
      }
    }, 500);
  });
};

export const fetchProductsByLocationApi = (locationId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (locationId === 'all') {
        resolve([...sampleProducts]); // 배열 복사본 반환
      } else {
        const filteredProducts = sampleProducts.filter(product => product.locationId === locationId);
        resolve([...filteredProducts]); // 배열 복사본 반환
      }
    }, 500);
  });
};

export const fetchPopularProductsApi = () => {
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
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...popularProducts]); // 배열 복사본 반환
    }, 500);
  });
}; 