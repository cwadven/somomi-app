import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  BackHandler
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { fetchLocations } from '../redux/slices/locationsSlice';
import SignupPromptModal from '../components/SignupPromptModal';
import { checkAnonymousLimits } from '../utils/authUtils';

const LocationsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  const { locations, status, error } = useSelector(state => state.locations);
  const { isAnonymous } = useSelector(state => state.auth);
  
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
    // 비회원인 경우 영역 개수 제한 체크
    if (isAnonymous && locations.length >= 1) {
      setShowSignupPrompt(true);
      return;
    }
    
    navigation.navigate('AddLocation');
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
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.locationCard}
      onPress={() => handleLocationPress(item)}
    >
      <View style={styles.locationIconContainer}>
        <Ionicons name={item.icon || 'cube-outline'} size={30} color="#4CAF50" />
      </View>
      <View style={styles.locationInfo}>
        <Text style={styles.locationTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.locationDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );
  
  if (status === 'loading' && !locations.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }
  
  if (error) {
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
  
  return (
    <View style={styles.container}>
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
      
      {/* 비회원 사용자의 경우 영역 개수 제한 안내 */}
      {isAnonymous && (
        <View style={styles.limitInfoContainer}>
          <Text style={styles.limitInfoText}>
            비회원은 최대 1개의 영역만 생성할 수 있습니다. ({locations.length}/1)
          </Text>
        </View>
      )}
      
      <FlatList
        data={locations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              오른쪽 하단의 + 버튼을 눌러 영역을 추가하세요.
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={[
          styles.addButton,
          // 비회원이고 영역이 1개 이상이면 버튼 비활성화 스타일 적용
          isAnonymous && locations.length >= 1 && styles.disabledAddButton
        ]}
        onPress={handleAddLocation}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      
      {/* 회원가입 유도 모달 */}
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message="비회원은 최대 1개의 영역만 생성할 수 있습니다. 회원가입하여 무제한으로 영역을 생성하세요!"
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
  listContainer: {
    paddingBottom: 80,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledAddButton: {
    backgroundColor: '#a5d6a7',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
  limitInfoContainer: {
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  limitInfoText: {
    fontSize: 14,
    color: '#F57F17',
  },
});

export default LocationsScreen; 