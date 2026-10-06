/** Site statique : `npm run build` produit le dossier `out/` (Netlify, Vercel, GitHub Pages). */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
