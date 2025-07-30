import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// 웹 브라우저 결과를 처리하기 위해 필요
WebBrowser.maybeCompleteAuthSession();

// 카카오 개발자 콘솔에서 가져온 앱 키 (실제로는 환경 변수 등으로 관리)
const KAKAO_APP_KEY = 'YOUR_KAKAO_APP_KEY'; // 실제 앱 키로 교체 필요
const KAKAO_REDIRECT_URI = 'exp://YOUR_EXPO_HOST/--/kakao-auth'; // 실제 리다이렉트 URI로 교체 필요

// 카카오 로그인 요청 함수
export const requestKakaoLogin = async () => {
  try {
    console.log('카카오 로그인 요청 시작');
    // 인증 요청 URL 생성
    const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_APP_KEY}&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}&response_type=code`;
    
    // 인증 세션 시작
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: KAKAO_REDIRECT_URI
    });
    
    console.log('카카오 인증 세션 결과:', result);
    
    // 사용자가 인증을 취소한 경우
    if (result.type === 'dismiss' || result.type === 'cancel') {
      console.log('카카오 로그인 취소됨');
      return { success: false, error: '로그인이 취소되었습니다.' };
    }
    
    // 인증 성공
    if (result.type === 'success' && result.params.code) {
      console.log('카카오 인증 코드 획득 성공');
      // 인증 코드로 토큰 요청
      const tokenResponse = await getKakaoToken(result.params.code);
      
      if (tokenResponse.success) {
        console.log('카카오 토큰 획득 성공');
        // 토큰으로 사용자 정보 요청
        const userInfo = await getKakaoUserInfo(tokenResponse.access_token);
        console.log('카카오 사용자 정보 획득 성공:', userInfo);
        return {
          success: true,
          data: {
            id: userInfo.id,
            email: userInfo.kakao_account?.email,
            profile: {
              nickname: userInfo.kakao_account?.profile?.nickname,
              profile_image_url: userInfo.kakao_account?.profile?.profile_image_url
            },
            access_token: tokenResponse.access_token
          }
        };
      }
      
      console.log('카카오 토큰 획득 실패:', tokenResponse);
      return tokenResponse;
    }
    
    console.log('카카오 로그인 실패: 알 수 없는 오류');
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  } catch (error) {
    console.error('Kakao login error:', error);
    return { success: false, error: error.message || '로그인 중 오류가 발생했습니다.' };
  }
};

// 카카오 토큰 요청 함수
const getKakaoToken = async (code) => {
  try {
    // 실제 구현에서는 서버에 요청하여 토큰을 받아옴
    // 클라이언트에서 직접 요청하는 것은 보안상 권장되지 않음
    
    // 현재는 모의 응답 반환
    return {
      success: true,
      access_token: `kakao_token_${Date.now()}`,
      refresh_token: `kakao_refresh_${Date.now()}`,
      expires_in: 21599
    };
  } catch (error) {
    console.error('Get Kakao token error:', error);
    return { success: false, error: error.message || '토큰 요청 중 오류가 발생했습니다.' };
  }
};

// 카카오 사용자 정보 요청 함수
const getKakaoUserInfo = async (accessToken) => {
  try {
    // 실제 구현에서는 서버에 요청하여 사용자 정보를 받아옴
    // 클라이언트에서 직접 요청하는 것은 보안상 권장되지 않음
    
    // 현재는 모의 응답 반환
    return {
      id: 12345678,
      connected_at: new Date().toISOString(),
      kakao_account: {
        email: 'kakao_user@example.com',
        profile: {
          nickname: '카카오 사용자',
          profile_image_url: 'https://via.placeholder.com/150'
        }
      }
    };
  } catch (error) {
    console.error('Get Kakao user info error:', error);
    throw error;
  }
}; 