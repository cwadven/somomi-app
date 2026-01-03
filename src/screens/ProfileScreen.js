import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Modal,
  Linking } from
'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';
import { fetchMemberProfile } from '../api/memberApi';
import NotificationSettings from '../components/NotificationSettings';



















import { loadSyncQueue } from '../utils/storageUtils';
import AlertModal from '../components/AlertModal';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isLoggedIn, isAnonymous, loading, error } = useSelector((state) => state.auth);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  // route.params로 전달된 initialMode가 있으면 해당 모드로 설정
  useEffect(() => {
    if (route.params?.initialMode) {

      // 모드 관련 처리가 필요한 경우 여기에 구현
    }}, [route.params]);

  // 세션 만료 모달 처리
  useEffect(() => {
    if (route.params?.sessionExpired) {
      setModalTitle('로그인 만료');
      setModalMessage('세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.');
      setModalButtons([
      { text: '확인', onPress: () => {setModalVisible(false);} }]
      );
      setModalVisible(true);
      // 한 번만 표시되도록 파라미터 제거
      try {
        navigation.setParams({ sessionExpired: undefined });
      } catch (e) {}
    }
  }, [route.params?.sessionExpired]);

  // 초기 큐 상태 로드
  useEffect(() => {
    (async () => {
      try {
        const q = await loadSyncQueue();
        setSyncQueueCount(Array.isArray(q) ? q.length : 0);
      } catch (e) {}
    })();
  }, []);

  // 로그인 상태에서 화면 진입 시 프로필 최신화
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isLoggedIn) {
          const res = await fetchMemberProfile();
          // 응답 매핑: nickname, profile_image_url
          const next = {
            ...user,
            username: res?.nickname || user?.username || '사용자',
            name: res?.nickname || user?.name || '사용자',
            email: undefined, // 이메일 영역 제거
            profileImage: res?.profile_image_url || null
          };
          // 로컬에서만 최신화: authSlice에 user 업데이트 로직이 없다면 화면 레벨 상태로 반영
          // 간단히 setState 없이 selector 기반 표시 값을 가공해 사용하려 했으나, 여기서는 임시로 객체 교체
          // eslint-disable-next-line no-param-reassign
          if (mounted) {
            // NOTE: Redux 상태 직접 변경 불가 → 화면에서 next를 우선 사용하도록 로컬 상태 보관
            setProfileOverride(next);
          }
        }
      } catch (e) {

        // 무시: 비로그인/토큰 오류 시 그대로
      }})();
    return () => {mounted = false;};
  }, [isLoggedIn]);

  const [profileOverride, setProfileOverride] = useState(null);

  useEffect(() => {
    let interval;
    (async () => {
      interval = setInterval(async () => {
        try {
          const q = await loadSyncQueue();
          setSyncQueueCount(Array.isArray(q) ? q.length : 0);
        } catch (e) {}
      }, 1500);
    })();
    return () => {if (interval) clearInterval(interval);};
  }, []);

  // 안드로이드 시스템 알림 설정으로 이동하는 함수
  const openAndroidNotificationSettings = () => {
    if (Platform.OS === 'android') {
      try {
        // 안드로이드 앱 정보 설정 화면으로 이동
        const appId = Platform.constants.Package || 'com.somomi.app';

        // 안드로이드 버전에 따라 다른 인텐트 사용
        if (Platform.Version >= 26) {// Android 8.0 (Oreo) 이상
          Linking.openSettings();
        } else if (Platform.Version >= 21) {// Android 5.0 (Lollipop) 이상
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
    setModalAction(null);
    setModalButtons([
    { text: '확인', onPress: () => {setModalVisible(false);dispatch(logout());} },
    { text: '취소', style: 'cancel', onPress: () => setModalVisible(false) }]
    );
    setModalVisible(true);
  };

  // 카카오 로그인 관련 콜백








  // 로그인 오류 처리







  // 알림 설정 모달 상태
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [modalButtons, setModalButtons] = useState(null);

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setModalVisible(false);
    // onClose에서는 액션을 수행하지 않음 (버튼으로만 수행)
    setModalButtons(null);
  };

  // 앱 정보 표시
  const showAppInfo = () => {
    setModalTitle('앱 정보');
    setModalMessage('소모미 (SoMoMi) v1.0.0\n생활용품 리마인드 알림 앱');
    setModalAction(null);
    setModalButtons([
    { text: '확인', onPress: () => setModalVisible(false) }]
    );
    setModalVisible(true);
  };

  // 도움말 표시
  const showHelp = () => {
    navigation.navigate('RootHelp');
  };

  // 문의하기(미구현) - 추후 기능 추가 예정
  // const showContact = () => {
  //   setModalTitle('알림');
  //   setModalMessage('문의하기 기능은 아직 구현되지 않았습니다.');
  //   setModalAction(null);
  //   setModalVisible(true);
  // };

  // 설정 메뉴 아이템 컴포넌트
  const SettingItem = ({ icon, title, onPress, showBadge = false }) =>
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={24} color="#4CAF50" style={styles.settingIcon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {showBadge && <View style={styles.badge} />}
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>;


  // 프로필 화면
  const renderProfileScreen = () =>
  <ScrollView style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileHeader}>
        {isLoggedIn && (profileOverride || user) ?
      <>
            {profileOverride?.profileImage || user?.profileImage ?
        <Image source={{ uri: profileOverride?.profileImage || user?.profileImage }} style={styles.profileImage} /> :

        <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                <Ionicons name="person-circle" size={64} color="#9E9E9E" />
              </View>
        }
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{profileOverride?.username || profileOverride?.name || user?.username || user?.name || '사용자'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </> :

      <View style={styles.loginContainer}>
            <Text style={styles.loginSubtitle}>다양한 기능을 이용하려면 로그인 해주세요.</Text>
            <View style={styles.authButtonsContainer}>
              <TouchableOpacity
            style={styles.authCtaButton}
            onPress={() => navigation.navigate('RootLogin')}>

                <Text style={styles.authCtaText}>로그인/회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
      }
      </View>

      {/* 앱푸시 테스트 섹션 제거 */}

      {/* 앱 설정: 로그인 완료 후에만 표시 */}
      {isLoggedIn && user ?
    <>
          {/* 설정 섹션 */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>앱 설정</Text>

            <SettingItem
          icon="notifications-outline"
          title="알림 설정"
          onPress={() => setShowNotificationModal(true)} />


            {Platform.OS === 'android' &&
        <SettingItem
          icon="phone-portrait-outline"
          title="안드로이드 앱 푸시 설정"
          onPress={() => openAndroidNotificationSettings()} />

        }
          </View>
        </> :
    null}

      {/* 정보 섹션: 일부 항목은 로그인 후에만 표시 */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>정보</Text>
        
        {isLoggedIn && user &&
      <>
            <SettingItem
          icon="checkmark-done-circle-outline"
          title="소진 처리한 상품 목록"
          onPress={() => navigation.navigate('ConsumedProducts')} />

            
            <SettingItem
          icon="notifications-outline"
          title="알림 목록"
          onPress={() => navigation.navigate('Notifications')} />

            
            <SettingItem
          icon="cart-outline"
          title="상점"
          onPress={() => navigation.navigate('Store')} />

          </>
      }
        
        <SettingItem
        icon="information-circle-outline"
        title="앱 정보"
        onPress={showAppInfo} />

        
        <SettingItem
        icon="help-circle-outline"
        title="도움말"
        onPress={showHelp} />

        
        {/* 문의하기(미구현): 추후 기능 추가 예정 */}
      </View>

      {/* 앱 버전 표시는 앱 정보 화면에서 제공 */}
    </ScrollView>;


  // 알림 설정 모달
  const NotificationSettingsModal = () =>
  <Modal
    visible={showNotificationModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowNotificationModal(false)}>

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
    </Modal>;


  return (
    <>
      {renderProfileScreen()}
      <NotificationSettingsModal />
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        buttons={modalButtons || [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: () => {setModalVisible(false);if (modalAction) modalAction();} }]
        }
        onClose={handleModalClose} />

    </>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12
  },
  profileInfo: {
    alignItems: 'center'
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '500'
  },
  loginContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%'
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20
  },
  authButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  authCtaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 180,
    alignItems: 'center'
  },
  authCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  previewContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 16
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eeeeee'
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  previewTitleBar: {
    width: '60%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginBottom: 6
  },
  previewSubtitleBar: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#eee'
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingIcon: {
    marginRight: 12
  },
  settingTitle: {
    fontSize: 16,
    color: '#333'
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  syncRightBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8
  },
  syncBadgePending: {
    backgroundColor: '#FFD54F'
  },
  syncBadgeIdle: {
    backgroundColor: '#E0E0E0'
  },
  syncBadgeText: {
    fontSize: 12,
    color: '#333'
  },
  syncNowBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 6
  },
  syncNowBtnDisabled: {
    backgroundColor: '#BDBDBD'
  },
  syncNowBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8
  },
  footer: {
    padding: 16,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999'
  },
  notificationDebuggerContainer: {
    padding: 16
  },
  // 모달 관련 스타일 추가
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalBody: {
    padding: 16
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  }
});

export default ProfileScreen;