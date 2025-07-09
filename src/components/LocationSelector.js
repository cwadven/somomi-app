import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 영역 선택 컴포넌트
 * @param {Array} locations - 영역 목록 배열
 * @param {Object} selectedLocation - 현재 선택된 영역
 * @param {Function} onSelectLocation - 영역 선택 시 호출되는 함수
 * @param {Function} onAddLocation - 영역 추가 버튼 클릭 시 호출되는 함수
 * @param {String} status - 영역 로딩 상태 ('idle', 'loading', 'succeeded', 'failed')
 * @param {Boolean} isRequired - 필수 필드 여부
 * @param {String} errorMessage - 에러 메시지
 * @param {Boolean} showError - 에러 표시 여부
 */
const LocationSelector = ({ 
  locations = [], 
  selectedLocation, 
  onSelectLocation, 
  onAddLocation,
  status = 'idle',
  isRequired = false,
  errorMessage = '',
  showError = false
}) => {
  return (
    <View style={styles.locationsContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.sectionTitle}>영역</Text>
        {isRequired && <Text style={styles.requiredMark}>*</Text>}
      </View>
      
      {status === 'loading' ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : locations.length > 0 ? (
        <>
          <FlatList
            horizontal
            data={locations}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={true}
            style={styles.locationFlatList}
            contentContainerStyle={styles.locationsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.locationChip,
                  selectedLocation?.id === item.id && styles.selectedLocationChip,
                  showError && !selectedLocation && styles.locationChipError
                ]}
                onPress={() => onSelectLocation(item)}
              >
                <Ionicons 
                  name={item.icon || 'cube-outline'} 
                  size={16} 
                  color={selectedLocation?.id === item.id ? '#fff' : '#4CAF50'} 
                  style={styles.locationChipIcon}
                />
                <Text
                  style={[
                    styles.locationChipText,
                    selectedLocation?.id === item.id && styles.selectedLocationChipText
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.addLocationChip}
                onPress={onAddLocation}
              >
                <Ionicons name="add" size={18} color="#4CAF50" style={styles.addLocationIcon} />
                <Text style={styles.addLocationText}>영역 추가</Text>
              </TouchableOpacity>
            }
          />
          {showError && errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyLocations}>
          <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={onAddLocation}
          >
            <Text style={styles.addLocationButtonText}>영역 추가하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  locationsContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  requiredMark: {
    color: 'red',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 16,
  },
  locationFlatList: {
    minHeight: 80,
    flexGrow: 0,
  },
  locationsList: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  locationChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selectedLocationChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    elevation: 3,
    shadowOpacity: 0.2,
  },
  locationChipError: {
    borderColor: 'red',
  },
  locationChipIcon: {
    marginRight: 4,
  },
  locationChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedLocationChipText: {
    color: '#fff',
  },
  addLocationChip: {
    backgroundColor: '#f0f9f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  addLocationIcon: {
    marginRight: 6,
  },
  addLocationText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyLocations: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  addLocationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default LocationSelector; 