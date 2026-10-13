/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // `@wagmi/connectors` re-exports Coinbase/Base account connectors whose
    // optional `@x402/*` peer deps are not installed. We don't use them, so
    // alias them away instead of pulling in the whole optional dependency tree.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};

export default nextConfig;
