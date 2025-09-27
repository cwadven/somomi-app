import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { loginUser } from '../redux/slices/authSlice';

const BasicLoginForm = ({ onLoginStart, onLoginComplete, onLoginError }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleBasicLogin = async () => {
    try {
      setLoading(true);
      setError('');
      if (onLoginStart) onLoginStart();
      // 간단한 이메일 형식 검증
      if (!email || !email.includes('@')) {
        setError('유효한 이메일을 입력하세요.');
        return;
      }
      const derivedUsername = (email && email.includes('@')) ? email.split('@')[0] : '사용자';
      const creds = { username: derivedUsername, email: email || 'user@example.com', password };
      await dispatch(loginUser(creds)).unwrap();
      if (onLoginComplete) onLoginComplete();
    } catch (error) {
      setError(error?.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formBox}>
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
      <TouchableOpacity style={styles.primaryBtn} onPress={handleBasicLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>로그인</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  formBox: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  input: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#F44336',
    marginTop: 2,
    marginBottom: 8,
  },
});

export default BasicLoginForm;


