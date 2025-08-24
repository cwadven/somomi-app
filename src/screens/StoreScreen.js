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
import { fetchLocations } from '../redux/slices/locationsSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';

const StoreScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoggedIn, isAnonymous, user, subscription, slots, points, pointHistory, userProductSlotTemplateInstances } = useSelector(state => state.auth);
  const { locations, status: locationsStatus } = useSelector(state => state.locations);
  
  const [showPointHistory, setShowPointHistory] = useState(false);
  
  // 영역 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchLocations());
    }
  }, [dispatch, isLoggedIn]);
  
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  // 상점 탭 (제품 슬롯, 영역 슬롯, 구독 플랜, G 충전)
  const [activeShopTab, setActiveShopTab] = useState('productSlot'); // 'productSlot' | 'locationSlot' | 'subscription' | 'points'
  const [pointPurchaseConfirmVisible, setPointPurchaseConfirmVisible] = useState(false);
  const [selectedPointPackage, setSelectedPointPackage] = useState(null);
  
  // 구독 플랜 정보
  const subscriptionPlans = [
    {
      id: 'standard',
      name: '스탠다드 플랜',
      pointPrice: 2900,
      locationSlots: 3,
      productSlotsPerLocation: 10,
      description: '일반 사용자를 위한 플랜. 본 상품은 구매일로부터 30일간 유지됩니다.',
      features: ['영역 3개 (영역당 제품 10개)', '제품 슬롯 10개']
    }
  ];
  
  // 슬롯 아이템 정보
  const slotItems = [
    {
      id: 'location_slot_1',
      type: 'locationSlot',
      name: '영역 슬롯 1개',
      pointPrice: 2000,
      amount: 1,
      description: '기본 제품 슬롯:\n3개'
    },
    {
      id: 'location_slot_3',
      type: 'locationSlot',
      name: '영역 슬롯 3개',
      pointPrice: 5000,
      amount: 3,
      description: '기본 제품 슬롯:\n4개×1, 3개×2'
    },
    {
      id: 'product_slot_5',
      type: 'productSlot',
      name: '제품 슬롯 5개',
      pointPrice: 1000,
      amount: 5,
      description: '영역당 추가 제품 5개를 등록할 수 있습니다.'
    },
    {
      id: 'product_slot_10',
      type: 'productSlot',
      name: '제품 슬롯 10개',
      pointPrice: 1800,
      amount: 10,
      description: '영역당 추가 제품 10개를 등록할 수 있습니다.'
    }
  ];
  
  // 포인트 패키지 정보
  const pointPackages = [
    {
      id: 'point_1000',
      name: '1,000 G',
      points: 1000,
      price: '1,000원',
      description: '기본 젬 패키지'
    },
    {
      id: 'point_5000',
      name: '5,000 G',
      points: 5000,
      price: '5,000원',
      description: '인기 젬 패키지'
    },
    {
      id: 'point_10000',
      name: '10,000 G',
      points: 10000,
      price: '10,000원',
      description: '가성비 젬 패키지'
    },
    {
      id: 'point_30000',
      name: '30,000 G',
      points: 30000,
      price: '30,000원',
      description: '대용량 젬 패키지',
      bonus: 3000
    },
    {
      id: 'point_50000',
      name: '50,000 G',
      points: 50000,
      price: '50,000원',
      description: '프리미엄 젬 패키지',
      bonus: 7500
    }
  ];
  
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
  
  // 슬롯 구매 처리
  const handlePurchaseSlot = (item) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        goToProfileTab();
      }
      return;
    }
    
    setSelectedProduct({
      kind: 'slot',
      type: item.type, // 'locationSlot' | 'productSlot'
      ...item
    });
    setPurchaseConfirmVisible(true);
  };
  
  // 구매 확정 처리
  const confirmPurchase = () => {
    setPurchaseConfirmVisible(false);
    
    if (!selectedProduct) return;
    
    try {
      // 포인트 차감
      const pointCost = selectedProduct.pointPrice;
      
      // 포인트가 부족한 경우
      if (points.balance < pointCost) {
        showErrorModal(`젬이 부족합니다.\n현재 젬: ${points.balance.toLocaleString()}G\n필요 젬: ${pointCost.toLocaleString()}G`);
        return;
      }
      
      if (selectedProduct.type === 'subscription') {
        // 포인트 사용 - usePoints 액션 호출
        dispatch(usePoints({
          amount: pointCost,
          description: `${selectedProduct.name} 구독 구매`,
          itemId: selectedProduct.id,
          itemType: 'subscription'
        }));
        
        // 구독 처리 - 테스트용 20초 유효 기간
        const expiryDate = new Date(Date.now() + 20 * 1000);
        
        dispatch(updateSubscription({
          isSubscribed: true,
          plan: selectedProduct.id,
          expiresAt: expiryDate.toISOString()
        }));
        
        // 슬롯 업데이트
        dispatch(updateSlots({
          locationSlots: {
            baseSlots: selectedProduct.locationSlots,
          },
          productSlots: {
            baseSlots: selectedProduct.productSlotsPerLocation,
          }
        }));
        // 템플릿 인스턴스 동기화 (somomi_user_location_templates 최신화)
        dispatch(applySubscriptionToTemplates({
          locationSlots: selectedProduct.locationSlots,
          productSlotsPerLocation: selectedProduct.productSlotsPerLocation,
          planId: selectedProduct.id,
          expiresAt: expiryDate.toISOString(),
        }));
        
        // 구매 내역 추가
        dispatch(addPurchase({
          id: `sub_${Date.now()}`,
          type: 'subscription',
          planId: selectedProduct.id,
          planName: selectedProduct.name,
          price: selectedProduct.pointPrice,
          pointsUsed: pointCost,
          expiresAt: expiryDate.toISOString()
        }));
        
        showSuccessModal('구독 완료', `${selectedProduct.name} 구독이 완료되었습니다. 이제 더 많은 영역과 제품을 등록할 수 있습니다.`);
      } else if (selectedProduct.type === 'productSlot' || selectedProduct.type === 'locationSlot' || selectedProduct.kind === 'slot') {
        // 포인트 사용 - usePoints 액션 호출
        dispatch(usePoints({
          amount: pointCost,
          description: `${selectedProduct.name} 구매`,
          itemId: selectedProduct.id,
          itemType: 'slot'
        }));
        
        // 슬롯 구매 처리
        if (selectedProduct.type === 'locationSlot') {
          dispatch(updateSlots({
            locationSlots: {
              additionalSlots: slots.locationSlots.additionalSlots + selectedProduct.amount
            }
          }));
          // 영역 템플릿도 함께 추가하여 즉시 사용 가능하도록 함
          for (let i = 0; i < selectedProduct.amount; i++) {
            if (selectedProduct.id === 'location_slot_1') {
              // 1개 패키지: 기본 슬롯 3개 템플릿 생성
              dispatch(addTemplateInstance({
                productId: 'basic_location',
                name: '기본 영역',
                description: '기본적인 제품 관리 기능을 제공하는 영역',
                icon: 'cube-outline',
                feature: { baseSlots: 3 },
                used: false,
                usedInLocationId: null,
              }));
            } else if (selectedProduct.id === 'location_slot_3') {
              // 3개 패키지: 1개는 기본 슬롯 4개, 2개는 3개
              const baseSlots = i === 0 ? 4 : 3;
              dispatch(addTemplateInstance({
                productId: 'basic_location',
                name: '기본 영역',
                description: '기본적인 제품 관리 기능을 제공하는 영역',
                icon: 'cube-outline',
                feature: { baseSlots },
                used: false,
                usedInLocationId: null,
              }));
            } else {
              // 그 외 패키지: 기본 템플릿 생성(기존 기본값 적용)
              dispatch(addBasicTemplateInstance());
            }
          }
          
          // 업데이트된 슬롯 정보를 포함한 성공 메시지
          const totalLocationSlots = slots.locationSlots.baseSlots + slots.locationSlots.additionalSlots + selectedProduct.amount;
          showSuccessModal('구매 완료', `${selectedProduct.name} 구매가 완료되었습니다.\n현재 보유 영역 슬롯: ${totalLocationSlots}개`);
        } else if (selectedProduct.type === 'productSlot') {
          // 제품 슬롯: 템플릿 인스턴스 생성으로 전환
          dispatch(addProductSlotTemplateInstances({ count: selectedProduct.amount }));
           
          // 업데이트된 슬롯 정보를 포함한 성공 메시지
          const nextTemplatesCount = (userProductSlotTemplateInstances?.length || 0) + selectedProduct.amount;
          showSuccessModal('구매 완료', `${selectedProduct.name} 구매가 완료되었습니다.\n보유 추가 제품 슬롯: ${nextTemplatesCount}개`);
        }
        
        // 구매 내역 추가
        dispatch(addPurchase({
          id: `slot_${Date.now()}`,
          type: 'slot',
          itemId: selectedProduct.id,
          itemName: selectedProduct.name,
          price: selectedProduct.pointPrice,
          pointsUsed: pointCost,
          amount: selectedProduct.amount
        }));
        
        // showSuccessModal('구매 완료', `${selectedProduct.name} 구매가 완료되었습니다.`); // 이 부분은 위에서 대체됨
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
    if (!selectedProduct) return null;
    
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
              <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
              <Text style={styles.modalProductPrice}>{selectedProduct.pointPrice.toLocaleString()}G</Text>
              
              {selectedProduct.type === 'subscription' && (
                <View style={styles.modalFeatures}>
                  {selectedProduct.features.map((feature, index) => (
                    <View key={index} style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.modalFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {(selectedProduct.type === 'productSlot' || selectedProduct.type === 'locationSlot' || selectedProduct.kind === 'slot') && (
                <Text style={styles.modalDescription}>
                  {selectedProduct.description}
                </Text>
              )}
              
              <View style={styles.pointInfoInModal}>
                <Text style={styles.pointInfoText}>현재 젬: {points.balance.toLocaleString()}G</Text>
                <Text style={styles.pointInfoText}>
                  구매 후 젬: {Math.max(0, points.balance - selectedProduct.pointPrice).toLocaleString()}G
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setPurchaseConfirmVisible(false)}
                >
                  <Text style={styles.modalCancelButtonText}>취소</Text>
                </TouchableOpacity>
                
                {points.balance >= selectedProduct.pointPrice ? (
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
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>
          {plan.pointPrice === 0 ? '무료' : `${plan.pointPrice.toLocaleString()}G`}
        </Text>
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
              {plan.pointPrice === 0 ? '시작하기' : '구독하기'}
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
        {slotItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.slotCard}
            onPress={() => handlePurchaseSlot(item)}
          >
            <View style={styles.slotIconContainer}>
              <Ionicons 
                name={item.type === 'locationSlot' ? 'grid' : 'cube'} 
                size={30} 
                color="#4CAF50" 
              />
            </View>
            <Text style={styles.slotName}>{item.name}</Text>
            <Text style={styles.slotPrice}>{item.pointPrice.toLocaleString()}G</Text>
            <Text style={styles.slotDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 영역 슬롯만 렌더링
  const renderLocationSlotItems = () => {
    const items = slotItems.filter((i) => i.type === 'locationSlot');
    return (
      <View style={styles.slotsGrid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.slotCard}
            onPress={() => handlePurchaseSlot(item)}
          >
            <View style={styles.slotIconContainer}>
              <Ionicons name="grid" size={30} color="#4CAF50" />
            </View>
            <Text style={styles.slotName}>{item.name}</Text>
            <Text style={styles.slotPrice}>{item.pointPrice.toLocaleString()}G</Text>
            <Text style={styles.slotDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 제품 슬롯만 렌더링
  const renderProductSlotItems = () => {
    const items = slotItems.filter((i) => i.type === 'productSlot');
    return (
      <View style={styles.slotsGrid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.slotCard}
            onPress={() => handlePurchaseSlot(item)}
          >
            <View style={styles.slotIconContainer}>
              <Ionicons name="cube" size={30} color="#4CAF50" />
            </View>
            <Text style={styles.slotName}>{item.name}</Text>
            <Text style={styles.slotPrice}>{item.pointPrice.toLocaleString()}G</Text>
            <Text style={styles.slotDescription}>{item.description}</Text>
          </TouchableOpacity>
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
    const now = Date.now();
    const isExpired = subscription?.isSubscribed && subscription?.expiresAt && now >= new Date(subscription.expiresAt).getTime();
    const effectiveBaseLocationSlots = isExpired ? 0 : slots.locationSlots.baseSlots;
    const totalLocationSlots = effectiveBaseLocationSlots + slots.locationSlots.additionalSlots;
    const totalProductSlots = slots.productSlots.baseSlots + (userProductSlotTemplateInstances?.length || 0);
    
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
        parentNav.navigate('Profile');
        return;
      }
    } catch (e) {}
    // 폴백
    navigation.navigate('Profile');
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
          <View style={styles.pointInfoContainer}>
            <View style={styles.pointInfoHeader}>
              <Text style={styles.pointInfoTitle}>보유 G</Text>
            </View>
            <Text style={styles.pointInfoValue}>{points.balance.toLocaleString()}G</Text>
          </View>
        )}
        
        {/* 현재 슬롯 상태 */}
        {isLoggedIn && renderCurrentSlots()}

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
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
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
    justifyContent: 'space-between',
  },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
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
    marginBottom: 12,
  },
  slotName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  slotPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
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
});

export default StoreScreen; 