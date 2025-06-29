import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocations } from '../redux/slices/locationsSlice';

const LocationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { locations, status, error } = useSelector(state => state.locations);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchLocations());
    }
  }, [status, dispatch]);

  const handleAddLocation = () => {
    navigation.navigate('AddLocation');
  };

  const handleLocationPress = (locationId) => {
    navigation.navigate('LocationDetail', { locationId });
  };

  const handleAllProductsPress = () => {
    navigation.navigate('LocationDetail', { locationId: 'all' });
  };

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.locationItem}
      onPress={() => handleLocationPress(item.id)}
    >
      <View style={styles.locationIconContainer}>
        <Ionicons name={item.icon || 'cube-outline'} size={24} color="#4CAF50" />
      </View>
      <View style={styles.locationInfo}>
        <Text style={styles.locationTitle}>{item.title}</Text>
        <Text style={styles.locationDescription} numberOfLines={1}>
          {item.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
    </TouchableOpacity>
  );

  if (status === 'loading' && locations.length === 0) {
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
          onPress={() => dispatch(fetchLocations())}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>영역 목록</Text>
      </View>

      <TouchableOpacity 
        style={styles.allProductsItem}
        onPress={handleAllProductsPress}
      >
        <View style={[styles.locationIconContainer, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="apps-outline" size={24} color="#4CAF50" />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>모든 제품</Text>
          <Text style={styles.locationDescription} numberOfLines={1}>
            등록된 모든 제품 보기
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
      </TouchableOpacity>

      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              오른쪽 하단의 + 버튼을 눌러 영역을 추가하세요.
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddLocation}
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
    paddingBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  allProductsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
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

export default LocationsScreen; 