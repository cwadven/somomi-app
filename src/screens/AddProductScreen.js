import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { addProduct } from '../redux/slices/productsSlice';

const AddProductScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { categories } = useSelector(state => state.categories);
  
  // 폼 상태
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(null);
  const [estimatedEndDate, setEstimatedEndDate] = useState(null);
  const [purchaseMethod, setPurchaseMethod] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');
  
  // 날짜 선택기 표시 상태
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showEstimatedEndDatePicker, setShowEstimatedEndDatePicker] = useState(false);

  // 폼 유효성 검사
  const isFormValid = () => {
    if (!productName.trim()) {
      Alert.alert('알림', '제품명을 입력해주세요.');
      return false;
    }
    
    if (!purchaseDate) {
      Alert.alert('알림', '구매일을 선택해주세요.');
      return false;
    }
    
    return true;
  };

  // 제품 등록 처리
  const handleSubmit = () => {
    if (!isFormValid()) return;
    
    const newProduct = {
      id: Date.now().toString(), // 임시 ID (실제로는 백엔드에서 생성)
      name: productName,
      categoryId: selectedCategory ? selectedCategory.id : null,
      category: selectedCategory ? selectedCategory.name : '미분류',
      purchaseDate: purchaseDate.toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      estimatedEndDate: estimatedEndDate ? estimatedEndDate.toISOString() : null,
      purchaseMethod,
      purchaseLink,
      price: price ? parseFloat(price) : null,
      memo,
      createdAt: new Date().toISOString(),
    };
    
    dispatch(addProduct(newProduct));
    Alert.alert('성공', '제품이 등록되었습니다.', [
      { text: '확인', onPress: () => navigation.navigate('Home') }
    ]);
  };

  // 날짜 선택 핸들러
  const handleDateChange = (event, selectedDate, dateType) => {
    if (Platform.OS === 'android') {
      setShowPurchaseDatePicker(false);
      setShowExpiryDatePicker(false);
      setShowEstimatedEndDatePicker(false);
    }
    
    if (selectedDate) {
      if (dateType === 'purchase') {
        setPurchaseDate(selectedDate);
      } else if (dateType === 'expiry') {
        setExpiryDate(selectedDate);
      } else if (dateType === 'estimated') {
        setEstimatedEndDate(selectedDate);
      }
    }
  };

  // 카테고리 선택 컴포넌트
  const CategorySelector = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>카테고리</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory?.id === category.id && styles.selectedCategoryChip
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory?.id === category.id && styles.selectedCategoryChipText
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>제품 등록</Text>
        
        {/* 제품명 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>제품명 *</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="제품명을 입력하세요"
          />
        </View>
        
        {/* 카테고리 선택 */}
        <CategorySelector />
        
        {/* 구매일 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매일 *</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowPurchaseDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {purchaseDate ? purchaseDate.toLocaleDateString() : '날짜 선택'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {showPurchaseDatePicker && (
            <DateTimePicker
              value={purchaseDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'purchase')}
            />
          )}
        </View>
        
        {/* 유통기한 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>유통기한 (선택)</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowExpiryDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {expiryDate ? expiryDate.toLocaleDateString() : '날짜 선택'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {showExpiryDatePicker && (
            <DateTimePicker
              value={expiryDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'expiry')}
            />
          )}
        </View>
        
        {/* 예상 소모 완료일 선택 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>예상 소모 완료일 (선택)</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowEstimatedEndDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {estimatedEndDate ? estimatedEndDate.toLocaleDateString() : '날짜 선택'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
          {showEstimatedEndDatePicker && (
            <DateTimePicker
              value={estimatedEndDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, 'estimated')}
            />
          )}
        </View>
        
        {/* 구매 방법 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매 방법 (선택)</Text>
          <TextInput
            style={styles.input}
            value={purchaseMethod}
            onChangeText={setPurchaseMethod}
            placeholder="예: 오프라인 매장, 온라인 쇼핑몰 등"
          />
        </View>
        
        {/* 구매 링크 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>구매 링크 (선택)</Text>
          <TextInput
            style={styles.input}
            value={purchaseLink}
            onChangeText={setPurchaseLink}
            placeholder="구매한 온라인 스토어 링크"
            keyboardType="url"
          />
        </View>
        
        {/* 가격 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>가격 (선택)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="가격 입력"
            keyboardType="numeric"
          />
        </View>
        
        {/* 메모 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={memo}
            onChangeText={setMemo}
            placeholder="추가 정보 입력"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        {/* 등록 버튼 */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>제품 등록</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  categoriesList: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategoryChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductScreen; 