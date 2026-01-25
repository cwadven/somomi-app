import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

/**
 * Show a rewarded ad (native only).
 *
 * @param {object} opts
 * @param {string} [opts.unitId] - Ad unit id. If omitted, uses Google test id.
 * @param {boolean} [opts.nonPersonalizedOnly] - NPA request.
 * @param {(reward: any) => void} [opts.onEarnedReward]
 * @param {(error: any) => void} [opts.onError]
 */
export async function showRewardedAd({
  unitId,
  nonPersonalizedOnly = true,
  onEarnedReward,
  onError,
} = {}) {
  const finalUnitId = unitId || TestIds.REWARDED;

  return await new Promise((resolve, reject) => {
    try {
      const rewarded = RewardedAd.createForAdRequest(finalUnitId, {
        requestNonPersonalizedAdsOnly: !!nonPersonalizedOnly,
      });

      const unsubscribe = rewarded.addAdEventListener((type, error, reward) => {
        try {
          if (type === AdEventType.LOADED) {
            rewarded.show();
          }

          if (type === RewardedAdEventType.EARNED_REWARD) {
            try { onEarnedReward?.(reward); } catch (e) {}
          }

          if (type === AdEventType.CLOSED) {
            try { unsubscribe?.(); } catch (e) {}
            resolve(true);
          }

          if (type === AdEventType.ERROR) {
            try { onError?.(error); } catch (e) {}
            try { unsubscribe?.(); } catch (e) {}
            reject(error || new Error('ad-error'));
          }
        } catch (e) {}
      });

      rewarded.load();
    } catch (e) {
      reject(e);
    }
  });
}

