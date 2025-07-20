import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateSubscription, updateSlots, addPurchase } from '../redux/slices/authSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';

const StoreScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoggedIn, isAnonymous, user, subscription, slots } = useSelector(state => state.auth);
  
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
  
  // 구독 플랜 정보
  const subscriptionPlans = [
    {
      id: 'basic',
      name: '기본 구독',
      price: '5,000원/월',
      features: [
        '영역 5개 생성 가능',
        '영역당 제품 10개 등록 가능',
        '모든 알림 기능 사용 가능'
      ],
      locationSlots: 5,
      productSlotsPerLocation: 10,
    },
    {
      id: 'premium',
      name: '프리미엄 구독',
      price: '10,000원/월',
      features: [
        '영역 무제한 생성',
        '영역당 제품 20개 등록 가능',
        '모든 알림 기능 사용 가능',
        'AI 추천 기능 사용 가능'
      ],
      locationSlots: 999, // 무제한
      productSlotsPerLocation: 20,
    }
  ];
  
  // 슬롯 아이템 정보
  const slotItems = [
    {
      id: 'location_slot_1',
      name: '영역 슬롯 1개',
      price: '1,000원',
      type: 'locationSlot',
      amount: 1,
      description: '영역을 1개 더 생성할 수 있습니다.'
    },
    {
      id: 'location_slot_3',
      name: '영역 슬롯 3개',
      price: '2,500원',
      type: 'locationSlot',
      amount: 3,
      description: '영역을 3개 더 생성할 수 있습니다.'
    },
    {
      id: 'product_slot_5',
      name: '제품 슬롯 5개',
      price: '1,500원',
      type: 'productSlot',
      amount: 5,
      description: '각 영역에 제품을 5개 더 등록할 수 있습니다.'
    },
    {
      id: 'product_slot_10',
      name: '제품 슬롯 10개',
      price: '2,800원',
      type: 'productSlot',
      amount: 10,
      description: '각 영역에 제품을 10개 더 등록할 수 있습니다.'
    }
  ];
  
  // 구독 구매 처리
  const handleSubscribe = (plan) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        navigation.navigate('Profile');
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
        navigation.navigate('Profile');
      }
      return;
    }
    
    setSelectedProduct({
      type: 'slot',
      ...item
    });
    setPurchaseConfirmVisible(true);
  };
  
  // 구매 확정 처리
  const confirmPurchase = () => {
    setPurchaseConfirmVisible(false);
    
    if (!selectedProduct) return;
    
    try {
      if (selectedProduct.type === 'subscription') {
        // 구독 처리
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 1개월 구독
        
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
        
        // 구매 내역 추가
        dispatch(addPurchase({
          id: `sub_${Date.now()}`,
          type: 'subscription',
          planId: selectedProduct.id,
          planName: selectedProduct.name,
          price: selectedProduct.price,
          expiresAt: expiryDate.toISOString()
        }));
        
        showSuccessModal('구독 완료', `${selectedProduct.name} 구독이 완료되었습니다. 이제 더 많은 영역과 제품을 등록할 수 있습니다.`);
      } else if (selectedProduct.type === 'slot') {
        // 슬롯 구매 처리
        if (selectedProduct.type === 'locationSlot') {
          dispatch(updateSlots({
            locationSlots: {
              additionalSlots: slots.locationSlots.additionalSlots + selectedProduct.amount
            }
          }));
        } else if (selectedProduct.type === 'productSlot') {
          dispatch(updateSlots({
            productSlots: {
              additionalSlots: slots.productSlots.additionalSlots + selectedProduct.amount
            }
          }));
        }
        
        // 구매 내역 추가
        dispatch(addPurchase({
          id: `slot_${Date.now()}`,
          type: 'slot',
          itemId: selectedProduct.id,
          itemName: selectedProduct.name,
          price: selectedProduct.price,
          amount: selectedProduct.amount
        }));
        
        showSuccessModal('구매 완료', `${selectedProduct.name} 구매가 완료되었습니다.`);
      }
    } catch (error) {
      showErrorModal('구매 처리 중 오류가 발생했습니다.');
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
  const PurchaseConfirmModal = () => (
    <Modal
      visible={purchaseConfirmVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setPurchaseConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>구매 확인</Text>
          
          {selectedProduct && (
            <>
              <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
              <Text style={styles.modalProductPrice}>{selectedProduct.price}</Text>
              
              {selectedProduct.type === 'subscription' ? (
                <Text style={styles.modalDescription}>
                  구독은 매월 자동으로 갱신됩니다. 언제든지 취소할 수 있습니다.
                </Text>
              ) : (
                <Text style={styles.modalDescription}>
                  {selectedProduct.description}
                </Text>
              )}
            </>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setPurchaseConfirmVisible(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]}
              onPress={confirmPurchase}
            >
              <Text style={styles.confirmButtonText}>구매하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // 구독 플랜 렌더링
  const renderSubscriptionPlans = () => {
    return subscriptionPlans.map((plan) => (
      <View key={plan.id} style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>{plan.price}</Text>
        </View>
        
        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.subscribeButton,
            subscription?.plan === plan.id && styles.subscribedButton
          ]}
          onPress={() => handleSubscribe(plan)}
          disabled={subscription?.plan === plan.id}
        >
          <Text style={styles.subscribeButtonText}>
            {subscription?.plan === plan.id ? '구독 중' : '구독하기'}
          </Text>
        </TouchableOpacity>
      </View>
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
            <Text style={styles.slotPrice}>{item.price}</Text>
            <Text style={styles.slotDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 현재 슬롯 상태 표시
  const renderCurrentSlots = () => {
    const totalLocationSlots = slots.locationSlots.baseSlots + slots.locationSlots.additionalSlots;
    const totalProductSlots = slots.productSlots.baseSlots + slots.productSlots.additionalSlots;
    
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
              만료일: {new Date(subscription.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    );
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
        {/* 현재 슬롯 상태 */}
        {isLoggedIn && renderCurrentSlots()}
        
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
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.loginButtonText}>로그인 화면으로 이동</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* 구독 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>구독 플랜</Text>
          <View style={styles.plansContainer}>
            {renderSubscriptionPlans()}
          </View>
        </View>
        
        {/* 슬롯 구매 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>추가 슬롯 구매</Text>
          {renderSlotItems()}
        </View>
      </ScrollView>
      
      {/* 모달 */}
      <PurchaseConfirmModal />
      
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
    marginBottom: 16,
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StoreScreen; 