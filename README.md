# ONE PICK 원픽마케팅 홈페이지

- `index.html` — 원페이지 모션 홈페이지
- `diagnose.html` — 무료 홈페이지 진단 (SEO 기본 + AI 인용 준비도)
- `api/seo-check.js` — 진단용 Vercel 서버리스 함수 (주소의 HTML·robots.txt·sitemap.xml 확인)

Vercel에 Import하면 별도 빌드 설정 없이 정적 사이트 + `/api` 함수로 배포됩니다.
도메인이 정해지면 `sitemap.xml`을 추가하고 `robots.txt`에 Sitemap 줄을 넣으세요.
