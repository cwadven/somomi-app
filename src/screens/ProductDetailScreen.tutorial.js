import { useCallback, useEffect, useMemo, useState } from 'react';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import { useMeasuredInWindow } from '../utils/useMeasuredInWindow';

export function useProductDetailTutorial({
  isTutorialProductCreate,
  tutorial,
  dispatch,
  navigation,
  productName,
  formScrollRef,
}) {
  const [tutorialProductNameDraft, setTutorialProductNameDraft] = useState('');
  const [tutorialToSaveTransitioning, setTutorialToSaveTransitioning] = useState(false);

  const tutorialProductNameFilled = useMemo(() => {
    const raw = isTutorialProductCreate ? tutorialProductNameDraft : productName;
    return String(raw || '').trim().length > 0;
  }, [isTutorialProductCreate, productName, tutorialProductNameDraft]);

  const blockerActiveName = !!(
    isTutorialProductCreate &&
    tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_NAME &&
    !tutorialToSaveTransitioning
  );

  const blockerActiveSave = !!(
    isTutorialProductCreate && tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_SAVE
  );

  const {
    ref: productNameInputRef,
    rect: productNameInputRect,
    measure: measureProductNameInput,
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

  // 튜토리얼 create 진입 시 기본은 제품명 작성부터
  useEffect(() => {
    if (!isTutorialProductCreate) return;
    if (tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_NAME) return;
    if (tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_SAVE) return;
    // ✅ 제품 생성 완료 후에는 축하 단계로 넘어가므로, 여기서 다시 "제품명 작성"으로 되돌리지 않음
    if (tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_PRODUCT_CONGRATS) return;
    try {
      dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_PRODUCT_NAME }));
    } catch (e) {}
  }, [dispatch, isTutorialProductCreate, tutorial?.step]);

  useEffect(() => {
    if (!isTutorialProductCreate) return;
    try {
      setTutorialProductNameDraft(String(productName || ''));
    } catch (e) {}
  }, [isTutorialProductCreate, productName]);

  // ✅ 튜토리얼에서는 네비게이션 헤더/뒤로가기 제스처를 완전히 비활성화
  useEffect(() => {
    try {
      if (!navigation?.setOptions) return;
      if (
        isTutorialProductCreate &&
        (tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_NAME ||
          tutorial?.step === TUTORIAL_STEPS.WAIT_PRODUCT_SAVE)
      ) {
        navigation.setOptions({
          headerShown: false,
          gestureEnabled: false,
        });
      } else {
        navigation.setOptions({
          gestureEnabled: true,
        });
      }
    } catch (e) {}
  }, [navigation, isTutorialProductCreate, tutorial?.step]);

  const goToSaveStep = useCallback(() => {
    if (!isTutorialProductCreate) return;
    if (!tutorialProductNameFilled) return;

    try {
      setTutorialToSaveTransitioning(true);
    } catch (e) {}
    try {
      formScrollRef?.current?.scrollToEnd?.({ animated: true });
    } catch (e) {}

    setTimeout(() => {
      try {
        setTutorialToSaveTransitioning(false);
      } catch (e) {}
      try {
        dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_PRODUCT_SAVE }));
      } catch (e) {}
      ensureMeasureSaveBtn();
    }, 350);
  }, [dispatch, ensureMeasureSaveBtn, formScrollRef, isTutorialProductCreate, tutorialProductNameFilled]);

  return {
    // state
    tutorialProductNameDraft,
    setTutorialProductNameDraft,
    tutorialToSaveTransitioning,

    // derived
    tutorialProductNameFilled,
    blockerActiveName,
    blockerActiveSave,

    // refs + rects
    productNameInputRef,
    productNameInputRect,
    saveBtnRef,
    saveBtnRect,

    // measurement
    measureProductNameInput,
    measureSaveBtn,
    ensureMeasureSaveBtn,

    // actions
    goToSaveStep,
  };
}

