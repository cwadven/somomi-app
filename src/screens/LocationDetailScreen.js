import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocationById, deleteLocation } from '../redux/slices/locationsSlice';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';
import { releaseTemplateInstance } from '../redux/slices/authSlice';
import { useSelector as useReduxSelector } from 'react-redux';
import ProductCard from '../components/ProductCard';
import SlotStatusBar from '../components/SlotStatusBar';
import SlotPlaceholder from '../components/SlotPlaceholder';
import LocationNotificationSettings from '../components/LocationNotificationSettings';

const LocationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  const { locationId, isAllProducts } = route.params;
  const isAllProductsView = isAllProducts || locationId === 'all';
  
  const { currentLocation, status, error, locations } = useSelector(state => state.locations);
  const { products } = useSelector(state => state.products);
  const { slots, userProductSlotTemplateInstances, subscription, userLocationTemplateInstances } = useSelector(state => state.auth);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [locationProducts, setLocationProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('products'); // 'products' 또는 'notifications'
  const [sortKey, setSortKey] = useState('created'); // null | 'estimated' | 'expiry' | 'created' | 'name' | 'estimatedRate' | 'expiryRate'
  const [sortDesc, setSortDesc] = useState(true); // 등록순 기본: 내림차순(가장 최근이 위)

  // 만료된 구독 템플릿이어도 상세 접근은 허용. 대신 UI 상에서 편집 유도로 처리.
  
  // 영역 정보 로드
  useEffect(() => {
    if (!isAllProductsView) {
      dispatch(fetchLocationById(locationId));
    }
  }, [dispatch, locationId, isAllProductsView]);
  
  // 제품 목록 로드
  useEffect(() => {
    dispatch(fetchProductsByLocation(isAllProductsView ? 'all' : locationId));
  }, [dispatch, locationId, isAllProductsView]);
  
  // 활성화/만료 상태 헬퍼 (영역)
  const isLocExpired = useCallback((loc) => {
    try {
      const locKey = loc?.id;
      const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locKey) || null;
      if (!tpl) return false;
      const exp = tpl.expiresAt || tpl.feature?.expiresAt;
      return !!exp && (Date.now() >= new Date(exp).getTime());
    } catch (e) { return false; }
  }, [userLocationTemplateInstances]);

  // 제품 목록 필터링
  useEffect(() => {
    if (isAllProductsView) {
      // 활성화된 영역(비활성/만료 제외)에 속한 제품만 표시
      const activeLocIds = new Set(
        (locations || [])
          .filter(loc => loc && loc.disabled !== true && !isLocExpired(loc))
          .map(loc => loc.id)
      );
      const filtered = (products || []).filter(p => {
        const key = p.locationLocalId || p.locationId;
        return !!key && activeLocIds.has(key) && p.syncStatus !== 'deleted' && !p.isConsumed;
      });
      setLocationProducts(filtered);
    } else {
      const filteredProducts = (products || []).filter(product => 
        product.locationId === locationId && product.syncStatus !== 'deleted' && !product.isConsumed
      );
      setLocationProducts(filteredProducts);
    }
  }, [products, locationId, isAllProductsView, locations, isLocExpired]);

  // 비율 계산 헬퍼
  const computeRate = useCallback((startIso, endIso) => {
    try {
      const now = Date.now();
      const start = startIso ? new Date(startIso).getTime() : null;
      const end = endIso ? new Date(endIso).getTime() : null;
      if (!end || !isFinite(end)) return null;
      const s = start && isFinite(start) ? start : null;
      // 시작이 없으면 종료 30일 전을 가정(보수적 기본치)
      const assumedStart = s || (end - 30 * 24 * 60 * 60 * 1000);
      const total = end - assumedStart;
      if (total <= 0) return null;
      const elapsed = Math.max(0, Math.min(total, now - assumedStart));
      return Math.round((elapsed / total) * 100);
    } catch {
      return null;
    }
  }, []);

  const getExpiryRate = useCallback((p) => {
    // 유통률: purchaseDate(있으면) 또는 createdAt ~ expiryDate 진행률
    return computeRate(p.purchaseDate || p.createdAt, p.expiryDate);
  }, [computeRate]);

  const getEstimatedRate = useCallback((p) => {
    // 소진률: purchaseDate(있으면) 또는 createdAt ~ estimatedEndDate 진행률
    return computeRate(p.purchaseDate || p.createdAt, p.estimatedEndDate);
  }, [computeRate]);

  // 정렬 로직
  const sortProducts = useCallback((list) => {
    const input = list || [];
    if (!sortKey) return [...input]; // 정렬 취소 시 원본 순서 유지

    const dir = sortDesc ? -1 : 1; // 내림차순: -1, 오름차순: 1
    const getName = (x) => (x?.name || x?.title || '').toString();
    const cmpByName = (a, b) => getName(a).localeCompare(getName(b)) * (sortDesc ? -1 : 1);
    const cmpNum = (av, bv) => (av === bv ? 0 : (av > bv ? dir : -dir));
    const normalizeRate = (r) => {
      if (r == null) return null;
      const n = Number(r);
      if (!isFinite(n)) return null;
      return Math.max(0, Math.min(100, Math.round(n)));
    };

    // 1) 소진순: 소진예상 없음 → 끝으로 보냄(원래 순서 유지)
    if (sortKey === 'estimated') {
      const present = input.filter(p => !!p.estimatedEndDate);
      const missing = input.filter(p => !p.estimatedEndDate);
      present.sort((a, b) => {
        const av = new Date(a.estimatedEndDate).getTime();
        const bv = new Date(b.estimatedEndDate).getTime();
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 2) 유통순: 유통기한 없음 → 끝으로 보냄(원래 순서 유지)
    if (sortKey === 'expiry') {
      const present = input.filter(p => !!p.expiryDate);
      const missing = input.filter(p => !p.expiryDate);
      present.sort((a, b) => {
        const av = new Date(a.expiryDate).getTime();
        const bv = new Date(b.expiryDate).getTime();
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 3) 소진률%: 계산 불가(null) → 끝으로 보냄(원래 순서 유지), 소진예상 있는 항목 우선
    if (sortKey === 'estimatedRate') {
      const present = input.filter(p => !!p.estimatedEndDate);
      const missing = input.filter(p => !p.estimatedEndDate);
      present.sort((a, b) => {
        const ra = normalizeRate(getEstimatedRate(a));
        const rb = normalizeRate(getEstimatedRate(b));
        const av = ra == null ? 0 : ra;
        const bv = rb == null ? 0 : rb;
        if (av === bv) {
          const ad = new Date(a.estimatedEndDate).getTime();
          const bd = new Date(b.estimatedEndDate).getTime();
          if (ad !== bd) return cmpNum(ad, bd);
          return getName(a).localeCompare(getName(b));
        }
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 4) 유통률%: 계산 불가(null) → 끝으로 보냄(원래 순서 유지), 유통기한 있는 항목 우선
    if (sortKey === 'expiryRate') {
      const present = input.filter(p => !!p.expiryDate);
      const missing = input.filter(p => !p.expiryDate);
      present.sort((a, b) => {
        const ra = normalizeRate(getExpiryRate(a));
        const rb = normalizeRate(getExpiryRate(b));
        const av = ra == null ? 0 : ra;
        const bv = rb == null ? 0 : rb;
        if (av === bv) {
          const ad = new Date(a.expiryDate).getTime();
          const bd = new Date(b.expiryDate).getTime();
          if (ad !== bd) return cmpNum(ad, bd);
          return getName(a).localeCompare(getName(b));
        }
        return cmpNum(av, bv);
      });
      return [...present, ...missing];
    }

    // 5) 등록순 / 이름순 기존 동작 유지
    if (sortKey === 'created') {
      const arr = [...input];
      arr.sort((a, b) => {
        const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (av === bv) return getName(a).localeCompare(getName(b));
        return cmpNum(av, bv);
      });
      return arr;
    }

    // name
    const arr = [...input];
    arr.sort(cmpByName);
    return arr;
  }, [sortKey, sortDesc, getEstimatedRate, getExpiryRate]);

  // 정렬 칩 클릭 시: 내림차순 → 오름차순 → 정렬 해제 순환
  const handleSortPress = useCallback((key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDesc(true); // 새 키는 기본 내림차순
      return;
    }
    if (sortDesc) {
      setSortDesc(false); // 오름차순
      return;
    }
    // 정렬 해제
    setSortKey(null);
  }, [sortKey, sortDesc]);
  
  // 뒤로가기 핸들러
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // 영역 삭제 확인 모달 표시
  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };
  
  // 영역 삭제 실행
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    
    try {
      // 영역 삭제
      await dispatch(deleteLocation(locationId)).unwrap();
      
      // 템플릿 인스턴스 해제 (다시 사용 가능하게)
      if (currentLocation?.templateInstanceId) {
        dispatch(releaseTemplateInstance(locationId));
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('오류', '영역 삭제 중 문제가 발생했습니다.');
    }
  };
  
  // 영역 수정 화면으로 이동
  const handleEditPress = () => {
    navigation.navigate('AddLocation', { 
      isEditMode: true,
      location: currentLocation
    });
  };
  
  // 제품 추가 화면으로 이동
  const handleAddProduct = () => {
    navigation.navigate('ProductForm', { locationId });
  };
  
  // 제품 상세 화면으로 이동
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };
  
  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // 로딩 중 표시
  if (!isAllProductsView && status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }
  
  // 오류 표시
  if (!isAllProductsView && error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>오류</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => dispatch(fetchLocationById(locationId))}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // 제품 슬롯 계산
  const calculateProductSlots = () => {
    if (isAllProductsView) {
      return { used: products.length, total: 999 }; // 모든 제품 보기에서는 슬롯 제한 없음
    }
    
    // 영역의 기본 슬롯 + 해당 영역에 등록된 추가 제품 슬롯 수
    const baseSlots = currentLocation?.feature?.baseSlots ?? slots.productSlots.baseSlots;
    const assignedExtra = (userProductSlotTemplateInstances || []).filter(t => t.assignedLocationId === locationId).length;
    const totalSlots = baseSlots === -1 ? -1 : (baseSlots + assignedExtra); // -1은 무제한
    
    return { 
      used: locationProducts.length,
      total: totalSlots
    };
  };
  
  const { used: usedSlots, total: totalSlots } = calculateProductSlots();
  
  // 슬롯 상태에 따른 제품 추가 가능 여부
  // 템플릿 만료 시에는 제품 추가/삭제/변경은 막고, 상세 조회/수정 화면 진입만 허용
  const linkedTemplate = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === locationId) || null;
  const linkedTemplateExpiry = linkedTemplate?.expiresAt || linkedTemplate?.feature?.expiresAt;
  const isTemplateExpired = !!linkedTemplateExpiry && (Date.now() >= new Date(linkedTemplateExpiry).getTime());
  const canAddProduct = !isTemplateExpired && (totalSlots === -1 || usedSlots < totalSlots);
  
  // 제품 목록 탭 렌더링
  const renderProductsTab = () => {
    return (
      <View style={styles.productsContainer}>
        <View style={styles.sortBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortBarContent}>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'created' && styles.sortChipActive]} onPress={() => handleSortPress('created')}>
              <Text style={[styles.sortChipText, sortKey === 'created' && styles.sortChipTextActive]}>등록순</Text>
              {sortKey === 'created' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'estimated' && styles.sortChipActive]} onPress={() => handleSortPress('estimated')}>
              <Text style={[styles.sortChipText, sortKey === 'estimated' && styles.sortChipTextActive]}>소진순</Text>
              {sortKey === 'estimated' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'expiry' && styles.sortChipActive]} onPress={() => handleSortPress('expiry')}>
              <Text style={[styles.sortChipText, sortKey === 'expiry' && styles.sortChipTextActive]}>유통순</Text>
              {sortKey === 'expiry' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'estimatedRate' && styles.sortChipActive]} onPress={() => handleSortPress('estimatedRate')}>
              <Text style={[styles.sortChipText, sortKey === 'estimatedRate' && styles.sortChipTextActive]}>소진률%</Text>
              {sortKey === 'estimatedRate' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'expiryRate' && styles.sortChipActive]} onPress={() => handleSortPress('expiryRate')}>
              <Text style={[styles.sortChipText, sortKey === 'expiryRate' && styles.sortChipTextActive]}>유통률%</Text>
              {sortKey === 'expiryRate' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortChip, sortKey === 'name' && styles.sortChipActive]} onPress={() => handleSortPress('name')}>
              <Text style={[styles.sortChipText, sortKey === 'name' && styles.sortChipTextActive]}>이름순</Text>
              {sortKey === 'name' && (
                <Ionicons name={sortDesc ? 'arrow-down' : 'arrow-up'} size={14} color="#4CAF50" style={styles.sortChipArrow} />
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
        {locationProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
            {!isAllProductsView && (
              <Text style={styles.emptySubText}>
                오른쪽 하단의 + 버튼을 눌러 제품을 추가하세요.
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={sortProducts(locationProducts)}
            keyExtractor={(item) => String(item.localId || item.id)}
            renderItem={({ item }) => (
              <ProductCard 
                product={item} 
                onPress={() => handleProductPress(item)}
              />
            )}
            contentContainerStyle={styles.productsList}
          />
        )}
        
        {/* 제품 추가 버튼 (모든 제품 보기가 아닐 때만 표시) */}
        {!isAllProductsView && (
          <TouchableOpacity 
            style={[
              styles.addButton,
              !canAddProduct && styles.disabledButton
            ]}
            onPress={handleAddProduct}
            disabled={!canAddProduct}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // 알림 설정 탭 렌더링
  const renderNotificationsTab = () => {
    return (
      <ScrollView style={styles.notificationsContainer}>
        <LocationNotificationSettings locationId={locationId} location={currentLocation} />
      </ScrollView>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          {isAllProductsView ? (
            <>
              <View style={styles.locationIconContainer}>
                <Ionicons name="albums-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>모든 제품</Text>
                <Text style={styles.locationDescription}>등록된 모든 제품을 확인합니다</Text>
              </View>
            </>
          ) : currentLocation && (
            <>
              <View style={styles.locationIconContainer}>
                <Ionicons name={currentLocation.icon || 'cube-outline'} size={24} color="#4CAF50" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.locationTitle}>{currentLocation.title}</Text>
                {currentLocation.description ? (
                  <Text style={styles.locationDescription}>{currentLocation.description}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
        
        {/* 영역 수정/삭제 버튼 (모든 제품 보기가 아닐 때만 표시) */}
        {!isAllProductsView && (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleEditPress}
            >
              <Ionicons name="create-outline" size={24} color="#4CAF50" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleDeletePress}
            >
              <Ionicons name="trash-outline" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* 슬롯 상태 표시 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
        <SlotStatusBar 
          used={usedSlots} 
          total={totalSlots} 
          type="product" 
        />
      )}
      
      {/* 탭 메뉴 (모든 제품 보기가 아닐 때만 표시) */}
      {!isAllProductsView && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => handleTabChange('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              제품 목록
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => handleTabChange('notifications')}
          >
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
              알림 설정
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 탭 내용 */}
      {isAllProductsView || activeTab === 'products' ? renderProductsTab() : renderNotificationsTab()}
      
      {/* 삭제 확인 모달 */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>영역 삭제</Text>
            <Text style={styles.modalMessage}>
              이 영역을 삭제하시겠습니까? 영역 내의 모든 제품 정보도 함께 삭제됩니다.
            </Text>
            <Text style={styles.modalWarning}>안전한 삭제를 위해 아래에 "삭제하기"를 입력하세요.</Text>
            <TextInput
              style={styles.confirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="삭제하기"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, deleteConfirmText.trim() !== '삭제하기' && styles.confirmButtonDisabled]}
                onPress={handleDeleteConfirm}
                disabled={deleteConfirmText.trim() !== '삭제하기'}
              >
                <Text style={styles.confirmButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  locationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  productsContainer: {
    flex: 1,
    position: 'relative',
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
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f8e9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c5e1a5',
    flexDirection: 'row', // Added for arrow alignment
    alignItems: 'center', // Added for arrow alignment
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
  sortDirBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  sortChipArrow: {
    marginLeft: 4,
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productsList: {
    padding: 16,
    paddingBottom: 80, // 하단 버튼을 위한 여백
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalWarning: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 10,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  confirmButtonDisabled: {
    backgroundColor: '#F8BBD0',
  },
  cancelButtonText: {
    color: '#333',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LocationDetailScreen; 