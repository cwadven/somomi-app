import { useCallback, useMemo } from 'react';
import { TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import { useMeasuredInWindow } from '../utils/useMeasuredInWindow';

export function useLocationDetailTutorial({
  tutorial,
  locationId,
  isAllProductsView,
  locationProductsLength,
}) {
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

  const {
    ref: addProductButtonRef,
    rect: addProductButtonRect,
    measure: measureAddProductButton,
  } = useMeasuredInWindow({
    active: lockAddProductTutorial,
    initialDelayMs: 0,
    retryCount: 10,
    retryDelayMs: 80,
  });

  const {
    ref: createdProductRowRef,
    rect: createdProductRowRect,
    measure: measureCreatedProductRow,
  } = useMeasuredInWindow({
    active: lockCreatedProductCongrats,
    initialDelayMs: 50,
    retryCount: 10,
    retryDelayMs: 80,
    deps: [locationProductsLength],
  });

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

