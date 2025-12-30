import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addPoints } from '../redux/slices/authSlice';
import AlertModal from '../components/AlertModal';
import SignupPromptModal from '../components/SignupPromptModal';

const PointScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { isLoggedIn, isAnonymous, user, points, pointHistory } = useSelector(state => state.auth);
  
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
  const [selectedPointPackage, setSelectedPointPackage] = useState(null);
  
  // 포인트 패키지 정보
  const pointPackages = [
    {
      id: 'point_1000',
      name: '1,000 포인트',
      points: 1000,
      price: '1,000원',
      description: '기본 포인트 패키지'
    },
    {
      id: 'point_5000',
      name: '5,000 포인트',
      points: 5000,
      price: '5,000원',
      description: '인기 포인트 패키지'
    },
    {
      id: 'point_10000',
      name: '10,000 포인트',
      points: 10000,
      price: '10,000원',
      description: '가성비 포인트 패키지'
    },
    {
      id: 'point_30000',
      name: '30,000 포인트',
      points: 30000,
      price: '30,000원',
      description: '대용량 포인트 패키지',
      bonus: 3000
    },
    {
      id: 'point_50000',
      name: '50,000 포인트',
      points: 50000,
      price: '50,000원',
      description: '프리미엄 포인트 패키지',
      bonus: 7500
    }
  ];
  
  // 포인트 충전 처리
  const handlePurchasePoints = (pointPackage) => {
    if (!isLoggedIn) {
      if (isAnonymous) {
        setShowSignupPrompt(true);
      } else {
        navigation.navigate('Profile');
      }
      return;
    }
    
    setSelectedPointPackage(pointPackage);
    setPurchaseConfirmVisible(true);
  };
  
  // 포인트 충전 확정 처리
  const confirmPurchase = () => {
    setPurchaseConfirmVisible(false);
    
    if (!selectedPointPackage) return;
    
    try {
      // 포인트 충전 처리
      const totalPoints = selectedPointPackage.points + (selectedPointPackage.bonus || 0);
      
      dispatch(addPoints({
        amount: totalPoints,
        description: `${selectedPointPackage.name} 구매${selectedPointPackage.bonus ? ` (+보너스 ${selectedPointPackage.bonus}P)` : ''}`,
        paymentMethod: '신용카드'
      }));
      
      showSuccessModal(
        '포인트 충전 완료', 
        `${totalPoints.toLocaleString()}P가 충전되었습니다.\n현재 보유 포인트: ${(points.balance + totalPoints).toLocaleString()}P`
      );
    } catch (error) {
      showErrorModal('포인트 충전 중 오류가 발생했습니다.');
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
  
  // 포인트 구매 확인 모달
  const PurchaseConfirmModal = () => (
    <Modal
      visible={purchaseConfirmVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setPurchaseConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>포인트 구매 확인</Text>
          
          {selectedPointPackage && (
            <>
              <Text style={styles.modalProductName}>{selectedPointPackage.name}</Text>
              <Text style={styles.modalProductPrice}>{selectedPointPackage.price}</Text>
              
              {selectedPointPackage.bonus && (
                <Text style={styles.modalBonus}>+{selectedPointPackage.bonus.toLocaleString()} 보너스 포인트</Text>
              )}
              
              <Text style={styles.modalDescription}>
                결제 후 즉시 포인트가 충전됩니다.
              </Text>
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
  
  // 포인트 패키지 렌더링
  const renderPointPackages = () => {
    return pointPackages.map((pkg) => (
      <TouchableOpacity 
        key={pkg.id} 
        style={styles.packageCard}
        onPress={() => handlePurchasePoints(pkg)}
      >
        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{pkg.name}</Text>
          <Text style={styles.packagePrice}>{pkg.price}</Text>
        </View>
        
        <Text style={styles.packageDescription}>{pkg.description}</Text>
        
        {pkg.bonus && (
          <View style={styles.bonusContainer}>
            <Text style={styles.bonusText}>+{pkg.bonus.toLocaleString()} 보너스 포인트</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.buyButton}
          onPress={() => handlePurchasePoints(pkg)}
        >
          <Text style={styles.buyButtonText}>충전하기</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ));
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
          {isAdd ? '+' : '-'}{item.amount.toLocaleString()}P
        </Text>
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
        <Text style={styles.headerTitle}>포인트</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {/* 포인트 정보 */}
        {isLoggedIn ? (
          <View style={styles.pointInfoContainer}>
            <Text style={styles.pointInfoLabel}>보유 포인트</Text>
            <Text style={styles.pointInfoValue}>{points.balance.toLocaleString()}P</Text>
          </View>
        ) : (
          <View style={styles.loginPrompt}>
            <Ionicons name="lock-closed" size={40} color="#999" />
            <Text style={styles.loginPromptTitle}>로그인이 필요합니다</Text>
            <Text style={styles.loginPromptText}>
              포인트 충전 및 사용을 위해 로그인이 필요합니다.
            </Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.loginButtonText}>로그인 화면으로 이동</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* 포인트 충전 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>포인트 충전</Text>
          <View style={styles.packagesContainer}>
            {renderPointPackages()}
          </View>
        </View>
        
        {/* 포인트 내역 섹션 */}
        {isLoggedIn && pointHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>포인트 내역</Text>
            <FlatList
              data={pointHistory}
              renderItem={renderPointHistoryItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              style={styles.historyList}
            />
          </View>
        )}
        
        {/* 포인트 사용 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>포인트 사용 안내</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>포인트로 할 수 있는 것</Text>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={styles.infoIcon} />
              <Text style={styles.infoText}>추가 영역 슬롯 구매</Text>
            </View>
          </View>
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
        message="회원 가입하여 포인트 충전 및 사용 혜택을 이용하세요."
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
  pointInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pointInfoLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  pointInfoValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    marginBottom: 8,
  },
  modalBonus: {
    fontSize: 14,
    fontWeight: '600',
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

export default PointScreen; 