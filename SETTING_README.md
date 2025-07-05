1. expo 프로젝트 생성
https://expo.dev/ 접근 후, 프로젝트 생성.

2. 코드 베이스 eas 등록

```bash
sudo npm install --global eas-cli
eas init --id ProjectID
```

3. 프로젝트 root 에 .env 정의

```
EXPO_PROJECT_ID=ProjectID
EXPO_UPDATES_URL=https://u.expo.dev/ProjectID
```

4. Android Prebuild

```bash
rm -rf node_modules/.cache && npx expo prebuild -p android --clean
```

5. my-release-key.keystore 생성

```bash
keytool -genkeypair -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

생성된 키 android/app 폴더에 저장

6. java 버전 관리 및 키 관리 (android/gradle.properties)

```
org.gradle.java.home=/Users/XXXXXXX/Library/Java/JavaVirtualMachines/corretto-17.0.13/Contents/Home

MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=XXXX
MYAPP_UPLOAD_KEY_PASSWORD=XXXX
```


7. 키 관리 (android/app/build.gradle)

```
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
```

8. Lint 검사 무시

```
android {
    ...
    
    // Lint 검사 비활성화
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
}
```

9. 프로젝트 설정 앱푸시 (android/app/build.gradle, android/build.gradle)

i. Firebase Console 에서 프로젝트 생성

https://firebase.google.com/?authuser=2

ii. android 설정 "Add Firebase to your Android app"

iii. goole-services.json 다운로드

iv. android/app 위치에 google-services.json 이동

v. android/build.gradle 에 com.google.gms:google-services:4.3.15 설정

```
buildscript {
    ext {
        ...
    }
    repositories {
        ...
    }
    dependencies {
        // 이거
        classpath('com.google.gms:google-services:4.3.15')
        classpath('com.android.tools.build:gradle')
        classpath('com.facebook.react:react-native-gradle-plugin')
    }
}
```

vi. Lint 무시 설정

```
allprojects {
  ...
  
  // 모든 프로젝트에 Lint 검사 비활성화 적용
  tasks.withType(JavaCompile) {
    options.compilerArgs << "-Xlint:unchecked" << "-Xlint:deprecation"
  }
  
  afterEvaluate {
    if (project.hasProperty('android')) {
      android {
        lintOptions {
          checkReleaseBuilds false
          abortOnError false
        }
      }
    }
  }
}
```

vii. android/app/build.gradle 에 com.google.gms.google-services 추가

```
apply plugin: 'com.android.application'
apply plugin: 'org.jetbrains.kotlin.android'
apply plugin: 'com.facebook.react'
apply plugin: 'com.google.gms.google-services'
```

viii. android/app/src/main/AndroidManifest.xml 에 특성 추가

memery more use

```
<application 
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="true"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="true"
    android:extractNativeLibs="true"
    android:largeHeap="true">
```

android.intent.category.DEFAULT 추가

```
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="https"/>
    </intent>
  </queries>
  <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true">
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>
    <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true" android:screenOrientation="portrait">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <!-- 이부분 추가 -->
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="프로젝트"/>
        <data android:scheme="com.회사.프로젝트"/>
      </intent-filter>
      <intent-filter>
        <action android:name=".MainActivity" />
        <category android:name="android.intent.category.DEFAULT" />
      </intent-filter>
      <!-- 이부분 추가 -->
    </activity>
  </application>
