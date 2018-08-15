import {IPlaylist} from "./IPlaylist";

export interface IPlaylistCollection {
	name: string;
	playlist: IPlaylist;
	playlistNodes: IPlaylistCollection[];
	nodes: number
}