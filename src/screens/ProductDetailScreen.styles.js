import { Platform, StyleSheet } from 'react-native';

// NOTE: 기존 `ProductDetailScreen.js`의 styles를 그대로 분리했습니다.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    width: 32
  },
  formLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  requiredLabel: {
    color: '#F44336'
  },
  requiredAsterisk: {
    color: '#F44336',
    fontWeight: '800'
  },
  requiredHint: {
    color: '#F44336',
    fontWeight: '600'
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  formImageButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  formImageButtonText: {
    marginLeft: 6,
    color: '#fff',
    fontWeight: '700'
  },
  formHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#666'
  },
  formSaveButton: {
    marginTop: 18,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  formSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  formCancelButton: {
    marginTop: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  formCancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700'
  },
  datePickButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  datePickButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  datePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  dateClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA'
  },
  dateClearButtonText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
    fontWeight: '700'
  },
  datePickerIosDone: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: 'red',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  characterImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  brandCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandName: {
    fontSize: 14,
    color: '#666',
    marginRight: 8
  },
  categoryName: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  hpSectionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0'
  },
  hpSection: {
    marginBottom: 16
  },
  hpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  hpTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  hpIcon: {
    marginRight: 6
  },
  hpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  hpDate: {
    fontSize: 14,
    color: '#666'
  },
  hpLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  hpLabel: {
    fontSize: 14,
    color: '#666'
  },
  hpPercentage: {
    fontSize: 14,
    fontWeight: '500'
  },
  hpBarContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden'
  },
  hpBar: {
    height: '100%',
    borderRadius: 5
  },
  remainingDays: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right'
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8
  },
  memoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoIcon: {
    marginRight: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#333'
  },
  infoValue: {
    fontSize: 14,
    color: '#666'
  },
  memoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  // 소진 처리 버튼 스타일
  consumeButtonContainer: {
    padding: 16,
    marginTop: 16
  },
  consumeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  urgentConsumeButton: {
    backgroundColor: '#FF9800'
  },
  consumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
    marginBottom: 24
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4
  },
  deleteButton: {
    backgroundColor: '#F44336'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  productInfoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20
  },
  productInfoRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  productInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80
  },
  productInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  successButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50'
  },
  tabButtonText: {
    fontSize: 16,
    color: '#666'
  },
  activeTabButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  productHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover'
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)'
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 16,
    zIndex: 2,
    padding: 8
  },
  imageViewerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  imageViewerImage: {
    width: '100%',
    height: '100%'
  },
  noImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  noImageText: {
    fontSize: 14,
    color: '#666'
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  locationText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  productCategory: {
    fontSize: 12,
    color: '#666'
  },
  bottomActionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  bottomActionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  bottomActionText: {
    fontSize: 14,
    marginTop: 4,
    color: '#666'
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8
  },
  memoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666'
  },
  buttonSection: {
    padding: 16,
    marginBottom: 16
  },
  consumedButton: {
    backgroundColor: '#4CAF50'
  },
  hpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center'
  },
  // 알림 설정 컨테이너 스타일 추가
  notificationsContainer: {
    padding: 16,
    paddingBottom: 80 // 하단 여백 추가
  },
  notificationsScrollContainer: {
    flex: 1
  },
  // 날짜 선택 모달 스타일
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    alignItems: 'center'
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15
  },
  closeButton: {
    padding: 5
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
    height: 200
  },
  datePickerScrollWrapper: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  datePickerScroll: {
    width: '100%',
    height: 150
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
    lineHeight: 22
  },
  datePickerOption: {
    // 일부 기기(예: Galaxy S10)에서 글자 하단이 잘리는 이슈가 있어
    // 고정 높이 대신 충분한 최소 높이/라인높이를 부여합니다.
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    height: 48
  },
  datePickerOptionSelected: {
    backgroundColor: '#4CAF50'
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22
  },
  datePickerOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold'
  },
  selectedDateText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600'
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  datePickerCancelButton: {
    backgroundColor: '#E0E0E0'
  },
  datePickerCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold'
  },
  datePickerConfirmButton: {
    backgroundColor: '#4CAF50'
  },
  datePickerConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  consumptionDateContainer: {
    alignItems: 'center',
    marginTop: 10
  },
  consumptionDateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600'
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8
  },
  datePickerSelector: {
    display: 'none' // 선택 표시선 숨기기
  },

  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginHorizontal: 5
  }
});

export default styles;