</manifest>
```

9. sdk 관리 (android/local.properties)

local.properties 파일 생성

```
## This file must *NOT* be checked into Version Control Systems,
# as it contains information specific to your local configuration.
#
# Location of the SDK. This is only used by Gradle.
# For customization when using a Version Control System, please read the
# header note.
sdk.dir=/Users/.../Library/Android/sdk
```

10. MainActivity.kt Notification 때문에 좀 수정 했음.

android/app/main/java/com/next_story/somomi/MainActivity.kt
import 부분도 추가 필요

```kotlin
import android.content.Intent
...
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    
    // 푸시 알림으로부터 시작된 경우 인텐트 처리
    handleIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleIntent(intent)
  }

  private fun handleIntent(intent: Intent) {
    // 푸시 알림 데이터 처리
    val extras = intent.extras
    if (extras != null) {
      // Bundle을 WritableMap으로 변환
      val params = Arguments.createMap().apply {
        extras.keySet().forEach { key ->
          when (val value = extras.get(key)) {
            is String -> putString(key, value)
            is Int -> putInt(key, value)
            is Boolean -> putBoolean(key, value)
            is Double -> putDouble(key, value)
            // 필요한 경우 다른 타입도 추가
          }
        }
      }

      // React Native에 알림 데이터 전달
      reactInstanceManager?.currentReactContext
          ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("notificationOpened", params)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
```

1.  Code push 설정

android/app/src/main/AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.CAMERA" tools:node="remove"/>
  <uses-permission android:name="android.permission.DETECT_SCREEN_CAPTURE"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.NOTIFICATIONS"/>
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WAKE_LOCK"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="https"/>
    </intent>
  </queries>
  <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme">
    <!-- 여기 부분 시작 -->
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="https://u.expo.dev/PROJECT_ID직접쳐야함"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHANNEL" android:value="@string/expo_updates_channel"/>
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-runtime-version&quot;:&quot;exposdk:50.0.0&quot;,&quot;expo-channel-name&quot;:&quot;production&quot;}"/>
    <!-- 여기 부분 끝 -->
    <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" 
            android:value="default_channel" 
            tools:replace="android:value" />
    <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true" android:screenOrientation="portrait">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="프로젝트이름"/>
        <data android:scheme="com.회사이름.프로젝트이름"/>
      </intent-filter>
    </activity>
    <activity android:name="com.facebook.react.devsupport.DevSettingsActivity" android:exported="false"/>
  </application>
</manifest>
```

android/app/build.gradle

```
...
defaultConfig {
  applicationId '...'
  ...
  // Expo Updates 설정
  buildConfigField("String", "EXPO_UPDATES_URL", "\"https://u.expo.dev/PROJECT_ID직접쳐야함\"")
  buildConfigField("String", "EXPO_UPDATES_ENABLED", "\"true\"")
  buildConfigField("String", "EXPO_UPDATES_CHECK_ON_LAUNCH", "\"ALWAYS\"")
  buildConfigField("String", "EXPO_RUNTIME_VERSION", "\"exposdk:50.0.0\"")
  buildConfigField("String", "EXPO_UPDATES_CHANNEL", "\"production\"")

  // 추가 헤더 설정
  manifestPlaceholders = [
      expoRuntimeVersion: "exposdk:50.0.0",
      expoUpdatesChannel: "production",
      expoUpdatesUrl: "https://u.expo.dev/PROJECT_ID직접쳐야함"
  ]
}
```

android/app/src/main/res/values/strings.xml

```xml
<resources>
  <string name="app_name">Somomi</string>
  <string name="expo_splash_screen_resize_mode" translatable="false">contain</string>
  <string name="expo_splash_screen_status_bar_translucent" translatable="false">false</string>
  <!-- 여기 설정 (시작) -->
  <string name="expo_runtime_version">exposdk:50.0.0</string>
  <string name="expo_updates_channel">default</string>
  <!-- 여기 설정 (끝) -->
</resources>
```


12.  프로젝트 루트에 credentials.json 파일 생성 후 코드 적용

```
{
  "android": {
    "keystore": {
      "keystorePath": "my-release-key.keystore",
      "keystorePassword": "YOUR_KEYSTORE_PASSWORD",
      "keyAlias": "my-key-alias",
      "keyPassword": "YOUR_KEY_PASSWORD"
    }
  }
}
```

14. 폴더 위치가 한글이면 설정

프로젝트 루트에 metro.config.js 생성

```javascript
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
```

15. assets 폴더 생성.

android/app/src/main/assets 폴더 생성

16. Android 빌드

```
cd android
./gradlew clean
./gradlew assembleRelease
```

17. EAS Update 사용 방법

- 개발 환경에 업데이트 배포:
   ```bash
   npm run update:dev
   ```

- 프로덕션 환경에 업데이트 배포:
   ```bash
   npm run update:prod
   ```