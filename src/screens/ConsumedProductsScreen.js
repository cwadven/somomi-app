import React, { useEffect, useCallback, useMemo, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchConsumedProducts } from '../redux/slices/productsSlice';

const ConsumedProductsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  // 정렬 상태: LocationDetailScreen과 동일한 인터랙션(내림차순 → 오름차순 → 해제)
  const [sortKey, setSortKey] = useState('consumed'); // 'consumed' | null
  const [sortDesc, setSortDesc] = useState(true);
  
  const { consumedProducts, consumedStatus, error } = useSelector(state => state.products);
  // 정렬된 목록 (소진 처리 시점 기준)
  const sortedConsumedProducts = useMemo(() => {
    const list = Array.isArray(consumedProducts) ? [...consumedProducts] : [];
    if (!sortKey) return list;
    const getDate = (item) => {
      const d = item?.consumedAt || item?.processedAt || null;
      return d ? new Date(d).getTime() : -Infinity;
    };
    const dir = sortDesc ? -1 : 1;
    const present = list.filter(i => !!(i?.consumedAt || i?.processedAt));
    const missing = list.filter(i => !(i?.consumedAt || i?.processedAt));
    present.sort((a, b) => {
      const da = getDate(a);
      const db = getDate(b);
      if (da === db) return 0;
      return da > db ? dir : -dir;
    });
    return [...present, ...missing];
  }, [consumedProducts, sortKey, sortDesc]);

  // 정렬 칩 클릭 핸들러 (내림 → 오름 → 해제)
  const handleSortPress = () => {
    if (sortKey !== 'consumed') {
      setSortKey('consumed');
      setSortDesc(true);
      return;
    }
    if (sortDesc) {
      setSortDesc(false);
      return;
    }
    setSortKey(null);
  };

  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    dispatch(fetchConsumedProducts());
  }, [dispatch]);
  
  // 화면에 포커스가 올 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchConsumedProducts());
    }, [dispatch])
  );
  
  // 소진 처리된 날짜 포맷팅
  const formatConsumedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = () => 'cube-outline';
  
  // 목록 아이템 렌더링
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => navigation.navigate('ConsumedProductDetail', { productId: item.id })}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getCategoryIcon()} size={30} color="#9E9E9E" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productDetails}>
          {item.brand && (
            <Text style={styles.brandText}>{item.brand}</Text>
          )}
          {/* 카테고리 텍스트 제거 */}
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
          onPress={() => dispatch(fetchConsumedProducts())}
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
        {/* 정렬 바 - LocationDetailScreen 스타일 준용, 기준은 소진 처리순만 */}
        <View style={styles.sortBar}>
          <View style={styles.sortBarContent}>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'consumed' && styles.sortChipActive]} onPress={handleSortPress}>
              <Text style={[styles.sortChipText, sortKey === 'consumed' && styles.sortChipTextActive]}>소진순</Text>
              {sortKey === 'consumed' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={sortedConsumedProducts}
          renderItem={renderItem}
          keyExtractor={item => `consumed-${String(item.localId || item.id)}-${item.processedAt || item.consumedAt || ''}`}
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
  headerRightBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sortBarContent: {
    alignItems: 'center',
    paddingRight: 8,
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f8e9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c5e1a5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortChipActive: {
    backgroundColor: '#c8e6c9',
    borderColor: '#81c784',
  },
  sortChipText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  sortChipTextActive: {
    fontWeight: '600',
  },
  sortChipArrow: {
    marginLeft: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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