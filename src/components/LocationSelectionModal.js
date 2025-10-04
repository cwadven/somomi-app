import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { isLocationExpired as isLocationExpiredUtil, getLocationCapacityInfo } from '../utils/locationUtils';
import { fetchProductsByLocation } from '../redux/slices/productsSlice';

const LocationSelectionModal = ({ visible, onClose, onSelectLocation, reasonMessage }) => {
  const dispatch = useDispatch();
  const { locations, status } = useSelector(state => state.locations);
  const { products, locationProducts } = useSelector(state => state.products);
  const { userProductSlotTemplateInstances, userLocationTemplateInstances, subscription } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // 모달이 표시될 때 영역 데이터 로드
  useEffect(() => {
    if (visible) {
      setLoading(true);
      dispatch(fetchLocations())
        .unwrap()
        .then(async (fetchedLocations) => {
          try {
            const list = Array.isArray(fetchedLocations) ? fetchedLocations : (locations || []);
            // 각 영역별 제품 목록 최신화 (용량 계산 정확도 향상)
            await Promise.all(
              list.map((loc) => {
                if (!loc?.id) return Promise.resolve();
                return dispatch(fetchProductsByLocation(String(loc.id)))
                  .unwrap()
                  .catch(() => {});
              })
            );
          } catch (_) {}
          setLoading(false);
        })
        .catch(() => setLoading(false));
      setSelectedLocationId(null);
    }
  }, [visible, dispatch]);

  const handleSelectLocation = (location) => {
    setSelectedLocationId(location.id);
  };

  // 복원 가능(만료 아님 && 가득 참 아님)한 영역만 필터링
  const eligibleLocations = useMemo(() => {
    try {
      return (locations || []).filter((loc) => {
        const { isFull } = getLocationCapacityInfo(
          loc.id,
          { locations, products, locationProducts, userProductSlotTemplateInstances, subscription }
        );
        const expired = isLocationExpiredUtil(loc.id, { userLocationTemplateInstances, subscription });
        return !isFull && !expired;
      });
    } catch (e) {
      return [];
    }
  }, [locations, products, locationProducts, userProductSlotTemplateInstances, userLocationTemplateInstances, subscription]);

  const renderLocationItem = ({ item }) => (
    (() => {
      const { used, total, isFull } = getLocationCapacityInfo(
        item.id,
        { locations, products, locationProducts, userProductSlotTemplateInstances, subscription }
      );
      const expired = isLocationExpiredUtil(item.id, { userLocationTemplateInstances, subscription });
      const disabled = expired || isFull;
      const selected = selectedLocationId === item.id;
      return (
        <TouchableOpacity
          style={[styles.locationItem, disabled && styles.locationItemDisabled, selected && styles.locationItemSelected]}
          onPress={() => !disabled && handleSelectLocation(item)}
          disabled={disabled}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name={item.icon || 'cube-outline'} size={24} color={disabled ? '#9E9E9E' : '#4CAF50'} />
          </View>
          <View style={styles.locationInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.locationTitle, disabled && { color: '#999' }]}>{item.title}</Text>
              {expired && (
                <View style={styles.badgeExpired}>
                  <Text style={styles.badgeText}>만료</Text>
                </View>
              )}
              {isFull && (
                <View style={styles.badgeFull}>
                  <Text style={styles.badgeText}>가득 참</Text>
                </View>
              )}
            </View>
            <Text style={styles.capacityText}>
              {total === -1 ? `사용 ${used} / 무제한` : `사용 ${used} / 총 ${total}`}
            </Text>
            {item.description && (
              <Text style={styles.locationDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
          {selected ? (
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={disabled ? '#ccc' : '#999'} />
          )}
        </TouchableOpacity>
      );
    })()
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>영역 선택</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {reasonMessage ? (
              <View style={styles.reasonBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#d35400" style={{ marginRight: 6 }} />
                <Text style={styles.reasonText}>{reasonMessage}</Text>
              </View>
            ) : null}
            <Text style={styles.modalDescription}>
              복원할 제품을 넣을 영역을 선택하세요.
            </Text>

            {loading || status === 'loading' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : eligibleLocations.length > 0 ? (
              <FlatList
                data={eligibleLocations}
                renderItem={renderLocationItem}
                keyExtractor={(item) => String(item.localId || item.id)}
                contentContainerStyle={styles.listContainer}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>복원 가능한 영역이 없습니다.</Text>
                <Text style={styles.emptySubText}>만료되었거나 슬롯이 가득 찬 영역은 표시되지 않습니다.</Text>
              </View>
            )}
          </View>

          {/* 하단 확인/취소 버튼 */}
          <View style={styles.footerButtons}>
            <TouchableOpacity style={[styles.footerButton, styles.footerCancel]} onPress={onClose}>
              <Text style={styles.footerCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.footerConfirm, !selectedLocationId && styles.footerConfirmDisabled]}
              onPress={() => {
                if (!selectedLocationId) return;
                const selected = eligibleLocations.find(l => l.id === selectedLocationId);
                if (!selected) return;
                const { isFull } = getLocationCapacityInfo(
                  selectedLocationId,
                  { locations, products, locationProducts, userProductSlotTemplateInstances, subscription }
                );
                const expired = isLocationExpiredUtil(selectedLocationId, { userLocationTemplateInstances, subscription });
                if (isFull || expired) return;
                onSelectLocation(selected);
                onClose();
              }}
              disabled={!selectedLocationId}
            >
              <Text style={styles.footerConfirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff6e6',
    borderColor: '#ffd9a6',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  reasonText: {
    flex: 1,
    color: '#8a4b08',
    fontSize: 13,
    lineHeight: 18,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footerButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  footerCancel: {
    backgroundColor: '#F5F5F5',
  },
  footerConfirm: {
    backgroundColor: '#4CAF50',
  },
  footerConfirmDisabled: {
    backgroundColor: '#A5D6A7',
  },
  footerCancelText: {
    color: '#757575',
    fontWeight: '600',
  },
  footerConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationItemDisabled: {
    opacity: 0.6,
  },
  locationItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1FAF3',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  capacityText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
  },
  badgeExpired: {
    marginLeft: 8,
    backgroundColor: '#fdecea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  badgeFull: {
    marginLeft: 6,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffeeba',
  },
  badgeText: {
    fontSize: 10,
    color: '#b71c1c',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default LocationSelectionModal; 