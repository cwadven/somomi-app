import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addCategory } from '../redux/slices/categoriesSlice';
import { generateId } from '../utils/idUtils';

const CategoryAddModal = ({ visible, onClose, onCategoryAdded }) => {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.categories.categories);
  
  // 상태 관리
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // 카테고리 추가 처리
  const handleAddCategory = () => {
    // 입력값 검증
    if (!newCategoryName.trim()) {
      setCategoryError('카테고리 이름을 입력해주세요.');
      return;
    }

    // 카테고리 이름 중복 검사
    const isDuplicate = categories.some(
      category => category.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (isDuplicate) {
      setCategoryError('이미 존재하는 카테고리 이름입니다.');
      return;
    }

    // 새 카테고리 생성
    const newCategory = {
      id: generateId('category'),
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || '',
      createdAt: new Date().toISOString()
    };

    // Redux에 카테고리 추가
    dispatch(addCategory(newCategory));

    // 부모 컴포넌트에 알림
    if (onCategoryAdded) {
      onCategoryAdded(newCategory);
    }

    // 모달 닫기
    handleClose();
  };

  // 모달 닫기
  const handleClose = () => {
    setNewCategoryName('');
    setNewCategoryDescription('');
    setCategoryError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        handleClose();
      }}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => {
            // 이벤트 버블링 방지
            e.stopPropagation();
          }}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%' }}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>새 카테고리 추가</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>카테고리 이름</Text>
                  <TextInput
                    style={[styles.modalInput, categoryError ? styles.inputError : null]}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="예: 식품, 화장품, 세제 등"
                    autoFocus
                    keyboardType="default"
                    autoCorrect={false}
                    blurOnSubmit={false}
                  />
                  {categoryError ? (
                    <Text style={styles.errorText}>{categoryError}</Text>
                  ) : null}
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>설명 (선택사항)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newCategoryDescription}
                    onChangeText={setNewCategoryDescription}
                    placeholder="카테고리에 대한 설명을 입력하세요"
                    multiline
                    keyboardType="default"
                    autoCorrect={false}
                  />
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => {
                      Keyboard.dismiss();
                      handleClose();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmButton]} 
                    onPress={handleAddCategory}
                  >
                    <Text style={styles.confirmButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#757575',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CategoryAddModal; 