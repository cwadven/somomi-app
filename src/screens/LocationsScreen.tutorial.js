import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';

export function useLocationsTutorial({
  tutorial,
  isFocused,
  dispatch,
  locations,
  templatePickerVisible,
  alertModalVisible,
  showCongratsModal,
}) {
  const addButtonRef = useRef(null);
  const [addButtonRect, setAddButtonRect] = useState(null);
  const newestLocationRowRef = useRef(null);
  const [newestLocationRowRect, setNewestLocationRowRect] = useState(null);
  const didShowTutorialCongratsRef = useRef(false);

  const blockerActive = !!(tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS);
  const blockerActiveCongrats = !!(tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CONGRATS);
  const blockerActiveNewestLocation = !!(tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK);

  // ✅ 안전장치: tabPress 이벤트 누락 시 화면 진입으로 보정
  useEffect(() => {
    try {
      if (!isFocused) return;
      if (!tutorial?.active) return;
      if (tutorial?.step !== TUTORIAL_STEPS.WAIT_LOCATIONS_TAB) return;
      dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS }));
    } catch (e) {}
  }, [dispatch, isFocused, tutorial?.active, tutorial?.step]);

  // ✅ 카테고리 생성 직후 축하 모달 (확인 후 리스트 터치 단계로)
  useEffect(() => {
    try {
      if (!isFocused) return;
      if (!blockerActiveCongrats) {
        didShowTutorialCongratsRef.current = false;
        return;
      }
      if (didShowTutorialCongratsRef.current) return;
      if (templatePickerVisible || alertModalVisible) return;
      if (typeof showCongratsModal !== 'function') return;

      didShowTutorialCongratsRef.current = true;
      showCongratsModal(() => {
        try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_CREATED_LOCATION_CLICK })); } catch (e) {}
      });
    } catch (e) {}
  }, [
    dispatch,
    isFocused,
    blockerActiveCongrats,
    templatePickerVisible,
    alertModalVisible,
    showCongratsModal,
  ]);

  const measureAddButton = useCallback(() => {
    try {
      const node = addButtonRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setAddButtonRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const measureNewestLocationRow = useCallback(() => {
    try {
      const node = newestLocationRowRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setNewestLocationRowRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!blockerActive) return;
    const t = setTimeout(() => measureAddButton(), 0);
    return () => clearTimeout(t);
  }, [blockerActive, measureAddButton]);

  useEffect(() => {
    if (!blockerActiveNewestLocation) return;
    const t = setTimeout(() => measureNewestLocationRow(), 50);
    return () => clearTimeout(t);
  }, [blockerActiveNewestLocation, measureNewestLocationRow, locations?.length]);

  const locationsSorted = useMemo(() => {
    const list = Array.isArray(locations) ? [...locations] : [];
    // newest first (fallback to id numeric)
    list.sort((a, b) => {
      const ta = new Date(a?.createdAt || a?.created_at || 0).getTime();
      const tb = new Date(b?.createdAt || b?.created_at || 0).getTime();
      if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
      const na = parseInt(String(a?.id || a?.localId || 0), 10) || 0;
      const nb = parseInt(String(b?.id || b?.localId || 0), 10) || 0;
      return nb - na;
    });
    return list;
  }, [locations]);

  const tutorialTargetTitle = useMemo(() => {
    const t = tutorial?.createdLocationTitle != null ? String(tutorial.createdLocationTitle).trim() : '';
    return t || null;
  }, [tutorial?.createdLocationTitle]);

  const tutorialTargetLocationId = useMemo(() => {
    const fromId = tutorial?.createdLocationId != null ? String(tutorial.createdLocationId) : null;
    if (fromId) return fromId;
    const t = tutorial?.createdLocationTitle != null ? String(tutorial.createdLocationTitle).trim() : '';
    if (t) {
      const matched = (locationsSorted || []).find((l) => String(l?.title || '').trim() === t) || null;
      if (matched?.id != null) return String(matched.id);
      if (matched?.localId != null) return String(matched.localId);
    }
    const first = locationsSorted?.[0];
    return first?.id != null ? String(first.id) : (first?.localId != null ? String(first.localId) : null);
  }, [tutorial?.createdLocationId, tutorial?.createdLocationTitle, locationsSorted]);

  const isAllowedCreatedLocation = useCallback((loc) => {
    if (!loc) return false;
    if (tutorialTargetTitle) {
      return String(loc?.title || '').trim() === String(tutorialTargetTitle).trim();
    }
    const targetId = tutorialTargetLocationId;
    if (!targetId) return false;
    const key = loc?.localId != null ? String(loc.localId) : (loc?.id != null ? String(loc.id) : null);
    return !!(key && String(key) === String(targetId));
  }, [tutorialTargetTitle, tutorialTargetLocationId]);

  return {
    // refs/rects
    addButtonRef,
    addButtonRect,
    newestLocationRowRef,
    newestLocationRowRect,
    // blockers
    blockerActive,
    blockerActiveCongrats,
    blockerActiveNewestLocation,
    // helpers
    measureAddButton,
    measureNewestLocationRow,
    locationsSorted,
    tutorialTargetTitle,
    tutorialTargetLocationId,
    isAllowedCreatedLocation,
    measureNewestLocationRow,
  };
}

