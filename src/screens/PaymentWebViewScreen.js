import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const PaymentWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const startUrl = route?.params?.url;

  const handleDeepLink = useCallback((url) => {
    if (!url) return false;
    if (url.startsWith('somomi://payment/success')) {
      navigation.replace('PaymentSuccess');
      return true;
    }
    if (url.startsWith('somomi://payment/cancel')) {
      navigation.replace('PaymentCancel');
      return true;
    }
    if (url.startsWith('somomi://payment/fail')) {
      navigation.replace('PaymentFail');
      return true;
    }
    const lower = url.toLowerCase();
    // http/https/about:blank 등은 WebView가 로드
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('about:')) {
      return false;
    }
    // 외부 스킴(카카오/전화/메일/마켓 등)은 WebView가 로드하지 않도록 막고 OS로 전달
    const externalSchemes = ['kakaotalk://', 'kakaopay://', 'tel:', 'mailto:', 'sms:', 'market://'];
    if (externalSchemes.some(s => lower.startsWith(s))) {
      Linking.openURL(url).catch(() => {
        if (lower.startsWith('kakaotalk://')) {
          Linking.openURL('market://details?id=com.kakao.talk').catch(() => {});
        }
      });
      return true; // WebView 로드 방지
    }
    // Android intent:// 처리: app scheme 변환 → fallback → 마켓
    if (Platform.OS === 'android' && lower.startsWith('intent://')) {
      try {
        const schemeMatch = url.match(/;scheme=([^;]+)/i);
        const endOfScheme = url.indexOf('#Intent');
        const pathPart = url.substring('intent://'.length, endOfScheme >= 0 ? endOfScheme : undefined);
        const appScheme = schemeMatch ? schemeMatch[1] : null;
        const appUrl = appScheme ? `${appScheme}://${pathPart}` : null;
        const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
        const fallbackUrl = fallbackMatch ? decodeURIComponent(fallbackMatch[1]) : null;
        const pkgMatch = url.match(/;package=([^;]+)/i);
        const pkg = pkgMatch ? pkgMatch[1] : null;
        if (appUrl) {
          Linking.openURL(appUrl).catch(() => {
            if (fallbackUrl) {
              Linking.openURL(fallbackUrl).catch(() => {});
            } else if (pkg) {
              Linking.openURL(`market://details?id=${pkg}`).catch(() => {});
            }
          });
        } else if (fallbackUrl) {
          Linking.openURL(fallbackUrl).catch(() => {});
        } else if (pkg) {
          Linking.openURL(`market://details?id=${pkg}`).catch(() => {});
        }
      } catch (_) {}
      return true; // WebView 로드 방지
    }
    // 알 수 없는 스킴은 로드 방지
    return true;
  }, [navigation]);

  const onShouldStart = useCallback((request) => {
    const url = request?.url || '';
    // 서버에서 window.location.href = 'about:blank#close' 같은 방식으로 닫기 요청 시도 가능
    if (url.toLowerCase().startsWith('about:blank#close') || url.toLowerCase().endsWith('#close')) {
      navigation.goBack();
      return false;
    }
    const intercepted = handleDeepLink(url);
    return !intercepted;
  }, [handleDeepLink]);

  const onNavChange = useCallback((navState) => {
    handleDeepLink(navState?.url);
  }, [handleDeepLink]);

  const onMessage = useCallback((event) => {
    try {
      const data = event?.nativeEvent?.data;
      if (!data) return;
      if (data === 'close' || data === 'CLOSE') {
        navigation.goBack();
        return;
      }
      const parsed = JSON.parse(data);
      if (parsed && (parsed.type === 'close' || parsed.type === 'CLOSE')) {
        navigation.goBack();
      }
    } catch (_) {}
  }, [navigation]);

  if (Platform.OS === 'web') {
    useEffect(() => {
      if (!__DEV__ && startUrl && typeof window !== 'undefined' && window.location) {
        window.location.href = startUrl;
      }
    }, [startUrl]);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>결제 진행</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={{ padding: 16 }}>
          <Text>
            {__DEV__ ? '개발 모드: 자동 리다이렉트를 비활성화했습니다.' : '브라우저로 결제 페이지를 여는 중...'}
          </Text>
          {!!startUrl && (
            <TouchableOpacity style={[styles.headerBtn, { marginTop: 12 }]} onPress={() => (window.location.href = startUrl)}>
              <Text style={{ color: '#4CAF50', fontWeight: '700' }}>수동으로 열기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Native(iOS/Android): 동적 import로 WebView 사용 (웹 번들 오류 방지)
  // eslint-disable-next-line global-require
  const { WebView } = require('react-native-webview');
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>결제 진행</Text>
        <View style={styles.headerRight} />
      </View>
      <WebView
        source={{ uri: startUrl }}
        onShouldStartLoadWithRequest={onShouldStart}
        onNavigationStateChange={onNavChange}
        onMessage={onMessage}
        startInLoadingState
        incognito
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        setSupportMultipleWindows
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  headerRight: { width: 28 },
});

export default PaymentWebViewScreen;


