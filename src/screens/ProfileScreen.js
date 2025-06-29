import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, isLoggedIn } = useSelector(state => state.auth);
  
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
  
  // 로그인 처리 (실제로는 카카오 로그인 연동 필요)
  const handleLogin = () => {
    // 임시 사용자 데이터
    const mockUser = {
      id: '123456789',
      name: '홍길동',
      email: 'user@example.com',
      profileImage: 'https://via.placeholder.com/150',
    };
    
    // 실제 구현에서는 카카오 로그인 API 연동 필요
    Alert.alert('알림', '카카오 로그인 기능은 아직 구현되지 않았습니다.');
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

  return (
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
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>로그인이 필요합니다</Text>
            <Text style={styles.loginSubtitle}>
              제품 정보를 클라우드에 저장하고 여러 기기에서 동기화하려면 로그인하세요.
            </Text>
            <TouchableOpacity style={styles.kakaoLoginButton} onPress={handleLogin}>
              <Text style={styles.kakaoLoginText}>카카오 계정으로 로그인</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
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
        
        <SettingItem 
          icon="color-palette-outline" 
          title="테마 설정" 
          onPress={() => Alert.alert('알림', '테마 설정 기능은 아직 구현되지 않았습니다.')}
        />
        
        <SettingItem 
          icon="language-outline" 
          title="언어 설정" 
          onPress={() => Alert.alert('알림', '언어 설정 기능은 아직 구현되지 않았습니다.')}
        />
      </View>
      
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>데이터 관리</Text>
        
        <SettingItem 
          icon="cloud-upload-outline" 
          title="데이터 백업" 
          onPress={() => Alert.alert('알림', '데이터 백업 기능은 아직 구현되지 않았습니다.')}
        />
        
        <SettingItem 
          icon="cloud-download-outline" 
          title="데이터 복원" 
          onPress={() => Alert.alert('알림', '데이터 복원 기능은 아직 구현되지 않았습니다.')}
        />
        
        <SettingItem 
          icon="trash-outline" 
          title="데이터 초기화" 
          onPress={() => Alert.alert('알림', '데이터 초기화 기능은 아직 구현되지 않았습니다.')}
        />
      </View>
      
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
        
        <SettingItem 
          icon="mail-outline" 
          title="문의하기" 
          onPress={() => Alert.alert('알림', '문의하기 기능은 아직 구현되지 않았습니다.')}
        />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>소모미 (SoMoMi) v1.0.0</Text>
      </View>
    </ScrollView>
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
  },
  kakaoLoginButton: {
    backgroundColor: '#FEE500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  kakaoLoginText: {
    color: '#3C1E1E',
    fontWeight: '600',
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
});

export default ProfileScreen; 