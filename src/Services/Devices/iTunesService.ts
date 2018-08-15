import {IiTunesService} from "../../Interfaces/Devices/iTunes/IiTunesService";
import {ITrack} from "../../Interfaces/Devices/iTunes/ITrack";
import {Base64Image} from "../../Models/Base64Image";
import {IRequestResponse} from "../../Interfaces/IRequestResponse";
import {Options} from "request";
import {Helpers} from "../../Helpers";
import {IBooleanResponse} from "../../Interfaces/Devices/iTunes/IBooleanResponse";
import {IIntegerResponse} from "../../Interfaces/Devices/iTunes/IIntegerResponse";
import {IPlaylistCollection} from "../../Interfaces/Devices/iTunes/IPlaylistCollection";
import * as base64Converter from "base64-img";

export class iTunesService implements IiTunesService {

	private static serverUrl = 'http://localhost:5000/api/';

	static doiTunesPostRequest(path: string, body: any): Promise<IRequestResponse> {
		const options: Options = {
			uri: iTunesService.serverUrl + path,
			method: 'POST',
			json: body
		};
		return Helpers.performRequest(options, '[iTunes]', false, true);
	}

	static doiTunesGetRequest(path: string): Promise<IRequestResponse> {
		const options: Options = {
			uri: 'http://localhost:5000/api/' + path,
			method: 'GET'
		};
		return Helpers.performRequest(options, '[iTunes]', false, true);
	}

	getCurrentPlayerState(): Promise<boolean> {
		const path = 'player/state/playPause';
		return new Promise<boolean>((resolve, reject) => {
			iTunesService.doiTunesGetRequest(path)
				.then(response => {
					const result = response.data as IBooleanResponse;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result.data);
					}
				})
				.catch(error => {
					console.log('[iTunes] getCurrentPlayerState() - Could not get state from server: ' + JSON.stringify(error));
					reject('[iTunes] getCurrentPlayerState() - Could not get state from server: ' + JSON.stringify(error));
				});
		});
	}

	getCurrentPlayerVolume(): Promise<number> {
		const path = 'player/state/volume';
		return new Promise<number>((resolve, reject) => {
			iTunesService.doiTunesGetRequest(path)
				.then(response => {
					const result = response.data as IIntegerResponse;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result.data);
					}
				})
				.catch(error => {
					console.log('[iTunes] getCurrentPlayerVolume() - Could not get state from server: ' + JSON.stringify(error));
					reject('[iTunes] getCurrentPlayerVolume() - Could not get state from server: ' + JSON.stringify(error));
				});
		});
	}

	getCurrentTrack(): Promise<ITrack> {
		const path = 'currentTrack';
		return new Promise<ITrack>((resolve, reject) => {
			iTunesService.doiTunesGetRequest(path)
				.then(response => {
					const result = response.data as ITrack;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result);
					}
				})
				.catch(error => {
					console.log('[iTunes] getCurrentTrack() - Could not get track from server: ' + JSON.stringify(error));
					reject('[iTunes] getCurrentTrack() - Could not get track from server: ' + JSON.stringify(error));
				});
		});
	}

	getCurrentTrackCover(): Promise<Base64Image> {
		const path = iTunesService.serverUrl + 'currentTrack/cover';

		return new Promise<Base64Image>((resolve, reject) => {
			base64Converter.requestBase64(path, (err, res, body) => {
				if (err) {
					const message = `[iTunes] getCurrentTrackCover() - Base64 converter could not get cover. Error: ${JSON.stringify(err)}`;
					console.log(message);
					reject(message);
				} else {
					if (!body) {
						reject('Could not convert to base64 ' + JSON.stringify(res));
					} else {
						resolve(new Base64Image(body));
					}
				}
			});
		});
	}

	getPlayListCover(folder: string, playlistIndex: number): Promise<Base64Image> {
		const path = `${iTunesService.serverUrl}playlist/folder/${folder}/${playlistIndex}/cover`;

		return new Promise<Base64Image>((resolve, reject) => {
			base64Converter.requestBase64(path, (err, res, body) => {
				if (err) {
					const message = `[iTunes] getCurrentTrackCover() - Base64 converter could not get cover. Error: ${JSON.stringify(err)}`;
					console.log(message);
					reject(message);
				} else {
					if (!body) {
						reject('Could not convert to base64 ' + JSON.stringify(res));
					} else {
						resolve(new Base64Image(body));
					}
				}
			});
		});
	}

	getPlayListsForFolder(folder: string): Promise<IPlaylistCollection> {
		const path = 'playlist/folder/' + folder;
		return new Promise<IPlaylistCollection>((resolve, reject) => {
			iTunesService.doiTunesGetRequest(path)
				.then(response => {
					const result = response.data as IPlaylistCollection;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result);
					}
				})
				.catch(error => {
					console.log('[iTunes] getPlayListsForFolder(' + folder + ') - Could not get state from server: ' + JSON.stringify(error));
					reject('[iTunes] getPlayListsForFolder(' + folder + ') - Could not get state from server: ' + JSON.stringify(error));
				});
		});
	}

	playPlayList(folder: string, playListIndex: number): Promise<ITrack> {
		const path = `playlist/folder/${folder}/${playListIndex}/play`;
		return new Promise<ITrack>((resolve, reject) => {
			iTunesService.doiTunesPostRequest(path, {})
				.then( response => {
					const result = response.data as ITrack;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result);
					}
				})
				.catch(error => {
					console.log('[iTunes] playPlayList(' + folder + ', ' + playListIndex + ') - Could not get state from server: ' + JSON.stringify(error));
					reject('[iTunes] playPlayList(' + folder + ', ' + playListIndex + ') - Could not get state from server: ' + JSON.stringify(error));
				});
		});
	}

	togglePlayPause(): Promise<boolean> {
		const path = `player/state/playpause`;
		return new Promise<boolean>((resolve, reject) => {
			iTunesService.doiTunesPostRequest(path, {})
				.then(response => {
					const result = response.data as IBooleanResponse;
					if (!result) {
						reject('Could not transform data to a valid response: ' + JSON.stringify(response.data));
					} else {
						resolve(result.data);
					}
				})
				.catch(error => {
					console.log('[iTunes] togglePlayPause - Could not get state from server: ' + JSON.stringify(error));
					reject('[iTunes] togglePlayPause - Could not get state from server: ' + JSON.stringify(error));
				});
		});
	}

}