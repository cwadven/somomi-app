import React, { useEffect, useState, useRef } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import { fetchPopularProductsApi } from '../api/productsApi';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const flatListRef = useRef(null);

  // 배너 데이터
  const banners = [
    { id: '1', title: '소모품 관리의 시작', description: '소모미와 함께 체계적으로 관리해보세요.' },
    { id: '2', title: '유통기한 알림', description: '유통기한이 다가오면 알려드립니다.' },
    { id: '3', title: '소모품 위치 관리', description: '어디에 보관했는지 잊지 마세요.' },
  ];

  // 팁 데이터
  const tips = [
    { id: '1', title: '유통기한 관리', text: '제품 구매 시 유통기한을 확인하고 등록하세요.' },
    { id: '2', title: '보관 장소', text: '같은 종류의 제품은 같은 장소에 보관하는 것이 좋습니다.' },
    { id: '3', title: '재고 확인', text: '주기적으로 재고를 확인하여 부족한 물품을 미리 준비하세요.' },
  ];

  useEffect(() => {
    loadPopularProducts();
  }, []);

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