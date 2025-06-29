import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';

const HomeScreen = () => {
  const { products } = useSelector(state => state.products);
  const { categories } = useSelector(state => state.categories);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'expiringSoon', 'lowHP'

  // 필터링된 제품 목록 업데이트
  useEffect(() => {
    let result = [...products];
    
    // 검색어 필터링
    if (searchQuery) {
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 카테고리 필터링
    if (selectedCategory) {
      result = result.filter(product => product.categoryId === selectedCategory);
    }
    
    // 특별 필터 적용
    if (filterType === 'expiringSoon') {
      // 유통기한이 7일 이내인 제품
      const today = new Date();
      const sevenDaysLater = new Date(today.setDate(today.getDate() + 7));
      
      result = result.filter(product => {
        if (!product.expiryDate) return false;
        const expiryDate = new Date(product.expiryDate);
        return expiryDate <= sevenDaysLater;
      });
    } else if (filterType === 'lowHP') {
      // HP가 30% 이하인 제품
      result = result.filter(product => {
        if (!product.expiryDate && !product.estimatedEndDate) return false;
        
        const today = new Date();
        let targetDate;
        
        if (product.expiryDate) {
          targetDate = new Date(product.expiryDate);
        } else if (product.estimatedEndDate) {
          targetDate = new Date(product.estimatedEndDate);
        }
        
        const purchaseDate = new Date(product.purchaseDate);
        const totalDays = (targetDate - purchaseDate) / (1000 * 60 * 60 * 24);
        const remainingDays = (targetDate - today) / (1000 * 60 * 60 * 24);
        
        const percentage = (remainingDays / totalDays) * 100;
        return percentage <= 30;
      });
    }
    
    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory, filterType]);

  // 필터 버튼 컴포넌트
  const FilterButton = ({ title, type, icon }) => (
    <TouchableOpacity 
      style={[
        styles.filterButton,
        filterType === type && styles.activeFilterButton
      ]}
      onPress={() => setFilterType(type)}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={filterType === type ? '#fff' : '#4CAF50'} 
      />
      <Text 
        style={[
          styles.filterButtonText,
          filterType === type && styles.activeFilterButtonText
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  // 카테고리 칩 컴포넌트
  const CategoryChip = ({ category }) => (
    <TouchableOpacity 
      style={[
        styles.categoryChip,
        selectedCategory === category.id && styles.activeCategoryChip
      ]}
      onPress={() => {
        setSelectedCategory(selectedCategory === category.id ? null : category.id);
      }}
    >
      <Text 
        style={[
          styles.categoryChipText,
          selectedCategory === category.id && styles.activeCategoryChipText
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  // 샘플 데이터 (실제 구현 시 제거)
  const sampleProducts = [
    {
      id: '1',
      name: '바디워시',
      category: '화장품',
      categoryId: '2',
      purchaseDate: '2025-05-01',
      estimatedEndDate: '2025-07-15',
      expiryDate: '2026-05-01',
    },
    {
      id: '2',
      name: '세탁세제',
      category: '세제',
      categoryId: '3',
      purchaseDate: '2025-04-15',
      estimatedEndDate: '2025-06-30',
    },
    {
      id: '3',
      name: '우유',
      category: '식품',
      categoryId: '1',
      purchaseDate: '2025-06-20',
      expiryDate: '2025-06-30',
    },
  ];

  // 렌더링할 제품 목록 (실제 데이터가 없을 경우 샘플 데이터 사용)
  const productsToRender = filteredProducts.length > 0 ? filteredProducts : sampleProducts;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>소모미</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="제품 검색"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <FilterButton title="전체" type="all" icon="apps-outline" />
        <FilterButton title="유통기한 임박" type="expiringSoon" icon="alert-circle-outline" />
        <FilterButton title="소진 임박" type="lowHP" icon="battery-dead-outline" />
      </View>
      
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CategoryChip category={item} />}
          contentContainerStyle={styles.categoriesList}
        />
      </View>
      
      <FlatList
        data={productsToRender}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notificationButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterButton: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4CAF50',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  categoriesContainer: {
    marginVertical: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeCategoryChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  productsList: {
    padding: 16,
  },
});

export default HomeScreen; 