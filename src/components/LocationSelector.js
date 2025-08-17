import React, { forwardRef } from 'react';
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
 * @param {Boolean} isLoading - 영역 로딩 중 여부
 * @param {Function} onRetry - 로드 재시도 함수
 * @param {String} error - 에러 메시지
 */
const LocationSelector = forwardRef(({ 
  locations = [], 
  selectedLocation, 
  onSelectLocation, 
  onAddLocation,
  isLoading = false,
  onRetry,
  error = '',
  hideAddButton = false,
}, ref) => {
  return (
    <View style={styles.locationsContainer}>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
          <Text style={styles.loaderText}>영역 정보를 불러오는 중...</Text>
      </View>
      ) : locations.length > 0 ? (
        <>
          <FlatList
            ref={ref}
            horizontal
            data={locations}
            keyExtractor={(item) => String(item.localId || item.id)}
            showsHorizontalScrollIndicator={true}
            style={styles.locationFlatList}
            contentContainerStyle={styles.locationsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.locationChip,
                  selectedLocation?.id === item.id && styles.selectedLocationChip,
                  error && !selectedLocation && styles.locationChipError
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
            ListFooterComponent={hideAddButton ? null : (
              <TouchableOpacity
                style={styles.addLocationChip}
                onPress={onAddLocation}
              >
                <Ionicons name="add" size={18} color="#4CAF50" style={styles.addLocationIcon} />
                <Text style={styles.addLocationText}>영역 추가</Text>
              </TouchableOpacity>
            )}
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyLocations}>
          <Text style={styles.emptyText}>등록된 영역이 없습니다.</Text>
          <View style={styles.emptyButtonsContainer}>
          {!hideAddButton && (
            <TouchableOpacity
              style={styles.addLocationButton}
              onPress={onAddLocation}
            >
              <Text style={styles.addLocationButtonText}>영역 추가하기</Text>
            </TouchableOpacity>
          )}
            
            {onRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
              >
                <Ionicons name="refresh" size={16} color="#fff" style={styles.retryIcon} />
                <Text style={styles.retryButtonText}>다시 로드</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

// 표시 이름 설정
LocationSelector.displayName = 'LocationSelector';

const styles = StyleSheet.create({
  locationsContainer: {
    marginBottom: 10,
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
  emptyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  addLocationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 10,
  },
  addLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryIcon: {
    marginRight: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loader: {
    marginBottom: 10,
  },
  loaderText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default LocationSelector; 