import { useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
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
      onLinkPress={(url) => {
        try {
          // somomi:// 딥링크 및 https 링크 모두 허용
          Linking.openURL(String(url)).catch(() => {});
        } catch (e) {}
        return false; // 기본 핸들링 방지
      }}
    >
      {normalized}
    </Markdown>
  );
}

