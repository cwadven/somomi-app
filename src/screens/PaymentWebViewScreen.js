import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
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
    return false;
  }, [navigation]);

  const onShouldStart = useCallback((request) => {
    const intercepted = handleDeepLink(request?.url);
    return !intercepted;
  }, [handleDeepLink]);

  const onNavChange = useCallback((navState) => {
    handleDeepLink(navState?.url);
  }, [handleDeepLink]);

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
        startInLoadingState
        incognito
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
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


