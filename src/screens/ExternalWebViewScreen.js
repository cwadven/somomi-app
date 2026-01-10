import { useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const ExternalWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const url = route?.params?.url || null;
  const title = route?.params?.title || '웹 페이지';

  const close = useCallback(() => {
    try { navigation.goBack(); } catch (e) {}
  }, [navigation]);

  const onShouldStart = useCallback((request) => {
    const nextUrl = request?.url || '';
    const lower = String(nextUrl).toLowerCase();
    if (lower.startsWith('somomi://close-webview') || lower.startsWith('somomi://home')) {
      close();
      return false;
    }
    if (lower.startsWith('about:blank#close') || lower.endsWith('#close')) {
      close();
      return false;
    }
    return true;
  }, [close]);

  const safeUrl = useMemo(() => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    return trimmed;
  }, [url]);

  if (Platform.OS === 'web') {
    useEffect(() => {
      if (!__DEV__ && safeUrl && typeof window !== 'undefined' && window.location) {
        window.location.href = safeUrl;
      }
    }, [safeUrl]);
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
          <Text>브라우저로 페이지를 여는 중...</Text>
        </View>
      </View>
    );
  }

  // eslint-disable-next-line global-require
  const { WebView } = require('react-native-webview');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={close}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerRight} />
      </View>
      {safeUrl ? (
        <WebView
          source={{ uri: safeUrl }}
          onShouldStartLoadWithRequest={onShouldStart}
          startInLoadingState
          incognito
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
        />
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#d32f2f' }}>열 수 없는 URL입니다.</Text>
        </View>
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
});

export default ExternalWebViewScreen;

