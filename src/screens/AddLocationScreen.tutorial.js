import { useCallback, useMemo, useState } from 'react';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import { useMeasuredInWindow } from '../utils/useMeasuredInWindow';

export function useAddLocationTutorial({ isTutorialCreate, tutorialStep, dispatch, scrollRef }) {
  // ✅ 튜토리얼 전용: 이름 입력 추적(다른 effect에 의해 locationData가 덮여도 라벨이 즉시 반응하도록)
  const [tutorialTitleDraft, setTutorialTitleDraft] = useState('');
  const [tutorialToSaveTransitioning, setTutorialToSaveTransitioning] = useState(false);

  const blockerActiveTemplate = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_TEMPLATE_TOP);
  const blockerActiveName = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_CATEGORY_NAME && !tutorialToSaveTransitioning);
  const blockerActiveSave = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_CATEGORY_SAVE);

  const tutorialNameFilled = useMemo(() => {
    if (!isTutorialCreate) return false;
    return String(tutorialTitleDraft || '').trim().length > 0;
  }, [isTutorialCreate, tutorialTitleDraft]);

  const {
    ref: firstTemplateRef,
    rect: firstTemplateRect,
    measure: measureFirstTemplate,
  } = useMeasuredInWindow({
    active: blockerActiveTemplate,
    initialDelayMs: 0,
    retryCount: 10,
    retryDelayMs: 80,
  });

  const {
    ref: nameInputRef,
    rect: nameInputRect,
    measure: measureNameInput,
  } = useMeasuredInWindow({
    active: blockerActiveName,
    initialDelayMs: 0,
    retryCount: 10,
    retryDelayMs: 80,
  });

  const {
    ref: saveBtnRef,
    rect: saveBtnRect,
    measure: measureSaveBtn,
    ensureMeasure: ensureMeasureSaveBtn,
  } = useMeasuredInWindow({
    active: blockerActiveSave,
    initialDelayMs: 0,
    retryCount: 10,
    retryDelayMs: 80,
  });

  const goToSaveStep = useCallback(() => {
    if (!isTutorialCreate) return;
    if (!tutorialNameFilled) return;
    try { setTutorialToSaveTransitioning(true); } catch (e) {}
    try {
      // 1) 스크롤을 맨 아래로 이동
      scrollRef?.current?.scrollToEnd?.({ animated: true });
    } catch (e) {}
    // 2) 스크롤 후 저장 단계로 전환 (저장 버튼만 터치 가능)
    setTimeout(() => {
      try { setTutorialToSaveTransitioning(false); } catch (e) {}
      try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_CATEGORY_SAVE })); } catch (e) {}
      // 저장 버튼 위치 재측정
      setTimeout(() => {
        try { ensureMeasureSaveBtn(); } catch (e) {}
      }, 250);
    }, 350);
  }, [dispatch, ensureMeasureSaveBtn, isTutorialCreate, scrollRef, tutorialNameFilled]);

  return {
    tutorialTitleDraft,
    setTutorialTitleDraft,
    tutorialNameFilled,
    tutorialToSaveTransitioning,

    firstTemplateRef,
    firstTemplateRect,
    nameInputRef,
    nameInputRect,
    saveBtnRef,
    saveBtnRect,

    blockerActiveTemplate,
    blockerActiveName,
    blockerActiveSave,

    measureFirstTemplate,
    measureNameInput,
    measureSaveBtn,

    goToSaveStep,
  };
}

