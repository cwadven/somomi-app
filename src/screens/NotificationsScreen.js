import { useState, useEffect, useRef } from 'react';
import {

View,
Text,
StyleSheet,
TouchableOpacity,
FlatList,
ActivityIndicator,
SafeAreaView } from

'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';













import { loadAllProcessedNotifications, processAllNotifications } from '../utils/notificationUtils';
import { fetchGuestAlarmHistory } from '../api/alarmApi';

// 화면 재진입 시 API 재호출 방지 및 스크롤 위치 복원을 위한 간단 캐시
let __notificationsDatesCache = null;
let __notificationsScrollOffsetY = 0;

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const listRef = useRef(null);

  // 최초 1회만 데이터 로드 (뒤로가기 시 재호출 방지)
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    // 캐시가 있으면 그대로 사용(API 미호출, 스크롤 위치 복원)
    if (Array.isArray(__notificationsDatesCache) && __notificationsDatesCache.length > 0) {
      setDates(__notificationsDatesCache);
      setLoading(false);
      // 콘텐츠 렌더 후 스크롤 복원
      setTimeout(() => {
        try {
          if (listRef.current && __notificationsScrollOffsetY > 0) {
            listRef.current.scrollToOffset({ offset: __notificationsScrollOffsetY, animated: false });
          }
        } catch (e) {}
      }, 0);
    } else {
      loadNotificationsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 알림 데이터 로드 함수
  const loadNotificationsData = async () => {
    try {
      setLoading(true);
      // 1) 백엔드 알림 히스토리 우선 사용
      let historyDates = [];
      try {
        const res = await fetchGuestAlarmHistory();
        const items = Array.isArray(res?.guest_alarm_histories) ? res.guest_alarm_histories : [];
        historyDates = items.map(h => ({
          date: h.target_date,
          count: Array.isArray(h.guest_inventory_items) ? h.guest_inventory_items.length : 0,
          notifications: (h.guest_inventory_items || []).map(it => ({
            product_id: it.guest_inventory_item_id,
            product_name: it.guest_inventory_item_name,
            location_id: it.guest_section_id,
            location_name: null,
            notification_type: it.expire_at ? '유통기한' : '소진 예상',
            message: it.expire_at
              ? `${it.guest_inventory_item_name}의 유통기한 알림`
              : `${it.guest_inventory_item_name}의 소진예상 알림`,
            expire_at: it.expire_at || it.expected_expire_at || null,
          }))
        })).sort((a, b) => b.date.localeCompare(a.date));
      } catch (e) {
        historyDates = [];
      }

      if (historyDates.length > 0) {
        setDates(historyDates);
        __notificationsDatesCache = historyDates;
      } else {
        // 2) 백엔드 없으면 기존 로컬 히스토리 표시
        await processAllNotifications(true);
        const allNotifications = await loadAllProcessedNotifications();
        const datesList = Object.keys(allNotifications).sort((a, b) => b.localeCompare(a));
        const datesWithCount = datesList.map(date => ({
          date,
          count: allNotifications[date]?.length || 0,
          notifications: allNotifications[date] || []
        }));
        setDates(datesWithCount);
        __notificationsDatesCache = datesWithCount;
      }
      setLoading(false);
    } catch (error) {
      console.error('알림 데이터 로드 중 오류 발생:', error);
      setLoading(false);
    }
  };

  // 날짜 선택 처리
  const handleDateSelect = (date, notifications) => {
    // NotificationDateScreen으로 이동
    navigation.navigate('NotificationDate', {
      date,
      notifications,
      formattedDate: formatDateString(date)
    });
  };

  // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDateString = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${month}월 ${day}일`;
  };

  // 날짜 카드 렌더링
  const renderDateCard = ({ item }) => (
    <TouchableOpacity
      style={styles.dateCard}
      onPress={() => handleDateSelect(item.date, item.notifications)}
    >
      <View style={styles.dateCardContent}>
        <View style={styles.dateCardHeader}>
          <Text style={styles.dateCardTitle}>{formatDateString(item.date)}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{item.count}</Text>
          </View>
        </View>
        <Text style={styles.dateCardSubtitle}>
          {item.count > 0 
            ? `${item.count}개의 알림이 있습니다.`
            : '알림이 없습니다.'
          }
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 목록</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        dates.length > 0 ? (
          <FlatList
            ref={listRef}
            data={dates}
            keyExtractor={(item) => item.date}
            renderItem={renderDateCard}
            contentContainerStyle={styles.datesList}
            onScroll={(e) => {
              __notificationsScrollOffsetY = e?.nativeEvent?.contentOffset?.y || 0;
            }}
            scrollEventThrottle={16}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>알림 기록이 없습니다.</Text>
          </View>
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datesList: {
    padding: 16,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateCardContent: {
    flex: 1,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  countBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default NotificationsScreen; 