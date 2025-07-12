import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 스크린 임포트
import HomeScreen from '../screens/HomeScreen';
import LocationsScreen from '../screens/LocationsScreen';
import LocationDetailScreen from '../screens/LocationDetailScreen';
import AddLocationScreen from '../screens/AddLocationScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CategoryScreen from '../screens/CategoryScreen';
import ConsumedProductsScreen from '../screens/ConsumedProductsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
        options={{ title: '제품 상세' }}
      />
      <Stack.Screen 
        name="EditProduct" 
        component={EditProductScreen} 
        options={{ title: '제품 수정' }}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ title: '카테고리' }}
      />
    </Stack.Navigator>
  );
};

// 영역 스택 네비게이터
const LocationsStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="LocationsScreen"
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        }
      }}
    >
      <Stack.Screen 
        name="LocationsScreen" 
        component={LocationsScreen} 
        options={{ title: '영역 목록', headerShown: false }}
      />
      <Stack.Screen 
        name="LocationDetail" 
        component={LocationDetailScreen} 
        options={({ route }) => ({ 
          title: route.params.locationId === 'all' ? '모든 제품' : '영역 상세',
          headerShown: false
        })}
      />
      <Stack.Screen 
        name="AddLocation" 
        component={AddLocationScreen} 
        options={{ title: '영역 추가' }}
      />
      <Stack.Screen 
        name="AddProduct" 
        component={AddProductScreen} 
        options={{ title: '제품 등록' }}
      />
      <Stack.Screen 
        name="EditProduct" 
        component={EditProductScreen} 
        options={{ title: '제품 수정' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: '제품 상세' }}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ title: '카테고리' }}
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
        name="ConsumedProducts" 
        component={ConsumedProductsScreen} 
        options={{ title: '소진 처리된 상품' }}
      />
    </Stack.Navigator>
  );
};

// 메인 탭 네비게이터
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

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer
          linking={linking}
          initialState={initialState}
          onStateChange={(state) => {
            AsyncStorage.setItem('navigation-state', JSON.stringify(state));
          }}
        >
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
                // 내 영역 탭을 클릭했을 때 LocationsScreen으로 이동하고 내비게이션 스택 초기화
                if (route.name === 'Locations') {
                  e.preventDefault(); // 기본 동작 방지
                  navigation.navigate('Locations', {
                    screen: 'LocationsScreen'
                  });
                  // 내 영역 스택을 초기화하여 LocationsScreen만 남도록 설정
                  navigation.dispatch(state => {
                    // 현재 라우트 찾기
                    const routes = state.routes.map(r => {
                      if (r.name === 'Locations') {
                        // Locations 스택의 라우트를 LocationsScreen 하나만 남도록 수정
                        return {
                          ...r,
                          state: {
                            ...r.state,
                            routes: [
                              {
                                name: 'LocationsScreen',
                                params: {},
                              },
                            ],
                            index: 0,
                          },
                        };
                      }
                      return r;
                    });
                    
                    return {
                      ...state,
                      routes,
                      index: state.index,
                    };
                  });
                }
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeStack} 
              options={{ title: '홈' }}
            />
            <Tab.Screen 
              name="Locations" 
              component={LocationsStack} 
              options={{ title: '내 영역' }}
            />
            <Tab.Screen 
              name="Profile" 
              component={ProfileStack} 
              options={{ title: '프로필' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default AppNavigator; 