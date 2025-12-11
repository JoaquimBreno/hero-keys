/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignorar módulos nativos que não devem ser incluídos no bundle do cliente
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      child_process: false,
      'fsevents': false,
    };

    // Ignorar arquivos .node (módulos nativos binários)
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });

    // Para o cliente, marcar módulos problemáticos como externos
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'fsevents': 'commonjs fsevents',
        'chokidar': 'commonjs chokidar',
      });
    }

    // Ignorar warnings sobre módulos nativos
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/fsevents/,
      },
      {
        module: /node_modules\/chokidar/,
      },
      {
        message: /fsevents/,
      },
    ];

    return config;
  },
  
  // Garantir que pacotes problemáticos sejam tratados como server-only
  serverExternalPackages: ['moises', 'fsevents', 'chokidar'],
  
  // Experimental: melhorar tratamento de módulos nativos
  experimental: {
    serverComponentsExternalPackages: ['moises', 'fsevents', 'chokidar'],
  },
};

export default nextConfig;

