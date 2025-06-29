import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocationById, fetchProductsByLocation } from '../redux/slices/locationsSlice';
import ProductCard from '../components/ProductCard';

const LocationDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { locationId } = route.params;
  const isAllProducts = locationId === 'all';
  
  const { 
    currentLocation, 
    locationProducts, 
    status, 
    error 
  } = useSelector(state => state.locations);
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!isAllProducts) {
      dispatch(fetchLocationById(locationId));
    }
    dispatch(fetchProductsByLocation(locationId));
  }, [dispatch, locationId, isAllProducts]);

  useEffect(() => {
    if (locationProducts && locationProducts[locationId]) {
      setProducts(locationProducts[locationId]);
    }
  }, [locationProducts, locationId]);

  const handleAddProduct = () => {
    navigation.navigate('AddProduct', { locationId });
  };

  const handleProductPress = (productId) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const renderItem = ({ item }) => (
    <ProductCard 
      product={item} 
      onPress={() => handleProductPress(item.id)}
    />
  );

  if (status === 'loading' && !products.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>오류: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            if (!isAllProducts) {
              dispatch(fetchLocationById(locationId));
            }
            dispatch(fetchProductsByLocation(locationId));
          }}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const title = isAllProducts ? '모든 제품' : currentLocation?.title || '영역 상세';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {!isAllProducts && currentLocation && (
            <View style={styles.locationIconContainer}>
              <Ionicons 
                name={currentLocation.icon || 'cube-outline'} 
                size={30} 
                color="#4CAF50" 
              />
            </View>
          )}
          <View>
            <Text style={styles.title}>{title}</Text>
            {!isAllProducts && currentLocation && (
              <Text style={styles.description}>{currentLocation.description}</Text>
            )}
          </View>
        </View>
      </View>
      
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 제품이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              오른쪽 하단의 + 버튼을 눌러 제품을 추가하세요.
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddProduct}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default LocationDetailScreen; 