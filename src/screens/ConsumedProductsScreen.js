import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchConsumedProductsAsync } from '../redux/slices/productsSlice';

const ConsumedProductsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  const { consumedProducts, consumedStatus, error } = useSelector(state => state.products);
  
  useEffect(() => {
    dispatch(fetchConsumedProductsAsync());
  }, [dispatch]);
  
  // 소진 처리된 날짜 포맷팅
  const formatConsumedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = (category) => {
    const categoryIcons = {
      '식품': 'fast-food',
      '화장품': 'color-palette',
      '세제': 'water',
      '욕실용품': 'water-outline',
      '주방용품': 'restaurant',
    };
    
    // category가 null이나 undefined인 경우 기본값 사용
    if (!category) {
      return 'cube-outline';
    }
    
    // category가 객체인 경우 name 속성 사용
    const categoryName = typeof category === 'object' ? category.name : category;
    return categoryIcons[categoryName] || 'cube-outline';
  };
  
  // 목록 아이템 렌더링
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => navigation.navigate('ConsumedProductDetail', { productId: item.id })}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getCategoryIcon(item.category)} size={30} color="#9E9E9E" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productDetails}>
          {item.brand && (
            <Text style={styles.brandText}>{item.brand}</Text>
          )}
          <Text style={styles.categoryText}>
            {item.category 
              ? (typeof item.category === 'object' ? item.category.name : item.category)
              : '미분류'
            }
          </Text>
        </View>
        <Text style={styles.consumedDate}>
          소진일: {formatConsumedDate(item.consumedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  // 빈 목록 표시
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-done-circle" size={60} color="#BDBDBD" />
      <Text style={styles.emptyText}>소진 처리된 제품이 없습니다.</Text>
    </View>
  );
  
  // 로딩 중 표시
  if (consumedStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  // 에러 표시
  if (consumedStatus === 'failed') {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#F44336" />
        <Text style={styles.errorText}>데이터를 불러오는 중 오류가 발생했습니다.</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => dispatch(fetchConsumedProductsAsync())}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소진 처리된 상품</Text>
        <View style={styles.headerRight} />
      </View>
      
      <View style={styles.container}>
        <FlatList
          data={consumedProducts}
          renderItem={renderItem}
          keyExtractor={item => `consumed-${item.id}-${item.consumedAt || Date.now()}`}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
  productItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  consumedDate: {
    fontSize: 12,
    color: '#757575',
  },
});

export default ConsumedProductsScreen; 