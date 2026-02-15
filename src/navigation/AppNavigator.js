import { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { completeTutorial, setTutorialStep, TUTORIAL_STEPS } from '../redux/slices/tutorialSlice';
import TutorialTouchBlocker from '../components/TutorialTouchBlocker';

const getDeepestRoute = (state) => {
  try {
    if (!state || !Array.isArray(state.routes) || state.routes.length === 0) return null;
    let route = state.routes[state.index ?? 0] || state.routes[0];
    // React Navigation nests child state at route.state
    while (route?.state && Array.isArray(route.state.routes) && route.state.routes.length > 0) {
      const s = route.state;
      route = s.routes[s.index ?? 0] || s.routes[0];
    }
    return route || null;
  } catch {
    return null;
  }
};

// 스크린 임포트
import HomeScreen from '../screens/HomeScreen';
import LocationsScreen from '../screens/LocationsScreen';
import LocationDetailScreen from '../screens/LocationDetailScreen';
import AddLocationScreen from '../screens/AddLocationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CategoryScreen from '../screens/CategoryScreen';
import ConsumedProductsScreen from '../screens/ConsumedProductsScreen';
import ConsumedProductDetailScreen from '../screens/ConsumedProductDetailScreen';
import MyNotificationsScreen from '../screens/MyNotificationsScreen';
import MyNotificationDetailScreen from '../screens/MyNotificationDetailScreen';
import StoreScreen from '../screens/StoreScreen';
import LoginScreen from '../screens/LoginScreen';
import HelpScreen from '../screens/HelpScreen';
// 결제 결과 딥링크 스크린 제거
import PaymentWebViewScreen from '../screens/PaymentWebViewScreen';
import ContentWebViewScreen from '../screens/ContentWebViewScreen';
import ExternalWebViewScreen from '../screens/ExternalWebViewScreen';
import PrivacyPolicyWebViewScreen from '../screens/PrivacyPolicyWebViewScreen';
import PointScreen from '../screens/PointScreen';
import QuestScreen from '../screens/QuestScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

// 홈 스택 네비게이터
const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        }
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ title: '소모미', headerShown: false }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={({ route }) => ({
          title: '제품 상세',
          headerShown: route.params?.hideHeader === true ? false : true
        })}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ title: '카테고리' }}
      />
      <Stack.Screen
        name="MyNotifications"
        component={MyNotificationsScreen}
        options={{ title: '내 알림', headerShown: false }}
      />
      <Stack.Screen
        name="MyNotificationDetail"
        component={MyNotificationDetailScreen}
        options={{ title: '알림 상세', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// 카테고리 관련 스택 네비게이터
const LocationsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="LocationsScreen" component={LocationsScreen} />
    <Stack.Screen 
      name="LocationDetail" 
      component={LocationDetailScreen} 
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen 
      name="AddLocation" 
      component={AddLocationScreen} 
      options={{ 
        // 스택 내 modal presentation 혼용 시(특히 react-native-screens) 이전 화면 detach로
        // 무한 스크롤 FlatList 스크롤이 0으로 리셋되는 문제가 발생할 수 있어 일반 push로 처리
        animation: 'slide_from_bottom'
      }}
    />
    <Stack.Screen 
      name="ProductDetail" 
      component={ProductDetailScreen} 
      options={{
        animation: 'slide_from_right',
      }}
    />
  </Stack.Navigator>
);

// ✅ 딥링크/마크다운 링크에서 "탭 전환 없이" LocationDetail을 띄우기 위한 루트 모달 스택
// - 알림 상세(MyNotificationDetail) 위에 한 겹 더 쌓여 "새 탭처럼" 보임
// - 뒤로가기 시 모달이 닫히며 원래 화면으로 복귀
const RootLocationDetailStack = ({ route }) => {
  const locationId = route?.params?.locationId != null ? String(route.params.locationId) : null;
  const from = route?.params?.from || 'deeplink';
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="LocationDetail"
        component={LocationDetailScreen}
        // ✅ 탭바가 없는 루트 모달 진입 케이스:
        // - 하단 플로팅 버튼 위치 보정 필요
        // - 캐시를 믿지 않고 최초 1회는 강제 fetch가 필요(딥링크/알림 상세 진입)
        initialParams={{ locationId, from, modal: true, forceFetch: true }}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

// 프로필 스택 네비게이터
const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        }
      }}
    >
      <Stack.Screen 
        name="ProfileScreen" 
        component={ProfileScreen} 
        options={{ title: '프로필', headerShown: false }}
      />
      <Stack.Screen
        name="Point"
        component={PointScreen}
        options={{ title: '포인트', headerShown: false }}
      />
      <Stack.Screen
        name="Quest"
        component={QuestScreen}
        options={{ title: '퀘스트', headerShown: false }}
      />
      <Stack.Screen
        name="ConsumedProducts"
        component={ConsumedProductsScreen}
        options={{ title: '소진 처리된 상품', headerShown: false }}
      />
      <Stack.Screen 
        name="ConsumedProductDetail" 
        component={ConsumedProductDetailScreen} 
        options={{ title: '소진 상품 상세', headerShown: false }}
      />
      {/* 상점은 프로필 스택이 아닌 루트 모달로 표시되므로 여기서 제거 */}
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={({ route }) => ({
          title: '제품 상세',
          headerShown: route.params?.hideHeader === true ? false : true
        })}
      />
    </Stack.Navigator>
  );
};

