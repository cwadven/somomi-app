import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';
import NotificationDateScreen from '../screens/NotificationDateScreen';
import MyNotificationsScreen from '../screens/MyNotificationsScreen';
import StoreScreen from '../screens/StoreScreen';
import LoginScreen from '../screens/LoginScreen';
import HelpScreen from '../screens/HelpScreen';
// 결제 결과 딥링크 스크린 제거
import PaymentWebViewScreen from '../screens/PaymentWebViewScreen';
import ContentWebViewScreen from '../screens/ContentWebViewScreen';
import ExternalWebViewScreen from '../screens/ExternalWebViewScreen';
import PrivacyPolicyWebViewScreen from '../screens/PrivacyPolicyWebViewScreen';

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
        name="ConsumedProducts" 
        component={ConsumedProductsScreen} 
        options={{ title: '소진 처리된 상품', headerShown: false }}
      />
      <Stack.Screen 
        name="ConsumedProductDetail" 
        component={ConsumedProductDetailScreen} 
        options={{ title: '소진 상품 상세', headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: '알림 목록', headerShown: false }}
      />
      <Stack.Screen 
        name="NotificationDate" 
        component={NotificationDateScreen} 
        options={{ title: '날짜별 알림', headerShown: false }}
      />
      <Stack.Screen 
        name="NotificationDetail" 
        component={NotificationDetailScreen} 
        options={({ route }) => ({
          title: '알림 상세',
          headerShown: false
        })}
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

  if (!isReady) {
    return null;
  }

  return (
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
        headerShown: false
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          if (route.name === 'Locations' && navigation.isFocused()) {
            e.preventDefault();
            navigation.navigate('Locations', { screen: 'LocationsScreen' });
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: '홈' }} />
      <Tab.Screen name="Locations" component={LocationsStack} options={{ title: '내 카테고리' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: '프로필' }} />
    </Tab.Navigator>
  );
};

// 루트 네비게이터: Login을 탭 위에 완전히 덮는 모달로 표시
const AppNavigator = ({ linking }) => {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();

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
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default AppNavigator; 