// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBFX6GniaMIkDDDgKzxUPP5S0mtu1UfA4E",
  authDomain: "type-p-3eec8.firebaseapp.com",
  projectId: "type-p-3eec8",
  storageBucket: "type-p-3eec8.firebasestorage.app",
  messagingSenderId: "29245150954",
  appId: "1:29245150954:web:cc936070b76e828f24e993",
  measurementId: "G-NDRDCSXMRQ"
};

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// 서비스 인스턴스 전역 노출
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 공용 PC 대비: 세션 지속성을 SESSION으로 설정
// → 브라우저 탭/창을 닫으면 로그인 상태 자동 소멸 (localStorage에 저장 안 함)
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

// 관리자 이메일
const ADMIN_EMAIL = 'leeshouxuan@gmail.com';