// 메인 탭 네비게이터만 구성하는 컴포넌트
const MainTabs = ({ linking }) => {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const dispatch = useDispatch();
  const tutorial = useSelector((state) => state.tutorial);
  const locationsTabRef = useRef(null);
  const [locationsTabRect, setLocationsTabRect] = useState(null);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('navigation-state');
        
        if (savedStateString) {
          const state = JSON.parse(savedStateString);
          setInitialState(state);
        }
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  const blockerActive = !!(tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_TAB);

  const measureLocationsTab = () => {
    try {
      const node = locationsTabRef.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setLocationsTabRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (!isReady) return;
    if (!blockerActive) return;
    const t = setTimeout(() => measureLocationsTab(), 0);
    return () => clearTimeout(t);
  }, [blockerActive, isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Locations') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarButton: (props) => {
          // 기본 tabBarButton을 유지하면서, "내 카테고리" 탭의 위치를 측정하기 위해 ref만 부착
          // (튜토리얼 단계에서 해당 영역만 클릭 가능하게 마스킹)
          const isLocations = route.name === 'Locations';
          const {
            children,
            onPress,
            onLongPress,
            accessibilityState,
            style,
            ...rest
          } = props || {};
          return (
            <TouchableOpacity
              {...rest}
              accessibilityState={accessibilityState}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.85}
              style={style}
              collapsable={false}
              onLayout={() => {
                if (isLocations) measureLocationsTab();
              }}
              ref={isLocations ? locationsTabRef : undefined}
            >
              {children}
            </TouchableOpacity>
          );
        },
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          // ✅ 튜토리얼 탭 강제: 단계에 따라 허용되는 탭만 클릭 가능
          if (tutorial?.active) {
            const step = tutorial?.step;
            // 1) PROFILE_INTRO 단계: Profile만 허용
            if (step === TUTORIAL_STEPS.PROFILE_INTRO) {
              if (route.name !== 'Profile') {
                e.preventDefault();
                return;
              }
            }

            // 2) WAIT_LOCATIONS_TAB 단계: Locations 탭을 "직접 눌러" 다음 단계로 넘어가야 함
            if (step === TUTORIAL_STEPS.WAIT_LOCATIONS_TAB) {
              if (route.name !== 'Locations') {
                e.preventDefault();
                return;
              }
              // Locations 탭은 허용 (아래에서 step advance)
            } else {
              // 3) 그 외 모든 튜토리얼 단계(+) / 템플릿 선택 / 이름 작성 / 저장 등에서는
              //    하단 탭을 눌러 화면이 바뀌는 것을 전부 차단
              e.preventDefault();
              return;
            }
          }

          if (route.name === 'Locations' && navigation.isFocused()) {
            e.preventDefault();
            navigation.navigate('Locations', { screen: 'LocationsScreen' });
          }

          // 튜토리얼: 사용자가 Locations 탭을 직접 눌렀을 때 다음 단계로
          if (tutorial?.active && tutorial?.step === TUTORIAL_STEPS.WAIT_LOCATIONS_TAB && route.name === 'Locations') {
            try { dispatch(setTutorialStep({ step: TUTORIAL_STEPS.WAIT_LOCATIONS_PLUS })); } catch (err) {}
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: '홈' }} />
      <Tab.Screen name="Locations" component={LocationsStack} options={{ title: '내 카테고리' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: '프로필' }} />
      </Tab.Navigator>

      <TutorialTouchBlocker
        active={blockerActive}
        holeRect={locationsTabRect}
        hideUntilHole={true}
        // 하단 탭 영역을 가리지 않도록 메시지를 탭(hole) 근처 위쪽에 배치
        messagePlacement={'near'}
        messagePlacementPreference={'above'}
        showActionLabel={false}
        message={'하단의 “내 카테고리” 탭을 눌러서\n튜토리얼을 계속 진행해주세요.'}
      />
    </View>
  );
};

