// 인증 모듈 - Google 로그인 및 사용자 라우팅
const Auth = (() => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // 매번 계정 선택 팝업 표시 (prompt:'login'은 재로그인 시 팝업이 막히는 문제 있음)
    provider.setCustomParameters({ prompt: 'select_account' });

    // 공용 PC 대비: 로그인 페이지를 정상 경유했는지 추적
    const FRESH_KEY = 'gtp_fresh';

    // Google 로그인
    async function signIn() {
        try {
            await auth.signInWithPopup(provider);
        } catch (e) {
            if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
            console.error('로그인 오류:', e);
            alert('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }

    // 로그아웃 (플래그 초기화 → Firebase 로그아웃 → Google 계정도 로그아웃)
    async function signOut() {
        sessionStorage.removeItem(FRESH_KEY);
        await auth.signOut();
        // Google 계정 세션도 완전히 종료하여 다음 사용자가 비밀번호를 직접 입력하게 함
        const returnUrl = encodeURIComponent(window.location.origin + '/index.html');
        window.location.href = 'https://accounts.google.com/Logout?continue=' + returnUrl;
    }

    // 관리자 이메일 하드코딩
    const ADMIN_EMAILS = ['leeshouxuan@gmail.com'];

    // 관리자 여부 확인
    async function isAdmin(uid) {
        const u = auth.currentUser;
        if (u && ADMIN_EMAILS.includes(u.email)) return true;
        try {
            const snap = await db.collection('admins').doc(uid).get();
            return snap.exists;
        } catch { return false; }
    }

    // 신규 사용자 여부 확인
    async function checkProfile(uid) {
        const snap = await db.collection('users').doc(uid).get();
        return snap.exists && snap.data().profileComplete === true;
    }

    // 인증 상태 감지 및 라우팅
    function initAuthListener(options = {}) {
        const { onLogin, onLogout, requireAuth = false, requireAdmin = false } = options;

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // requireAuth 페이지에서 fresh 로그인 플래그가 없으면 강제 로그아웃
                if (requireAuth && sessionStorage.getItem(FRESH_KEY) !== '1') {
                    sessionStorage.removeItem(FRESH_KEY);
                    await auth.signOut();
                    window.location.href = '/index.html';
                    return;
                }

                const admin = await isAdmin(user.uid);

                if (requireAdmin && !admin) {
                    alert('관리자만 접근할 수 있습니다.');
                    window.location.href = '/app.html';
                    return;
                }

                if (onLogin) onLogin(user, admin);
            } else {
                if (requireAuth) {
                    window.location.href = '/index.html';
                    return;
                }
                if (onLogout) onLogout();
            }
        });
    }

    // 로그인 성공 플래그 세팅
    function markFreshLogin() { sessionStorage.setItem(FRESH_KEY, '1'); }

    // 로그인 플래그 초기화
    function clearFreshLogin() { sessionStorage.removeItem(FRESH_KEY); }

    return { signIn, signOut, isAdmin, checkProfile, initAuthListener, markFreshLogin, clearFreshLogin };
})();
