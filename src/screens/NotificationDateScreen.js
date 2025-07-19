import React, { useState, useEffect } from 'react';
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
import { loadProcessedNotifications } from '../utils/notificationUtils';

const NotificationDateScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { date, formattedDate } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // 컴포넌트 마운트 시 해당 날짜의 최신 알림 데이터 로드
  useEffect(() => {
    loadDateNotifications();
  }, [date]);

  // 해당 날짜의 알림 데이터 로드 함수
  const loadDateNotifications = async () => {
    try {
      setLoading(true);
      // 해당 날짜의 최신 알림 데이터 로드
      const dateNotifications = await loadProcessedNotifications(date);
      setNotifications(dateNotifications);
      setLoading(false);
    } catch (error) {
      console.error('알림 데이터 로드 중 오류 발생:', error);
      setLoading(false);
    }
  };

  // 알림 상세 화면으로 이동
  const navigateToNotificationDetail = (notification) => {
    navigation.push('NotificationDetail', { 
      notification,
      hideHeader: true 
    });
  };

  // 알림 유형에 따른 아이콘 반환
  const getNotificationIcon = (type) => {
    if (type === '유통기한') {
      return 'calendar';
    }
    return 'hourglass';
  };

  // 알림 유형에 따른 색상 반환
  const getNotificationColor = (type) => {
    if (type === '유통기한') {
      return '#2196F3';
    }
    return '#4CAF50';
  };

  // 알림 항목 렌더링
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => navigateToNotificationDetail(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.notification_type) }]}>
        <Ionicons name={getNotificationIcon(item.notification_type)} size={24} color="#fff" />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationType}>{item.notification_type}</Text>
          <Text style={styles.productName}>{item.product_name}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
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
          data={notifications}
          keyExtractor={(item, index) => `notification-${index}`}
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