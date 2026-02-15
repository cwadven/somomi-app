import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useDispatch, useSelector } from 'react-redux';

import { givePresignedUrl } from '../api/commonApi';
import { fetchMemberProfile, markTutorialSeenSuccess, updateMemberProfile } from '../api/memberApi';
import { createAdMobRewardRequest, fetchAdMobRewardRules } from '../api/rewardApi';
import NotificationSettings from '../components/NotificationSettings';
import { navigate as rootNavigate } from '../navigation/RootNavigation';
import { logout, updateUserInfo } from '../redux/slices/authSlice';
import AlertModal from '../components/AlertModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSyncQueue } from '../utils/storageUtils';
import { showRewardedAd as showRewardedAdNative } from '../utils/rewardedAd';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import { deactivateStoredDeviceToken } from '../utils/pushDeviceTokenManager';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isLoggedIn, isAnonymous, loading, error } = useSelector((state) => state.auth);
  const tutorial = useSelector((state) => state.tutorial);
  const lockTutorialIntro = !!(tutorial?.active && tutorial?.step === TUTORIAL_STEPS.PROFILE_INTRO);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [profileImageViewerVisible, setProfileImageViewerVisible] = useState(false);
  const [editProfileImageViewerVisible, setEditProfileImageViewerVisible] = useState(false);

  // route.params로 전달된 initialMode가 있으면 해당 모드로 설정
  useEffect(() => {
    if (route.params?.initialMode) {

      // 모드 관련 처리가 필요한 경우 여기에 구현
    }}, [route.params]);

  // 세션 만료 모달 처리
  useEffect(() => {
    if (route.params?.sessionExpired) {
      setModalTitle('로그인 만료');
      setModalMessage('세션이 만료되어 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.');
      // ✅ 다른 모달(예: 튜토리얼)에서 남아있던 content가 섞이지 않도록 초기화
      setModalContent(null);
      setModalAction(null);
      setModalButtons([
      { text: '확인', onPress: () => {setModalVisible(false);} }]
      );
      setModalVisible(true);
      // 한 번만 표시되도록 파라미터 제거
      try {
        navigation.setParams({ sessionExpired: undefined });
      } catch (e) {}
    }
  }, [route.params?.sessionExpired]);

  // 초기 큐 상태 로드
  useEffect(() => {
    (async () => {
      try {
        const q = await loadSyncQueue();
        setSyncQueueCount(Array.isArray(q) ? q.length : 0);
      } catch (e) {}
    })();
  }, []);

  // ✅ 튜토리얼 시작 안내: 프로필에서 "내 카테고리" 탭만 누를 수 있도록 안내
  useEffect(() => {
    try {
      if (!tutorial?.active) return;
      if (tutorial?.step !== TUTORIAL_STEPS.PROFILE_INTRO) return;
      // ✅ 모달이 뜨는 순간 바로 "seen_tutorial=true" 처리 API 호출
      // (dev StrictMode 등으로 effect가 재실행되어도 중복 호출을 피하도록 user.seenTutorial을 즉시 올려 가드)
      try {
        if (isLoggedIn && !isAnonymous && user?.seenTutorial !== true) {
          dispatch(updateUserInfo({ seenTutorial: true }));
          markTutorialSeenSuccess().catch(() => {});
        }
      } catch (e) {}
      // ✅ 이전 모달의 버튼/콘텐츠가 순간 섞여 보이는 현상 방지
      setModalButtons(null);
      setModalContent(null);
      setModalAction(null);
      // 안내 모달을 열어 "튜토리얼 제품 직접 시작하기" 메시지 제공
      setModalTitle('튜토리얼');
      // message는 문자열만 렌더되므로, '카테고리'만 굵게 처리하기 위해 content 사용
      setModalMessage('');
      setModalContent(
        <Text style={styles.tutorialModalText}>
          첫 작업을 위해서{'\n'}
          <Text style={styles.tutorialModalTextBold}>'카테고리'</Text>를 만들러 가볼까요?
        </Text>
      );
      setModalButtons([
        {
          text: '확인',
          onPress: () => {
            try { setModalVisible(false); } catch (e) {}
            try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_LOCATIONS_TAB })); } catch (e) {}
          },
        },
      ]);
      setModalVisible(true);
    } catch (e) {}
  }, [tutorial?.active, tutorial?.step, dispatch, isAnonymous, isLoggedIn, user?.seenTutorial]);

  // ✅ 튜토리얼 인트로 모달에서는 하드웨어 back/제스처로 화면이 뒤로 가지 않게 차단
  useEffect(() => {
    if (!lockTutorialIntro) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      try { sub?.remove?.(); } catch (e) {}
    };
  }, [lockTutorialIntro]);

  // 로그인 상태에서 화면 진입 시 프로필 최신화
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isLoggedIn) {
          const res = await fetchMemberProfile();
          // 응답 매핑: nickname, profile_image_url
          const memberIdRaw = res?.member_id;
          const guestIdRaw = res?.guest_id;
          const memberId = memberIdRaw == null ? null : String(memberIdRaw);
          const guestId = guestIdRaw == null ? null : String(guestIdRaw);
          const categoryAlarmEnabledRaw = res?.category_alarm_enabled;
          const categoryAlarmEnabled =
            typeof categoryAlarmEnabledRaw === 'boolean'
              ? categoryAlarmEnabledRaw
              : (user?.categoryAlarmEnabled ?? true);
          const seenTutorialRaw = res?.seen_tutorial;
          const seenTutorial =
            typeof seenTutorialRaw === 'boolean'
              ? seenTutorialRaw
              : (user?.seenTutorial ?? true);
          const next = {
            ...user,
            // 서버에서 내려주는 식별자 매핑
            id: memberId || user?.id,
            memberId: memberId || user?.memberId,
            customerId: guestId || user?.customerId,
            guestId: guestId || user?.guestId,
            username: res?.nickname || user?.username || '사용자',
            name: res?.nickname || user?.name || '사용자',
            email: undefined, // 이메일 필드 제거
            profileImage: res?.profile_image_url || null,
            categoryAlarmEnabled,
            seenTutorial,
          };
          // 로컬에서만 최신화: authSlice에 user 업데이트 로직이 없다면 화면 레벨 상태로 반영
          // 간단히 setState 없이 selector 기반 표시 값을 가공해 사용하려 했으나, 여기서는 임시로 객체 교체
          // eslint-disable-next-line no-param-reassign
          if (mounted) {
            // NOTE: Redux 상태 직접 변경 불가 → 화면에서 next를 우선 사용하도록 로컬 상태 보관
            setProfileOverride(next);
          }

          // 전역 user에도 반영 (SSV customData 등에서 사용)
          try {
            dispatch(updateUserInfo({
              id: next.id,
              memberId: next.memberId,
              customerId: next.customerId,
              guestId: next.guestId,
              username: next.username,
              name: next.name,
              profileImage: next.profileImage,
              categoryAlarmEnabled: next.categoryAlarmEnabled,
              seenTutorial: next.seenTutorial,
              email: undefined,
            }));
          } catch (e) {}
        }
      } catch (e) {

        // 무시: 비로그인/토큰 오류 시 그대로
      }})();
    return () => {mounted = false;};
  }, [isLoggedIn]);

  const [profileOverride, setProfileOverride] = useState(null);
  const activeProfile = profileOverride || user || null;

  // 프로필 수정 모달 상태
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editProfileImagePreview, setEditProfileImagePreview] = useState(null);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [uploadedProfileImageUrl, setUploadedProfileImageUrl] = useState(null);

  useEffect(() => {
    let interval;
    (async () => {
      interval = setInterval(async () => {
        try {
          const q = await loadSyncQueue();
          setSyncQueueCount(Array.isArray(q) ? q.length : 0);
        } catch (e) {}
      }, 1500);
    })();
    return () => {if (interval) clearInterval(interval);};
  }, []);

  // 안드로이드 시스템 알림 설정으로 이동하는 함수
  const openAndroidNotificationSettings = () => {
    if (Platform.OS === 'android') {
      try {
        // 안드로이드 앱 정보 설정 화면으로 이동
        const appId = Platform.constants.Package || 'com.somomi.app';

        // 안드로이드 버전에 따라 다른 인텐트 사용
        if (Platform.Version >= 26) {// Android 8.0 (Oreo) 이상
          Linking.openSettings();
        } else if (Platform.Version >= 21) {// Android 5.0 (Lollipop) 이상
          Linking.openURL(`app-settings://notification/${appId}`);
        } else {
          // 이전 버전에서는 앱 정보 화면으로 이동
          Linking.openURL(`app-settings://${appId}`);
        }
      } catch (error) {
        console.error('알림 설정 화면 열기 실패:', error);
        setModalTitle('알림 설정');
        setModalMessage('알림 설정 화면을 열 수 없습니다. 설정 앱에서 수동으로 앱의 알림 설정을 변경해주세요.');
        setModalContent(null);
        setModalAction(null);
        setModalVisible(true);
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    setModalTitle('로그아웃');
    setModalMessage('정말 로그아웃 하시겠습니까?');
    // ✅ 튜토리얼 등에서 설정한 content가 로그아웃 모달에 보이지 않도록 초기화
    setModalContent(null);
    setModalAction(null);
    setModalButtons([
    // ✅ 버튼 배치: 취소(왼쪽) / 확인(오른쪽)
    { text: '취소', style: 'cancel', onPress: () => setModalVisible(false) },
    { text: '확인', onPress: async () => {
      setModalVisible(false);
      // ✅ 로그아웃 시 서버의 디바이스 토큰 비활성화(DELETE /v1/push/device-token)
      // - 실패해도 로그아웃은 진행
      try { await deactivateStoredDeviceToken({ reason: 'logout' }); } catch (e) {}
      try { await AsyncStorage.removeItem('navigation-state'); } catch (e) {}
      try { dispatch(logout()); } catch (e) {}
      // ✅ 로그아웃 후에도 현재 탭(프로필)에 그대로 유지
      // (내 카테고리로 강제 이동시키면 사용자 입장에서 "왜 탭이 바뀌지?"가 됨)
    } }
    ]
    );
    setModalVisible(true);
  };

  // 카카오 로그인 관련 콜백








  // 로그인 오류 처리







  // 알림 설정 모달 상태
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [modalButtons, setModalButtons] = useState(null);
  const [rewardAdLoading, setRewardAdLoading] = useState(false);
  const [rewardRules, setRewardRules] = useState([]);
  const [rewardRulesLoading, setRewardRulesLoading] = useState(false);

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setModalVisible(false);
    // onClose에서는 액션을 수행하지 않음 (버튼으로만 수행)
    setModalButtons(null);
    setModalContent(null);
  };

  const showErrorAlert = (message) => {
    setModalTitle('오류');
    setModalMessage(message);
    setModalContent(null);
    setModalAction(null);
    setModalButtons([{ text: '확인', onPress: () => setModalVisible(false) }]);
    setModalVisible(true);
  };

  const showInfoAlert = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalContent(null);
    setModalAction(null);
    setModalButtons([{ text: '확인', onPress: () => setModalVisible(false) }]);
    setModalVisible(true);
  };

  // AdMob 리워드 룰 목록 로드 (프로필 > 광고 섹션)
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!isLoggedIn || !user) return;
      try {
        setRewardRulesLoading(true);
        const res = await fetchAdMobRewardRules();
        const list = Array.isArray(res?.reward_rules) ? res.reward_rules : [];
        if (mounted) setRewardRules(list);
      } catch (e) {
        if (mounted) setRewardRules([]);
      } finally {
        if (mounted) setRewardRulesLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [isLoggedIn, user]);

  const showRewardedAd = async (rewardRuleId) => {
    if (!isLoggedIn) return;
    if (rewardAdLoading) return;
    try {
      setRewardAdLoading(true);

      // 1) 백엔드에 SSV 요청 레코드 생성 → ssv_id 확보
      let ssvRes;
      try {
        ssvRes = await createAdMobRewardRequest({ rewardRuleId });
      } catch (reqErr) {
        const status = reqErr?.response?.status;
        const msg = reqErr?.message || 'SSV 요청 생성에 실패했습니다.';
        // 400: 오늘 이미 리워드 받음 등 → 오류가 아니라 안내로 표시
        if (status === 400) {
          showInfoAlert('알림', msg);
          return;
        }
        throw reqErr;
      }
      const ssvIdRaw = ssvRes?.ssv_id;
      const ssvId = ssvIdRaw == null ? null : String(ssvIdRaw);
      if (!ssvId) throw new Error('SSV 요청 생성에 실패했습니다. (ssv_id 없음)');

      await showRewardedAdNative({
        // TODO: 운영에서는 실제 리워드 광고 단위 ID로 교체
        unitId: 'ca-app-pub-5773129721731206/2419623977',
        // SSV customData: 백엔드에서 발급된 ssv_id를 전달하여 콜백과 매칭
        customData: ssvId,
        onEarnedReward: () => {
          showInfoAlert('보상 지급 완료', '광고 시청 보상이 지급되었습니다.');
        },
      });
    } catch (e) {
      const code = e?.code || e?.nativeErrorCode || e?.name || '';
      const msg = String(e?.message || '');
      // ✅ No fill: 광고 인벤토리 없음 (정상적인 실패 케이스)
      if (String(code).toUpperCase() === 'NO_FILL' || msg.toLowerCase().includes('no fill')) {
        showInfoAlert('알림', '볼 수 있는 광고가 없어요. 다음에 확인해주세요~');
        return;
      }
      // ✅ UI thread 에러(AdMob #008) 방어: 사용자에겐 친절한 메시지
      if (msg.includes('Must be called on the main UI thread') || msg.includes('#008')) {
        showInfoAlert('알림', '광고를 준비하는 중 문제가 발생했어요.\n잠시 후 다시 시도해주세요.');
        return;
      }
      showErrorAlert(msg || '광고를 불러오지 못했습니다.');
    } finally {
      setRewardAdLoading(false);
    }
  };

  // 문의하기(미구현) - 추후 기능 추가 예정
  // const showContact = () => {
  //   setModalTitle('알림');
  //   setModalMessage('문의하기 기능은 아직 구현되지 않았습니다.');
  //   setModalAction(null);
  //   setModalVisible(true);
  // };

  // 설정 메뉴 아이템 컴포넌트
  const SettingItem = ({ icon, title, subtitle, onPress, showBadge = false, disabled = false }) =>
  <TouchableOpacity style={[styles.settingItem, disabled && styles.settingItemDisabled]} onPress={onPress} disabled={disabled}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon} size={24} color={disabled ? '#BDBDBD' : '#4CAF50'} style={styles.settingIcon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, disabled && { color: '#9E9E9E' }]}>{title}</Text>
          {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {showBadge && <View style={styles.badge} />}
        <Ionicons name="chevron-forward" size={20} color={disabled ? '#D0D0D0' : '#999'} style={styles.settingChevron} />
      </View>
    </TouchableOpacity>;

  const openEditProfile = () => {
    if (!isLoggedIn) return;
    const currentNick = activeProfile?.username || activeProfile?.name || user?.username || user?.name || '';
    setEditNickname(String(currentNick || ''));
    const currentImg = activeProfile?.profileImage || user?.profileImage || null;
    setEditProfileImagePreview(currentImg);
    setUploadedProfileImageUrl(currentImg);
    setShowEditProfileModal(true);
  };

  const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
  // iOS/Android 한글 IME 조합 중에는 'ㄱ/ㅏ' 같은 자모가 입력되므로 자모까지 허용해야 입력이 끊기지 않음
  const NICKNAME_ALLOWED_REGEX = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]+$/;
  const getFileExtension = (nameOrUri) => {
    if (!nameOrUri || typeof nameOrUri !== 'string') return null;
    const clean = nameOrUri.split('?')[0].split('#')[0];
    const last = clean.split('/').pop() || clean;
    const idx = last.lastIndexOf('.');
    if (idx === -1) return null;
    return last.slice(idx + 1).toLowerCase();
  };
  const guessMimeTypeFromExtension = (ext) => {
    switch ((ext || '').toLowerCase()) {
      case 'png':return 'image/png';
      case 'jpg':
      case 'jpeg':return 'image/jpeg';
      case 'gif':return 'image/gif';
      case 'webp':return 'image/webp';
      default:return 'application/octet-stream';
    }
  };
  const guessExtensionFromMimeType = (mimeType) => {
    switch ((mimeType || '').toLowerCase()) {
      case 'image/png':return 'png';
      case 'image/jpeg':return 'jpg';
      case 'image/gif':return 'gif';
      case 'image/webp':return 'webp';
      default:return null;
    }
  };
  const buildSafeFileName = (ext) => `member_image_${Date.now()}.${String(ext || '').toLowerCase()}`;
  const joinReadHostAndKey = (readHost, key) => {
    if (!readHost || !key) return null;
    const host = String(readHost);
    const k = String(key);
    if (host.endsWith('/') && k.startsWith('/')) return host + k.slice(1);
    if (!host.endsWith('/') && !k.startsWith('/')) return `${host}/${k}`;
    return host + k;
  };
  const optimizeImageIfNeeded = async ({ uri, ext }) => {
    if (ext === 'gif') return { uri, ext };
    const MAX_DIM = 1280;
    let format = SaveFormat.JPEG;
    let outExt = 'jpg';
    let compress = 0.78;
    if (ext === 'png' || ext === 'webp') {
      format = SaveFormat.WEBP;
      outExt = 'webp';
      compress = 0.8;
    }
    const result = await manipulateAsync(uri, [{ resize: { width: MAX_DIM } }], { compress, format });
    return { uri: result?.uri || uri, ext: outExt };
  };
  const getMemberImageTransactionPk = () => {
    const raw = user?.id;
    const s = raw == null ? '' : String(raw);
    if (/^\\d+$/.test(s)) return s;
    return '0';
  };
  const uploadProfileImage = async ({ uri, fileName, mimeType, ext }) => {
    setProfileImageUploading(true);
    try {
      const pk = getMemberImageTransactionPk();
      const presigned = await givePresignedUrl('member-image', pk, fileName);
      const url = presigned?.url;
      const fields = presigned?.data;
      const key = fields?.key;
      const readHost = presigned?.read_host;
      if (!url || !fields || !key) throw new Error('invalid-presigned-response');

      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => {
        if (v == null) return;
        form.append(k, String(v));
      });
      const finalExt = ext || getFileExtension(fileName) || 'jpg';
      const mime = mimeType || guessMimeTypeFromExtension(finalExt);
      if (Platform.OS === 'web') {
        const blob = await fetch(uri).then((r) => r.blob());
        if (typeof File !== 'undefined') {
          const file = new File([blob], fileName, { type: mime });
          form.append('file', file);
        } else {
          form.append('file', blob, fileName);
        }
      } else {
        form.append('file', { uri, name: fileName, type: mime });
      }

      const uploadRes = await fetch(url, { method: 'POST', body: form });
      if (!uploadRes.ok) {
        const t = await uploadRes.text().catch(() => '');
        throw new Error(`s3-upload-failed:${uploadRes.status}:${t}`);
      }
      const full = joinReadHostAndKey(readHost, key);
      const iconUrl = full || key;
      setUploadedProfileImageUrl(iconUrl);
      return iconUrl;
    } finally {
      setProfileImageUploading(false);
    }
  };
  const pickProfileImage = async () => {
    const prevPreview = editProfileImagePreview || null;
    const prevUploaded = uploadedProfileImageUrl || null;
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) {
          showErrorAlert('갤러리 접근 권한이 필요합니다.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85
      });
      if (res.canceled) return;
      const asset = Array.isArray(res.assets) ? res.assets[0] : null;
      if (!asset?.uri) return;

      const extFromNameOrUri = getFileExtension(asset.fileName || asset.uri);
      const extFromMime = guessExtensionFromMimeType(asset.mimeType);
      const ext = (extFromNameOrUri || extFromMime || '').toLowerCase();
      if (!ext || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        showErrorAlert('png, jpg, jpeg, gif, webp 파일만 업로드할 수 있어요.');
        return;
      }
      const optimized = await optimizeImageIfNeeded({ uri: asset.uri, ext }).catch(() => ({ uri: asset.uri, ext }));
      const finalExt = optimized.ext || ext;
      const meta = {
        uri: optimized.uri,
        ext: finalExt,
        fileName: buildSafeFileName(finalExt),
        mimeType: guessMimeTypeFromExtension(finalExt)
      };
      setEditProfileImagePreview(meta.uri);
      setUploadedProfileImageUrl(null);
      await uploadProfileImage(meta);
    } catch (e) {
      // presigned 발급/업로드 실패 시: 프리뷰/업로드 URL을 이전 값으로 복구
      setEditProfileImagePreview(prevPreview);
      setUploadedProfileImageUrl(prevUploaded);
      showErrorAlert(`이미지 선택 중 오류가 발생했습니다: ${e?.message || String(e)}`);
    }
  };
  const saveProfile = async () => {
    const nickname = (editNickname || '').trim();
    if (!nickname) {
      showErrorAlert('닉네임을 입력해 주세요.');
      return;
    }
    if (!NICKNAME_ALLOWED_REGEX.test(nickname)) {
      showErrorAlert('닉네임은 한글/영문/숫자만 입력할 수 있어요.');
      return;
    }
    if (profileImageUploading) return;
    try {
      const profile_image_url = uploadedProfileImageUrl || null;
      await updateMemberProfile({
        nickname,
        profile_image_url,
        category_alarm_enabled: !!activeProfile?.categoryAlarmEnabled,
      });
      const next = {
        ...(activeProfile || user || {}),
        username: nickname,
        name: nickname,
        profileImage: profile_image_url,
      };
      setProfileOverride(next);
      try { dispatch(updateUserInfo({ username: nickname, name: nickname, profileImage: profile_image_url })); } catch (e) {}
      setShowEditProfileModal(false);
    } catch (e) {
      showErrorAlert(`프로필 저장 중 오류가 발생했습니다: ${e?.message || String(e)}`);
    }
  };


  // 프로필 화면
  const renderProfileScreen = () =>
  <ScrollView style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileHeader}>
        {isLoggedIn && (profileOverride || user) ?
      <>
            {profileOverride?.profileImage || user?.profileImage ?
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setProfileImageViewerVisible(true)}
        >
          <Image source={{ uri: profileOverride?.profileImage || user?.profileImage }} style={styles.profileImage} />
        </TouchableOpacity> :

        <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                <Ionicons name="person-circle" size={64} color="#9E9E9E" />
              </View>
        }
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{profileOverride?.username || profileOverride?.name || user?.username || user?.name || '사용자'}</Text>
            </View>
            <View style={styles.profileActionsRow}>
              <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
                <Ionicons name="create-outline" size={16} color="#4CAF50" />
                <Text style={styles.editProfileButtonText}>프로필 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </> :

      <View style={styles.loginContainer}>
            <Text style={styles.loginSubtitle}>다양한 기능을 이용하려면 로그인 해주세요.</Text>
            <View style={styles.authButtonsContainer}>
              <TouchableOpacity
            style={styles.authCtaButton}
            onPress={() => navigation.navigate('RootLogin')}>

                <Text style={styles.authCtaText}>로그인/회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
      }
      </View>

      {/* 앱 설정: 로그인 완료 후에만 표시 */}
      {isLoggedIn && user ?
    <>
          {/* 설정 섹션 */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>앱 설정</Text>

            <SettingItem
          icon="notifications-outline"
          title="알림 설정"
          onPress={() => setShowNotificationModal(true)} />


            {Platform.OS === 'android' &&
        <SettingItem
          icon="phone-portrait-outline"
          title="안드로이드 앱 푸시 설정"
          onPress={() => openAndroidNotificationSettings()} />

        }
          </View>
        </> :
    null}

      {/* 정보 섹션: 일부 항목은 로그인 후에만 표시 */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>정보</Text>
        
        {isLoggedIn && user &&
      <>
            <SettingItem
          icon="wallet-outline"
          title="포인트"
          onPress={() => navigation.navigate('Point')} />

            <SettingItem
          icon="checkmark-done-circle-outline"
          title="소진 처리한 상품 목록"
          onPress={() => navigation.navigate('ConsumedProducts')} />

            {/* NOTE: 아직 완전 배포 전이라 노출하지 않음 */}
            {/*
            <SettingItem
              icon="cart-outline"
              title="상점"
              onPress={() => navigation.navigate('Store')}
            />
            */}

          </>
      }
        
        <SettingItem
          icon="document-text-outline"
          title="개인정보처리방침"
          onPress={() => rootNavigate('PrivacyPolicyWebView', { title: '개인정보처리방침' })}
        />

        
        {/* 문의하기(미구현): 추후 기능 추가 예정 */}
      </View>

      {/* 활동 섹션: 로그인 완료 후에만 표시 */}
      {isLoggedIn && user ? (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>활동</Text>
          <SettingItem
            icon="flag-outline"
            title="퀘스트"
            onPress={() => navigation.navigate('Quest')}
          />
        </View>
      ) : null}

      {/* 광고 섹션: 로그인 완료 후에만 표시 */}
      {isLoggedIn && user ?
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>광고</Text>
          {rewardRulesLoading ? (
            <SettingItem
              icon="gift-outline"
              title="불러오는 중..."
              subtitle="잠시만 기다려주세요."
              disabled={true}
            />
          ) : (rewardRules || []).length > 0 ? (
            (rewardRules || []).map((rule) => {
              const available = !!rule?.is_available;
              const title = String(rule?.reward_campaign_name || '리워드 광고');
              const rewardRuleId = rule?.reward_rule_id;
              return (
                <SettingItem
                  key={String(rule?.reward_rule_id ?? title)}
                  icon="gift-outline"
                  title={rewardAdLoading ? '광고 불러오는 중...' : title}
                  subtitle={!available ? '다음에 다시 시도해주세요.' : undefined}
                  disabled={!available || rewardAdLoading}
                  onPress={available ? () => showRewardedAd(rewardRuleId) : undefined}
                />
              );
            })
          ) : (
            <SettingItem
              icon="gift-outline"
              title="현재 이용 가능한 광고가 없습니다."
              subtitle="다음에 다시 시도해주세요."
              disabled={true}
            />
          )}
        </View>
        : null}

    </ScrollView>;


  return (
    <>
      {renderProfileScreen()}

      {/* 보상형 광고 로딩 오버레이 */}
      <Modal visible={rewardAdLoading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>광고 불러오는 중...</Text>
          </View>
        </View>
      </Modal>

      {/* 프로필 이미지 전체보기 모달 */}
      {(() => {
        const uri = String(activeProfile?.profileImage || '').trim();
        if (!uri) return null;
        return (
          <Modal
            visible={profileImageViewerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setProfileImageViewerVisible(false)}
          >
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerClose}
                onPress={() => setProfileImageViewerVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.imageViewerBody}>
                <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* 프로필 수정: 이미지 전체보기 모달 */}
      {(() => {
        const uri = String(editProfileImagePreview || '').trim();
        if (!uri) return null;
        return (
          <Modal
            visible={editProfileImageViewerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setEditProfileImageViewerVisible(false)}
          >
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerClose}
                onPress={() => setEditProfileImageViewerVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.imageViewerBody}>
                <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* 알림 설정 모달 */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>알림 설정</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalHintText}>
                현재 기기 알림 권한이 꺼져 있으면 실제 알림이 오지 않을 수 있어요.
              </Text>
              <NotificationSettings
                categoryAlarmEnabled={!!activeProfile?.categoryAlarmEnabled}
                onChangeCategoryAlarmEnabled={async (enabled) => {
                  if (!isLoggedIn) return;
                  // optimistic
                  setProfileOverride((prev) => ({
                    ...(prev || user || {}),
                    categoryAlarmEnabled: !!enabled,
                  }));
                  try {
                    dispatch(updateUserInfo({ categoryAlarmEnabled: !!enabled }));
                  } catch (e) {}

                  const nicknameForBody = String(activeProfile?.name || activeProfile?.username || user?.name || user?.username || '사용자');
                  const profileImageForBody = activeProfile?.profileImage ?? null;
                  await updateMemberProfile({
                    nickname: nicknameForBody,
                    profile_image_url: profileImageForBody,
                    category_alarm_enabled: !!enabled,
                  });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 프로필 수정 모달 (입력 시 리렌더되어도 모달이 리마운트되지 않도록 inline 렌더) */}
      <Modal
        visible={showEditProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={[styles.modalOverlay, styles.modalOverlayTight]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={[styles.modalContainer, styles.modalContainerLarge]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>프로필 수정</Text>
                <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <Text style={styles.modalDescription}>닉네임과 프로필 이미지를 수정할 수 있어요.</Text>

              <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
                {editProfileImagePreview ?
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setEditProfileImageViewerVisible(true)}
                >
                  <Image source={{ uri: editProfileImagePreview }} style={styles.profileImage} />
                </TouchableOpacity> :
                <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
                    <Ionicons name="person-circle" size={64} color="#9E9E9E" />
                  </View>
                }
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.editProfileButton, { marginRight: 8 }]}
                    disabled={profileImageUploading}
                    onPress={pickProfileImage}
                  >
                    {profileImageUploading ?
                    <ActivityIndicator size="small" color="#4CAF50" style={{ marginRight: 6 }} /> :
                    <Ionicons name="image-outline" size={16} color="#4CAF50" />
                    }
                    <Text style={styles.editProfileButtonText}>{profileImageUploading ? '업로드 중...' : '이미지 선택'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0' }]}
                    disabled={profileImageUploading}
                    onPress={() => {
                      setEditProfileImagePreview(null);
                      setUploadedProfileImageUrl(null);
                    }}
                  >
                    <Text style={[styles.logoutText, { color: '#666' }]}>이미지 삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.requiredLabel}>
                닉네임 <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                value={editNickname}
                onChangeText={(t) => {
                  // ✅ 닉네임은 한글/영문/숫자만 허용 (한글 IME 조합용 자모 포함)
                  const sanitized = String(t || '').replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
                  setEditNickname(sanitized);
                }}
                placeholder="닉네임"
                style={styles.profileEditInput}
                editable={!profileImageUploading}
              />

              <TouchableOpacity
                style={[styles.authCtaButton, (profileImageUploading || (editNickname || '').trim().length === 0) && { opacity: 0.5 }]}
                disabled={profileImageUploading || (editNickname || '').trim().length === 0}
                onPress={saveProfile}
              >
                <Text style={styles.authCtaText}>{profileImageUploading ? '업로드 중...' : '저장'}</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        content={modalContent}
        buttons={modalButtons}
        onClose={() => {
          // 튜토리얼 인트로에서는 back으로 닫히지 않게 처리 (확인 버튼으로만 진행)
          if (lockTutorialIntro) return;
          handleModalClose();
        }}
      />

    </>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tutorialModalText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  tutorialModalTextBold: {
    fontWeight: '900',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12
  },
  profileInfo: {
    alignItems: 'center'
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5'
  },
  profileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
  },
  editProfileButtonText: {
    marginLeft: 6,
    color: '#4CAF50',
    fontWeight: '700',
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '500'
  },
  loginContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%'
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20
  },
  authButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  authCtaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 180,
    alignItems: 'center'
  },
  authCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  profileEditInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  requiredLabel: {
    fontWeight: '700',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#F44336',
    fontWeight: '900',
  },
  previewContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 16
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eeeeee'
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  previewTitleBar: {
    width: '60%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginBottom: 6
  },
  previewSubtitleBar: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#eee'
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  settingIcon: {
    marginRight: 12
  },
  settingTitle: {
    fontSize: 16,
    color: '#333'
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  settingItemDisabled: {
    opacity: 0.7,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  settingChevron: {
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  syncRightBox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8
  },
  syncBadgePending: {
    backgroundColor: '#FFD54F'
  },
  syncBadgeIdle: {
    backgroundColor: '#E0E0E0'
  },
  syncBadgeText: {
    fontSize: 12,
    color: '#333'
  },
  syncNowBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 6
  },
  syncNowBtnDisabled: {
    backgroundColor: '#BDBDBD'
  },
  syncNowBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingBox: {
    width: 220,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  footer: {
    padding: 16,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999'
  },
  notificationDebuggerContainer: {
    padding: 16
  },
  // 모달 관련 스타일 추가
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalOverlayTight: {
    padding: 8
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    // 프로필 수정 모달이 너무 작게 보이는 이슈 개선: 세로 비율 확장
    maxHeight: '92%',
    overflow: 'hidden'
  },
  modalContainerLarge: {
    // 프로필 수정은 가능한 크게(거의 풀스크린) 표시하여 스크롤 필요성을 최소화
    maxHeight: '98%',
    minHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalBody: {
    padding: 16
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  modalHintText: {
    fontSize: 12,
    color: '#777',
    lineHeight: 16,
    marginBottom: 12,
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
  inlineSettingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 12,
  },
  inlineSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineSettingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  inlineSettingDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
    lineHeight: 16,
  },
});

export default ProfileScreen;