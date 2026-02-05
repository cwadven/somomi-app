import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';

export function useLocationDetailTutorial({
  tutorial,
  locationId,
  isAllProductsView,
  locationProductsLength,
}) {
  const addProductButtonRef = useRef(null);
  const [addProductButtonRect, setAddProductButtonRect] = useState(null);

  const createdProductRowRef = useRef(null);
  const [createdProductRowRect, setCreatedProductRowRect] = useState(null);

  const lockAddProductTutorial = !!(
    tutorial?.active &&
    tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATION_ADD_PRODUCT &&
    !isAllProductsView
  );

  const lockCreatedProductCongrats = !!(
    tutorial?.active &&
    tutorial?.step === TUTORIAL_STEPS.WAIT_CREATED_PRODUCT_CONGRATS &&
    !isAllProductsView &&
    tutorial?.createdProductLocationId != null &&
    String(tutorial.createdProductLocationId) === String(locationId)
  );

  const wantCreatedProductName = useMemo(() => {
    const n = tutorial?.createdProductName != null ? String(tutorial.createdProductName).trim() : '';
    return n || null;
  }, [tutorial?.createdProductName]);

  const isTargetCreatedProduct = useCallback(
    (item) => {
      if (!lockCreatedProductCongrats) return false;
      if (!wantCreatedProductName) return false;
      const itemName = String(item?.name || item?.title || '').trim();
      return !!itemName && itemName === wantCreatedProductName;
    },
    [lockCreatedProductCongrats, wantCreatedProductName]
  );

  const measureCreatedProductRow = useCallback(() => {
    try {
      const node = createdProductRowRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setCreatedProductRowRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!lockCreatedProductCongrats) return;
    const t = setTimeout(() => measureCreatedProductRow(), 50);
    return () => clearTimeout(t);
  }, [lockCreatedProductCongrats, measureCreatedProductRow, locationProductsLength]);

  const measureAddProductButton = useCallback(() => {
    try {
      const node = addProductButtonRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setAddProductButtonRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!lockAddProductTutorial) return;
    const t = setTimeout(() => measureAddProductButton(), 0);
    return () => clearTimeout(t);
  }, [lockAddProductTutorial, measureAddProductButton]);

  return {
    // locks
    lockAddProductTutorial,
    lockCreatedProductCongrats,

    // add button hole
    addProductButtonRef,
    addProductButtonRect,
    measureAddProductButton,

    // created product hole
    createdProductRowRef,
    createdProductRowRect,
    measureCreatedProductRow,
    isTargetCreatedProduct,
  };
}

