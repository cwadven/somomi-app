import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts } from '../redux/slices/productsSlice';
import ProductCard from '../components/ProductCard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const MyProductsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { products, status, error } = useSelector((state) => state.products);

  // 화면이 포커스될 때마다 제품 목록 다시 로드
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProducts());
    }, [dispatch])
  );

  const renderItem = ({ item }) => (
    <ProductCard 
      product={item} 
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>내 제품 목록</Text>
      </View>
      
      {status === 'loading' && products.length === 0 && (
        <View style={styles.centered}>
          <Text>로딩 중...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>오류: {error}</Text>
        </View>
      )}
      
      {status === 'succeeded' && products.length === 0 && (
        <View style={styles.centered}>
          <Text>등록된 제품이 없습니다.</Text>
        </View>
      )}
      
      {products.length > 0 && (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <TouchableOpacity 
        style={styles.addButton}
                  onPress={() => navigation.navigate('ProductForm', { mode: 'add' })}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
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

export default MyProductsScreen; 