import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const PaymentWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const webViewRef = useRef(null);
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
        ref={webViewRef}
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


