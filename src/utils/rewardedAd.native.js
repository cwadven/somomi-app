import { Alert, NativeModules, Platform } from 'react-native';

/**
 * Show a rewarded ad (native only) via our custom native module.
 *
 * @param {object} opts
 * @param {string} opts.unitId - Rewarded Ad Unit ID ("/" form). (필수)
 * @param {string} [opts.customData] - SSV에 전달할 customData (예: guest_id)
 * @param {(reward: any) => void} [opts.onEarnedReward]
 * @param {(error: any) => void} [opts.onError]
 */
export async function showRewardedAd({ unitId, customData, onEarnedReward, onError } = {}) {
  if (Platform.OS === 'web') {
    throw new Error('웹에서는 불가능 합니다.');
  }

  const mod = NativeModules?.SomomiRewardedAd;
  if (!mod?.show) {
    const msg = 'SomomiRewardedAd 네이티브 모듈을 찾을 수 없습니다. (Android 빌드에 포함되었는지 확인해주세요.)';
    try { Alert.alert('광고 로드 오류', msg); } catch (e) {}
    throw new Error(msg);
  }

  const finalUnitId = String(unitId || '').trim();
  if (!finalUnitId) {
    const msg = 'Rewarded 광고 unitId가 필요합니다.';
    try { Alert.alert('광고 설정 오류', msg); } catch (e) {}
    throw new Error(msg);
  }
  if (finalUnitId.includes('~')) {
    const msg = `Rewarded 광고 유닛 ID가 아니라 App ID가 들어간 것 같아요.\n\nfinalUnitId=${finalUnitId}`;
    try { Alert.alert('광고 설정 오류', msg); } catch (e) {}
    throw new Error(msg);
  }

  try {
    // Native returns: { type, amount } when earned, or null when dismissed without reward.
    const reward = await mod.show(finalUnitId, customData == null ? null : String(customData));
    if (reward) {
      try { onEarnedReward?.(reward); } catch (e) {}
    }
    return reward;
  } catch (e) {
    try { onError?.(e); } catch (e2) {}
    throw e;
  }
}

