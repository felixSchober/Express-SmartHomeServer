import {ITrack} from "./ITrack";

export interface IPlaylist {
	songs: number;
	duration: number;
	name: string;
	id: number;
	sourceId: number;
	trackList: ITrack[];
}