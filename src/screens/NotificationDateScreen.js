import { useState, useEffect } from 'react';
import {

  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { loadProcessedNotifications } from '../utils/notificationUtils';
import { fetchGuestAlarmHistory } from '../api/alarmApi';

const NotificationDateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { date, formattedDate } = route.params;
  const { locations } = useSelector(state => state.locations);
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [groupedNotifications, setGroupedNotifications] = useState([]);

  // 컴포넌트 마운트 시 해당 날짜의 최신 알림 데이터 로드
  useEffect(() => {
    loadDateNotifications();
  }, [date]);

  // 알림을 제품별로 그룹화하는 함수
  const groupNotificationsByProduct = (notificationsList) => {
    const groupedMap = new Map();

    // 알림을 제품 ID 기준으로 그룹화
    notificationsList.forEach(notification => {
      const productId = notification.product_id;
      
      if (!groupedMap.has(productId)) {
        // 새 그룹 생성
        groupedMap.set(productId, {
          product_id: productId,
          product_name: notification.product_name,
          location_id: notification.location_id,
          location_name: notification.location_name,
          notifications: [notification],
          combined: false
        });
      } else {
        // 기존 그룹에 알림 추가
        const group = groupedMap.get(productId);
        group.notifications.push(notification);
        
        // 유통기한과 소진예상 알림이 모두 있는지 확인
        const hasExpiry = group.notifications.some(n => n.notification_type === '유통기한');
        const hasEstimated = group.notifications.some(n => n.notification_type === '소진 예상');
        
        if (hasExpiry && hasEstimated) {
          group.combined = true;
        }
      }
    });

    // Map을 배열로 변환
    return Array.from(groupedMap.values());
  };

  // 해당 날짜의 알림 데이터 로드 함수
  const loadDateNotifications = async () => {
    try {
      setLoading(true);
      // 1) 백엔드 히스토리에서 해당 날짜 찾기
      let backendNotifications = [];
      try {
        const res = await fetchGuestAlarmHistory();
        const items = Array.isArray(res?.guest_alarm_histories) ? res.guest_alarm_histories : [];
        const match = items.find(h => h.target_date === date);
        if (match && Array.isArray(match.guest_inventory_items)) {
          backendNotifications = match.guest_inventory_items.map(it => {
            const locId = it.guest_section_id != null ? String(it.guest_section_id) : null;
            const loc = locId ? (locations || []).find(l => String(l.id) === locId) : null;
            return {
              product_id: it.guest_inventory_item_id,
              product_name: it.guest_inventory_item_name,
              location_id: it.guest_section_id,
              location_name: loc ? (loc.title || null) : null,
              notification_type: it.expire_at ? '유통기한' : '소진 예상',
              message: it.expire_at
                ? `${it.guest_inventory_item_name}의 유통기한 알림`
                : `${it.guest_inventory_item_name}의 소진예상 알림`,
              expire_at: it.expire_at || it.expected_expire_at || null,
            };
          });
        }
      } catch (e) {}

      const dateNotifications = backendNotifications.length > 0
        ? backendNotifications
        : await loadProcessedNotifications(date);

      // 로컬 폴백인 경우에도 위치명 보강
      const enriched = (dateNotifications || []).map(n => {
        if (n.location_name) return n;
        const locId = n.location_id != null ? String(n.location_id) : null;
        const loc = locId ? (locations || []).find(l => String(l.id) === locId) : null;
        return { ...n, location_name: loc ? (loc.title || null) : n.location_name || null };
      });

      setNotifications(enriched);
      const grouped = groupNotificationsByProduct(enriched);
      setGroupedNotifications(grouped);
      
      setLoading(false);
    } catch (error) {
      console.error('알림 데이터 로드 중 오류 발생:', error);
      setLoading(false);
    }
  };

  // 알림 상세 화면으로 이동
  const navigateToNotificationDetail = (group) => {
    if (group.combined) {
      // 결합된 알림의 경우 첫 번째 알림을 기본으로 사용하고 추가 정보 포함
      const combinedNotification = {
        ...group.notifications[0],
        combined: true,
        allNotifications: group.notifications
      };
      
      navigation.push('NotificationDetail', { 
        notification: combinedNotification,
        hideHeader: true 
      });
    } else {
      // 단일 알림인 경우 해당 알림만 전달 (notifications 배열의 첫 번째 항목)
      navigation.push('NotificationDetail', { 
        notification: group.notifications[0],
        hideHeader: true 
      });
    }
  };

  // 알림 유형에 따른 아이콘 반환
  const getNotificationIcon = (group) => {
    if (group.combined) {
      // 결합된 알림은 특별한 아이콘 사용
      return 'notifications';
    }
    
    const type = group.notifications[0].notification_type;
    if (type === '유통기한') {
      return 'calendar';
    }
    return 'hourglass';
  };

  // 알림 유형에 따른 색상 반환
  const getNotificationColor = (group) => {
    if (group.combined) {
      // 결합된 알림은 특별한 색상 사용
      return '#9C27B0'; // 보라색
    }
    
    const type = group.notifications[0].notification_type;
    if (type === '유통기한') {
      return '#2196F3';
    }
    return '#4CAF50';
  };

  // 알림 메시지 생성
  const getNotificationMessage = (group) => {
    if (group.combined) {
      return `${group.product_name}의 유통기한과 소진 예상 알림이 있습니다.`;
    }
    
    return group.notifications[0].message;
  };

  // 알림 유형 텍스트 생성
  const getNotificationTypeText = (group) => {
    if (group.combined) {
      return '복합 알림';
    }
    
    return group.notifications[0].notification_type;
  };

  // 알림 항목 렌더링
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => navigateToNotificationDetail(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item) }]}>
        <Ionicons name={getNotificationIcon(item)} size={24} color="#fff" />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationType}>{getNotificationTypeText(item)}</Text>
          <Text style={styles.productName}>{item.product_name}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{getNotificationMessage(item)}</Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.locationName}>
            {item.location_name ? `위치: ${item.location_name}` : '위치 없음'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
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
        <Text style={styles.headerTitle}>{formattedDate}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={groupedNotifications}
          keyExtractor={(item, index) => `notification-group-${index}`}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.notificationsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {`${formattedDate}에 알림이 없습니다.`}
              </Text>
            </View>
          }
        />
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
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationName: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default NotificationDateScreen; 