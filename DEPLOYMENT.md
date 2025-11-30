# Vercel 배포 가이드

## 현재 문제
Vercel 배포 시 404 에러 발생

## 해결 방법

### 옵션 1: 클라이언트만 배포 (권장)
Vercel은 정적 사이트 호스팅에 최적화되어 있습니다. API는 별도 플랫폼에 배포하는 것을 권장합니다.

**클라이언트 배포:**
1. Vercel에서 `client` 디렉토리를 루트로 설정
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Install Command: `npm install`

**API 배포 (별도):**
- Render, Railway, Fly.io 등에 `server` 디렉토리 배포
- 환경변수로 API URL 설정

**클라이언트 환경변수 설정:**
```javascript
// client/src/App.jsx에서
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

### 옵션 2: 통합 배포 (복잡)
현재 생성된 `vercel.json` 사용

**주의사항:**
- Vercel Functions는 서버리스이므로 파일 업로드/저장이 제한됨
- `store.js`의 파일 기반 저장소는 작동하지 않음
- 데이터베이스(MongoDB, PostgreSQL 등) 필요

## 권장 사항
1. **클라이언트**: Vercel에 배포
2. **서버**: Render 또는 Railway에 배포
3. **데이터**: 클라우드 데이터베이스 사용

## 다음 단계
어떤 방식으로 배포하시겠습니까?
