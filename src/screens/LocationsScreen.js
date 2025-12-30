import { isTemplateActive } from '../utils/validityUtils';
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
import { useFocusEffect, useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { updateLocation } from '../redux/slices/locationsSlice';
import { addBasicTemplateInstance, loadUserLocationTemplateInstances, loadUserProductSlotTemplateInstances } from '../redux/slices/authSlice';
import SignupPromptModal from '../components/SignupPromptModal';
import { checkAnonymousLimits } from '../utils/authUtils';
import SlotPlaceholder from '../components/SlotPlaceholder';
import SlotStatusBar from '../components/SlotStatusBar';
import AlertModal from '../components/AlertModal';
// 로그인 폼/소셜 버튼은 내 영역에서 노출하지 않음

const LocationsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const route = useRoute();
  
  const { locations, status, error } = useSelector(state => state.locations);
  const { isAnonymous, isLoggedIn, userLocationTemplateInstances, subscription } = useSelector(state => state.auth);

  // 자동 연동 모달 제거 (요청사항)
 
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: ''
  });
  // 템플릿 선택 모달 상태
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerLocation, setTemplatePickerLocation] = useState(null);
  const [freeTemplates, setFreeTemplates] = useState([]);
  const [templatePickerSelectedTemplateId, setTemplatePickerSelectedTemplateId] = useState(null);

  // 각 영역별로 연결된 템플릿이 구독 만료인지 계산하는 헬퍼
  const isLocationExpired = useCallback((loc) => {
    const tpl = (userLocationTemplateInstances || []).find(t => t.usedInLocationId === loc.id) || null;
    if (!tpl) return false;
    return !isTemplateActive(tpl, subscription);
  }, [userLocationTemplateInstances, subscription]);

  // 템플릿 만료 판별 헬퍼
  const isTemplateExpired = useCallback((tpl) => {
    if (!tpl) return false;
    return !isTemplateActive(tpl, subscription);
  }, [subscription]);

  // 템플릿 선택 모달 콘텐츠를 선택 상태에 맞게 갱신
  useEffect(() => {
    if (!templatePickerVisible) return;
    const selected = freeTemplates.find(t => t.id === templatePickerSelectedTemplateId) || null;
    const summary = selected
      ? `선택됨: ${selected.name || '템플릿'} (기본 슬롯: ${selected.feature?.baseSlots === -1 ? '무제한' : selected.feature?.baseSlots})`
      : '선택된 템플릿이 없습니다';
    setAlertModalConfig(prev => ({
      ...prev,
      message: summary,
      buttons: [
        { text: '취소', style: 'cancel', onPress: () => setTemplatePickerVisible(false) },
        {
          text: selected ? '확인' : '확인(선택 필요)',
          onPress: () => {
            if (!selected || !templatePickerLocation) return;
            // 선택된 템플릿의 feature/baseSlots를 영역에 반영
            const selectedTpl = freeTemplates.find(t => t.id === selected.id);
            if (selectedTpl) {
              dispatch(updateLocation({
                ...templatePickerLocation,
                templateInstanceId: selectedTpl.id,
                productId: selectedTpl.productId,
                feature: selectedTpl.feature,
                disabled: false, // 템플릿 연동 시 활성화
              }));
            }
            // 템플릿 사용 처리
            dispatch({ type: 'auth/markTemplateInstanceAsUsed', payload: { templateId: selected.id, locationId: templatePickerLocation.id } });
            setTemplatePickerVisible(false);
            navigation.navigate('LocationDetail', { locationId: templatePickerLocation.id, from: 'Locations' });
          }
        }
      ],
      content: (
        <ScrollView style={styles.templatePickerList}>
          {freeTemplates.map((tpl) => {
            const isSelected = templatePickerSelectedTemplateId === tpl.id;
            return (
              <TouchableOpacity
                key={tpl.id}
                style={[styles.templatePickerItem, isSelected && styles.templatePickerItemSelected]}
                onPress={() => setTemplatePickerSelectedTemplateId(tpl.id)}
              >
                <View style={styles.templatePickerLeft}>
                  <View style={styles.templatePickerIconBox}>
                    <Ionicons name={tpl.icon || 'cube-outline'} size={18} color="#4CAF50" />
                  </View>
                  <View>
                    <Text style={styles.templatePickerTitle}>{tpl.name || '템플릿'}</Text>
                    <Text style={styles.templatePickerDesc}>
                      기본 슬롯: {tpl.feature?.baseSlots === -1 ? '무제한' : tpl.feature?.baseSlots}
                    </Text>
                  </View>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )
    }));
  }, [templatePickerVisible, templatePickerSelectedTemplateId, freeTemplates, templatePickerLocation, dispatch, navigation]);

  // 화면이 포커스될 때마다 영역 데이터 로드
  useEffect(() => {
    if (isFocused) {
      console.log('LocationsScreen: 영역 목록 로드 시작');
      // 로그인 상태에서 진입 시 템플릿 최신화
      try { if (isLoggedIn) { dispatch(loadUserLocationTemplateInstances()); } } catch (e) {}
      try { if (isLoggedIn) { dispatch(loadUserProductSlotTemplateInstances()); } } catch (e) {}
      if (isLoggedIn) {
        dispatch(fetchLocations())
        .then(result => {
          console.log('LocationsScreen: 영역 목록 로드 성공', result);
        })
        .catch(err => {
          console.error('LocationsScreen: 영역 목록 로드 실패', err);
        });
      }
    }
  }, [dispatch, isFocused]);

  // 로그인 후 자동 연동 모달은 표시하지 않음 (요청사항)
  useEffect(() => {
    // no-op
  }, [isLoggedIn, userLocationTemplateInstances, locations]);

  // route.params.refresh가 변경될 때마다 영역 목록 새로고침
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('LocationsScreen: refresh 파라미터 감지, 영역 목록 새로고침', route.params.refresh);
      dispatch(fetchLocations());
    }
  }, [dispatch, route.params?.refresh]);
  
  // 디버깅용: locations 변경 감지
  useEffect(() => {
    console.log('LocationsScreen: 현재 영역 목록', locations);
  }, [locations]);
  
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

  // 영역 추가 화면으로 이동 (영역 생성/수정 UI는 최소화하고, 제품 슬롯 관련 UI는 제거됨)
  const handleAddLocation = () => {
    navigation.navigate('AddLocation');
  };
  
  // 회원가입 유도 메시지 가져오기
  const getSignupPromptMessage = () => {
    // 템플릿이 부족한 경우 (사용 가능한 템플릿이 없는 경우)
    const availableTemplates = userLocationTemplateInstances.filter(template => !template.used);
    if (availableTemplates.length === 0) {
      return '비회원은 최대 1개의 영역 템플릿만 사용할 수 있습니다. 회원가입하여 더 많은 영역을 생성하세요!';
    }
    
    // 기본 메시지
    return '비회원은 일부 기능이 제한됩니다.\n회원가입 후 모든 기능을 이용해보세요.';
  };

  const handleLocationPress = (location) => {
    // 만료된 경우에도 상세 진입은 허용하되, 내부에서 수정으로 변경 유도
    // 로그인 상태에서 템플릿에 연동되지 않은 영역은 접근 차단
    const linked = userLocationTemplateInstances.some(t => t.usedInLocationId === location.id);
    const hasFreeTemplate = userLocationTemplateInstances.some(t => !t.used && !isTemplateExpired(t));
    if (isLoggedIn && !linked) {
      if (hasFreeTemplate) {
        // 템플릿 선택 목록 구성
        const free = userLocationTemplateInstances.filter(t => !t.used && !isTemplateExpired(t));
        setFreeTemplates(free);
        setTemplatePickerLocation(location);
        setTemplatePickerSelectedTemplateId(null);
        setAlertModalConfig({
          title: '템플릿 선택',
          message: '선택된 템플릿이 없습니다',
          icon: 'link-outline',
          iconColor: '#4CAF50',
          buttons: [
            { text: '취소', style: 'cancel', onPress: () => setTemplatePickerVisible(false) },
            {
              text: '확인',
              onPress: () => {
                const selected = templatePickerSelectedTemplateId;
                if (!selected) return; // 선택 없으면 무시
                const selectedTpl = freeTemplates.find(t => t.id === selected);
                if (selectedTpl) {
                  dispatch(updateLocation({
                    ...location,
                    templateInstanceId: selectedTpl.id,
                    productId: selectedTpl.productId,
                    feature: selectedTpl.feature,
                    disabled: false, // 템플릿 연동 시 활성화
                  }));
                }
                dispatch({ type: 'auth/markTemplateInstanceAsUsed', payload: { templateId: selected, locationId: location.id } });
                setTemplatePickerVisible(false);
                navigation.navigate('LocationDetail', { locationId: location.id });
              }
            }
          ],
          content: null
        });
        setTemplatePickerVisible(true);
      } else {
        setAlertModalConfig({
          title: '템플릿 부족',
          message: '이 영역은 템플릿이 없어 접근할 수 없습니다.\n템플릿을 구매하고 연동해주세요.',
          icon: 'alert-circle',
          iconColor: '#F44336',
          buttons: [
            { text: '상점으로 이동', style: 'success', onPress: () => { setAlertModalVisible(false); navigation.navigate('Store'); } },
            { text: '닫기', style: 'cancel' }
          ]
        });
        setAlertModalVisible(true);
      }
      return;
    }
    navigation.navigate('LocationDetail', { locationId: location.id, from: 'Locations' });
  };

  const handleAllProductsPress = () => {
    navigation.navigate('LocationDetail', { 
      locationId: 'all',
      isAllProducts: true,
      from: 'Locations'
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

  // 로그인 게이트 컴포넌트
  const loginGateComponent = useMemo(() => {
    if (isLoggedIn) return null;
    return (
      <View style={[styles.centered, { paddingHorizontal: 24 }]}>
        <Ionicons name="lock-closed" size={48} color="#4CAF50" style={{ marginBottom: 12 }} />
        <Text style={styles.loginTitle}>로그인이 필요합니다</Text>
        <Text style={styles.loginSubtitle}>내 영역 기능을 이용하려면 로그인해주세요.</Text>
        <View style={{ width: '100%', marginTop: 16 }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.primaryBtnText}>로그인 하러 가기</Text>
          </TouchableOpacity>
        </View>

        {/* 예시 프리뷰 (반투명 카드 + 하단 페이드) */}
        <View style={styles.previewContainer}>
          {[1,2,3].map((i) => (
            <View key={`preview-${i}`} style={styles.previewCard}>
              <View style={styles.previewLeft}>
                <View style={styles.previewIconCircle}>
                  <Ionicons name="cube-outline" size={18} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.previewTitleBar} />
                  <View style={styles.previewSubtitleBar} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
            </View>
          ))}
          <View pointerEvents="none" style={styles.previewFade} />
        </View>
      </View>
    );
  }, [isLoggedIn]);
  
  // 주의: 훅 호출 순서를 보장하기 위해 중간 early return 금지

  // 템플릿 인스턴스 기준으로 사용 가능한 슬롯 계산 (메모이제이션)
  const nonExpiredTemplates = useMemo(() => userLocationTemplateInstances.filter(t => !isTemplateExpired(t)), [userLocationTemplateInstances, isTemplateExpired]);
  const availableTemplates = useMemo(() => nonExpiredTemplates.filter(template => !template.used), [nonExpiredTemplates]);
  const usedTemplates = useMemo(() => nonExpiredTemplates.filter(template => template.used), [nonExpiredTemplates]);
  const totalTemplates = nonExpiredTemplates.length;
  // 원본(만료 포함) 기준 카운트
  const rawTotalTemplates = userLocationTemplateInstances.length;
  const rawUsedTemplates = useMemo(() => userLocationTemplateInstances.filter(t => t.used).length, [userLocationTemplateInstances]);
  
  // 템플릿 상태 변경시에만 로그 출력
  useEffect(() => {
    console.log('LocationsScreen - 템플릿 상태:', {
      totalTemplatesValid: totalTemplates,
      usedTemplatesValid: usedTemplates.length,
      availableTemplatesValid: availableTemplates.length,
      expiredTemplateCount: userLocationTemplateInstances.length - nonExpiredTemplates.length,
      templates: userLocationTemplateInstances
    });
  }, [totalTemplates, usedTemplates.length, availableTemplates.length, userLocationTemplateInstances.length, nonExpiredTemplates.length]);

  return (
    <View style={styles.container}>
      {!isLoggedIn ? (
        loginGateComponent
      ) : (isLoading || hasError) ? (
        loadingOrErrorComponent
      ) : (
        <>
          {/* 구독 만료 배너 */}
          {/* 전역 만료 배너 제거. 영역별로 안내 */}
          {/* 슬롯 상태 표시 바 - 템플릿 인스턴스 기준 */}
          <SlotStatusBar 
            used={rawUsedTemplates} 
            total={rawTotalTemplates} 
            type="location" 
          />
          {/* 자동 연동 모달 제거됨 */}
          
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
                keyExtractor={(item) => String(item.localId || item.id)}
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
                        {isLoggedIn && !userLocationTemplateInstances.some(t => t.usedInLocationId === item.id) && (
                          <Text style={{ color: '#F44336', marginTop: 4, fontSize: 12 }}>
                            템플릿 미연동(비활성화)
                          </Text>
                        )}
                        {isLocationExpired(item) && (
                          <Text style={{ color: '#F44336', marginTop: 4, fontSize: 12 }}>
                            템플릿 만료됨
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#999" />
                  </TouchableOpacity>
                )}
              />
            )}
            
            {/* 영역 추가 버튼 (우측 하단에 고정) */}
            <TouchableOpacity style={styles.addButton} onPress={handleAddLocation}>
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* 회원가입 유도 모달 */}
          <SignupPromptModal 
            visible={showSignupPrompt}
            onClose={() => setShowSignupPrompt(false)}
            message={getSignupPromptMessage()}
            currentCount={userLocationTemplateInstances.filter(template => template.used).length}
            maxCount={1}
          />
          <AlertModal
            visible={alertModalVisible || templatePickerVisible}
            title={alertModalConfig.title}
            message={alertModalConfig.message}
            content={alertModalConfig.content}
            buttons={alertModalConfig.buttons}
            onClose={() => { setAlertModalVisible(false); setTemplatePickerVisible(false); }}
            icon={alertModalConfig.icon}
            iconColor={alertModalConfig.iconColor}
          />
        </>
      )}
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
  subscriptionExpiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  subscriptionExpiredText: {
    color: '#F44336',
    fontSize: 12,
    flex: 1,
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
  disabledAddButton: {
    opacity: 0.7, // 비활성화된 버튼의 투명도 조절
    backgroundColor: '#9E9E9E', // 비활성화된 버튼의 배경색 변경
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
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 4,
    position: 'relative',
    opacity: 0.9,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240,240,240,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewTitleBar: {
    width: '60%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(224,224,224,0.6)',
    marginBottom: 6,
  },
  previewSubtitleBar: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(238,238,238,0.5)',
  },
  previewFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(248,248,248,0.6)',
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  templatePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  templatePickerItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  templatePickerList: {
    maxHeight: 260,
  },
  templatePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templatePickerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  templatePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  templatePickerDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default LocationsScreen; 