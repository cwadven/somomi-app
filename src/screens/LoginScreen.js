import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { registerUser } from '../redux/slices/authSlice';
import BasicLoginForm from '../components/BasicLoginForm';

const LoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      const u = username || (email && email.includes('@') ? email.split('@')[0] : '사용자');
      await dispatch(registerUser({ username: u, email, password })).unwrap();
      navigation.goBack();
    } catch (e) {
      setError(e?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>소모미</Text>
      <Text style={styles.subtitle}>계정으로 로그인하거나 회원가입하세요</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
          <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode === 'signup' && styles.tabActive]} onPress={() => setMode('signup')}>
          <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {mode === 'login' ? (
        <BasicLoginForm onLoginComplete={() => navigation.goBack()} />
      ) : (
        <View style={styles.formBox}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="사용자 이름"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            secureTextEntry={true}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>회원가입</Text>}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>닫기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4CAF50',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: 6,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fafafa',
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#2E7D32',
  },
  formBox: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 8,
    textAlign: 'center',
  },
  closeBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    color: '#666',
  },
});

export default LoginScreen;