// 루트 네비게이터: Login을 탭 위에 완전히 덮는 모달로 표시
const AppNavigator = ({ linking }) => {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const dispatch = useDispatch();
  const tutorial = useSelector((state) => state.tutorial);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('navigation-state');
        if (savedStateString) {
          const state = JSON.parse(savedStateString);
          setInitialState(state);
        }
      } finally {
        setIsReady(true);
      }
    };
    if (!isReady) restoreState();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      {/* 탭바가 바닥에서 떠 보이는 현상 방지: 전체 SafeArea를 bottom까지 적용하지 않음 */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          initialState={initialState}
          onStateChange={(state) => {
            AsyncStorage.setItem('navigation-state', JSON.stringify(state));

            // ✅ 튜토리얼 도중 "어떤 사유로든 흐름에서 벗어나면" -> 튜토리얼은 끝난 것으로 처리
            // - 서버/로컬에 저장하지 않기 때문에, 이 세션에서는 재시작만 막으면 됨(DONE으로 종료)
            try {
              if (!tutorial?.active) return;
              if (tutorial?.step === TUTORIAL_STEPS.DONE) return;

              const deepest = getDeepestRoute(state);
              const currentName = deepest?.name ? String(deepest.name) : '';
              const currentParams = deepest?.params || {};

              // 튜토리얼이 의도하는 화면 집합 밖으로 나가면 즉시 종료
              const tutorialScreens = new Set([
                'ProfileScreen',
                'LocationsScreen',
                'AddLocation',
                'LocationDetail',
                'ProductDetail',
              ]);
              if (!tutorialScreens.has(currentName)) {
                dispatch(completeTutorial());
                return;
              }

              // AddLocation / ProductDetail 은 tutorial param이 빠지면 "나간 것"으로 간주
              if ((currentName === 'AddLocation' || currentName === 'ProductDetail') && currentParams?.tutorial !== true) {
                dispatch(completeTutorial());
                return;
              }
            } catch (e) {}
          }}
        >
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="MainTabs" children={() => <MainTabs linking={linking} />} />
            <RootStack.Screen name="RootLogin" component={LoginScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <RootStack.Screen name="RootHelp" component={HelpScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen name="PaymentWebView" component={PaymentWebViewScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen name="ContentWebView" component={ContentWebViewScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen name="ExternalWebView" component={ExternalWebViewScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen name="PrivacyPolicyWebView" component={PrivacyPolicyWebViewScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen name="Store" component={StoreScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
            <RootStack.Screen
              name="RootMyNotificationDetail"
              component={MyNotificationDetailScreen}
              options={{ presentation: 'modal', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="RootLocationDetail"
              component={RootLocationDetailStack}
              options={{ presentation: 'modal', animation: 'slide_from_right' }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default AppNavigator; 