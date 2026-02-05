import { StyleSheet } from 'react-native';

// NOTE: 기존 `AddLocationScreen.js`의 styles를 그대로 분리했습니다.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    height: 56,
    paddingHorizontal: 16,
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
    width: 40
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  tutorialBanner: {
    backgroundColor: 'rgba(76,175,80,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  tutorialBannerText: {
    color: '#1B5E20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  tutorialPrimaryCta: {
    borderWidth: 3,
    borderColor: '#1B5E20',
  },
  formGroup: {
    marginBottom: 16
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imagePreviewBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageUploadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f0f9f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  imageButtonText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  imageRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    backgroundColor: '#ffebee',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  imageRemoveButtonText: {
    color: '#F44336',
    fontWeight: '700',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 48,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  imageViewerBody: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  placeholderLight: {
    color: '#333'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  inputHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#9E9E9E'
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 56
  },
  selectedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  iconSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  templateGroup: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  templateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  templateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  templateGroupInfo: {
    flex: 1
  },
  templateGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  templateGroupDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  templateOptions: {
    padding: 12
  },
  templateOptionsContainer: {
    maxHeight: 280
  },
  templateOptionsScroll: {
    flexGrow: 0
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8
  },
  disabledTemplateOption: {
    opacity: 0.5
  },
  selectedTemplateOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9'
  },
  templateOptionTitle: {
    fontSize: 15,
    color: '#333'
  },
  templateOptionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4
  },
  emptyTemplates: {
    padding: 16,
    alignItems: 'center'
  },
  emptyTemplatesText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  emptySlotCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  emptySlotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
    marginBottom: 4,
    textAlign: 'center'
  },
  emptySlotSubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18
  },
  storeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  storeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  planButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  planButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  productSlotSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  productSlotList: {
    marginTop: 16
  },
  slotScrollableList: {
    maxHeight: 260
  },
  productSlotSummary: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  productSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  productSlotLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600'
  },
  productSlotValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700'
  },
  productSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9'
  },
  productSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  productSlotText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  productSlotSubText: {
    fontSize: 13,
    color: '#777',
    marginTop: 4
  },
  productSlotLinkedText: {
    fontSize: 13,
    color: '#555',
    marginTop: 6
  },
  assignButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  assignButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold'
  },
  stagingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#c8e6c9'
  },
  stagingNoticeText: {
    fontSize: 12,
    color: '#2e7d32'
  },
  stagingHelpText: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
    textAlign: 'center'
  }
});

export default styles;

