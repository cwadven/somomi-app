import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchQuests, completeQuest } from '../api/questApi';

const TABS = [
  { key: 'daily', label: '일일' },
  { key: 'weekly', label: '주간' },
  { key: 'hidden', label: '스페셜' },
];

const QuestScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('daily');
  const [quests, setQuests] = useState({ daily: [], weekly: [], hidden: [] });
  const [loading, setLoading] = useState({ daily: false, weekly: false, hidden: false });
  const [error, setError] = useState({ daily: false, weekly: false, hidden: false });
  const [completing, setCompleting] = useState(null); // 완료 처리 중인 quest_id
  // TODO: 무한스크롤 페이지네이션 — API에 커서/페이지 파라미터 추가 시 활성화
  // const [meta, setMeta] = useState({ daily: { nextCursor: null, hasMore: false }, ... });
  // const [loadingMore, setLoadingMore] = useState({ daily: false, weekly: false, hidden: false });

  const loadQuests = useCallback(async (type) => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    setError((prev) => ({ ...prev, [type]: false }));
    try {
      const res = await fetchQuests(type);
      const list = Array.isArray(res?.quests) ? res.quests : [];
      setQuests((prev) => ({ ...prev, [type]: list }));
    } catch (e) {
      setError((prev) => ({ ...prev, [type]: true }));
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }, []);

  // 탭 전환 시 해당 타입 데이터 로드 (이미 로드된 적 있으면 재요청)
  useEffect(() => {
    loadQuests(activeTab);
  }, [activeTab, loadQuests]);

  const handleClaimReward = async (quest) => {
    if (completing) return;
    setCompleting(quest.quest_id);
    try {
      await completeQuest(quest.quest_id);
      // 완료 처리 후 해당 퀘스트를 로컬에서 즉시 반영
      setQuests((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).map((q) =>
          q.quest_id === quest.quest_id ? { ...q, is_completed: true } : q
        ),
      }));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '퀘스트 완료 처리에 실패했습니다.';
      // Alert 대신 간단한 인라인 에러 (Alert import 불필요)
      try {
        const { Alert } = require('react-native');
        Alert.alert('알림', msg);
      } catch (_) {}
    } finally {
      setCompleting(null);
    }
  };

  const renderQuestItem = ({ item }) => {
    const progress = item.target_count > 0
      ? Math.min(item.current_count / item.target_count, 1)
      : 0;
    const goalReached = item.current_count >= item.target_count;
    const hasReward = !!item.reward_description;

    return (
      <View style={styles.questCard}>
        <View style={styles.questInfo}>
          <Text style={styles.questTitle}>{item.title}</Text>
          <Text style={styles.questDesc}>{item.description}</Text>

          {/* 보상 설명 */}
          <View style={styles.rewardRow}>
            <Ionicons
              name={hasReward ? 'gift-outline' : 'close-circle-outline'}
              size={14}
              color={hasReward ? '#FF9800' : '#BDBDBD'}
            />
            <Text style={[styles.rewardText, !hasReward && styles.rewardTextNone]}>
              {hasReward ? item.reward_description : '보상 없음'}
            </Text>
          </View>

          {/* 진행률 바 */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {item.current_count}/{item.target_count}
            </Text>
          </View>
        </View>

        {/* 보상받기 / 완료 버튼 */}
        {(() => {
          const isCompleting = completing === item.quest_id;
          if (item.is_completed) {
            return (
              <View style={styles.claimBtnDone}>
                <Ionicons name="checkmark-circle" size={16} color="#9E9E9E" />
                <Text style={styles.claimBtnDoneText}>완료</Text>
              </View>
            );
          }
          if (hasReward) {
            return (
              <TouchableOpacity
                style={[styles.claimBtn, (!goalReached || isCompleting) && styles.claimBtnDisabled]}
                disabled={!goalReached || isCompleting}
                onPress={() => handleClaimReward(item)}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.claimBtnText, !goalReached && styles.claimBtnTextDisabled]}>
                    보상받기
                  </Text>
                )}
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              style={[styles.claimBtn, !goalReached ? styles.claimBtnDisabled : styles.claimBtnComplete, isCompleting && styles.claimBtnDisabled]}
              disabled={!goalReached || isCompleting}
              onPress={() => handleClaimReward(item)}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={[styles.claimBtnText, !goalReached ? styles.claimBtnTextDisabled : styles.claimBtnCompleteText]}>
                  완료
                </Text>
              )}
            </TouchableOpacity>
          );
        })()}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading[activeTab]) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flag-outline" size={52} color="#BDBDBD" />
        <Text style={styles.emptyText}>퀘스트가 없습니다.</Text>
      </View>
    );
  };

  const currentLoading = loading[activeTab];
  const currentError = error[activeTab];
  const currentQuests = quests[activeTab] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>퀘스트</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 콘텐츠 */}
      {currentLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : currentError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={52} color="#F44336" />
          <Text style={styles.errorText}>퀘스트를 불러오지 못했습니다.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadQuests(activeTab)}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentQuests}
          renderItem={renderQuestItem}
          keyExtractor={(item) => String(item.quest_id)}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.3}
          // TODO: 무한스크롤 onEndReached 핸들러
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },

  /* 탭 */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  tabTextActive: {
    color: '#4CAF50',
  },

  /* 리스트 */
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  /* 퀘스트 카드 */
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  questInfo: {
    flex: 1,
    marginRight: 12,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  questDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },

  /* 보상 설명 */
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  rewardText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  rewardTextNone: {
    color: '#BDBDBD',
    fontWeight: '400',
  },

  /* 진행률 */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 32,
    textAlign: 'right',
  },

  /* 보상 버튼 */
  claimBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
  },
  claimBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  claimBtnTextDisabled: {
    color: '#9E9E9E',
  },
  claimBtnComplete: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  claimBtnCompleteText: {
    color: '#4CAF50',
  },
  claimBtnDone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  claimBtnDoneText: {
    color: '#9E9E9E',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default QuestScreen;
