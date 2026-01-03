import React from 'react';

import {
TouchableOpacity,
Text,
StyleSheet,

ActivityIndicator } from
'react-native';
import { useDispatch } from 'react-redux';
import { requestKakaoLogin } from '../utils/kakaoAuth';
import { kakaoLogin } from '../redux/slices/authSlice';

const KakaoLoginButton = ({ onLoginStart, onLoginComplete, onLoginError }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);
  

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      if (onLoginStart) onLoginStart();
      
      console.log('카카오 로그인 버튼 클릭: 로그인 요청 시작');
      const result = await requestKakaoLogin();
      console.log('카카오 로그인 요청 결과:', result);
      
      if (result.success && result.data) {
        console.log('카카오 로그인 성공: Redux 액션 디스패치 시작');
        // Redux 액션 디스패치
        const response = await dispatch(kakaoLogin(result.data)).unwrap();
        console.log('카카오 로그인 Redux 액션 완료:', response);
        if (onLoginComplete) onLoginComplete();
      } else {
        console.log('카카오 로그인 실패:', result.error);
        if (onLoginError) onLoginError(result.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Kakao login error:', error);
      if (onLoginError) onLoginError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={handleKakaoLogin}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#000000" size="small" />
      ) : (
        <Text style={styles.text}>카카오 계정으로 로그인</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FEE500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  text: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KakaoLoginButton; 