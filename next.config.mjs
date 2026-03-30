/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: [
		'@napi-rs/canvas',
		'@napi-rs/canvas-linux-x64-gnu',
		'@napi-rs/canvas-linux-x64-musl',
	],
};

export default nextConfig;
