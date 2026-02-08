import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function MarkdownMessageText({ message, style }) {
  const normalized = useMemo(() => {
    return message == null ? '' : String(message);
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
    <Markdown style={mdStyle}>
      {normalized}
    </Markdown>
  );
}

