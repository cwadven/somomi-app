import { useEffect, useState, useRef, useCallback } from 'react';
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
import { fetchManageTipsApi, fetchPromotionBannersApi } from '../api/promotionApi';
import { useSelector } from 'react-redux';
import { checkUnreadGuestNotifications } from '../api/notificationApi';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { isLoggedIn, isAnonymous, user } = useSelector((state) => state.auth);
  const isMemberLoggedIn = !!(isLoggedIn && !isAnonymous && user?.memberId);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [exitApp, setExitApp] = useState(false);
  const flatListRef = useRef(null);
  const [hasUnreadGuest, setHasUnreadGuest] = useState(false);

  // 배너 데이터
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannersError, setBannersError] = useState('');
  const bannerAutoTimerRef = useRef(null);
  const bannerUserInteractingRef = useRef(false);

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

  // 홈 상단 배너 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setBannersLoading(true);
        setBannersError('');
        const res = await fetchPromotionBannersApi({ target_layer: 'HOME_TOP', page: 1, size: 10 });
        const list = Array.isArray(res?.banners) ? res.banners : [];
        if (!mounted) return;
        setBanners(list);
        setCurrentBannerIndex(0);
      } catch (e) {
        if (!mounted) return;
        setBanners([]);
        setBannersError('배너를 불러오지 못했습니다.');
      } finally {
        if (mounted) setBannersLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 배너 3초 자동 슬라이드
  useEffect(() => {
    if (!banners || banners.length <= 1) return () => {};
    if (bannerUserInteractingRef.current) return () => {};
    if (bannerAutoTimerRef.current) clearInterval(bannerAutoTimerRef.current);
    bannerAutoTimerRef.current = setInterval(() => {
      try {
        if (bannerUserInteractingRef.current) return;
        const next = (currentBannerIndex + 1) % banners.length;
        flatListRef.current?.scrollToOffset?.({ offset: next * width, animated: true });
      } catch (e) {}
    }, 3000);
    return () => {
      if (bannerAutoTimerRef.current) clearInterval(bannerAutoTimerRef.current);
      bannerAutoTimerRef.current = null;
    };
  }, [banners, currentBannerIndex]);

  const pickBannerImage = useCallback((banner) => {
    const w = width;
    const big = banner?.big_image;
    const mid = banner?.middle_image;
    const small = banner?.small_image;
    const ordered = w >= 720 ? [big, mid, small] : (w >= 390 ? [mid, big, small] : [small, mid, big]);
    const uri = ordered.find((x) => typeof x === 'string' && x.trim() !== '') || null;
    return uri;
  }, []);

  const handleBannerPress = useCallback((banner) => {
    const external = banner?.external_target_url;
    const targetPk = banner?.target_pk;
    const targetType = banner?.target_type;
    const title = banner?.title || '콘텐츠';
    const normalizedType = targetType == null ? null : String(targetType).toUpperCase();
    const isContentTarget = normalizedType == null || normalizedType === 'CONTENT';
    const isExternalTarget = normalizedType === 'EXTERNAL_URL';

    if (isExternalTarget) {
      if (external && typeof external === 'string' && external.trim() !== '') {
        rootNavigate('ExternalWebView', { url: external, title });
      }
      return;
    }

    if (isContentTarget && targetPk != null && String(targetPk).trim() !== '') {
      rootNavigate('ContentWebView', { contentId: String(targetPk), title });
    }
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

  // 홈 탭 포커스 시: 읽지 않은 게스트 알림 존재 여부 조회(회원만)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!isMemberLoggedIn) {
          if (alive) setHasUnreadGuest(false);
          return;
        }
        try {
          const res = await checkUnreadGuestNotifications();
          const v =
            res?.has_unread != null ? !!res.has_unread :
            res?.hasUnread != null ? !!res.hasUnread :
            false;
          if (alive) setHasUnreadGuest(v);
        } catch (e) {
          if (alive) setHasUnreadGuest(false);
        }
      })();
      return () => { alive = false; };
    }, [isMemberLoggedIn])
  );

  // 배너 렌더링
  const renderBanner = ({ item }) => {
    const bg = typeof item?.background_color === 'string' && item.background_color.trim() !== '' ? item.background_color : '#4CAF50';
    const titleColor = typeof item?.title_font_color === 'string' && item.title_font_color.trim() !== '' ? item.title_font_color : '#ffffff';
    const descColor = typeof item?.description_font_color === 'string' && item.description_font_color.trim() !== '' ? item.description_font_color : 'rgba(255,255,255,0.92)';
    const uri = pickBannerImage(item);
    const normalizedType = item?.target_type == null ? null : String(item?.target_type).toUpperCase();
    const isContentTarget = normalizedType == null || normalizedType === 'CONTENT';
    const isExternalTarget = normalizedType === 'EXTERNAL_URL';
    const clickable = !!(
      (isExternalTarget && item?.external_target_url && String(item?.external_target_url).trim() !== '') ||
      (isContentTarget && item?.target_pk != null && String(item?.target_pk).trim() !== '')
    );
    const { Image } = require('react-native');
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.bannerItem, { backgroundColor: bg }]}
        onPress={() => (clickable ? handleBannerPress(item) : null)}
        disabled={!clickable}
      >
        <View style={styles.bannerInner}>
          {uri ? (
            <Image source={{ uri }} style={styles.bannerImage} resizeMode="cover" />
          ) : null}
          <View style={styles.bannerOverlay}>
            {!!item?.title && (
              <Text style={[styles.bannerTitle, { color: titleColor }]} numberOfLines={1}>
                {item.title}
              </Text>
            )}
            {!!item?.description && (
              <Text style={[styles.bannerDescription, { color: descColor }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 배너 스크롤 이벤트 핸들러
  const handleBannerScrollEnd = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentBannerIndex(index);
    bannerUserInteractingRef.current = false;
  };

  const handleBannerScrollBeginDrag = () => {
    bannerUserInteractingRef.current = true;
    if (bannerAutoTimerRef.current) {
      clearInterval(bannerAutoTimerRef.current);
      bannerAutoTimerRef.current = null;
    }
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
        {isLoggedIn ? (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              // 알림 목록으로 이동하는 순간 UX 상 레드닷은 즉시 내려도 무방(실제 미읽음은 서버 기준)
              try { setHasUnreadGuest(false); } catch (e) {}
              navigation.navigate('MyNotifications');
            }}
            accessibilityRole="button"
            accessibilityLabel="내 알림"
          >
            <View style={styles.notificationIconWrap}>
              <Ionicons name="notifications-outline" size={22} color="#4CAF50" />
              {hasUnreadGuest ? <View style={styles.notificationDot} /> : null}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 배너 섹션 (관리팁 위) */}
        {bannersLoading ? (
          <View style={styles.bannerSection}>
            <View style={[styles.bannerItem, { backgroundColor: '#e8f5e9' }]} />
          </View>
        ) : banners.length > 0 ? (
          <View style={styles.bannerSection}>
            <FlatList
              ref={flatListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              data={banners}
              renderItem={renderBanner}
              keyExtractor={item => String(item.banner_id)}
              pagingEnabled
              snapToAlignment="start"
              disableIntervalMomentum
              scrollEventThrottle={16}
              onScrollBeginDrag={handleBannerScrollBeginDrag}
              onMomentumScrollEnd={handleBannerScrollEnd}
              decelerationRate="fast"
              snapToInterval={width}
            />
            <View style={styles.bannerIndicator}>
              <Text style={styles.bannerIndicatorText}>
                {currentBannerIndex + 1}/{banners.length}
              </Text>
            </View>
          </View>
        ) : bannersError ? (
          <View style={styles.bannerSection}>
            <Text style={{ paddingHorizontal: 16, color: '#d32f2f' }}>{bannersError}</Text>
          </View>
        ) : null}
        
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationIconWrap: {
    position: 'relative',
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
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
    height: Math.max(140, Math.min(200, Math.round(width * 0.42))),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerInner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
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