import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
};
export default nextConfig;
