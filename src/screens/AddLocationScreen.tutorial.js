import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';

export function useAddLocationTutorial({ isTutorialCreate, tutorialStep, dispatch, scrollRef }) {
  // ✅ 튜토리얼 전용: 이름 입력 추적(다른 effect에 의해 locationData가 덮여도 라벨이 즉시 반응하도록)
  const [tutorialTitleDraft, setTutorialTitleDraft] = useState('');
  const firstTemplateRef = useRef(null);
  const [firstTemplateRect, setFirstTemplateRect] = useState(null);
  const nameInputRef = useRef(null);
  const [nameInputRect, setNameInputRect] = useState(null);
  const saveBtnRef = useRef(null);
  const [saveBtnRect, setSaveBtnRect] = useState(null);
  const [tutorialToSaveTransitioning, setTutorialToSaveTransitioning] = useState(false);

  const blockerActiveTemplate = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_TEMPLATE_TOP);
  const blockerActiveName = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_CATEGORY_NAME && !tutorialToSaveTransitioning);
  const blockerActiveSave = !!(isTutorialCreate && tutorialStep === TUTORIAL_STEPS.WAIT_CATEGORY_SAVE);

  const tutorialNameFilled = useMemo(() => {
    if (!isTutorialCreate) return false;
    return String(tutorialTitleDraft || '').trim().length > 0;
  }, [isTutorialCreate, tutorialTitleDraft]);

  const measureFirstTemplate = useCallback(() => {
    try {
      const node = firstTemplateRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setFirstTemplateRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const measureNameInput = useCallback(() => {
    try {
      const node = nameInputRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setNameInputRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const measureSaveBtn = useCallback(() => {
    try {
      const node = saveBtnRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setSaveBtnRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!blockerActiveTemplate) return;
    const t = setTimeout(() => measureFirstTemplate(), 0);
    return () => clearTimeout(t);
  }, [blockerActiveTemplate, measureFirstTemplate]);

  useEffect(() => {
    if (!blockerActiveName) return;
    const t = setTimeout(() => measureNameInput(), 0);
    return () => clearTimeout(t);
  }, [blockerActiveName, measureNameInput]);

  useEffect(() => {
    if (!blockerActiveSave) return;
    const t = setTimeout(() => measureSaveBtn(), 0);
    return () => clearTimeout(t);
  }, [blockerActiveSave, measureSaveBtn]);

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
        try { measureSaveBtn(); } catch (e) {}
      }, 250);
    }, 350);
  }, [dispatch, isTutorialCreate, measureSaveBtn, scrollRef, tutorialNameFilled]);

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

