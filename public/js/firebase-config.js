// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBCTQl16_-duMf0aOyR5rd_QZXWhBTZYBw",
  authDomain: "type-p-2aa36.firebaseapp.com",
  projectId: "type-p-2aa36",
  storageBucket: "type-p-2aa36.firebasestorage.app",
  messagingSenderId: "137203688372",
  appId: "1:137203688372:web:68a75b4a477807007f88e1",
  measurementId: "G-ZFELE1JC2T"
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
const ADMIN_EMAIL = 'huaer0925@gmail.com';
