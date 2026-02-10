import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config, { webpack }) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: { icon: true },
        },
      ],
    });

    // Workaround: the weather widget imports global CSS inside JS.
    // Alias that CSS import to an empty file to avoid HMR issues,
    // while we load the real CSS globally from app/layout.tsx.
    config.resolve = config.resolve || {} as any;
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
    };

    // Replace the widget's internal CSS import with an empty file only when
    // the import originates from the widget's components folder.
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\.\/styles\/styles\.css$/,
        (resource: any) => {
          if (
            resource.context &&
            /@daniel-szulc[\\/]react-weather-widget[\\/]dist[\\/]components/.test(
              resource.context
            )
          ) {
            resource.request = path.resolve(
              __dirname,
              "src/styles/weather-widget-empty.css"
            );
          }
        }
      )
    );
    return config;
  },
};

export default nextConfig;
