import { IDeviceController } from "../../IDeviceController";
import { ITrack } from "./ITrack";
import { Base64Image } from "../../../Models/Base64Image";
import { IPlaylistCollection } from "./IPlaylistCollection";

export interface IiTunesService extends IDeviceController {
    getCurrentTrack(): Promise<ITrack>;
    getCurrentTrackCover(): Promise<Base64Image>;
    getCurrentPlayerState(): Promise<boolean>;
    getCurrentPlayerVolume(): Promise<number>;
    togglePlayPause(): Promise<boolean>;
    toggleMuteUnmute(): Promise<boolean>;
    previousTrack(): Promise<ITrack>;
    skipTrack(): Promise<ITrack>;

    getPlayListsForFolder(folder: string): Promise<IPlaylistCollection>;
    getPlayListCover(folder: string, playlistIndex: number): Promise<Base64Image>;
    playPlayList(folder: string, playListIndex: number): Promise<ITrack>;
    getIsMuteState(): Promise<boolean>
}