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
  
  // 결합된 알림인지 확인
  const isCombined = notification.combined && notification.allNotifications;

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

  // 제품 상세 화면으로 이동
  const navigateToProductDetail = () => {
    // product_id가 없다면 이동하지 않음
    if (!notification?.product_id) return;
    navigation.push('ProductDetail', { 
      productId: String(notification.product_id),
      // 상세 캐시 탐색을 돕기 위해 기본 필드도 함께 전달(폴백용)
      product: {
        id: String(notification.product_id),
        name: notification.product_name,
        locationId: notification.location_id ? String(notification.location_id) : null,
      },
      hideHeader: true
    });
  };

  // 결합된 알림 렌더링
  const renderCombinedNotifications = () => {
    return (
      <View style={styles.combinedContainer}>
        <Text style={styles.combinedTitle}>알림 목록</Text>
        
        {notification.allNotifications.map((item, index) => (
          <View key={`combined-${index}`} style={styles.combinedItem}>
            <View style={[styles.combinedIconContainer, { backgroundColor: getNotificationColor(item.notification_type) }]}>
              <Ionicons name={getNotificationIcon(item.notification_type)} size={20} color="#fff" />
            </View>
            <View style={styles.combinedContent}>
              <Text style={styles.combinedType}>{item.notification_type}</Text>
              <Text style={styles.combinedMessage}>{item.message}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 제품 정보 렌더링
  const renderProductInfo = () => {
    return (
      <View style={styles.productSection}>
        <Text style={styles.sectionTitle}>제품 정보</Text>
        <View style={styles.productInfoItem}>
          <Text style={styles.infoLabel}>제품명</Text>
          <Text style={styles.infoValue}>{notification.product_name}</Text>
        </View>
        
        {notification.location_name && (
          <View style={styles.productInfoItem}>
            <Text style={styles.infoLabel}>위치</Text>
            <Text style={styles.infoValue}>{notification.location_name}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
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
      
      <ScrollView style={styles.container}>
        {/* 알림 헤더 */}
        <View style={styles.notificationHeader}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isCombined ? '#9C27B0' : getNotificationColor(notification.notification_type) }
          ]}>
            <Ionicons 
              name={isCombined ? 'notifications' : getNotificationIcon(notification.notification_type)} 
              size={32} 
              color="#fff" 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.productName}>{notification.product_name}</Text>
            <Text style={styles.notificationType}>
              {isCombined ? '복합 알림' : notification.notification_type}
            </Text>
          </View>
        </View>
        
        {/* 알림 내용 */}
        <View style={styles.contentSection}>
          <Text style={styles.contentTitle}>알림 내용</Text>
          <Text style={styles.contentText}>
            {isCombined 
              ? `${notification.product_name}의 유통기한과 소진 예상 알림이 있습니다.` 
              : notification.message
            }
          </Text>
        </View>
        
        {/* 결합된 알림 목록 */}
        {isCombined && renderCombinedNotifications()}
        
        {/* 제품 정보 */}
        {renderProductInfo()}
        
        {/* 제품 상세 버튼 */}
        <TouchableOpacity 
          style={styles.productDetailButton}
          onPress={navigateToProductDetail}
        >
          <Text style={styles.productDetailButtonText}>제품 상세 보기</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationType: {
    fontSize: 14,
    color: '#666',
  },
  contentSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  productSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  productInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  productDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    margin: 20,
  },
  productDetailButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  combinedContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  combinedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  combinedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  combinedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  combinedContent: {
    flex: 1,
  },
  combinedType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  combinedMessage: {
    fontSize: 14,
    color: '#666',
  },
});

export default NotificationDetailScreen; 