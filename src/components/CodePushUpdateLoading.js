import { View, StyleSheet, Image, ActivityIndicator, Text } from 'react-native';
import SplashImage from '../../assets/splash.png';

const CodePushUpdateLoading = ({ error, message, progressText }) => {
  return (
    <View style={styles.container}>
      <Image source={SplashImage} style={styles.splash} resizeMode="contain" />
      <ActivityIndicator style={styles.spinner} />
      {progressText ? <Text style={styles.progressText}>{progressText}</Text> : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{String(error)}</Text> : null}
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
    marginTop: 12,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  messageText: {
    marginTop: 6,
    fontSize: 13,
    color: '#333',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default CodePushUpdateLoading; 