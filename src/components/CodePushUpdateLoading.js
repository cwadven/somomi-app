import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import SplashImage from '../../assets/splash.png';

const CodePushUpdateLoading = ({ error }) => {
  return (
    <View style={styles.container}>
      <Image source={SplashImage} style={styles.splash} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefbf2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splash: {
    width: '80%',
    height: '80%',
  },
  spinner: {
    marginTop: 16,
  },
});

export default CodePushUpdateLoading; 