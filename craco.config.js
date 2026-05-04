module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        https: false,
      };
      // Tell webpack that node: scheme resolves to false (browser build)
      config.plugins = config.plugins || [];
      const NormalModuleReplacementPlugin = require("webpack").NormalModuleReplacementPlugin;
      config.plugins.push(
        new NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      return config;
    },
  },
};
