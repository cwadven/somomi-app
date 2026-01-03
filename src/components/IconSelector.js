import { 

  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 화면 너비 가져오기
const { width } = Dimensions.get('window');
// 화면 크기에 따라 열 수 조정 (작은 화면에서는 3, 큰 화면에서는 4)
const numColumns = width < 360 ? 3 : 4;

/**
 * 아이콘 선택 모달 컴포넌트
 * @param {Boolean} visible - 모달 표시 여부
 * @param {Function} onClose - 모달 닫기 함수
 * @param {String} selectedIcon - 현재 선택된 아이콘
 * @param {Function} onSelect - 아이콘 선택 시 호출되는 함수
 */
const IconSelector = ({ 
  visible = false,
  onClose,
  selectedIcon, 
  onSelect
}) => {
  // 기본 아이콘 목록
  const defaultIcons = [
    'home-outline',
    'cube-outline',
    'business-outline',
    'cart-outline',
    'fast-food-outline',
    'restaurant-outline',
    'beer-outline',
    'cafe-outline',
    'pizza-outline',
    'nutrition-outline',
    'ice-cream-outline',
    'basket-outline',
    'gift-outline',
    'medkit-outline',
    'fitness-outline',
    'paw-outline',
    'bed-outline',
    'desktop-outline',
    'phone-portrait-outline',
    'tablet-portrait-outline',
    'laptop-outline',
    'tv-outline',
    'game-controller-outline',
    'headset-outline',
    'musical-notes-outline',
    'book-outline',
    'library-outline',
    'school-outline',
    'brush-outline',
    'color-palette-outline',
    'shirt-outline',
    'footsteps-outline',
    'glasses-outline',
    'umbrella-outline',
    'car-outline',
    'bicycle-outline',
    'airplane-outline',
    'train-outline',
    'boat-outline',
    'briefcase-outline',
    'cash-outline',
    'card-outline',
    'wallet-outline',
    'calculator-outline',
    'hammer-outline',
    'construct-outline',
    'build-outline',
    'leaf-outline',
    'flower-outline',
    'planet-outline'
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>아이콘 선택</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={defaultIcons}
            keyExtractor={(item) => `icon-${item}`}
            numColumns={numColumns}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.iconsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.iconItem,
                  selectedIcon === item && styles.selectedIconItem
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Ionicons 
                  name={item} 
                  size={24} 
                  color={selectedIcon === item ? '#fff' : '#4CAF50'} 
                />
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  iconsList: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  iconItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selectedIconItem: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    elevation: 3,
    shadowOpacity: 0.2,
  },
});

export default IconSelector; 