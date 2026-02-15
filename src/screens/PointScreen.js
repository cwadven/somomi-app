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
import { fetchAvailablePoint } from '../api/pointApi';

const PointScreen = () => {
  const navigation = useNavigation();
  const [availablePoint, setAvailablePoint] = useState(null);
  const [pointLoading, setPointLoading] = useState(true);

  // TODO: 포인트 내역 API 연동 시 활성화
  // const [history, setHistory] = useState([]);
  // const [historyLoading, setHistoryLoading] = useState(false);
  // const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  // const [historyMeta, setHistoryMeta] = useState({ nextCursor: null, hasMore: false });

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

  // TODO: 포인트 내역 API 연동 시 무한 스크롤 핸들러
  // const loadMore = useCallback(() => {
  //   if (historyLoadingMore) return;
  //   if (!historyMeta?.hasMore) return;
  //   // dispatch or API call with historyMeta.nextCursor
  // }, [historyLoadingMore, historyMeta]);

  const renderHistoryItem = ({ item }) => {
    const isEarn = item.type === 'earn';
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyIconWrap}>
          <Ionicons
            name={isEarn ? 'add-circle-outline' : 'remove-circle-outline'}
            size={24}
            color={isEarn ? '#4CAF50' : '#F44336'}
          />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyDesc}>{item.description || (isEarn ? '포인트 적립' : '포인트 사용')}</Text>
          <Text style={styles.historyDate}>{item.date || ''}</Text>
        </View>
        <Text style={[styles.historyAmount, { color: isEarn ? '#4CAF50' : '#F44336' }]}>
          {isEarn ? '+' : '-'}{Number(item.amount || 0).toLocaleString()} P
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={52} color="#BDBDBD" />
      <Text style={styles.emptyText}>포인트 내역이 없습니다.</Text>
    </View>
  );

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

      <FlatList
        data={[]}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.3}
        // onEndReached={loadMore}
        // ListFooterComponent={historyLoadingMore ? (
        //   <View style={{ paddingVertical: 16 }}>
        //     <ActivityIndicator size="small" color="#4CAF50" />
        //   </View>
        // ) : null}
      />
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
  historyDesc: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#9E9E9E',
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
