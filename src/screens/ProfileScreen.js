import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';
import KakaoLoginButton from '../components/KakaoLoginButton';
import PushNotificationTest from '../components/PushNotificationTest';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isLoggedIn, isAnonymous, loading, error } = useSelector(state => state.auth);
  
  // 로그인/회원가입 모드 상태
  const [mode, setMode] = useState('profile'); // 'profile', 'login'

  // route.params로 전달된 initialMode가 있으면 해당 모드로 설정
  useEffect(() => {
    if (route.params?.initialMode) {
      setMode(route.params.initialMode);
    }
  }, [route.params]);
  
  // 로그아웃 처리
  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: () => dispatch(logout())
        }
      ]
    );
  };
  
  // 카카오 로그인 관련 콜백
  const handleLoginStart = () => {
    console.log('카카오 로그인 시작');
  };
  
  const handleLoginComplete = () => {
    console.log('카카오 로그인 완료');
    setMode('profile');
  };
  
  const handleLoginError = (errorMsg) => {
    Alert.alert('로그인 실패', errorMsg);
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

  // 로그인 화면
  const renderLoginScreen = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.formContainer}
    >
      <View style={styles.formHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setMode('profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.formTitle}>로그인</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.kakaoLoginContainer}>
        <Text style={styles.loginGuideText}>
          카카오 계정으로 간편하게 로그인하세요
        </Text>
        
        <KakaoLoginButton 
          onLoginStart={handleLoginStart}
          onLoginComplete={handleLoginComplete}
          onLoginError={handleLoginError}
        />
      </View>
    </KeyboardAvoidingView>
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
      
      {/* 로그인 한 경우에만 제품 관리와 앱 설정 표시 */}
      {isLoggedIn && user && (
        <>
          {/* 제품 관리 섹션 */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>제품 관리</Text>
            
            <SettingItem 
              icon="checkmark-done-circle-outline" 
              title="소진 처리한 상품 보기" 
              onPress={() => navigation.navigate('ConsumedProducts')}
            />
          </View>
          
          {/* 설정 섹션 */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>앱 설정</Text>
            
            <SettingItem 
              icon="notifications-outline" 
              title="알림 설정" 
              onPress={() => Alert.alert('알림', '알림 설정 기능은 아직 구현되지 않았습니다.')}
            />
          </View>
        </>
      )}
      
      {/* 정보 섹션은 항상 표시 */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>정보</Text>
        
        <SettingItem 
          icon="information-circle-outline" 
          title="앱 정보" 
          onPress={() => Alert.alert('앱 정보', '소모미 (SoMoMi) v1.0.0\n생활용품 리마인드 알림 앱')}
        />
        
        <SettingItem 
          icon="help-circle-outline" 
          title="도움말" 
          onPress={() => Alert.alert('알림', '도움말 기능은 아직 구현되지 않았습니다.')}
        />
        
        {/* 문의하기는 로그인한 사용자에게만 표시 */}
        {isLoggedIn && (
          <SettingItem 
            icon="mail-outline" 
            title="문의하기" 
            onPress={() => Alert.alert('알림', '문의하기 기능은 아직 구현되지 않았습니다.')}
          />
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>소모미 (SoMoMi) v1.0.0</Text>
      </View>
    </ScrollView>
  );

  // 현재 모드에 따라 다른 화면 렌더링
  if (mode === 'login') {
    return renderLoginScreen();
  } else {
    return renderProfileScreen();
  }
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
  // 로그인 폼 스타일
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  kakaoLoginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginGuideText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
  },
  pushTestSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});

export default ProfileScreen; 