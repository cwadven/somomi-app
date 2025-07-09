import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 아이콘 선택 컴포넌트
 * @param {Array} icons - 선택 가능한 아이콘 목록 배열
 * @param {String} selectedIcon - 현재 선택된 아이콘
 * @param {Function} onSelectIcon - 아이콘 선택 시 호출되는 함수
 */
const IconSelector = ({ 
  icons = [], 
  selectedIcon, 
  onSelectIcon
}) => {
  return (
    <View style={styles.iconSelectorContainer}>
      <Text style={styles.sectionTitle}>아이콘 선택</Text>
      <FlatList
        horizontal
        data={icons}
        keyExtractor={(item, index) => `icon-${index}-${item}`}
        showsHorizontalScrollIndicator={true}
        style={styles.iconFlatList}
        contentContainerStyle={styles.iconsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.iconItem,
              selectedIcon === item && styles.selectedIconItem
            ]}
            onPress={() => onSelectIcon(item)}
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
  );
};

const styles = StyleSheet.create({
  iconSelectorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  iconFlatList: {
    minHeight: 80,
    flexGrow: 0,
  },
  iconsList: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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