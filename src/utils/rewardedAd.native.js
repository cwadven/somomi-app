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
  // IMPORTANT:
  // Do NOT import react-native-google-mobile-ads at module top-level.
  // In release builds, a top-level import can crash the app on startup
  // if native config / initialization is not ready. We lazy-require it
  // only when the user actually tries to show an ad.
  // eslint-disable-next-line global-require
  const { AdEventType, RewardedAd, RewardedAdEventType, TestIds } = require('react-native-google-mobile-ads');

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

