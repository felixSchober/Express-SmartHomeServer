declare module 'base64-img' {
	export function base64(filename: string, callback: (err: any, data: any) => void): void;
	export function base64Sync(filename: string): string;

	export function requestBase64(url: string, callback: (err: any, res: any, body: any) => void): void;


	export function img(data: string, destpath: string, name: string, callback: (err: any, filepath: string) => void): void;
	export function imgSync(data: string, destpath: string, name: string): string;
}