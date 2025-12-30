import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken } from '../utils/storageUtils';

const ContentWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const contentId = route?.params?.contentId ?? 1;
  const title = route?.params?.title ?? '콘텐츠';

  const startUrl = useMemo(() => `${API_BASE_URL}/v1/content/${contentId}`, [contentId]);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await loadJwtToken();
        const headers = {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        };
        // 익명 토큰(anonymous_*)은 서버에 Authorization으로 보내지 않음 (요청사항)
        if (token && typeof token === 'string' && !token.startsWith('anonymous_')) {
          headers.Authorization = `jwt ${token}`;
        }
        const res = await fetch(startUrl, { method: 'GET', headers });
        const text = await res.text();
        if (!mounted) return;
        if (!res.ok) {
          setErrorMsg(text || `콘텐츠를 불러오지 못했습니다. (status: ${res.status})`);
          setHtml('');
          return;
        }
        setHtml(text || '');
        setErrorMsg('');
      } catch (e) {
        if (!mounted) return;
        setErrorMsg('콘텐츠를 불러오는 중 오류가 발생했습니다.');
        setHtml('');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [startUrl]);

  const closeAndGoHome = useCallback(() => {
    try { navigation.goBack(); } catch (e) {}
    // 홈 탭으로 이동(웹뷰가 다른 탭에서 열려도 홈으로 보내기)
    try {
      const { navigationRef } = require('../navigation/RootNavigation');
      setTimeout(() => {
        try {
          if (navigationRef?.isReady?.()) {
            navigationRef.navigate('MainTabs', { screen: 'Home' });
          }
        } catch (e) {}
      }, 0);
    } catch (e) {}
  }, [navigation]);

  const onShouldStart = useCallback((request) => {
    const url = request?.url || '';
    const lower = String(url).toLowerCase();
    if (lower.startsWith('somomi://home') || lower.startsWith('somomi://close-webview')) {
      closeAndGoHome();
      return false;
    }
    if (lower.startsWith('about:blank#close') || lower.endsWith('#close')) {
      closeAndGoHome();
      return false;
    }
    return true;
  }, [closeAndGoHome]);

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
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={{ padding: 16 }}>
          <Text>
            브라우저로 콘텐츠 페이지를 여는 중...
          </Text>
        </View>
      </View>
    );
  }

  // Native(iOS/Android): 동적 import로 WebView 사용 (웹 번들 오류 방지)
  // eslint-disable-next-line global-require
  const { WebView } = require('react-native-webview');

  const source = useMemo(() => {
    // API에서 받아온 HTML을 WebView에 직접 렌더링
    // baseUrl을 주면 상대경로 리소스가 있을 때 해석에 도움 됨
    return { html: html || '', baseUrl: API_BASE_URL };
  }, [html]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.centerText}>콘텐츠를 불러오는 중...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: '#d32f2f' }]}>{errorMsg}</Text>
        </View>
      ) : (
        <WebView
          source={source}
          onShouldStartLoadWithRequest={onShouldStart}
          startInLoadingState
          incognito
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
        />
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  centerText: { marginTop: 10, fontSize: 14, color: '#333', textAlign: 'center' },
});

export default ContentWebViewScreen;


