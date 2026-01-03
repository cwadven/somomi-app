import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image,
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';












import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchConsumedProducts } from '../redux/slices/productsSlice';

const ConsumedProductsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  // 정렬 상태: 서버 정렬만 사용 ('-consumed' | 'consumed')
  const [sortDesc, setSortDesc] = useState(true);
  
  const { consumedProducts, consumedStatus, consumedLoadingMore, consumedMeta, error } = useSelector(state => state.products);

  // 첫 진입 1회만 초기 로드
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    const sort = sortDesc ? '-consumed' : 'consumed';
    dispatch(fetchConsumedProducts({ size: 20, sort, append: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정렬 칩 클릭 핸들러 (내림 ↔ 오름)
  const handleSortPress = () => {
    const nextDesc = !sortDesc;
    setSortDesc(nextDesc);
    const sort = nextDesc ? '-consumed' : 'consumed';
    dispatch(fetchConsumedProducts({ size: 20, sort, append: false }));
  };

  // 화면 포커스 시 자동 재호출 방지: useFocusEffect 제거
  
  const loadMore = useCallback(() => {
    if (consumedLoadingMore) return;
    if (!consumedMeta?.hasMore) return;
    const sort = sortDesc ? '-consumed' : 'consumed';
    dispatch(fetchConsumedProducts({ nextCursor: consumedMeta.nextCursor, size: 20, sort, append: true }));
  }, [dispatch, consumedMeta, sortDesc, consumedLoadingMore]);
  
  // 소진 처리된 날짜 포맷팅
  const formatConsumedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // 카테고리에 맞는 아이콘 선택
  const getCategoryIcon = () => 'cube-outline';

  const ConsumedItemIcon = ({ uri }) => {
    const [failed, setFailed] = useState(false);
    const hasUri = typeof uri === 'string' && uri.trim() !== '';
    if (hasUri && !failed) {
      return (
        <Image
          source={{ uri }}
          style={styles.iconImage}
          onError={() => setFailed(true)}
        />
      );
    }
    return <Ionicons name={getCategoryIcon()} size={30} color="#9E9E9E" />;
  };
  
  // 목록 아이템 렌더링
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => navigation.navigate('ConsumedProductDetail', { productId: item.id })}
    >
      <View style={styles.iconContainer}>
        <ConsumedItemIcon uri={item?.iconUrl} />
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
            <TouchableOpacity style={[styles.sortChip, styles.sortChipActive]} onPress={handleSortPress}>
              <Text style={[styles.sortChipText, styles.sortChipTextActive]}>소진순</Text>
              <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
            </TouchableOpacity>
          </View>
        </View>
        {consumedStatus === 'loading' ? (
          <View style={styles.loadingInlineContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : (
          <FlatList
            data={consumedProducts}
            renderItem={renderItem}
            keyExtractor={item => `consumed-${String(item.localId || item.id)}-${item.processedAt || item.consumedAt || ''}`}
            ListEmptyComponent={renderEmptyList}
            contentContainerStyle={styles.listContent}
            onEndReachedThreshold={0.3}
            onEndReached={loadMore}
            ListFooterComponent={consumedLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#4CAF50" />
              </View>
            ) : null}
          />
        )}
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
  loadingInlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
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
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    resizeMode: 'cover',
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