import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>도움말</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>소모미 사용 가이드</Text>
        <Text style={styles.paragraph}>
          소모미는 생활용품의 유통기한/소진예정일을 관리하고, 리마인드 알림을 받아 잊지 않도록 도와주는 앱입니다.
        </Text>

        <Text style={styles.sectionTitle}>핵심 기능</Text>
        <Text style={styles.bullet}>• 카테고리 관리: 냉장고/욕실/주방 등 카테고리를 만들어 제품을 분류하세요.</Text>
        <Text style={styles.bullet}>• 제품 등록: 구매일/유통기한/소진예정일을 기록해 관리하세요.</Text>
        <Text style={styles.bullet}>• 알림: 유통/소진 시점 전에 리마인드를 받아 놓치지 않도록 합니다.</Text>

        <Text style={styles.sectionTitle}>도움이 필요하신가요?</Text>
        <Text style={styles.paragraph}>
          문의/제안은 추후 업데이트될 고객센터 메뉴를 통해 접수하실 수 있습니다. 현재는 앱 정보 화면을 통해 버전을 확인할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
        <Text style={styles.qaQ}>Q. 알림이 오지 않아요.</Text>
        <Text style={styles.qaA}>A. 프로필 → 앱 설정에서 알림을 활성화했는지 확인하고, 기기 설정의 앱 알림 권한도 허용해 주세요.</Text>
        <Text style={styles.qaQ}>Q. 제품을 어디서 수정하나요?</Text>
        <Text style={styles.qaA}>A. 내 카테고리 목록 또는 제품 목록에서 제품을 눌러 상세 화면에서 수정할 수 있습니다.</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  bullet: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginLeft: 8,
    marginBottom: 2,
  },
  qaQ: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  qaA: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default HelpScreen;


