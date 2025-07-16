import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { loadAllProcessedNotifications, loadProcessedNotifications } from '../utils/notificationUtils';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateList, setShowDateList] = useState(true);
  const [selectedDateNotifications, setSelectedDateNotifications] = useState([]);

  // 컴포넌트 마운트 시 알림 데이터 로드
  useEffect(() => {
    loadNotificationsData();
  }, []);

  // 알림 데이터 로드 함수
  const loadNotificationsData = async () => {
    try {
      setLoading(true);
      const allNotifications = await loadAllProcessedNotifications();
      
      // 날짜 목록 추출 및 내림차순 정렬
      const datesList = Object.keys(allNotifications).sort((a, b) => b.localeCompare(a));
      
      // 날짜별 알림 개수 정보와 함께 저장
      const datesWithCount = datesList.map(date => ({
        date,
        count: allNotifications[date]?.length || 0,
        notifications: allNotifications[date] || []
      }));
      
      setDates(datesWithCount);
      setLoading(false);
    } catch (error) {
      console.error('알림 데이터 로드 중 오류 발생:', error);
      setLoading(false);
    }
  };

  // 날짜 선택 처리
  const handleDateSelect = (date, notifications) => {
    setSelectedDate(date);
    setSelectedDateNotifications(notifications);
    setShowDateList(false);
  };

  // 날짜 목록으로 돌아가기
  const goBackToDateList = () => {
    setShowDateList(true);
    setSelectedDate('');
    setSelectedDateNotifications([]);
  };

  // 알림 상세 화면으로 이동
  const navigateToNotificationDetail = (notification) => {
    navigation.navigate('NotificationDetail', { notification });
  };

  // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDateString = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${month}월 ${day}일`;
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

  // 날짜별 알림 목록 화면
  const renderDateNotifications = () => (
    <>
      <FlatList
        data={selectedDateNotifications}
        keyExtractor={(item, index) => `notification-${index}`}
        renderItem={renderNotificationItem}
        contentContainerStyle={styles.notificationsList}
        ListHeaderComponent={
          <View style={styles.dateHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBackToDateList}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.dateHeaderTitle}>{formatDateString(selectedDate)}</Text>
            <View style={styles.headerRight} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {`${formatDateString(selectedDate)}에 알림이 없습니다.`}
            </Text>
          </View>
        }
      />
    </>
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
      ) : showDateList ? (
        dates.length > 0 ? (
          <FlatList
            data={dates}
            keyExtractor={(item) => item.date}
            renderItem={renderDateCard}
            contentContainerStyle={styles.datesList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>알림 기록이 없습니다.</Text>
          </View>
        )
      ) : (
        renderDateNotifications()
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
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  dateHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
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
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default NotificationsScreen; 