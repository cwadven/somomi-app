import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Modal,
  Linking
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';
import KakaoLoginButton from '../components/KakaoLoginButton';
import PushNotificationTest from '../components/PushNotificationTest';
import NotificationSettings from '../components/NotificationSettings';
import NotificationDebugger from '../components/NotificationDebugger';
import { clearAllData } from '../utils/storageUtils';
import { initializeData } from '../api/productsApi';
import { fetchLocations } from '../redux/slices/locationsSlice';
import AlertModal from '../components/AlertModal';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isLoggedIn, isAnonymous, loading, error } = useSelector(state => state.auth);

  // route.params로 전달된 initialMode가 있으면 해당 모드로 설정
  useEffect(() => {
    if (route.params?.initialMode) {
      // 모드 관련 처리가 필요한 경우 여기에 구현
    }
  }, [route.params]);

  // 안드로이드 시스템 알림 설정으로 이동하는 함수
  const openAndroidNotificationSettings = () => {
    if (Platform.OS === 'android') {
      try {
        // 안드로이드 앱 정보 설정 화면으로 이동
        const appId = Platform.constants.Package || 'com.somomi.app';

        // 안드로이드 버전에 따라 다른 인텐트 사용
        if (Platform.Version >= 26) { // Android 8.0 (Oreo) 이상
          Linking.openSettings();
        } else if (Platform.Version >= 21) { // Android 5.0 (Lollipop) 이상
          Linking.openURL(`app-settings://notification/${appId}`);
        } else {
          // 이전 버전에서는 앱 정보 화면으로 이동
          Linking.openURL(`app-settings://${appId}`);
        }
      } catch (error) {
        console.error('알림 설정 화면 열기 실패:', error);
        setModalTitle('알림 설정');
        setModalMessage('알림 설정 화면을 열 수 없습니다. 설정 앱에서 수동으로 앱의 알림 설정을 변경해주세요.');
        setModalAction(null);
        setModalVisible(true);
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    setModalTitle('로그아웃');
    setModalMessage('정말 로그아웃 하시겠습니까?');
    setModalAction(() => dispatch(logout()));
    setModalVisible(true);
  };

  // 카카오 로그인 관련 콜백
  const handleLoginStart = () => {
    console.log('카카오 로그인 시작');
  };

  const handleLoginComplete = () => {
    console.log('카카오 로그인 완료');
  };

  // 로그인 오류 처리
  const handleLoginError = (errorMsg) => {
    setModalTitle('로그인 실패');
    setModalMessage(errorMsg);
    setModalAction(null);
    setModalVisible(true);
  };

  // 알림 설정 모달 상태
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setModalVisible(false);
    if (modalAction) {
      modalAction();
    }
  };

  // 앱 정보 표시
  const showAppInfo = () => {
    setModalTitle('앱 정보');
    setModalMessage('소모미 (SoMoMi) v1.0.0\n생활용품 리마인드 알림 앱');
    setModalAction(null);
    setModalVisible(true);
  };

  // 도움말 표시
  const showHelp = () => {
    setModalTitle('알림');
    setModalMessage('도움말 기능은 아직 구현되지 않았습니다.');
    setModalAction(null);
    setModalVisible(true);
  };

  // 문의하기 표시
  const showContact = () => {
    setModalTitle('알림');
    setModalMessage('문의하기 기능은 아직 구현되지 않았습니다.');
    setModalAction(null);
    setModalVisible(true);
  };

  // 설정 메뉴 아이템 컴포넌트
  const SettingItem = ({ icon, title, onPress, showBadge = false }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={24} color="#4CAF50" style={styles.settingIcon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {showBadge && <View style={styles.badge} />}
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  // 프로필 화면
  const renderProfileScreen = () => (
    <ScrollView style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileHeader}>
        {isLoggedIn && user ? (
          <>
            <Image
              source={{ uri: user.profileImage || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user.username || user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </>
        ) : isAnonymous ? (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>비회원으로 이용 중</Text>
            <Text style={styles.loginSubtitle}>
              회원가입하면 더 많은 기능을 이용할 수 있습니다.
              {'\n'}(영역 무제한 생성, 상품 무제한 등록)
            </Text>
            <View style={styles.authButtonsContainer}>
              <KakaoLoginButton
                onLoginStart={handleLoginStart}
                onLoginComplete={handleLoginComplete}
                onLoginError={handleLoginError}
              />
            </View>
          </View>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>로그인이 필요합니다</Text>
            <Text style={styles.loginSubtitle}>
              제품 정보를 클라우드에 저장하고 여러 기기에서 동기화하려면 로그인하세요.
            </Text>
            <View style={styles.authButtonsContainer}>
              <KakaoLoginButton
                onLoginStart={handleLoginStart}
                onLoginComplete={handleLoginComplete}
                onLoginError={handleLoginError}
              />
            </View>
          </View>
        )}
      </View>

      {/* 앱푸시 테스트 섹션 - 모든 사용자에게 표시 */}
      {Platform.OS !== 'web' && (
        <View style={styles.pushTestSection}>
          <PushNotificationTest />
        </View>
      )}

      {/* 로그인 한 경우에만 앱 설정 표시 */}
      {isLoggedIn && user && (
        <>
          {/* 설정 섹션 */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>앱 설정</Text>

            <SettingItem
              icon="notifications-outline"
              title="알림 설정"
              onPress={() => setShowNotificationModal(true)}
            />

            {Platform.OS === 'android' && (
              <SettingItem
                icon="phone-portrait-outline"
                title="안드로이드 앱 푸시 설정"
                onPress={() => openAndroidNotificationSettings()}
            />
            )}
          </View>
        </>
      )}

      {/* 알림 테스트 섹션 - 모든 사용자에게 표시 */}
      {Platform.OS !== 'web' && (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>알림 테스트</Text>
          <View style={styles.notificationDebuggerContainer}>
            <NotificationDebugger />
          </View>
        </View>
      )}

      {/* 정보 섹션은 항상 표시 */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>정보</Text>

        <SettingItem
          icon="checkmark-done-circle-outline"
          title="소진 처리한 상품 목록"
          onPress={() => navigation.navigate('ConsumedProducts')}
        />
        
        <SettingItem
          icon="notifications-outline"
          title="알림 목록"
          onPress={() => navigation.navigate('Notifications')}
        />

        <SettingItem
          icon="information-circle-outline"
          title="앱 정보"
          onPress={showAppInfo}
        />

        <SettingItem
          icon="help-circle-outline"
          title="도움말"
          onPress={showHelp}
        />

        {/* 문의하기는 로그인한 사용자에게만 표시 */}
        {isLoggedIn && (
          <SettingItem
            icon="mail-outline"
            title="문의하기"
            onPress={showContact}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>소모미 (SoMoMi) v1.0.0</Text>
      </View>
    </ScrollView>
  );

  // 알림 설정 모달
  const NotificationSettingsModal = () => (
    <Modal
      visible={showNotificationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowNotificationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>알림 설정</Text>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              앱 전체 알림 설정을 관리합니다. 이 설정을 비활성화하면 모든 알림이 중지됩니다.
            </Text>
            <NotificationSettings />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {renderProfileScreen()}
      <NotificationSettingsModal />
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '500',
  },
  loginContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  authButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  pushTestSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  notificationDebuggerContainer: {
    padding: 16,
  },
  // 모달 관련 스타일 추가
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
});

export default ProfileScreen; 