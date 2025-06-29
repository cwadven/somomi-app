import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import { fetchPopularProductsApi } from '../api/productsApi';

const HomeScreen = ({ navigation }) => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 인기 상품 데이터 로드
  useEffect(() => {
    const loadPopularProducts = async () => {
      try {
        setLoading(true);
        const data = await fetchPopularProductsApi();
        setPopularProducts(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadPopularProducts();
  }, []);

  // 배너 데이터
  const banners = [
    { id: '1', title: '소모품 관리의 시작, 소모미', description: '지금 시작하세요!' },
    { id: '2', title: '이달의 추천 생활용품', description: '최대 30% 할인' },
    { id: '3', title: '소모품 관리 팁', description: '효율적인 관리 방법' },
  ];

  // 팁 데이터
  const tips = [
    { 
      id: '1', 
      title: '치약 보관 방법', 
      content: '치약은 직사광선을 피해 서늘한 곳에 보관하면 유통기한을 더 오래 유지할 수 있습니다.' 
    },
    { 
      id: '2', 
      title: '세제 사용량', 
      content: '세제는 제품 지침보다 약간 적게 사용해도 충분한 세척력을 발휘합니다. 경제적이고 환경에도 좋아요!' 
    },
    { 
      id: '3', 
      title: '화장품 유통기한', 
      content: '개봉 후 화장품은 보통 6개월~1년 내에 사용하는 것이 좋습니다.' 
    },
  ];

  // 배너 렌더링
  const renderBanner = ({ item }) => (
    <TouchableOpacity style={styles.bannerItem}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        <Text style={styles.bannerDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  // 추천 상품 렌더링
  const renderRecommendedProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.recommendedProductItem}
      onPress={() => navigation.navigate('MyProducts', { 
        screen: 'ProductDetail', 
        params: { productId: item.id } 
      })}
    >
      <View style={styles.recommendedProductImageContainer}>
        <View style={styles.recommendedProductImage}>
          <Ionicons name="cube-outline" size={40} color="#4CAF50" />
        </View>
      </View>
      <Text style={styles.recommendedProductBrand}>{item.brand}</Text>
      <Text style={styles.recommendedProductName}>{item.name}</Text>
      <View style={styles.recommendedProductPopularity}>
        <Ionicons name="star" size={12} color="#FFD700" />
        <Text style={styles.recommendedProductPopularityText}>인기도 {item.popularity}%</Text>
      </View>
    </TouchableOpacity>
  );

  // 팁 렌더링
  const renderTip = ({ item }) => (
    <TouchableOpacity style={styles.tipItem}>
      <Ionicons name="bulb-outline" size={24} color="#4CAF50" style={styles.tipIcon} />
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{item.title}</Text>
        <Text style={styles.tipText}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>소모미</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="제품 검색"
        />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 배너 섹션 */}
        <View style={styles.section}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={banners}
            renderItem={renderBanner}
            keyExtractor={item => item.id}
            pagingEnabled
            snapToAlignment="center"
            contentContainerStyle={styles.bannerList}
          />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
  bannerList: {
    paddingLeft: 16,
  },
  bannerItem: {
    width: 300,
    height: 150,
    marginRight: 16,
    borderRadius: 12,
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
  recommendedProductsList: {
    paddingLeft: 16,
  },
  recommendedProductItem: {
    width: 120,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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