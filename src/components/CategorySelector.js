import { forwardRef } from 'react';
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
 * 카테고리 선택 컴포넌트
 * @param {Array} categories - 카테고리 목록 배열
 * @param {Object} selectedCategory - 현재 선택된 카테고리
 * @param {Function} onSelectCategory - 카테고리 선택 시 호출되는 함수
 * @param {Function} onAddCategory - 카테고리 추가 버튼 클릭 시 호출되는 함수
 * @param {String} status - 카테고리 로딩 상태 ('idle', 'loading', 'succeeded', 'failed')
 * @param {Object} ref - FlatList에 대한 참조
 */
const CategorySelector = forwardRef(({ 
  categories = [], 
  selectedCategory, 
  onSelectCategory, 
  onAddCategory,
  status = 'idle'
}, ref) => {
  return (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>카테고리</Text>
      {status === 'loading' ? (
        <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />
      ) : categories.length > 0 ? (
        <FlatList
          ref={ref}
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={true}
          style={styles.categoryFlatList}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory?.id === item.id && styles.selectedCategoryChip
              ]}
              onPress={() => {
                // 이미 선택된 카테고리를 다시 선택하면 선택 해제
                if (selectedCategory?.id === item.id) {
                  onSelectCategory(null);
                } else {
                  onSelectCategory(item);
                }
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory?.id === item.id && styles.selectedCategoryChipText
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addCategoryChip}
              onPress={onAddCategory}
            >
              <Ionicons name="add" size={18} color="#4CAF50" style={styles.addCategoryIcon} />
              <Text style={styles.addCategoryText}>카테고리 추가</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <View style={styles.emptyCategories}>
          <Text style={styles.emptyText}>등록된 카테고리가 없습니다.</Text>
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={onAddCategory}
          >
            <Text style={styles.addCategoryButtonText}>카테고리 추가하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  categoriesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  categoryFlatList: {
    minHeight: 80,
    flexGrow: 0,
  },
  categoriesList: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCategoryChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    elevation: 3,
    shadowOpacity: 0.2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  selectedCategoryChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  addCategoryChip: {
    backgroundColor: '#f0f9f0',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  addCategoryIcon: {
    marginRight: 6,
  },
  addCategoryText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyCategories: {
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
  addCategoryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
});

export default CategorySelector; 