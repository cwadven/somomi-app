import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL } from '../config/apiConfig';
import { loadJwtToken } from '../utils/storageUtils';

const PrivacyPolicyWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const title = route?.params?.title ?? '개인정보처리방침';

  const startUrl = useMemo(() => `${API_BASE_URL}/privacy/policy`, []);
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
        // 익명 토큰(anonymous_*)은 서버에 Authorization으로 보내지 않음
        if (token && typeof token === 'string' && !token.startsWith('anonymous_')) {
          headers.Authorization = `jwt ${token}`;
        }
        const res = await fetch(startUrl, { method: 'GET', headers });
        const text = await res.text();
        if (!mounted) return;
        if (!res.ok) {
          setErrorMsg(text || `개인정보처리방침을 불러오지 못했습니다. (status: ${res.status})`);
          setHtml('');
          return;
        }
        setHtml(text || '');
        setErrorMsg('');
      } catch (e) {
        if (!mounted) return;
        setErrorMsg('개인정보처리방침을 불러오는 중 오류가 발생했습니다.');
        setHtml('');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [startUrl]);

  const close = useCallback(() => {
    try { navigation.goBack(); } catch (e) {}
  }, [navigation]);

  const onShouldStart = useCallback((request) => {
    const url = request?.url || '';
    const lower = String(url).toLowerCase();
    if (lower.startsWith('somomi://home') || lower.startsWith('somomi://close-webview')) {
      close();
      return false;
    }
    if (lower.startsWith('about:blank#close') || lower.endsWith('#close')) {
      close();
      return false;
    }
    return true;
  }, [close]);

  if (Platform.OS === 'web') {
    useEffect(() => {
      if (!__DEV__ && startUrl && typeof window !== 'undefined' && window.location) {
        window.location.href = startUrl;
      }
    }, [startUrl]);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={close}>
            <Ionicons name="close" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={{ padding: 16 }}>
          <Text>브라우저로 개인정보처리방침 페이지를 여는 중...</Text>
        </View>
      </View>
    );
  }

  // Native(iOS/Android): 동적 import로 WebView 사용 (웹 번들 오류 방지)
  // eslint-disable-next-line global-require
  const { WebView } = require('react-native-webview');

  const source = useMemo(() => {
    return { html: html || '', baseUrl: API_BASE_URL };
  }, [html]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={close}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.centerText}>불러오는 중...</Text>
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

export default PrivacyPolicyWebViewScreen;

