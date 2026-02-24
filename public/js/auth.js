// 인증 모듈 - Google 로그인 및 사용자 라우팅
const Auth = (() => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // 공용 PC 대비: 매번 계정 선택 팝업 강제 표시
    provider.setCustomParameters({ prompt: 'select_account' });

    // Google 로그인
    async function signIn() {
        try {
            await auth.signInWithPopup(provider);
        } catch (e) {
            console.error('로그인 오류:', e);
            alert('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }

    // 로그아웃
    async function signOut() {
        await auth.signOut();
        window.location.href = '/index.html';
    }

    // 하드코딩 관리자 이메일 목록 (로그인 없이도 즉시 적용)
    const ADMIN_EMAILS = [
        'kdevelop1592@gmail.com',
    ];

    // 관리자 여부 확인 (이메일 하드코딩 우선, Firestore admins 컬렉션 병행)
    async function isAdmin(uid) {
        // 현재 로그인한 유저의 이메일로 먼저 체크
        const currentUser = auth.currentUser;
        if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
            return true;
        }
        // Firestore admins 컬렉션 체크 (fallback)
        try {
            const snap = await db.collection('admins').doc(uid).get();
            return snap.exists;
        } catch {
            return false;
        }
    }

    // 신규 사용자 여부 확인
    async function checkProfile(uid) {
        const snap = await db.collection('users').doc(uid).get();
        if (!snap.exists || !snap.data().profileComplete) {
            return false;
        }
        return true;
    }

    // 인증 상태 변화 감지 및 페이지 라우팅
    function initAuthListener(options = {}) {
        const {
            onLogin,
            onLogout,
            requireAuth = false,
            requireAdmin = false,
        } = options;

        auth.onAuthStateChanged(async (user) => {
            if (user) {
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

    return { signIn, signOut, isAdmin, checkProfile, initAuthListener };
})();
