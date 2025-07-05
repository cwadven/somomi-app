const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// 한글 경로 문제 해결을 위한 설정
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // index.js 파일을 직접 참조하는 경우 처리
  if (moduleName.includes('index.js')) {
    return {
      filePath: path.resolve(projectRoot, 'index.js'),
      type: 'sourceFile',
    };
  }
  
  // 기본 해석기 사용
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 