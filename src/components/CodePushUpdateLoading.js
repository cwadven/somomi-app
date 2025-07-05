import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CodePushUpdateLoading = ({ error }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-download-outline" size={48} color="#4CAF50" />
        <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
        <Text style={styles.text}>업데이트를 설치하고 있습니다</Text>
        <Text style={styles.subText}>잠시만 기다려주세요...</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#f44336',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default CodePushUpdateLoading; 