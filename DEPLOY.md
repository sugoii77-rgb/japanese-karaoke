# 🚀 배포 가이드 (sugoii77-rgb)

## 로컬에서 실행하기 (먼저 테스트!)

```bash
cd japanese-karaoke
npm install
npm run dev
```

브라우저에서 http://localhost:3000 열기

---

## GitHub + Vercel 배포

### 1단계: GitHub에 저장소 만들기

1. https://github.com/new 접속
2. Repository name: `mai-japanese-karaoke`
3. Private 선택 (선물 비밀 유지!)
4. "Create repository" 클릭

### 2단계: 코드 업로드

```bash
cd japanese-karaoke
git init
git add .
git commit -m "🎌 마이의 일본어 카라오케 앱"
git branch -M main
git remote add origin https://github.com/sugoii77-rgb/mai-japanese-karaoke.git
git push -u origin main
```

### 3단계: Vercel 배포

1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" → `mai-japanese-karaoke` 선택
3. Framework: Next.js (자동 감지)
4. "Deploy" 클릭
5. 완료! URL 복사해서 선물 🎁

---

배포 URL 예시: https://mai-japanese-karaoke.vercel.app
