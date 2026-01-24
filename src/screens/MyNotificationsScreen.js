import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchGuestNotifications } from '../api/notificationApi';

const PAGE_SIZE = 20;

const MyNotificationsScreen = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const nextCursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  const normalizeText = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.trim();
  };

  const getItemTitle = (it) => {
    return normalizeText(it?.title) || '알림';
  };

  const getItemSubtitle = (it) => {
    const createdAt = it?.created_at || null;
    if (createdAt) {
      const t = new Date(createdAt).toLocaleString();
      return t;
    }
    return '';
  };

  const keyForItem = (it, idx) => {
    const id = it?.id ?? null;
    if (id != null) return String(id);
    const createdAt = it?.created_at || it?.createdAt || '';
    return `${createdAt}-${idx}`;
  };

  const fetchPage = useCallback(async ({ cursor = null, append = false } = {}) => {
    const res = await fetchGuestNotifications({ size: PAGE_SIZE, nextCursor: cursor });
    const list = Array.isArray(res?.guest_notification_items) ? res.guest_notification_items : [];
    const next = res?.next_cursor ?? null;
    const hasMore = !!res?.has_more;
    nextCursorRef.current = next;
    hasMoreRef.current = hasMore;
    setItems((prev) => (append ? [...prev, ...list] : list));
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      await fetchPage({ cursor: null, append: false });
    } catch (e) {
      setError(e?.message || '알림 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      await fetchPage({ cursor: null, append: false });
    } catch (e) {
      setError(e?.message || '새로고침에 실패했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (loading || refreshing || loadingMore) return;
    if (!hasMoreRef.current) return;
    const cursor = nextCursorRef.current;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      await fetchPage({ cursor, append: true });
    } catch (e) {
      // 더보기 실패는 토스트 대신 상단 에러만 유지
      setError(e?.message || '추가 로딩에 실패했습니다.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePressItem = (item) => {
    const id = item?.id;
    if (id == null) return;
    // 상세 조회 시 읽음 처리되므로, 목록에서도 즉시 미읽음 표시 제거(UX)
    setItems((prev) => prev.map((p) => (p?.id === id ? { ...p, is_read: true } : p)));
    navigation.navigate('MyNotificationDetail', { notificationId: id });
  };

  const renderItem = ({ item }) => {
    const isRead = item?.is_read === true;
    return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.row, !isRead && styles.rowUnread]}
      onPress={() => handlePressItem(item)}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={isRead ? 'notifications-outline' : 'notifications'} size={18} color={isRead ? '#4CAF50' : '#16A34A'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, !isRead && styles.rowTitleUnread]} numberOfLines={2}>
            {getItemTitle(item)}
          </Text>
          {getItemSubtitle(item) ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {getItemSubtitle(item)}
            </Text>
          ) : null}
        </View>
        {!isRead ? <View style={styles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 알림</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadInitial}>
                <Text style={styles.retryText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {items.length === 0 && !error ? (
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={56} color="#cfcfcf" />
              <Text style={styles.emptyText}>알림이 없습니다.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={keyForItem}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              refreshing={refreshing}
              onRefresh={onRefresh}
              ListFooterComponent={
                loadingMore ? (
                  <View style={{ paddingVertical: 14 }}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                  </View>
                ) : null
              }
            />
          )}
        </>
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
  emptyText: { marginTop: 10, fontSize: 14, color: '#777' },
  listContent: { padding: 16, paddingBottom: 24 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  rowUnread: {
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  rowTitleUnread: { color: '#14532D' },
  rowSubtitle: { marginTop: 4, fontSize: 12, color: '#888' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 10,
    marginTop: 6,
  },
  errorBox: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  errorText: { color: '#E11D48', fontSize: 13, marginBottom: 10 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default MyNotificationsScreen;

