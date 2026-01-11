import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { verifyToken } from '../redux/slices/authSlice';
import { sendVerificationToken, verifyVerificationToken, emailSignUp } from '../api/memberApi';
import { saveJwtToken, saveRefreshToken } from '../utils/storageUtils';
import BasicLoginForm from '../components/BasicLoginForm';

const LoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const dispatch = useDispatch();
  const mountedRef = useRef(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      // 기본 검증
      if (!email || !email.includes('@')) {
        setError('유효한 이메일을 입력하세요.');
        return;
      }
      if (!password || password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!otpVerified) {
        setError('이메일 인증을 완료해 주세요.');
        return;
      }
      // 이메일/토큰 기반 회원가입 API 호출
      const res = await emailSignUp({ email, one_time_token: otpCode, password, password2: passwordConfirm });
      const accessToken = res?.access_token ?? res?.data?.access_token;
      const refreshToken = res?.refresh_token ?? res?.data?.refresh_token;
      if (accessToken) {
        await saveJwtToken(accessToken);
        if (refreshToken) await saveRefreshToken(refreshToken);
        try { await dispatch(verifyToken()).unwrap(); } catch (e) {}
      } else {
        setError('토큰 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      // 화면 닫기 전에 로딩 해제(언마운트 후 setState 방지)
      if (mountedRef.current) setLoading(false);
      try {
        if (navigation?.canGoBack?.()) navigation.goBack();
        else navigation.navigate('Profile');
      } catch (e) {}
    } catch (e) {
      setError(e?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (otpLoading || loading) return;
    try {
      setError('');
      setOtpError('');
      if (!email || !email.includes('@')) {
        setError('유효한 이메일을 입력한 후 인증을 요청하세요.');
        return;
      }
      setOtpVerified(false);
      setOtpCode('');
      setOtpLoading(true);
      await sendVerificationToken(email);
      if (mountedRef.current) setOtpRequested(true);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e?.response?.data?.message || e?.message || '인증 메일 전송 중 오류가 발생했습니다.');
      setOtpRequested(false);
    } finally {
      if (mountedRef.current) setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpLoading || loading) return;
    try {
      setError('');
      const onlyDigits = String(otpCode || '').replace(/\D/g, '');
      if (!/^\d{6}$/.test(onlyDigits)) {
        setOtpError('6자리 숫자 인증 코드를 입력하세요.');
        return;
      }
      setOtpLoading(true);
      await verifyVerificationToken(email, onlyDigits);
      if (!mountedRef.current) return;
      setOtpVerified(true);
      setOtpError('');
      setOtpCode(onlyDigits);
    } catch (e) {
      if (!mountedRef.current) return;
      setOtpVerified(false);
      setOtpError(e?.response?.data?.message || e?.message || '인증 코드 검증에 실패했습니다.');
    } finally {
      if (mountedRef.current) setOtpLoading(false);
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
          {/* 닉네임 입력 제거 */}
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={email}
              onChangeText={(t) => { setEmail(t); setOtpRequested(false); setOtpVerified(false); }}
              placeholder="이메일"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.smallBtn} onPress={handleRequestOtp} disabled={loading || otpLoading}>
              {otpLoading
                ? <ActivityIndicator size="small" color="#2E7D32" />
                : <Text style={styles.smallBtnText}>{otpRequested ? '재요청' : '인증 받기'}</Text>}
            </TouchableOpacity>
          </View>
          {/* 인증코드 입력: 이메일 아래로 이동 */}
          {otpRequested && !otpVerified && (
            <View style={[styles.row, { marginTop: 8 }]}> 
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={otpCode}
                onChangeText={(t) => { setOtpCode(t); setOtpError(''); }}
                placeholder="인증 코드(6자리)"
                keyboardType="number-pad"
                maxLength={6}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.smallBtn} onPress={handleVerifyOtp} disabled={loading || otpLoading}>
                {otpLoading
                  ? <ActivityIndicator size="small" color="#2E7D32" />
                  : <Text style={styles.smallBtnText}>확인하기</Text>}
              </TouchableOpacity>
            </View>
          )}
          {!!otpError && (
            <Text style={styles.otpErrorText}>{otpError}</Text>
          )}
          {otpVerified && (
            <Text style={styles.successText}>이메일 인증이 완료되었습니다.</Text>
          )}
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            secureTextEntry={true}
          />
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호 확인"
            secureTextEntry={true}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={loading || otpLoading}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallBtn: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginLeft: 8,
  },
  smallBtnText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 12,
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
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  successText: {
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  otpErrorText: {
    color: '#F44336',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'flex-start',
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


