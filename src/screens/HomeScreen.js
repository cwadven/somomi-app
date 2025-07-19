import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  ToastAndroid,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProductCard from '../components/ProductCard';
import { fetchPopularProductsApi } from '../api/productsApi';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [exitApp, setExitApp] = useState(false);
  const flatListRef = useRef(null);

  // 배너 데이터
  const banners = [];

  // 팁 데이터
  const tips = [];

  useEffect(() => {
    loadPopularProducts();
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
          if (Platform.OS === 'android') {
            ToastAndroid.show('뒤로가기 하면 앱이 종료됩니다', ToastAndroid.SHORT);
          } else {
            // iOS에서는 Alert 사용
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

  const loadPopularProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchPopularProductsApi();
      setPopularProducts(data);
      setError(null);
    } catch (err) {
      setError('인기 상품을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  // 추천 상품 렌더링
  const renderRecommendedProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.recommendedProductItem}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.recommendedProductImageContainer}>
        <View style={styles.recommendedProductImage}>
          <Ionicons name="cube-outline" size={32} color="#4CAF50" />
        </View>
      </View>
      <Text style={styles.recommendedProductBrand}>{item.brand}</Text>
      <Text style={styles.recommendedProductName}>{item.name}</Text>
      <View style={styles.recommendedProductPopularity}>
        <Ionicons name="star" size={12} color="#FFD700" />
        <Text style={styles.recommendedProductPopularityText}>{item.popularity}</Text>
      </View>
    </TouchableOpacity>
  );

  // 팁 렌더링
  const renderTip = ({ item }) => (
    <View style={styles.tipItem}>
      <View style={styles.tipIcon}>
        <Ionicons name="bulb-outline" size={24} color="#4CAF50" />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{item.title}</Text>
        <Text style={styles.tipText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>소모미</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 배너 섹션 */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={flatListRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            data={banners}
            renderItem={renderBanner}
            keyExtractor={item => item.id}
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
        
        {/* 추천 상품 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>인기 상품</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={popularProducts}
              renderItem={renderRecommendedProduct}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.recommendedProductsList}
            />
          )}
        </View>
        
        {/* 팁 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>소모품 관리 팁</Text>
          </View>
          <FlatList
            data={tips}
            renderItem={renderTip}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.tipsList}
          />
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
    padding: 8,
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
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
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
  recommendedProductsList: {
    paddingLeft: 16,
  },
  recommendedProductItem: {
    width: 120,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  recommendedProductImageContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendedProductImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedProductBrand: {
    fontSize: 12,
    color: '#888',
  },
  recommendedProductName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  recommendedProductPopularity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recommendedProductPopularityText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  tipsList: {
    paddingHorizontal: 16,
  },
  tipItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  tipText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
});

export default HomeScreen; 