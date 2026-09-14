const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const { join } = require('path');

const plugins = [
  new NxAppWebpackPlugin({
    target: 'node',
    compiler: 'tsc',
    main: './src/main.ts',
    tsConfig: './tsconfig.app.json',
    assets: ['./src/assets'],
    optimization: false,
    outputHashing: 'none',
    generatePackageJson: true,
    sourceMap: true,
  }),
];

// Upload only when auth is present (Railway production build). Skip local/CI.
if (process.env.SENTRY_AUTH_TOKEN?.trim()) {
  const release =
    process.env.SENTRY_RELEASE?.trim() ||
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  plugins.push(
    sentryWebpackPlugin({
      org: process.env.SENTRY_ORG?.trim(),
      project: process.env.SENTRY_PROJECT?.trim() || 'baza-api',
      authToken: process.env.SENTRY_AUTH_TOKEN.trim(),
      ...(release ? { release: { name: release } } : {}),
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/apps/baza-api/**/*.map'],
      },
      telemetry: false,
    })
  );
}

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/baza-api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins,
};
