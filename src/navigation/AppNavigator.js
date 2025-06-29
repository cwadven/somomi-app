import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

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
    <Stack.Navigator>
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
    <Stack.Navigator>
      <Stack.Screen 
        name="LocationsScreen" 
        component={LocationsScreen} 
        options={{ title: '영역 목록', headerShown: false }}
      />
      <Stack.Screen 
        name="LocationDetail" 
        component={LocationDetailScreen} 
        options={({ route }) => ({ 
          title: route.params.locationId === 'all' ? '모든 제품' : '영역 상세' 
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
    <Stack.Navigator>
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
const AppNavigator = () => {
  return (
    <NavigationContainer>
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
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack} 
          options={{ headerShown: false, title: '홈' }}
        />
        <Tab.Screen 
          name="Locations" 
          component={LocationsStack} 
          options={{ headerShown: false, title: '내 영역' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileStack} 
          options={{ headerShown: false, title: '프로필' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 