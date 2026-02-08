import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchGuestNotificationDetail } from '../api/notificationApi';
import MarkdownMessageText from '../components/MarkdownMessageText';

const MyNotificationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const notificationId = route.params?.notificationId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetchGuestNotificationDetail(notificationId);
        if (!mounted) return;
        setDetail(res || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || '알림을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [notificationId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 상세</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.replace('MyNotificationDetail', { notificationId })}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>{detail?.title || '알림'}</Text>
          {detail?.created_at ? (
            <Text style={styles.meta}>{new Date(detail.created_at).toLocaleString()}</Text>
          ) : null}

          <View style={styles.messageBox}>
            <MarkdownMessageText style={styles.message} message={detail?.message || ''} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerRight: { width: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  errorText: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  body: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 14 },
  messageBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  message: { fontSize: 14, color: '#111827', lineHeight: 20 },
});

export default MyNotificationDetailScreen;

