import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';

export function useProductDetailTutorial({
  isTutorialProductCreate,
  tutorial,
  dispatch,
  navigation,
  productName,
  formScrollRef,
}) {
  const productNameInputRef = useRef(null);
  const [productNameInputRect, setProductNameInputRect] = useState(null);

  const saveBtnRef = useRef(null);
  const [saveBtnRect, setSaveBtnRect] = useState(null);

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

  const measureProductNameInput = useCallback(() => {
    try {
      const node = productNameInputRef.current;
      if (!node) return;
      // ✅ use window coords (TutorialTouchBlocker converts window→overlay local)
      if (typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setProductNameInputRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const measureSaveBtn = useCallback(() => {
    try {
      const node = saveBtnRef.current;
      if (!node) return;
      // ✅ use window coords (TutorialTouchBlocker converts window→overlay local)
      if (typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setSaveBtnRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const ensureMeasureProductNameInput = useCallback(() => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      try {
        measureProductNameInput();
      } catch (e) {}
      if (tries >= 10) return;
      setTimeout(tick, 80);
    };
    setTimeout(tick, 0);
  }, [measureProductNameInput]);

  const ensureMeasureSaveBtn = useCallback(() => {
    let tries = 0;
    const tick = () => {
      tries += 1;
      try {
        measureSaveBtn();
      } catch (e) {}
      if (tries >= 10) return;
      setTimeout(tick, 80);
    };
    setTimeout(tick, 0);
  }, [measureSaveBtn]);

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

  useEffect(() => {
    if (!blockerActiveName) return;
    ensureMeasureProductNameInput();
  }, [blockerActiveName, ensureMeasureProductNameInput]);

  useEffect(() => {
    if (!blockerActiveSave) return;
    ensureMeasureSaveBtn();
  }, [blockerActiveSave, ensureMeasureSaveBtn]);

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

