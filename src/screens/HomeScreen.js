import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  Platform,
  Alert
} from 'react-native';

// ToastAndroid를 조건부로 가져오기
const ToastAndroid = Platform.OS === 'android' ? require('react-native').ToastAndroid : null;

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { navigate as rootNavigate } from '../navigation/RootNavigation';
import { fetchManageTipsApi } from '../api/promotionApi';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [exitApp, setExitApp] = useState(false);
  const flatListRef = useRef(null);

  // 배너 데이터
  const banners = [];

  // 관리 팁 데이터
  const [tips, setTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(true);
  const [tipsError, setTipsError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setTipsLoading(true);
        setTipsError('');
        const res = await fetchManageTipsApi();
        const list = Array.isArray(res?.manage_tips) ? res.manage_tips : [];
        if (!mounted) return;
        setTips(list.slice(0, 10));
      } catch (e) {
        if (!mounted) return;
        setTips([]);
        setTipsError('관리 팁을 불러오지 못했습니다.');
      } finally {
        if (mounted) setTipsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 뒤로가기 버튼 처리
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (exitApp) {
          // 두 번째 뒤로가기: 앱 종료
          BackHandler.exitApp();
          return true;
        } else {
          // 첫 번째 뒤로가기: 토스트 메시지 표시
          setExitApp(true);
          
          // 플랫폼에 따른 메시지 표시
          if (Platform.OS === 'android' && ToastAndroid) {
            ToastAndroid.show('뒤로가기 하면 앱이 종료됩니다', ToastAndroid.SHORT);
          } else {
            // iOS 또는 웹에서는 Alert 사용
            Alert.alert('알림', '뒤로가기 하면 앱이 종료됩니다', [], { cancelable: true });
          }
          
          // 2초 후 exitApp 상태 초기화
          setTimeout(() => {
            setExitApp(false);
          }, 2000);
          
          return true;
        }
      };
      
      // 뒤로가기 이벤트 리스너 등록
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [exitApp])
  );

  // 배너 렌더링
  const renderBanner = ({ item }) => (
    <TouchableOpacity style={styles.bannerItem}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  // 배너 스크롤 이벤트 핸들러
  const handleBannerScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentBannerIndex(index);
  };

  const handleTipPress = useCallback((tip) => {
    const contentId = tip?.content_id;
    if (!contentId) return;
    rootNavigate('ContentWebView', { contentId, title: tip?.title || '콘텐츠' });
  }, []);

  // 팁 렌더링
  const renderTip = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.tipItem}
      onPress={() => handleTipPress(item)}
      disabled={!item?.content_id}
    >
      <View style={styles.tipIcon}>
        <Ionicons name="bulb-outline" size={24} color="#4CAF50" />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.tipMeta}>
          {item?.content_id ? '자세히 보기' : '콘텐츠 없음'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#bbb" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>소모미</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 배너 섹션 (데이터가 있을 때만 표시) */}
        {banners.length > 0 && (
          <View style={styles.bannerSection}>
            <FlatList
              ref={flatListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              data={banners}
              renderItem={renderBanner}
              keyExtractor={item => String(item.id)}
              pagingEnabled
              snapToAlignment="center"
              onScroll={handleBannerScroll}
              decelerationRate="fast"
              snapToInterval={width}
            />
            <View style={styles.bannerIndicator}>
              <Text style={styles.bannerIndicatorText}>
                {currentBannerIndex + 1}/{banners.length}
              </Text>
            </View>
          </View>
        )}
        
        {/* 팁 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>소모품 관리 팁</Text>
          </View>
          {tipsLoading ? (
            <View style={styles.tipsLoadingWrap}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.tipsLoadingText}>관리 팁 불러오는 중...</Text>
              <View style={styles.tipsSkeletonItem} />
              <View style={styles.tipsSkeletonItem} />
              <View style={styles.tipsSkeletonItem} />
            </View>
          ) : tipsError ? (
            <View style={styles.tipsLoadingWrap}>
              <Text style={[styles.tipsLoadingText, { color: '#d32f2f' }]}>{tipsError}</Text>
            </View>
          ) : (
          <FlatList
            data={tips}
            renderItem={renderTip}
            keyExtractor={item => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={styles.tipsList}
          />
          )}
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notificationButton: {
    // removed
  },
  bannerSection: {
    position: 'relative',
    marginVertical: 12,
  },
  section: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bannerItem: {
    width: width,
    height: 150,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    padding: 16,
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#fff',
  },
  bannerIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipsList: {
    paddingHorizontal: 16,
  },
  tipsLoadingWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tipsLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  tipsSkeletonItem: {
    marginTop: 10,
    width: '100%',
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tipItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  tipIcon: {
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipMeta: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen; 