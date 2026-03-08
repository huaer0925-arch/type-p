// 기록 저장 및 조회 모듈
const Records = (() => {

    // 연습 기록 저장
    async function save(uid, profile, result) {
        const record = {
            uid,
            className: profile.className,
            grade: profile.grade,
            name: profile.name,
            mode: result.mode,       // 'word' | 'sentence' | 'paragraph'
            lang: result.lang,       // 'ko' | 'en'
            wpm: result.wpm,
            cpm: result.cpm,
            accuracy: result.accuracy,
            duration: result.duration,
            keystrokes: result.keystrokes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('users').doc(uid).collection('records').add(record);

        // 사용자 누적 통계 업데이트
        await db.collection('users').doc(uid).update({
            totalKeystrokes: firebase.firestore.FieldValue.increment(result.keystrokes),
        });

        return record;
    }

    // 개인 기록 최근 N개 조회 (연습 + 버블슈터 통합)
    async function getMyRecords(uid, limit = 50) {
        // 1. 일반 연습 기록 가져오기
        const recordsSnap = await db.collection('users').doc(uid)
            .collection('records')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. 버블 슈터 기록 가져오기
        const bubbleSnap = await db.collection('users').doc(uid)
            .collection('bubbleRecords')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        // 버블 슈터 기록 정규화 (일반 기록 형식과 맞춤)
        const bubbleRecords = bubbleSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                mode: 'bubble',            // 모드 명시
                wpm: data.wpmAvg || 0,     // 평균 타수를 wpm으로 매핑
                accuracy: data.accuracy || 0,
                duration: data.duration || 0,
                lang: data.lang || 'ko',
            };
        });

        // 3. 통합 및 정렬
        const all = [...records, ...bubbleRecords]
            .sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
                return timeB - timeA;
            });

        return all.slice(0, limit);
    }

    // 학반 랭킹 (상위 5명, WPM 최고 기록)
    async function getClassRanking(className) {
        // 해당 학반의 모든 users 가져와서 최고 WPM 기준 정렬
        const usersSnap = await db.collection('users')
            .where('className', '==', className)
            .where('profileComplete', '==', true)
            .get();

        const rankings = [];
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            // 해당 학생의 최고 WPM 기록 조회
            const recSnap = await db.collection('users').doc(doc.id)
                .collection('records')
                .orderBy('wpm', 'desc')
                .limit(1)
                .get();

            const bestWpm = recSnap.empty ? 0 : recSnap.docs[0].data().wpm;
            rankings.push({
                uid: doc.id,
                name: data.name,
                className: data.className,
                bestWpm,
                level: data.level || 1,
            });
        }

        return rankings
            .sort((a, b) => b.bestWpm - a.bestWpm)
            .slice(0, 5);
    }

    // 학년 랭킹 (상위 25명)
    async function getGradeRanking(grade) {
        const usersSnap = await db.collection('users')
            .where('grade', '==', grade)
            .where('profileComplete', '==', true)
            .get();

        const rankings = [];
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const recSnap = await db.collection('users').doc(doc.id)
                .collection('records')
                .orderBy('wpm', 'desc')
                .limit(1)
                .get();

            const bestWpm = recSnap.empty ? 0 : recSnap.docs[0].data().wpm;
            rankings.push({
                uid: doc.id,
                name: data.name,
                className: data.className,
                bestWpm,
                level: data.level || 1,
            });
        }

        return rankings
            .sort((a, b) => b.bestWpm - a.bestWpm)
            .slice(0, 25);
    }

    // 관리자: 전체 학생 기록 목록
    async function getAllUsers() {
        const snap = await db.collection('users')
            .where('profileComplete', '==', true)
            .get();
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // 클라이언트에서 정렬 (Firestore 인덱스 오류 방지)
        return users.sort((a, b) => (a.className || '').localeCompare(b.className || ''));
    }

    // 관리자: 특정 학생 기록 조회
    async function getUserRecords(uid) {
        const snap = await db.collection('users').doc(uid)
            .collection('records')
            .orderBy('createdAt', 'desc')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 랭킹/게임 설정 읽기
    async function getRankingSettings() {
        try {
            // 캐시 대신 서버에서 최신 데이터 강제 로드
            const snap = await db.collection('settings').doc('ranking').get({ source: 'server' });
            if (!snap.exists) {
                console.log('설정 문서 없음, 기본값 사용');
                return { classRankingEnabled: true, gradeRankingEnabled: true, specialBubbleProb: 0.07 };
            }
            const data = snap.data();
            console.log('설정 로드됨:', data);
            return data;
        } catch (e) {
            console.error('설정 로드 실패(서버), 캐시 시도:', e);
            const snap = await db.collection('settings').doc('ranking').get();
            return snap.exists ? snap.data() : { classRankingEnabled: true, gradeRankingEnabled: true, specialBubbleProb: 0.07 };
        }
    }

    // 랭킹/게임 설정 저장 (관리자 전용)
    async function setRankingSettings(settings) {
        console.log('설정 저장 시도:', settings);
        await db.collection('settings').doc('ranking').set(settings, { merge: true });
        console.log('설정 저장 완료');
    }

    // 키보드 손가락 위치 설정 읽기
    async function getKeyboardSettings() {
        try {
            const snap = await db.collection('settings').doc('keyboard').get();
            return snap.exists ? snap.data() : null;
        } catch (e) {
            console.error('키보드 설정 로드 실패:', e);
            return null;
        }
    }

    // 키보드 손가락 위치 설정 저장 (관리자 전용)
    async function setKeyboardSettings(settings) {
        console.log('키보드 설정 저장 시도:', settings);
        await db.collection('settings').doc('keyboard').set(settings);
    }

    // 관리자: 특정 학생 버블슈터 기록 조회
    async function getBubbleRecords(uid) {
        const snap = await db.collection('users').doc(uid)
            .collection('bubbleRecords')
            .orderBy('createdAt', 'desc')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 사이트 제목/로고 설정 읽기
    async function getSiteSettings() {
        try {
            const snap = await db.collection('settings').doc('site').get();
            if (!snap.exists) return { title: '우리학교 타자마스터', subtitle: '우리학교 타자 연습 플랫폼', logoUrl: '' };
            return { title: '우리학교 타자마스터', subtitle: '우리학교 타자 연습 플랫폼', logoUrl: '', ...snap.data() };
        } catch (e) {
            console.error('사이트 설정 로드 실패:', e);
            return { title: '우리학교 타자마스터', subtitle: '우리학교 타자 연습 플랫폼', logoUrl: '' };
        }
    }

    // 사이트 제목/로고 설정 저장 (관리자 전용)
    async function setSiteSettings(data) {
        await db.collection('settings').doc('site').set(data, { merge: true });
    }

    return {
        save, getMyRecords,
        getClassRanking, getGradeRanking,
        getAllUsers, getUserRecords, getBubbleRecords,
        getRankingSettings, setRankingSettings,
        getKeyboardSettings, setKeyboardSettings,
        getSiteSettings, setSiteSettings
    };
})();

