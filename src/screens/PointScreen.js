import { useEffect, useState, useCallback } from 'react';
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
import { fetchAvailablePoint, fetchPointHistory } from '../api/pointApi';

const PAGE_SIZE = 20;

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${day} ${h}:${min}`;
  } catch {
    return dateString;
  }
};

const formatDateShort = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}.${day}`;
  } catch {
    return dateString;
  }
};

const PointScreen = () => {
  const navigation = useNavigation();
  const [availablePoint, setAvailablePoint] = useState(null);
  const [pointLoading, setPointLoading] = useState(true);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyMeta, setHistoryMeta] = useState({ nextCursor: null, hasMore: false });

  // 보유 포인트 조회
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setPointLoading(true);
        const res = await fetchAvailablePoint();
        if (mounted) setAvailablePoint(res?.available_point ?? 0);
      } catch (e) {
        if (mounted) setAvailablePoint(null);
      } finally {
        if (mounted) setPointLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  // 포인트 내역 첫 페이지 로드
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setHistoryLoading(true);
        const res = await fetchPointHistory({ size: PAGE_SIZE });
        if (!mounted) return;
        const items = Array.isArray(res?.guest_point_items) ? res.guest_point_items : [];
        setHistory(items);
        setHistoryMeta({ nextCursor: res?.next_cursor || null, hasMore: !!res?.has_more });
      } catch (e) {
        if (mounted) setHistory([]);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  // 무한스크롤 다음 페이지
  const loadMore = useCallback(async () => {
    if (historyLoadingMore) return;
    if (!historyMeta?.hasMore) return;
    setHistoryLoadingMore(true);
    try {
      const res = await fetchPointHistory({ nextCursor: historyMeta.nextCursor, size: PAGE_SIZE });
      const items = Array.isArray(res?.guest_point_items) ? res.guest_point_items : [];
      setHistory((prev) => [...prev, ...items]);
      setHistoryMeta({ nextCursor: res?.next_cursor || null, hasMore: !!res?.has_more });
    } catch (e) {
      // 무시
    } finally {
      setHistoryLoadingMore(false);
    }
  }, [historyLoadingMore, historyMeta]);

  const renderHistoryItem = ({ item }) => {
    const isPositive = item.point >= 0;
    const color = isPositive ? '#4CAF50' : '#F44336';
    const sign = isPositive ? '+' : '';

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyIconWrap}>
          <Ionicons
            name={isPositive ? 'add-circle-outline' : 'remove-circle-outline'}
            size={24}
            color={color}
          />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyReason}>{item.reason}</Text>
          <Text style={styles.historyDate}>{formatDateTime(item.created_at)}</Text>
          {(item.valid_from || item.valid_until) ? (
            <Text style={styles.historyValidity}>
              {item.valid_from && item.valid_until
                ? `${formatDateShort(item.valid_from)} ~ ${formatDateShort(item.valid_until)}`
                : item.valid_from
                  ? `${formatDateShort(item.valid_from)}부터`
                  : `${formatDateShort(item.valid_until)}까지`}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.historyAmount, { color }]}>
          {sign}{Number(item.point).toLocaleString()} P
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (historyLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={52} color="#BDBDBD" />
        <Text style={styles.emptyText}>포인트 내역이 없습니다.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 포인트 잔액 카드 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>보유 포인트</Text>
        {pointLoading ? (
          <ActivityIndicator size="small" color="#4CAF50" style={{ marginTop: 8 }} />
        ) : availablePoint != null ? (
          <Text style={styles.balanceValue}>{Number(availablePoint).toLocaleString()} P</Text>
        ) : (
          <Text style={styles.balanceError}>포인트를 불러올 수 없습니다</Text>
        )}
      </View>

      {/* 포인트 내역 리스트 */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>포인트 내역</Text>
      </View>

      {historyLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListFooterComponent={historyLoadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  balanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 6,
  },
  balanceError: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 6,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  historyIconWrap: {
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyReason: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  historyValidity: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 12,
  },
});

export default PointScreen;
