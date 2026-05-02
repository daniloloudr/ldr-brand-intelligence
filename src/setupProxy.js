const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "https://api.anthropic.com",
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      selfHandleResponse: false,
      on: {
        proxyReq: (proxyReq, req) => {
          proxyReq.setHeader("x-api-key", process.env.REACT_APP_ANTHROPIC_KEY);
          proxyReq.setHeader("anthropic-version", "2023-06-01");
          proxyReq.setHeader("content-type", "application/json");
          proxyReq.setHeader("anthropic-dangerous-direct-browser-access", "true");
        },
        proxyRes: (proxyRes, req, res) => {
          // Passa os headers de SSE sem buffering
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-Accel-Buffering", "no");
        },
      },
    })
  );
};