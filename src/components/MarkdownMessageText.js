import { useMemo } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function MarkdownMessageText({ message, style }) {
  const normalized = useMemo(() => {
    const raw = message == null ? '' : String(message);
    // 백엔드/DB에 따라 개행이 "\\n"로 들어오거나, <br> 형태로 들어오는 케이스가 있어
    // 마크다운 파싱이 깨지지 않도록 최소한만 정규화
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .trim();
  }, [message]);

  const handleLinkPress = (url) => {
    const u = url == null ? '' : String(url);

    // ✅ 앱 내부 딥링크는 OS openURL이 아닌 "직접 네비게이션"으로 처리 (앱 포그라운드에서 더 안정적)
    try {
      const m = u.match(/^somomi:\/\/location\/detail\/([^/?#]+)/i);
      const locId = m?.[1] ? decodeURIComponent(m[1]) : null;
      if (locId) {
        const { navigate } = require('../navigation/RootNavigation');
        // ✅ 탭 전환 없이 루트 모달로 LocationDetail을 띄움 (뒤로가기 시 닫힘)
        navigate('RootLocationDetail', { locationId: String(locId), from: 'deeplink' });
        return;
      }
    } catch (e) {}

    try {
      Linking.openURL(u).catch(() => {});
    } catch (e) {}
  };

  const mdStyle = useMemo(() => {
    const base = StyleSheet.flatten(style) || {};
    return {
      body: base,
      text: base,
      paragraph: { ...base, marginTop: 0, marginBottom: 8 },
      strong: { ...base, fontWeight: '800' },
      em: { ...base, fontStyle: 'italic' },
      bullet_list: { marginTop: 6, marginBottom: 6 },
      ordered_list: { marginTop: 6, marginBottom: 6 },
      list_item: { flexDirection: 'row', marginBottom: 4 },
      bullet_list_icon: { marginRight: 6, lineHeight: base?.lineHeight },
      bullet_list_content: { flex: 1 },
      link: { color: '#1A73E8', textDecorationLine: 'underline' },
      code_inline: { backgroundColor: '#F3F4F6', fontFamily: base?.fontFamily, paddingHorizontal: 4 },
    };
  }, [style]);

  return (
    <Markdown
      style={mdStyle}
      rules={{
        // 링크가 "클릭이 안되는" 환경이 있어, 링크 렌더링을 직접 오버라이드하여 항상 클릭 가능하게 처리
        link: (node, children, parent, styles) => {
          const href = node?.attributes?.href || '';
          return (
            <Text
              key={node.key}
              style={styles.link}
              onPress={() => handleLinkPress(href)}
              suppressHighlighting={false}
            >
              {children}
            </Text>
          );
        },
        blocklink: (node, children, parent, styles) => {
          const href = node?.attributes?.href || '';
          return (
            <Text
              key={node.key}
              style={styles.link}
              onPress={() => handleLinkPress(href)}
              suppressHighlighting={false}
            >
              {children}
            </Text>
          );
        },
      }}
    >
      {normalized}
    </Markdown>
  );
}

