import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const NotificationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { notification } = route.params;

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
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

  // 제품 상세 페이지로 이동
  const navigateToProductDetail = () => {
    if (notification.product_id) {
      navigation.navigate('ProductDetail', { productId: notification.product_id });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 상세</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.notification_type) }]}>
            <Ionicons name={getNotificationIcon(notification.notification_type)} size={32} color="#fff" />
          </View>
          <View style={styles.notificationTitleContainer}>
            <Text style={styles.notificationType}>{notification.notification_type} 알림</Text>
            <Text style={styles.productName}>{notification.product_name}</Text>
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>알림 내용</Text>
          <Text style={styles.messageText}>{notification.message}</Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>알림 발생 원인</Text>
            <Text style={styles.infoValue}>
              {notification.source_type === 'location' ? '영역 알림 설정' : '제품 알림 설정'}
            </Text>
          </View>

          {notification.source_type === 'location' && notification.source_name && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>발생 영역</Text>
              <Text style={styles.infoValue}>{notification.source_name}</Text>
            </View>
          )}

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>제품 위치</Text>
            <Text style={styles.infoValue}>{notification.location_name || '위치 정보 없음'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>만료 일시</Text>
            <Text style={styles.infoValue}>{formatDate(notification.expire_at)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.productButton}
          onPress={navigateToProductDetail}
        >
          <Ionicons name="cube-outline" size={20} color="#fff" style={styles.productButtonIcon} />
          <Text style={styles.productButtonText}>제품 상세 보기</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationTitleContainer: {
    flex: 1,
  },
  notificationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  productButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  productButtonIcon: {
    marginRight: 8,
  },
  productButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default NotificationDetailScreen; 