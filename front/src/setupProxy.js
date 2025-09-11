// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware'); //프록시 미들웨어 불러온다.
// CRA dev server가 실행될 때 미들웨어 등록
module.exports = function(app) {
    // /api → 백엔드 서버
    app.use(
        '/api', // ['/api', '/auth', '/files'] 여러개 매핑명 사용
        createProxyMiddleware({
            target: 'http://localhost:8080', // 실제 백엔드 서버 주소
            changeOrigin: true // 브라우저 CORS 우회
        })
    );
};