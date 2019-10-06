<<<<<<< HEAD
import {BaseSocketService} from "./BaseSocketService";
import {IDeviceController} from "../../Interfaces/IDeviceController";
import {ISocketController} from "../../Interfaces/ISocketController";
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";
import {Server, Socket} from "socket.io";
import {ISwitchStateChangeCommand} from "../../Interfaces/ISwitchStateChangeCommand";
import {IiTunesService} from "../../Interfaces/Devices/iTunes/IiTunesService";
import {IPlaylistChangeCommand} from "../../Interfaces/Devices/iTunes/IPlaylistChangeCommand";
import {ITrack} from "../../Interfaces/Devices/iTunes/ITrack";
import {Base64Image} from "../../Models/Base64Image";
import {IPlaylistCollection} from "../../Interfaces/Devices/iTunes/IPlaylistCollection";
import {IPlaylist} from "../../Interfaces/Devices/iTunes/IPlaylist";

export class ITunesSocketService extends BaseSocketService {

	static playlistFolder = 'Dashboard';

	constructor(socketName: string,
				io: Server,
				pollingInterval: number,
				socketMessageIdentifier: string,
				controller: IDeviceController,
				socketController: ISocketController) {
		super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
	}

	addSocketObserver(socket: Socket): void {
		this.sockets.push(socket);

		this.socketController.log(`[Socket] New Observer for topic ${this.socketMessageIdentifier}`, false);
		socket.on(this.socketMessageIdentifier + '_player', (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[iTunes] Received player change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const iTunesController = this.controller as IiTunesService;
			let promise: Promise<boolean>;

			if (command.state === 'toggle') {
				promise = iTunesController.togglePlayPause();
			} else {
				this.socketController.log(`[iTunes] Received state change other than toggle`, false);
				return;
			}

			promise.then((newState: boolean) => {
				this.socketController.log(`[iTunes] Toggle state change successful.`, false);
				this.sendCurrentPlayerState(newState);
			}).catch((err) => this.socketController.log(
				'[iTunes] State change NOT successful. - Error: ' + JSON.stringify(err), true)
			);
		});

		socket.on(this.socketMessageIdentifier + '_playlist', (command: IPlaylistChangeCommand) => {
			if (!command) {
				const logMessage = '[iTunes] Received playlist change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const iTunesController = this.controller as IiTunesService;


			iTunesController.playPlayList(command.folder, command.index)
				.then((newTrack: ITrack) => {
				this.socketController.log(`[iTunes] Play playlist with track ${JSON.stringify(newTrack)}`, false);
				this.sendCurrentTrack(newTrack);
				this.sendCurrentTrackCover(iTunesController);
			}).catch((err) => this.socketController.log(
				'[iTunes] State change NOT successful. - Error: ' + JSON.stringify(err), true)
			);
		});


	}

	sendInitialState(): void {
		this.sendPlaylistCollectionInformation();
		this.sendStateUpdate();
	}

	public sendUpdates = () => {
		this.sendStateUpdate();
	};


	private sendStateUpdate() {
		const iTunesController = this.controller as IiTunesService;

		iTunesController.getCurrentTrack()
			.then(currentTrack => this.sendCurrentTrack(currentTrack))
			.catch(err => this.socketController.log(
				'[iTunes] Could not get current track. - Error: ' + JSON.stringify(err), true));

		this.sendCurrentTrackCover(iTunesController);

		iTunesController.getCurrentPlayerState()
			.then(currentState => this.sendCurrentPlayerState(currentState))
			.catch(err => this.socketController.log(
				'[iTunes] Could not get current state. - Error: ' + JSON.stringify(err), true));

	}

	private sendCurrentPlayerState(state: boolean) {
		this.socketController.send(this.socketMessageIdentifier + '_player', state);
	}

	private sendCurrentTrack(currentTrack: ITrack) {
		this.socketController.send(this.socketMessageIdentifier + '_currentTrack', currentTrack);
	}

	private sendCurrentTrackCover(controller: IiTunesService) {
		controller.getCurrentTrackCover()
			.then((base64Cover: Base64Image) => {
				this.socketController.send(this.socketMessageIdentifier + '_currentTrack_cover', base64Cover.base64ImageRepresentation);
			})
			.catch(err => this.socketController.log(
				'[iTunes] Could not get cover for current track. - Error: ' + JSON.stringify(err), true)
			);
	}

	private sendPlaylistCollectionInformation() {
		const iTunesController = this.controller as IiTunesService;

		console.log('[iTunes] Send playlist info for playlists.');

		// iterate over all playlists in folder dashboard
		iTunesController.getPlayListsForFolder(ITunesSocketService.playlistFolder)
			.then((collection: IPlaylistCollection) => {
				const children = collection.playlistNodes;
				if (collection.nodes === 0 || !children) {
					// Dashboard does not have children playlists
					return;
				}

				// for every playlist, send the cover and name
				for (let i = 0; i < collection.nodes; i++) {
					const playlist = children[i].playlist;
					this.sendPlaylistInformation(playlist, i, iTunesController);
				}
			})
			.catch(err => this.socketController.log(
			'[iTunes] Could not get playlists. - Error: ' + JSON.stringify(err), true)
			);
	}

	private sendPlaylistInformation(playlist: IPlaylist, index: number, controller: IiTunesService) {
		console.log('[iTunes] Send playlist info for playlist ' + playlist.name + '.');

		this.socketController.send(this.socketMessageIdentifier + '_playlist_' + index, playlist);

		// send cover
		controller.getPlayListCover(ITunesSocketService.playlistFolder, index)
			.then((base64Cover: Base64Image) => {
				this.socketController.send(this.socketMessageIdentifier + '_playlist_' + index + '_cover', base64Cover.base64ImageRepresentation);
			})
			.catch(err => this.socketController.log(
			'[iTunes] Could not get cover for playlist ' + index +  '. - Error: ' + JSON.stringify(err), true)
		);
	}
=======
import { BaseSocketService } from "./BaseSocketService";
import { IDeviceController } from "../../Interfaces/IDeviceController";
import { ISocketController } from "../../Interfaces/ISocketController";
import { PollingIntervalRule } from "../../Interfaces/PollingIntervalRule";
import { Server, Socket } from "socket.io";
import { ISwitchStateChangeCommand } from "../../Interfaces/ISwitchStateChangeCommand";
import { IiTunesService } from "../../Interfaces/Devices/iTunes/IiTunesService";
import { IPlaylistChangeCommand } from "../../Interfaces/Devices/iTunes/IPlaylistChangeCommand";
import { ITrack } from "../../Interfaces/Devices/iTunes/ITrack";
import { Base64Image } from "../../Models/Base64Image";
import { IPlaylistCollection } from "../../Interfaces/Devices/iTunes/IPlaylistCollection";
import { IPlaylist } from "../../Interfaces/Devices/iTunes/IPlaylist";

export class ITunesSocketService extends BaseSocketService {

    static playlistFolder = 'Dashboard';

    constructor(socketName: string,
        io: Server,
        pollingInterval: number,
        socketMessageIdentifier: string,
        controller: IDeviceController,
        socketController: ISocketController) {
        super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
    }

    addSocketObserver(socket: Socket): void {
        this.sockets.push(socket);

        this.socketController.log(`[Socket] New Observer for topic ${this.socketMessageIdentifier}`, false);

        // Player commands like play/pause skip/prev
        socket.on(this.socketMessageIdentifier + '_player', (command: ISwitchStateChangeCommand) => {
            if (!command) {
                const logMessage = '[iTunes] Received player change command via socket but message is invalid';
                this.socketController.log(logMessage, false);
                return;
            }

            const iTunesController = this.controller as IiTunesService;

            switch (command.name) {
                case 'state':
                    this.executePlayPauseCommand(command, iTunesController);
                    break;
                case 'mute':
                    this.executeMuteToggleCommand(command, iTunesController);
                    break;
                case 'track':
                    this.executeTrackCommand(command, iTunesController);
                    break;
                default:
                    this.socketController.log(`[iTunes] player change command ${command.name} is not recognized.`, true);
                    break;
            }
        });

        socket.on(this.socketMessageIdentifier + '_playlist', (command: IPlaylistChangeCommand) => {
            if (!command) {
                const logMessage = '[iTunes] Received playlist change command via socket but message is invalid';
                this.socketController.log(logMessage, false);
                return;
            }

            const iTunesController = this.controller as IiTunesService;


            iTunesController.playPlayList(command.folder, command.index)
                .then((newTrack: ITrack) => {
                    this.socketController.log(`[iTunes] Play playlist with track ${JSON.stringify(newTrack)}`, false);
                    this.sendCurrentTrack(newTrack);
                    this.sendCurrentTrackCover(iTunesController);
                }).catch((err) => this.socketController.log(
                    '[iTunes] State change NOT successful. - Error: ' + JSON.stringify(err), true)
                );
        });
    }

    private executePlayPauseCommand(command: ISwitchStateChangeCommand, controller: IiTunesService): void {
        let promise: Promise<boolean>;

        if (command.state === 'toggle') {
            promise = controller.togglePlayPause();
        } else {
            this.socketController.log(`[iTunes] Received state change other than toggle`, false);
            return;
        }

        promise.then((newState: boolean) => {
            this.socketController.log(`[iTunes] Toggle state change successful.`, false);
            this.sendCurrentPlayerState(newState);
        }).catch((err) => this.socketController.log(
            '[iTunes] State change NOT successful. - Error: ' + JSON.stringify(err), true)
        );
    }

    private executeMuteToggleCommand(command: ISwitchStateChangeCommand, controller: IiTunesService): void {
        let promise: Promise<boolean>;

        if (command.state === 'toggle') {
            promise = controller.toggleMuteUnmute();
        } else {
            this.socketController.log(`[iTunes] Received mute state change other than toggle`, false);
            return;
        }

        promise.then((newState: boolean) => {
            this.socketController.log(`[iTunes] Toggle mute change successful.`, false);
            this.sendCurrentPlayerState(undefined, newState);
        }).catch((err) => this.socketController.log(
            '[iTunes] mute State change NOT successful. - Error: ' + JSON.stringify(err), true)
        );
    }

    private executeTrackCommand(command: ISwitchStateChangeCommand, controller: IiTunesService): void {
        let promise: Promise<ITrack>;

        if (command.state === 'skip') {
            promise = controller.skipTrack();
        } else if (command.state === 'prev') {
            promise = controller.previousTrack();
        } else {
            this.socketController.log(`[iTunes] Received state change other than toggle`, false);
            return;
        }

        promise.then((track: ITrack) => {
            this.socketController.log(`[iTunes] New track command to track ${track.name} successful`, false);
            this.sendCurrentTrack(track);
        }).catch((err) => this.socketController.log(
            '[iTunes] new track command. - Error: ' + JSON.stringify(err), true)
        );
    }

    sendInitialState(): void {
        this.sendPlaylistCollectionInformation();
        this.sendStateUpdate();
    }

    public sendUpdates = () => {
        this.sendStateUpdate();
    };


    private sendStateUpdate() {
        const iTunesController = this.controller as IiTunesService;

        iTunesController.getCurrentTrack()
            .then(currentTrack => this.sendCurrentTrack(currentTrack))
            .catch(err => this.socketController.log(
                '[iTunes] Could not get current track. - Error: ' + JSON.stringify(err), true));

        this.sendCurrentTrackCover(iTunesController);

        iTunesController.getCurrentPlayerState()
            .then(currentState => this.sendCurrentPlayerState(currentState))
            .catch(err => this.socketController.log(
                '[iTunes] Could not get current state. - Error: ' + JSON.stringify(err), true));

        iTunesController.getIsMuteState()
            .then(currentState => this.sendCurrentPlayerState(undefined, currentState))
            .catch(err => this.socketController.log(
                '[iTunes] Could not get current mute state. - Error: ' + JSON.stringify(err), true));

    }

    private sendCurrentPlayerState(playerState?: boolean, muteState?: boolean) {
        if (playerState !== null && playerState !== undefined) {
            this.socketController.send(this.socketMessageIdentifier + '_player', playerState);
        }

        if (muteState !== null && muteState !== undefined) {
            this.socketController.send(this.socketMessageIdentifier + '_playerMute', muteState);
        }
    }

    private sendCurrentTrack(currentTrack: ITrack) {
        this.socketController.send(this.socketMessageIdentifier + '_currentTrack', currentTrack);
    }

    private sendCurrentTrackCover(controller: IiTunesService) {
        controller.getCurrentTrackCover()
            .then((base64Cover: Base64Image) => {
                this.socketController.send(this.socketMessageIdentifier + '_currentTrack_cover', base64Cover.base64ImageRepresentation);
            })
            .catch(err => this.socketController.log(
                '[iTunes] Could not get cover for current track. - Error: ' + JSON.stringify(err), true)
            );
    }

    private sendPlaylistCollectionInformation() {
        const iTunesController = this.controller as IiTunesService;

        console.log('[iTunes] Send playlist info for playlists.');

        // iterate over all playlists in folder dashboard
        iTunesController.getPlayListsForFolder(ITunesSocketService.playlistFolder)
            .then((collection: IPlaylistCollection) => {
                const children = collection.playlistNodes;
                if (collection.nodes === 0 || !children) {
                    // Dashboard does not have children playlists
                    return;
                }

                // for every playlist, send the cover and name
                for (let i = 0; i < collection.nodes; i++) {
                    const playlist = children[i].playlist;
                    this.sendPlaylistInformation(playlist, i, iTunesController);
                }
            })
            .catch(err => this.socketController.log(
                '[iTunes] Could not get playlists. - Error: ' + JSON.stringify(err), true)
            );
    }

    private sendPlaylistInformation(playlist: IPlaylist, index: number, controller: IiTunesService) {
        console.log('[iTunes] Send playlist info for playlist ' + playlist.name + '.');

        this.socketController.send(this.socketMessageIdentifier + '_playlist_' + index, playlist);

        // send cover
        controller.getPlayListCover(ITunesSocketService.playlistFolder, index)
            .then((base64Cover: Base64Image) => {
                this.socketController.send(this.socketMessageIdentifier + '_playlist_' + index + '_cover', base64Cover.base64ImageRepresentation);
            })
            .catch(err => this.socketController.log(
                '[iTunes] Could not get cover for playlist ' + index + '. - Error: ' + JSON.stringify(err), true)
            );
    }
>>>>>>> e19fe9b3f26adeb4a4060f983d6273b95a66a21d


}