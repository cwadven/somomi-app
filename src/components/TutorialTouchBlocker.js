import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function roundedRectPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const right = x + w;
  const bottom = y + h;
  return [
    `M${x + rr} ${y}`,
    `H${right - rr}`,
    `A${rr} ${rr} 0 0 1 ${right} ${y + rr}`,
    `V${bottom - rr}`,
    `A${rr} ${rr} 0 0 1 ${right - rr} ${bottom}`,
    `H${x + rr}`,
    `A${rr} ${rr} 0 0 1 ${x} ${bottom - rr}`,
    `V${y + rr}`,
    `A${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    'Z',
  ].join(' ');
}

// Renders a full-screen touch blocker with a "hole" where touches can pass through.
// The "hole" is provided in window coordinates (measureInWindow).
export default function TutorialTouchBlocker({
  active,
  holeRect,
  message,
  hideUntilHole = false,
  messagePlacement = 'bottom', // 'bottom' | 'near'
  messagePlacementPreference = 'below', // 'above' | 'below' (only when messagePlacement='near')
  showActionLabel = true,
  holeRadius = 14,
  dimColor = 'rgba(0,0,0,0.45)',
  actionLabel = '터치',
  actionLabelPlacement = 'above', // 'above' | 'below'
  onActionPress,
  ctaText,
  onCtaPress,
  ctaDisabled = false,
}) {
  const { width, height } = useWindowDimensions();
  const rootRef = useRef(null);
  const [rootOffset, setRootOffset] = useState({ x: 0, y: 0 });
  const [messageBoxHeight, setMessageBoxHeight] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        const node = rootRef.current;
        if (!node || typeof node.measureInWindow !== 'function') return;
        node.measureInWindow((x, y) => {
          if (typeof x === 'number' && typeof y === 'number') {
            setRootOffset({ x, y });
          }
        });
      } catch (e) {}
    }, 0);
    return () => clearTimeout(t);
  }, [active, holeRect?.x, holeRect?.y]);

  const hole = useMemo(() => {
    if (!holeRect || typeof holeRect.x !== 'number') return null;
    const pad = 10;
    // holeRect is measured in window coords; convert into this overlay's local coord space
    const x = clamp(holeRect.x - (rootOffset?.x || 0) - pad, 0, width);
    const y = clamp(holeRect.y - (rootOffset?.y || 0) - pad, 0, height);
    const w = clamp(holeRect.width + pad * 2, 0, width - x);
    const h = clamp(holeRect.height + pad * 2, 0, height - y);
    return { x, y, width: w, height: h };
  }, [holeRect, rootOffset?.x, rootOffset?.y, width, height]);

  const dimPath = useMemo(() => {
    // Hook 순서를 깨지 않기 위해 hole 유무와 관계없이 항상 계산합니다.
    if (!hole) return null;
    // even-odd fill: outer rect minus inner rounded rect
    const outer = `M0 0H${width}V${height}H0Z`;
    const inner = roundedRectPath(hole.x, hole.y, hole.width, hole.height, holeRadius);
    return `${outer} ${inner}`;
  }, [width, height, hole?.x, hole?.y, hole?.width, hole?.height, holeRadius]);

  const messageBottom = useMemo(() => {
    // Hook 순서를 깨지 않기 위해(조건부 hook 금지) hole 유무와 관계없이 항상 계산합니다.
    const base = 16;
    if (!hole) return base;

    // 기본은 하단 고정. hole이 화면 아래쪽에 있을 때만 hole 위로 올려서 겹침을 줄임.
    if (hole.y > height * 0.55) {
      const aboveHole = height - hole.y + 12;
      return clamp(aboveHole, base, Math.max(base, height - 140));
    }
    return base;
  }, [height, hole?.y]);

  const messageBoxPos = useMemo(() => {
    if (!hole) return null;
    const basePos = { position: 'absolute', left: 16, right: 16 };

    if (messagePlacement === 'near') {
      const est = onCtaPress ? 140 : 86;
      const boxH = messageBoxHeight > 0 ? messageBoxHeight : est;
      const margin = 12;
      const aboveTop = hole.y - boxH - margin;
      const belowTop = hole.y + hole.height + margin;
      const minTop = 8;
      const maxTop = Math.max(minTop, height - boxH - 8);
      const canAbove = aboveTop >= minTop;
      const canBelow = belowTop <= maxTop;

      let top;
      if (messagePlacementPreference === 'above') {
        top = canAbove ? aboveTop : canBelow ? belowTop : clamp(aboveTop, minTop, maxTop);
      } else {
        top = canBelow ? belowTop : canAbove ? aboveTop : clamp(belowTop, minTop, maxTop);
      }
      return { ...basePos, top };
    }

    return { ...basePos, bottom: messageBottom };
  }, [
    height,
    hole?.y,
    hole?.height,
    messageBottom,
    messageBoxHeight,
    messagePlacement,
    messagePlacementPreference,
    onCtaPress,
  ]);

  if (!active) return null;

  if (!hole) {
    if (hideUntilHole) return null;
    return (
      <View ref={rootRef} pointerEvents="auto" style={[styles.rootOverlay, styles.fullOverlay]} collapsable={false}>
        <View pointerEvents={onCtaPress ? 'auto' : 'none'} style={styles.messageBox}>
          <Text style={styles.messageText}>{message || '계속 진행해주세요.'}</Text>
          {onCtaPress ? (
            <TouchableOpacity
              onPress={onCtaPress}
              activeOpacity={0.85}
              disabled={!!ctaDisabled}
              style={[styles.ctaBtn, !!ctaDisabled && { opacity: 0.5 }]}
            >
              <Text style={styles.ctaText}>{String(ctaText || '확인')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  const topH = hole.y;
  const leftW = hole.x;
  const rightX = hole.x + hole.width;
  const bottomY = hole.y + hole.height;
  const labelH = 32;
  const touchLabelTop =
    actionLabelPlacement === 'below'
      ? clamp(hole.y + hole.height + 8, 8, height - labelH - 8)
      : clamp(hole.y - labelH - 4, 8, height - labelH - 8);
  const touchLabelLeft = clamp(hole.x + hole.width / 2 - 34, 8, width - 68);

  return (
    <View
      ref={rootRef}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, styles.rootOverlay]}
      collapsable={false}
      onLayout={() => {
        try {
          const node = rootRef.current;
          if (!node || typeof node.measureInWindow !== 'function') return;
          node.measureInWindow((x, y) => {
            if (typeof x === 'number' && typeof y === 'number') setRootOffset({ x, y });
          });
        } catch (e) {}
      }}
    >
      {/* dim with rounded hole (visual only) */}
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        style={StyleSheet.absoluteFillObject}
      >
        {dimPath ? <Path d={dimPath} fill={dimColor} fillRule="evenodd" /> : null}
      </Svg>

      {/* blockers */}
      <View pointerEvents="auto" style={[styles.blockTouch, { left: 0, top: 0, width, height: topH }]} />
      <View pointerEvents="auto" style={[styles.blockTouch, { left: 0, top: hole.y, width: leftW, height: hole.height }]} />
      <View
        pointerEvents="auto"
        style={[styles.blockTouch, { left: rightX, top: hole.y, width: Math.max(0, width - rightX), height: hole.height }]}
      />
      <View
        pointerEvents="auto"
        style={[styles.blockTouch, { left: 0, top: bottomY, width, height: Math.max(0, height - bottomY) }]}
      />

      {/* highlight */}
      <View pointerEvents="none" style={[styles.holeOutline, { left: hole.x, top: hole.y, width: hole.width, height: hole.height }]} />

      {/* action label */}
      {showActionLabel ? (
        typeof onActionPress === 'function' ? (
          <TouchableOpacity
            pointerEvents="auto"
            activeOpacity={0.85}
            onPress={onActionPress}
            style={[
              styles.touchLabel,
              styles.touchLabelClickable,
              {
                left: touchLabelLeft,
                top: touchLabelTop,
              },
            ]}
          >
            <Text style={styles.touchLabelText}>{String(actionLabel || '터치')}</Text>
          </TouchableOpacity>
        ) : (
          <View
            pointerEvents="none"
            style={[
              styles.touchLabel,
              {
                left: touchLabelLeft,
                top: touchLabelTop,
              },
            ]}
          >
            <Text style={styles.touchLabelText}>{String(actionLabel || '터치')}</Text>
          </View>
        )
      ) : null}

      {/* message */}
      <View
        pointerEvents={onCtaPress ? 'auto' : 'none'}
        onLayout={(e) => {
          try {
            const h = e?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h > 0) setMessageBoxHeight(h);
          } catch (err) {}
        }}
        style={[styles.messageBox, messageBoxPos || { position: 'absolute', left: 16, right: 16, bottom: messageBottom }]}
      >
        <Text style={styles.messageText}>{message || '하이라이트된 부분만 눌러주세요.'}</Text>
        {onCtaPress ? (
          <TouchableOpacity
            onPress={onCtaPress}
            activeOpacity={0.85}
            disabled={!!ctaDisabled}
            style={[styles.ctaBtn, !!ctaDisabled && { opacity: 0.5 }]}
          >
            <Text style={styles.ctaText}>{String(ctaText || '완료')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootOverlay: {
    // Ensure overlay is always above headers/tabs (web + native)
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  fullOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  // 터치 차단만 담당 (시각적 딤은 SVG에서 처리)
  blockTouch: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  holeOutline: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 14,
  },
  messageBox: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  messageText: {
    color: '#1B5E20',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  ctaBtn: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  touchLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#4CAF50',
    minWidth: 68,
    maxWidth: 320,
    alignItems: 'center',
  },
  touchLabelClickable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  touchLabelText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

