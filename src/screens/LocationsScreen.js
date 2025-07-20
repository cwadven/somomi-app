import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  BackHandler,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { fetchLocations } from '../redux/slices/locationsSlice';
import SignupPromptModal from '../components/SignupPromptModal';
import { checkAnonymousLimits } from '../utils/authUtils';
import SlotPlaceholder from '../components/SlotPlaceholder';
import SlotStatusBar from '../components/SlotStatusBar';

const LocationsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const { locations, status, error } = useSelector(state => state.locations);
  const { isAnonymous, slots } = useSelector(state => state.auth);
  
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // 화면이 포커스될 때마다 영역 데이터 로드
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchLocations());
    }, [dispatch])
  );
  
  // 뒤로가기 버튼 처리
  useEffect(() => {
    const handleBackPress = () => {
      // LocationsScreen이 포커스 상태일 때만 처리
      if (isFocused) {
        // 탭 네비게이터의 홈 탭으로 이동
        navigation.navigate('Home');
        return true; // 기본 뒤로가기 동작 방지
      }
      return false; // 다른 화면에서는 기본 뒤로가기 동작 수행
    };

    // 뒤로가기 이벤트 리스너 등록
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [isFocused, navigation]);

  const handleAddLocation = () => {
    // Redux의 슬롯 정보를 사용하여 사용 가능한 슬롯 확인
    const totalLocationSlots = slots.locationSlots.baseSlots + slots.locationSlots.additionalSlots;
    const usedLocationSlots = locations.length;
    const hasAvailableSlots = usedLocationSlots < totalLocationSlots;
    
    // 슬롯이 없으면 구독/구매 유도
    if (!hasAvailableSlots) {
      // 비회원인 경우 회원가입 유도
      if (isAnonymous) {
        setShowSignupPrompt(true);
        return;
      }
      
      // 회원인 경우 구독/구매 유도
      Alert.alert(
        '슬롯 부족',
        '영역 슬롯이 부족합니다. 구독하거나 추가 슬롯을 구매하세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '상점으로 이동', 
            onPress: () => navigation.navigate('Store')
          }
        ]
      );
      return;
    }
    
    // 슬롯이 있으면 영역 추가 화면으로 이동
    navigation.navigate('AddLocation');
  };
  
  // SignupPromptModal 메시지 동적 생성
  const getSignupPromptMessage = () => {
    const totalLocationSlots = slots.locationSlots.baseSlots;
    return `비회원은 최대 ${totalLocationSlots}개의 영역만 생성할 수 있습니다. 회원가입하여 더 많은 영역을 생성하세요!`;
  };

  const handleLocationPress = (location) => {
    navigation.navigate('LocationDetail', { locationId: location.id });
  };

  const handleAllProductsPress = () => {
    navigation.navigate('LocationDetail', { 
      locationId: 'all',
      isAllProducts: true 
    });
  };

  // 로딩 및 에러 상태 처리를 위한 변수
  const isLoading = status === 'loading' && !locations.length;
  const hasError = !!error;
  
  // useMemo로 조건부 렌더링 컴포넌트 준비
  const loadingOrErrorComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => dispatch(fetchLocations())}
          >
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  }, [isLoading, hasError, error, dispatch]);
  
  // 로딩 중이거나 에러가 있으면 해당 컴포넌트 반환
  if (isLoading || hasError) {
    return loadingOrErrorComponent;
  }

  // Redux의 슬롯 정보를 사용하여 사용 가능한 슬롯 계산
  const totalLocationSlots = slots.locationSlots.baseSlots + slots.locationSlots.additionalSlots;
  const usedLocationSlots = locations.length;
  const availableSlots = Math.max(0, totalLocationSlots - usedLocationSlots);

  return (
    <View style={styles.container}>
      {/* 슬롯 상태 표시 바 */}
      <SlotStatusBar 
        used={usedLocationSlots} 
        total={totalLocationSlots} 
        type="location" 
      />
      
      {/* 모든 제품 버튼 */}
      <TouchableOpacity 
        style={styles.allProductsCard}
        onPress={handleAllProductsPress}
      >
        <View style={styles.allProductsIconContainer}>
          <Ionicons name="albums-outline" size={30} color="#4CAF50" />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>모든 제품</Text>
          <Text style={styles.locationDescription} numberOfLines={1}>
            등록된 모든 제품을 확인합니다
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
      
      {/* 영역 목록 */}
      <Text style={styles.sectionTitle}>내 영역 목록</Text>
      
      {/* 영역 슬롯 리스트 */}
      <View style={styles.locationsContainer}>
        {locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              오른쪽 하단의 + 버튼을 눌러 영역을 추가하세요.
            </Text>
          </View>
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.locationListItem}
                onPress={() => handleLocationPress(item)}
              >
                <View style={styles.locationListItemContent}>
                  <View style={styles.locationIconContainer}>
                    <Ionicons name={item.icon || 'cube-outline'} size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.locationListItemTextContainer}>
                    <Text style={styles.locationListItemTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.locationListItemDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            )}
          />
        )}
        
        {/* 영역 추가 버튼 (우측 하단에 고정) */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddLocation}
        >
          <Ionicons name="add" size={30} color="white" />
          {availableSlots > 0 && (
            <View style={styles.slotCountBadge}>
              <Text style={styles.slotCountText}>{availableSlots}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* 회원가입 유도 모달 */}
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message={getSignupPromptMessage()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  locationsContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 80, // 하단 버튼을 위한 여백
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  slotItem: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  allProductsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  allProductsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#c8e6c9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  slotCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  slotCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationListItemTextContainer: {
    flex: 1,
  },
  locationListItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationListItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default LocationsScreen; 