import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateSubscription, updateSlots, addPurchase, usePoints, addPoints, addBasicTemplateInstance, addTemplateInstance, addProductSlotTemplateInstances, applySubscriptionToTemplates } from '../redux/slices/authSlice';
import { isTemplateActive } from '../utils/validityUtils';
import productTemplateData from '../storeTemplateData/productTemplateData';
import locationTemplateData from '../storeTemplateData/locationTemplateData';
import { fetchSectionTemplateProducts } from '../api/productApi';
import subscriptionTemplateData from '../storeTemplateData/subscriptionTemplateData';
import { getLocationSlotChipLabels, getDurationChipLabel, getProductSlotChipLabel } from '../utils/badgeLabelUtils';
import pointPackageData from '../storeTemplateData/pointPackageData';
import { fetchLocations } from '../redux/slices/locationsSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';
import { fetchAvailablePoint } from '../api/pointApi';

const StoreScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoggedIn, isAnonymous, user, subscription, slots, points, pointHistory, userProductSlotTemplateInstances } = useSelector(state => state.auth);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  
  const [showPointHistory, setShowPointHistory] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  
  // 영역 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchLocations());
    }
  }, [dispatch, isLoggedIn]);

  // 1초 간격으로 현재 시각 갱신(카운트다운 표시용)
  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 영역 슬롯 상품 API 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchSectionTemplateProducts();
        const list = Array.isArray(res?.guest_section_template_products) ? res.guest_section_template_products : [];
        if (mounted) setRemoteLocationTemplateProducts(list);
      } catch (e) {
        // 실패 시 로컬 카탈로그로 대체
        if (mounted) setRemoteLocationTemplateProducts(null);
      }
    })();
    return () => { mounted = false; };
  }, [isLoggedIn]);

  // 가용 포인트 동기화
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isLoggedIn) return;
        const res = await fetchAvailablePoint();
        const value = typeof res?.available_point === 'number' ? res.available_point : null;
        if (mounted && value != null) {
          // 화면 표시만 갱신: auth.points.balance를 직접 바꾸지 않고 UI 레벨에서만 반영하려면 로컬 상태를 써도 되나,
          // 현재 구조에서는 points.balance를 그대로 사용 중이므로, 여기서는 임시로 override 상태를 둔다.
          setRemotePoint(value);
        }
      } catch (e) {
        if (mounted) setRemotePoint(null);
      }
    })();
    return () => { mounted = false; };
  }, [isLoggedIn]);

  const [remotePoint, setRemotePoint] = useState(null);
  
  // 모달 상태
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: '',
    iconColor: '',
  });
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [purchaseConfirmVisible, setPurchaseConfirmVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // kept for compatibility
  const [selectedItem, setSelectedItem] = useState(null); // new generic selected item
  const [activeShopTab, setActiveShopTab] = useState('productSlot'); // 'productSlot' | 'locationSlot' | 'subscription' | 'points'
  const [pointPurchaseConfirmVisible, setPointPurchaseConfirmVisible] = useState(false);
  const [selectedPointPackage, setSelectedPointPackage] = useState(null);
  
  // 구독 플랜 정보 (외부 데이터)
  const subscriptionPlans = subscriptionTemplateData;
  
  // 데이터 주도 방식 카탈로그 (외부 데이터 + 서버)
  const [remoteLocationTemplateProducts, setRemoteLocationTemplateProducts] = useState(null);
  const storeCatalog = [...productTemplateData, ...locationTemplateData];
  
  // 포인트 패키지 정보
  const pointPackages = pointPackageData;
  
  // 구독 구매 처리
  const handleSubscribe = (plan) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        goToProfileTab();
      }
      return;
    }
    
    setSelectedProduct({
      type: 'subscription',
      ...plan
    });
    setPurchaseConfirmVisible(true);
  };
  
  // 카탈로그 아이템 구매 처리(슬롯/스페셜/번들 등 확장형)
  const handlePurchaseItem = (item) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        goToProfileTab();
      }
      return;
    }
    
    setSelectedItem(item);
    setPurchaseConfirmVisible(true);
  };
  
  // 구매 확정 처리
  const confirmPurchase = () => {
    setPurchaseConfirmVisible(false);
    
    const item = selectedItem || selectedProduct;
    if (!item) return;
    
    try {
      // 포인트 차감
      const pointCost = item.realPointPrice ?? item.pointPrice;
      
      // 포인트가 부족한 경우
      if (points.balance < pointCost) {
        showErrorModal(`젬이 부족합니다.\n현재 젬: ${points.balance.toLocaleString()}G\n필요 젬: ${pointCost.toLocaleString()}G`);
        return;
      }
      
      if (item.category === 'subscription') {
        // 포인트 사용 - usePoints 액션 호출
        dispatch(usePoints({
          amount: pointCost,
          description: `${item.name} 구독 구매`,
          itemId: item.id,
          itemType: 'subscription'
        }));
        
        // 구독 처리 - 플랜 만료일 계산 (기본: 30일)
        const durationDays = typeof item.durationDays === 'number' ? item.durationDays : 30;
        const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        
        dispatch(updateSubscription({
          isSubscribed: true,
          plan: item.id,
          expiresAt: expiryDate.toISOString()
        }));
        
        // 템플릿 인스턴스 동기화: 신 스키마(locationTemplate/productTemplate) 우선 적용, 없으면 구 스키마도 처리됨
        dispatch(applySubscriptionToTemplates({
          locationTemplate: Array.isArray(item.locationTemplate) ? item.locationTemplate : undefined,
          productTemplate: Array.isArray(item.productTemplate) ? item.productTemplate : undefined,
          locationSlots: item.locationSlots,
          productSlotsPerLocation: item.productSlotsPerLocation,
          planId: item.id,
          expiresAt: expiryDate.toISOString(),
        }));
        
        // 구매 내역 추가
        dispatch(addPurchase({
          id: `sub_${Date.now()}`,
          type: 'subscription',
          planId: item.id,
          planName: item.name,
          price: item.realPointPrice ?? item.pointPrice,
          pointsUsed: pointCost,
          expiresAt: expiryDate.toISOString()
        }));
        
        showSuccessModal('구독 완료', `${item.name} 구독이 완료되었습니다. 이제 더 많은 영역과 제품을 등록할 수 있습니다.`);
      } else if (item.category === 'productSlot' || item.category === 'locationTemplateBundle' || item.category === 'locationTemplateSpecial') {
        // 포인트 사용 - usePoints 액션 호출
        dispatch(usePoints({
          amount: pointCost,
          description: `${item.name} 구매`,
          itemId: item.id,
          itemType: 'slot'
        }));
        
        // 슬롯/템플릿 구매 처리 (데이터주도)
        if (item.category === 'productSlot') {
          const slotTemplate = Array.isArray(item.templates) && item.templates[0] ? item.templates[0] : null;
          const count = slotTemplate?.count || 0;
          dispatch(addProductSlotTemplateInstances({ count }));
          const nextTemplatesCount = (userProductSlotTemplateInstances?.length || 0) + count;
          showSuccessModal('구매 완료', `${item.name} 구매가 완료되었습니다.\n보유 추가 제품 슬롯: ${nextTemplatesCount}개`);
          dispatch(addPurchase({ id: `slot_${Date.now()}`, type: 'slot', itemId: item.id, itemName: item.name, price: pointCost, pointsUsed: pointCost, amount: count }));
        }
        if (item.category === 'locationTemplateBundle') {
          const templates = Array.isArray(item.templates) ? item.templates : [];
          const count = templates.length;
          // slots counter 업데이트
          dispatch(updateSlots({ locationSlots: { additionalSlots: slots.locationSlots.additionalSlots + count } }));
          for (const t of templates) {
            const baseSlots = (t && typeof t.feature?.baseSlots === 'number') ? t.feature.baseSlots : 3;
            const displayName = t?.locationTemplateName || '기본 영역';
            dispatch(addTemplateInstance({
              productId: t?.locationTemplateId || 'basic_location',
              name: displayName,
              description: '기본적인 제품 관리 기능을 제공하는 영역',
              icon: 'cube-outline',
              feature: { baseSlots },
              used: false,
              usedInLocationId: null,
            }));
          }
          const totalLocationSlots = slots.locationSlots.baseSlots + slots.locationSlots.additionalSlots + count;
          showSuccessModal('구매 완료', `${item.name} 구매가 완료되었습니다.\n현재 보유 영역 슬롯: ${totalLocationSlots}개`);
          dispatch(addPurchase({ id: `slot_${Date.now()}`, type: 'slot', itemId: item.id, itemName: item.name, price: pointCost, pointsUsed: pointCost, amount: count }));
        }
        if (item.category === 'locationTemplateSpecial') {
          const specialTemplate = Array.isArray(item.templates) && item.templates[0] ? item.templates[0] : null;
          const days = (specialTemplate?.feature?.validWhile && specialTemplate.feature.validWhile.expiresAt) ? null : (specialTemplate?.durationDays || 30);
          const baseSlots = (specialTemplate && typeof specialTemplate.feature?.baseSlots === 'number') ? specialTemplate.feature.baseSlots : -1;
          const expiresAt = (specialTemplate?.feature?.validWhile && specialTemplate.feature.validWhile.expiresAt) || new Date(Date.now() + (days || 0) * 24 * 60 * 60 * 1000).toISOString();
          // slots counter 업데이트(스페셜 영역도 하나의 추가 영역으로 카운트)
          dispatch(updateSlots({ locationSlots: { additionalSlots: slots.locationSlots.additionalSlots + 1 } }));
          dispatch(addTemplateInstance({
            productId: specialTemplate?.locationTemplateId || 'special_location',
            name: specialTemplate?.locationTemplateName || '스페셜 영역',
            description: days ? `${days}일 유효 / 제품 슬롯 무제한` : '제품 슬롯 무제한',
            icon: 'star',
            feature: { baseSlots, validWhile: { type: 'fixed', expiresAt } },
            used: false,
            usedInLocationId: null,
          }));
          showSuccessModal('구매 완료', `${item.name} 구매가 완료되었습니다.\n유효기간: ${days}일, 제품 슬롯: 무제한`);
          dispatch(addPurchase({ id: `slot_${Date.now()}`, type: 'slot', itemId: item.id, itemName: item.name, price: pointCost, pointsUsed: pointCost, amount: 1 }));
        }
      }
    } catch (error) {
      console.log('error', error);
      showErrorModal('구매 처리 중 오류가 발생했습니다.');
    }
  };
  
  // 포인트 충전 처리
  const handlePurchasePoints = (pkg) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        goToProfileTab();
      }
      return;
    }
    
    setSelectedPointPackage(pkg);
    setPointPurchaseConfirmVisible(true);
  };
  
  // 포인트 구매 확정 처리
  const confirmPointPurchase = () => {
    setPointPurchaseConfirmVisible(false);
    
    if (!selectedPointPackage) return;
    
    try {
      // 실제 결제 처리 로직 (여기서는 가상으로 처리)
      const totalPoints = selectedPointPackage.points + (selectedPointPackage.bonus || 0);
      
      // 포인트 추가
      dispatch(addPoints({
        amount: totalPoints,
        description: `${selectedPointPackage.name} 구매${selectedPointPackage.bonus ? ` (+보너스 ${selectedPointPackage.bonus}G)` : ''}`,
        paymentMethod: '신용카드'
      }));
      
      showSuccessModal(
        'G 충전 완료', 
        `${totalPoints.toLocaleString()}G가 충전되었습니다.\n현재 보유 G: ${(points.balance + totalPoints).toLocaleString()}G`
      );
    } catch (error) {
      showErrorModal('결제 처리 중 오류가 발생했습니다.');
    }
  };
  
  // 성공 모달 표시
  const showSuccessModal = (title, message) => {
    setAlertModalConfig({
      title,
      message,
      buttons: [{ text: '확인', onPress: () => setAlertModalVisible(false) }],
      icon: 'checkmark-circle',
      iconColor: '#4CAF50',
    });
    setAlertModalVisible(true);
  };
  
  // 오류 모달 표시
  const showErrorModal = (message) => {
    setAlertModalConfig({
      title: '오류',
      message,
      buttons: [{ text: '확인', onPress: () => setAlertModalVisible(false) }],
      icon: 'alert-circle',
      iconColor: '#F44336',
    });
    setAlertModalVisible(true);
  };
  
  // 구매 확인 모달
  const PurchaseConfirmModal = () => {
    const item = selectedItem || selectedProduct;
    if (!item) return null;
    
    return (
      <Modal
        visible={purchaseConfirmVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>구매 확인</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setPurchaseConfirmVisible(false)}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalProductName}>{item.name}</Text>
              {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.modalProductPriceOriginal, styles.strike]}>{item.originalPointPrice.toLocaleString()}G</Text>
                  <Text style={styles.modalProductPriceReal}>{item.realPointPrice.toLocaleString()}G</Text>
                </View>
              ) : (
                <Text style={styles.modalProductPrice}>{(item.originalPointPrice ?? item.realPointPrice ?? item.pointPrice).toLocaleString()}G</Text>
              )}
              
              {item.category === 'subscription' && (
                <View style={styles.modalFeatures}>
                  {item.features.map((feature, index) => (
                    <View key={index} style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.modalFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {(item.category === 'productSlot' || item.category === 'locationTemplateBundle' || item.category === 'locationTemplateSpecial') && (
                <Text style={styles.modalDescription}>
                  {item.description}
                </Text>
              )}
              
              <View style={styles.pointInfoInModal}>
                <Text style={styles.pointInfoText}>현재 젬: {points.balance.toLocaleString()}G</Text>
                <Text style={styles.pointInfoText}>
                  구매 후 젬: {Math.max(0, points.balance - (item.realPointPrice ?? item.pointPrice)).toLocaleString()}G
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setPurchaseConfirmVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>취소</Text>
                </TouchableOpacity>
                
                {points.balance >= (item.realPointPrice ?? item.pointPrice) ? (
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={confirmPurchase}
                  >
                    <Text style={styles.modalConfirmButtonText}>구매하기</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalChargeButton]}
                    onPress={goToPointScreen}
                  >
                    <Text style={styles.chargePointButtonText}>젬 충전하기</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // 포인트 구매 확인 모달
  const PointPurchaseConfirmModal = () => {
    if (!selectedPointPackage) return null;
    
    return (
      <Modal
        visible={pointPurchaseConfirmVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>G 구매 확인</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setPointPurchaseConfirmVisible(false)}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalProductName}>{selectedPointPackage.name}</Text>
              <Text style={styles.modalProductPrice}>{selectedPointPackage.price}</Text>
              
              {selectedPointPackage.bonus && (
                <Text style={styles.modalBonus}>+{selectedPointPackage.bonus.toLocaleString()} 보너스 젬</Text>
              )}
              
              <Text style={styles.modalDescription}>
                결제 후 즉시 젬이 충전됩니다.
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setPointPurchaseConfirmVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>취소</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={confirmPointPurchase}
                >
                  <Text style={styles.modalConfirmButtonText}>결제하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // 구독 플랜 렌더링
  const renderSubscriptionPlans = () => {
    return subscriptionPlans.map((plan) => (
      <TouchableOpacity 
        key={plan.id} 
        style={styles.planCard}
        onPress={() => handleSubscribe(plan)}
      >
        {/* 헤더: 이름 + 세일 배지 */}
        <View style={styles.planHeaderRow}>
          <Text style={styles.planName}>{plan.name}</Text>
          {(plan.originalPointPrice != null && plan.realPointPrice != null && plan.originalPointPrice !== plan.realPointPrice) && (
            <View style={styles.saleBadge}>
              <Ionicons name="pricetag" size={12} color="#fff" />
              <Text style={styles.saleBadgeText}>
                {`-${Math.max(0, Math.round((1 - (plan.realPointPrice / plan.originalPointPrice)) * 100))}%`}
              </Text>
            </View>
          )}
        </View>

        {/* 가격 표시 */}
        {(plan.originalPointPrice != null && plan.realPointPrice != null && plan.originalPointPrice !== plan.realPointPrice) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.planPriceOriginal, styles.strike]}>{plan.originalPointPrice.toLocaleString()}G</Text>
            <Text style={styles.planPriceReal}>{plan.realPointPrice.toLocaleString()}G</Text>
          </View>
        ) : (
          <Text style={styles.planPrice}>
            {(plan.originalPointPrice ?? plan.realPointPrice ?? 0) === 0 ? '무료' : `${(plan.originalPointPrice ?? plan.realPointPrice ?? 0).toLocaleString()}G`}
          </Text>
        )}

        {/* 요약 칩 */}
        {(() => {
          const durationDays = typeof plan.durationDays === 'number' ? plan.durationDays : null;
          const baseSlotsValues = (Array.isArray(plan.locationTemplate) ? plan.locationTemplate : [])
            .map(t => t?.feature?.baseSlots)
            .filter(v => typeof v === 'number');
          const locationLabels = getLocationSlotChipLabels(baseSlotsValues);
          const productCount = Array.isArray(plan.productTemplate) ? plan.productTemplate.length : 0;
          const durationLabel = getDurationChipLabel(durationDays);
          const productLabel = getProductSlotChipLabel(productCount);
          return (
            <View style={styles.summaryChipsRow}>
              {durationLabel && (
                <View style={styles.chip}><Ionicons name="time" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{durationLabel}</Text></View>
              )}
              {locationLabels.map((label, idx) => (
                <View key={`plan-loc-${idx}`} style={styles.chip}><Ionicons name="cube" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{label}</Text></View>
              ))}
              {productLabel && (
                <View style={styles.chip}><Ionicons name="add-circle" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{productLabel}</Text></View>
              )}
            </View>
          );
        })()}
 
        <Text style={styles.planDescription}>{plan.description}</Text>
        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <View style={styles.planButtonContainer}>
          <TouchableOpacity 
            style={styles.planButton}
            onPress={() => handleSubscribe(plan)}
          >
            <Text style={styles.planButtonText}>
              {plan.realPointPrice === 0 ? '시작하기' : '구독하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ));
  };
  
  // 슬롯 아이템 렌더링
  const renderSlotItems = () => {
    return (
      <View style={styles.slotsGrid}>
        {storeCatalog.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.slotCard}
            onPress={() => handlePurchaseItem(item)}
          >
            <View style={styles.slotIconContainer}>
              <Ionicons 
                name={item.category === 'locationTemplateSpecial' ? 'star' : item.category === 'locationTemplateBundle' ? 'grid' : 'cube'} 
                size={30} 
                color="#4CAF50" 
              />
            </View>
            <Text style={styles.slotName}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) ? (
                <>
                  <Text style={[styles.slotPriceOriginal, styles.strike]}>{item.originalPointPrice.toLocaleString()}G</Text>
                  <Text style={styles.slotPriceReal}>{item.realPointPrice.toLocaleString()}G</Text>
                </>
              ) : (
                <Text style={styles.slotPrice}>{(item.originalPointPrice ?? item.realPointPrice ?? item.pointPrice).toLocaleString()}G</Text>
              )}
            </View>
            <Text style={styles.slotDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 영역 슬롯만 렌더링
  const renderLocationSlotItems = () => {
    const apiItems = Array.isArray(remoteLocationTemplateProducts) ? remoteLocationTemplateProducts : null;
    const items = apiItems ? apiItems.map((p) => {
      const templates = Array.isArray(p.templates) ? p.templates.map(t => ({
        feature: {
          baseSlots: typeof t.base_slots === 'number' ? t.base_slots : 0,
          validWhile: t.available_days ? { type: 'fixed', expiresAt: null } : { type: 'fixed', expiresAt: null },
        }
      })) : [];
      return {
        id: String(p.product_id),
        category: 'locationTemplateBundle',
        name: p.title,
        description: p.description || '',
        saleEndAt: p.end_at || null,
        originalPointPrice: null,
        realPointPrice: typeof p.price === 'number' ? p.price : 0,
        templates,
      };
    }) : storeCatalog.filter((i) => i.category === 'locationTemplateBundle' || i.category === 'locationTemplateSpecial');
    return (
      <View style={styles.slotsGrid}>
        {items.map((item) => (
          <View key={item.id} style={styles.slotTile}>
            {/* 좌측 아이콘 */}
            <View style={styles.slotTileLeft}>
              <View style={styles.slotTileIconWrap}>
                <Ionicons name={item.category === 'locationTemplateSpecial' ? 'star' : 'grid'} size={22} color="#4CAF50" />
              </View>
            </View>
            {/* 중앙: 제목/칩/설명 */}
            <View style={styles.slotTileCenter}>
              <View style={styles.slotTileTitleRow}>
                <Text style={styles.slotTileTitle}>{item.name}</Text>
                {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) && (
                  <View style={[styles.saleBadge, { marginLeft: 6 }]}>
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <Text style={styles.saleBadgeText}>
                      {`-${Math.max(0, Math.round((1 - (item.realPointPrice / item.originalPointPrice)) * 100))}%`}
                    </Text>
                  </View>
                )}
              </View>
              {(() => {
                const templates = Array.isArray(item.templates) ? item.templates : [];
                const isSpecial = item.category === 'locationTemplateSpecial';
                const durationDays = null;
                const baseSlotsValues = templates
                  .map(t => t?.feature?.baseSlots)
                  .filter(v => typeof v === 'number');
                const locationLabels = getLocationSlotChipLabels(baseSlotsValues);
                const durationLabel = getDurationChipLabel(durationDays);
                return (
                  <View style={styles.summaryChipsRow}>
                    {durationLabel && (
                      <View className="chip"><Ionicons name="time" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{durationLabel}</Text></View>
                    )}
                    {locationLabels.map((label, idx) => (
                      <View key={`loc-${idx}`} style={styles.chip}><Ionicons name="cube" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{label}</Text></View>
                    ))}
                  </View>
                );
              })()}
              {/* 판매 종료 카운트다운 */}
              {(() => {
                if (!item.saleEndAt) return null;
                const endTs = new Date(item.saleEndAt).getTime();
                if (!isFinite(endTs)) return null;
                const remain = Math.max(0, endTs - nowTs);
                const sec = Math.floor(remain / 1000);
                const d = Math.floor(sec / 86400);
                const h = Math.floor((sec % 86400) / 3600).toString().padStart(2, '0');
                const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
                const s = Math.floor(sec % 60).toString().padStart(2, '0');
                const label = d > 0 ? `${d}일 ${h}:${m}:${s}` : `${h}:${m}:${s}`;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="time-outline" size={12} color="#E53935" style={{ marginRight: 4 }} />
                    <Text style={styles.saleEndCountdown}>종료까지: {label}</Text>
                  </View>
                );
              })()}
              <Text style={styles.slotTileSubtitle} numberOfLines={2}>{item.description}</Text>
            </View>
            {/* 우측: 가격/버튼 */}
            <View style={styles.slotTileRight}>
              {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.slotPriceOriginal, styles.strike]}>{item.originalPointPrice.toLocaleString()}G</Text>
                  <Text style={styles.slotPriceReal}>{item.realPointPrice.toLocaleString()}G</Text>
                </View>
              ) : (
                <Text style={styles.slotPrice}>{(item.originalPointPrice ?? item.realPointPrice ?? item.pointPrice).toLocaleString()}G</Text>
              )}
              <TouchableOpacity style={[styles.slotBuyButton, { marginTop: 6 }]} onPress={() => handlePurchaseItem(item)}>
                <Ionicons name="cart" size={16} color="#fff" />
                <Text style={styles.slotBuyButtonText}>구매</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };
  
  // 제품 슬롯만 렌더링
  const renderProductSlotItems = () => {
    const items = storeCatalog.filter((i) => i.category === 'productSlot');
    return (
      <View style={styles.slotsGrid}>
        {items.map((item) => (
          <View key={item.id} style={styles.slotTile}>
            <View style={styles.slotTileLeft}>
              <View style={styles.slotTileIconWrap}>
                <Ionicons name="cube" size={22} color="#4CAF50" />
              </View>
            </View>
            <View style={styles.slotTileCenter}>
              <View style={styles.slotTileTitleRow}>
                <Text style={styles.slotTileTitle}>{item.name}</Text>
                {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) && (
                  <View style={[styles.saleBadge, { marginLeft: 6 }]}>
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <Text style={styles.saleBadgeText}>
                      {`-${Math.max(0, Math.round((1 - (item.realPointPrice / item.originalPointPrice)) * 100))}%`}
                    </Text>
                  </View>
                )}
              </View>
              {(() => {
                const tpl = Array.isArray(item.templates) && item.templates[0] ? item.templates[0] : null;
                const count = tpl?.count || tpl?.countPerLocation || 0;
                const label = getProductSlotChipLabel(count);
                if (!label) return null;
                return (
                  <View style={styles.summaryChipsRow}>
                    <View style={styles.chip}><Ionicons name="add-circle" size={12} color="#4CAF50" style={{ marginRight: 4 }} /><Text style={styles.chipText}>{label}</Text></View>
                  </View>
                );
              })()}
              <Text style={styles.slotTileSubtitle} numberOfLines={2}>{item.description}</Text>
            </View>
            <View style={styles.slotTileRight}>
              {(item.originalPointPrice != null && item.realPointPrice != null && item.originalPointPrice !== item.realPointPrice) ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.slotPriceOriginal, styles.strike]}>{item.originalPointPrice.toLocaleString()}G</Text>
                  <Text style={styles.slotPriceReal}>{item.realPointPrice.toLocaleString()}G</Text>
                </View>
              ) : (
                <Text style={styles.slotPrice}>{(item.originalPointPrice ?? item.realPointPrice ?? item.pointPrice).toLocaleString()}G</Text>
              )}
              <TouchableOpacity style={[styles.slotBuyButton, { marginTop: 6 }]} onPress={() => handlePurchaseItem(item)}>
                <Ionicons name="cart" size={16} color="#fff" />
                <Text style={styles.slotBuyButtonText}>구매</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };
  
  // 포인트 패키지 렌더링
  const renderPointPackages = () => {
    return (
      <View style={styles.pointPackagesRow}>
        {pointPackages.slice(0, 3).map((pkg) => (
          <TouchableOpacity 
            key={pkg.id} 
            style={styles.pointPackageCard}
            onPress={() => handlePurchasePoints(pkg)}
          >
            <Text style={styles.pointPackageName}>{pkg.name}</Text>
            <Text style={styles.pointPackagePrice}>{pkg.price}</Text>
            {pkg.bonus && (
              <Text style={styles.pointPackageBonus}>+{pkg.bonus}G 보너스</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 포인트 내역 렌더링
  const renderPointHistoryItem = ({ item }) => {
    const isAdd = item.type === 'add';
    
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyItemLeft}>
          <Ionicons 
            name={isAdd ? 'add-circle' : 'remove-circle'} 
            size={24} 
            color={isAdd ? '#4CAF50' : '#F44336'} 
          />
          <View style={styles.historyItemInfo}>
            <Text style={styles.historyItemDescription}>{item.description}</Text>
            <Text style={styles.historyItemDate}>
              {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.historyItemAmount,
          isAdd ? styles.historyItemAmountAdd : styles.historyItemAmountUse
        ]}>
          {isAdd ? '+' : '-'}{item.amount.toLocaleString()}G
        </Text>
      </View>
    );
  };
  
  // 현재 슬롯 상태 표시
  const renderCurrentSlots = () => {
    // 유효한 영역 템플릿 수 = 현재 화면에서는 사용자 보유 영역 템플릿 인스턴스를 세지 않으므로, 기본 슬롯만 반영
    const effectiveBaseLocationSlots = slots.locationSlots.baseSlots; // 구독 만료는 템플릿 유효성으로 표현함
    // 유효한 추가 제품 슬롯 인스턴스만 카운트
    const validExtraProductSlots = (userProductSlotTemplateInstances || []).filter(t => isTemplateActive(t, subscription)).length;
    const totalLocationSlots = effectiveBaseLocationSlots + slots.locationSlots.additionalSlots;
    const totalProductSlots = slots.productSlots.baseSlots + validExtraProductSlots;
    
    return (
      <View style={styles.currentSlotsContainer}>
        <Text style={styles.currentSlotsTitle}>현재 보유 슬롯</Text>
        
        <View style={styles.slotInfoRow}>
          <View style={styles.slotInfoItem}>
            <Ionicons name="grid" size={24} color="#4CAF50" />
            <Text style={styles.slotInfoLabel}>영역 슬롯:</Text>
            <Text style={styles.slotInfoValue}>{totalLocationSlots}개</Text>
          </View>
          
          <View style={styles.slotInfoItem}>
            <Ionicons name="cube" size={24} color="#4CAF50" />
            <Text style={styles.slotInfoLabel}>제품 슬롯:</Text>
            <Text style={styles.slotInfoValue}>{totalProductSlots}개/영역</Text>
          </View>
        </View>
        
        {subscription.isSubscribed && (
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionLabel}>
              현재 구독: {subscriptionPlans.find(p => p.id === subscription.plan)?.name || '기본 구독'}
            </Text>
            <Text style={styles.subscriptionExpiry}>
              {isExpired ? '구독 만료됨' : `만료일: ${new Date(subscription.expiresAt).toLocaleString()}`}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  // 포인트 화면으로 이동
  const goToPointScreen = () => {
    navigation.navigate('Point');
  };

  // 프로필 메인 탭으로 이동 (탭 포커스)
  const goToProfileTab = () => {
    try {
      const parentNav = navigation.getParent && navigation.getParent();
      if (parentNav && typeof parentNav.navigate === 'function') {
        // 탭 포커스 + 프로필 스택의 루트로 이동
        parentNav.navigate('Profile', { screen: 'ProfileScreen' });
        return;
      }
    } catch (e) {}
    // 폴백
    try {
      navigation.navigate('ProfileScreen');
    } catch (e) {
      navigation.navigate('Profile');
    }
  };
  
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상점</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {/* 비로그인 상태 안내 */}
        {!isLoggedIn && (
          <View style={styles.loginPrompt}>
            <Ionicons name="lock-closed" size={40} color="#999" />
            <Text style={styles.loginPromptTitle}>로그인이 필요합니다</Text>
            <Text style={styles.loginPromptText}>
              구독 및 슬롯 구매를 위해 로그인이 필요합니다.
            </Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={goToProfileTab}
            >
              <Text style={styles.loginButtonText}>로그인 화면으로 이동</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* 포인트 정보 */}
        {isLoggedIn && (
          <View style={[styles.pointInfoContainer, { marginTop: 12 }]}>
            <View style={styles.pointInfoHeader}>
              <Text style={styles.pointInfoTitle}>보유 G</Text>
            </View>
            <Text style={styles.pointInfoValue}>{(remotePoint != null ? remotePoint : points.balance).toLocaleString()}G</Text>
          </View>
        )}
        
        {/* 현재 슬롯 상태 숨김 */}

        {/* 상점 탭 (사용자 기본 정보 아래) */}
        <View style={styles.shopTabsContainer}>
          <View style={styles.shopTabs}>
            <TouchableOpacity
              style={[styles.shopTabItem, activeShopTab === 'productSlot' && styles.shopTabItemActive]}
              onPress={() => setActiveShopTab('productSlot')}
            >
              <Text style={[styles.shopTabText, activeShopTab === 'productSlot' && styles.shopTabTextActive]}>제품 슬롯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shopTabItem, activeShopTab === 'locationSlot' && styles.shopTabItemActive]}
              onPress={() => setActiveShopTab('locationSlot')}
            >
              <Text style={[styles.shopTabText, activeShopTab === 'locationSlot' && styles.shopTabTextActive]}>영역 슬롯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shopTabItem, activeShopTab === 'subscription' && styles.shopTabItemActive]}
              onPress={() => setActiveShopTab('subscription')}
            >
              <Text style={[styles.shopTabText, activeShopTab === 'subscription' && styles.shopTabTextActive]}>구독 플랜</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shopTabItem, activeShopTab === 'points' && styles.shopTabItemActive]}
              onPress={() => setActiveShopTab('points')}
            >
              <Text style={[styles.shopTabText, activeShopTab === 'points' && styles.shopTabTextActive]}>G 충전</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 탭 내용 */}
        {activeShopTab === 'productSlot' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제품 슬롯</Text>
            {renderProductSlotItems()}
          </View>
        )}

        {activeShopTab === 'locationSlot' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>영역 슬롯</Text>
            {renderLocationSlotItems()}
          </View>
        )}

        {activeShopTab === 'subscription' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>구독 플랜</Text>
            <View style={styles.plansContainer}>
              {renderSubscriptionPlans()}
            </View>
          </View>
        )}

        {activeShopTab === 'points' && (
          <View style={[styles.section, styles.pointChargeSection]}>
            <Text style={styles.sectionTitle}>G 충전</Text>
            {renderPointPackages()}

            {isLoggedIn && pointHistory.length > 0 && (
              <TouchableOpacity 
                style={styles.historyToggleButton}
                onPress={() => setShowPointHistory(!showPointHistory)}
              >
                <Text style={styles.historyToggleText}>
                  {showPointHistory ? '내역 접기' : 'G 내역 자세히 보기'}
                </Text>
                <Ionicons 
                  name={showPointHistory ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="#4CAF50" 
                />
              </TouchableOpacity>
            )}

            {isLoggedIn && pointHistory.length > 0 && showPointHistory && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>G 내역</Text>
                <FlatList
                  data={pointHistory}
                  renderItem={renderPointHistoryItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  style={styles.historyList}
                />
              </View>
            )}
          </View>
        )}
        
        {/* 포인트 내역 섹션 - 제거 */}
      </ScrollView>
      
      {/* 모달 */}
      <PurchaseConfirmModal />
      <PointPurchaseConfirmModal />
      
      <AlertModal 
        visible={alertModalVisible}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        buttons={alertModalConfig.buttons}
        icon={alertModalConfig.icon}
        iconColor={alertModalConfig.iconColor}
        onClose={() => setAlertModalVisible(false)}
      />
      
      <SignupPromptModal 
        visible={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        message="회원 가입하여 구독 및 슬롯 구매를 이용하세요."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  plansContainer: {
    flexDirection: 'column',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  saleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  planPriceOriginal: {
    fontSize: 14,
    color: '#999',
    marginRight: 6,
  },
  planPriceReal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  summaryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  chipText: {
    fontSize: 12,
    color: '#444',
  },
  planFeatures: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subscribedButton: {
    backgroundColor: '#BDBDBD',
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  slotTileLeft: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTileCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  slotTileRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 90,
  },
  slotTileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotTileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  slotTileSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  saleEndCountdown: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '600',
  },
  slotIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
    color: '#333',
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  slotPriceOriginal: {
    fontSize: 13,
    color: '#999',
    marginRight: 6,
  },
  slotPriceReal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  slotDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  currentSlotsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentSlotsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  slotInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
  },
  slotInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  subscriptionInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: '#666',
  },
  loginPrompt: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginPromptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  loginPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalFeatures: {
    marginBottom: 20,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalFeatureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalConfirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalCancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalChargeButton: {
    backgroundColor: '#2196F3',
  },
  chargePointButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pointInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pointInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointInfoTitle: {
    fontSize: 16,
    color: '#666',
  },
  pointInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chargeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chargeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pointInfoInModal: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  pointInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  chargePointButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chargePointButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  
  // 포인트 패키지 스타일
  packagesContainer: {
    flexDirection: 'column',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  bonusContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  bonusText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // 포인트 내역 스타일
  historyList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  historyItemDescription: {
    fontSize: 14,
    color: '#333',
  },
  historyItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historyItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyItemAmountAdd: {
    color: '#4CAF50',
  },
  historyItemAmountUse: {
    color: '#F44336',
  },
  
  // 정보 카드 스타일
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  
  // 모달 스타일
  modalBonus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  pointChargeSection: {
    backgroundColor: '#f5f8ff',
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e8ff',
  },
  
  pointPackagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  
  pointPackageCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  pointPackageName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  pointPackagePrice: {
    fontSize: 13,
    color: '#4CAF50',
    marginBottom: 4,
    textAlign: 'center',
  },
  
  pointPackageBonus: {
    fontSize: 11,
    color: '#FF9800',
    textAlign: 'center',
  },
  planButtonContainer: {
    marginTop: 16,
  },
  planButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 0,
  },
  slotDetailsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  slotDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  slotItemsContainer: {
    flexDirection: 'row',
  },
  slotItemCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
    width: 100,
  },
  slotItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptySlotCard: {
    backgroundColor: '#e0e0e0',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  emptySlotIconContainer: {
    backgroundColor: '#fff',
  },
  emptySlotText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  productListItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productListItemContent: {
    flex: 1,
  },
  productListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productListItemLocation: {
    fontSize: 12,
    color: '#666',
  },
  productListItemExpiry: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  historyToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  historyToggleText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
  },
  historyContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  // 상점 탭 스타일
  shopTabsContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  shopTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  shopTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  shopTabItemActive: {
    backgroundColor: '#E8F5E9',
  },
  shopTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  shopTabTextActive: {
    color: '#4CAF50',
  },
  slotBuyContainer: {
    marginTop: 10,
    width: '100%',
    alignItems: 'flex-end',
  },
  slotBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  slotBuyButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default StoreScreen; 