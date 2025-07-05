import { Platform } from 'react-native';

// 웹 환경인지 확인하는 함수
export const isWeb = Platform.OS === 'web';

// 네이티브 환경인지 확인하는 함수
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android'; 