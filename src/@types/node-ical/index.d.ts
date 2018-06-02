
declare module 'node-ical' {
	export type Callback = (err: string, data: object) => void;
	export function fromURL(url: string, options: object, callback: Callback): void;
}