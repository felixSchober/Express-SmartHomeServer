import {IHarmonyActivity} from '../../Interfaces/Devices/Harmony/IHarmonyActivity';
import {IHarmonyControllerService} from '../../Interfaces/Devices/Harmony/IHarmonyControllerService';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISwitchStateChangeCommand} from '../../Interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import {Server, Socket} from 'socket.io';
import {ISocketController} from '../../Interfaces/ISocketController';
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";


export class HarmonySocketService extends BaseSocketService {


	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
	}

	public addSocketObserver(socket: Socket): void {
		this.sockets.push(socket);

		const socketActivityTopicIdentifier = this.socketMessageIdentifier + '_activity';
		const socketChannelTopicIdentifier = this.socketMessageIdentifier + '_channel';


		this.socketController.log(`[Socket] New Observer for topic ${socketActivityTopicIdentifier}`, false);
		this.socketController.log(`[Socket] New Observer for topic ${socketChannelTopicIdentifier}`, false);

		// Harmony ACTIVITY SWITCHING
		socket.on(socketActivityTopicIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Harmony] Received activity turn on change command via socket but message is invalid';
				this.socketController.log(logMessage, true);
				return;
			} else {
				this.socketController.log(`[Harmony] Received state change command to new state ${command.state}`, false);
			}

			const harmonyController = this.controller as IHarmonyControllerService;
			let promise: Promise<IHarmonyActivity>;


			const state = command.state === 'on';

			if (state) {
				promise = harmonyController.startActivity(command.name);
			} else {
				promise = harmonyController.stopActivity();
			}

			// execute promise
			promise.then((newState: IHarmonyActivity) => {
					this.socketController.log(
						'[Harmony] Activity change successful. New State for Activity ' + command.name + ': ' + newState, false);
					this.sendCurrentState();
				})
				.catch((err) => this.socketController.log(
					'[Harmony] Activity change NOT successful. Activity Name ' + command.name + ' - Error: ' + err, true));
		});

		// Harmony CHANNEL SWITCHING
		socket.on(socketChannelTopicIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Harmony] Received channel change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const harmonyController = this.controller as IHarmonyControllerService;

			// execute promise
			harmonyController.changeTvChannel(command.state).then((newState: string) => {
					this.socketController.log(
						'[Harmony] TV channel change successful. New State for Activity ' + command.name + ': ' + newState, false);
					this.sendCurrentState();
				})
				.catch((err) => this.socketController.log(
					'[Harmony] TV channel change NOT successful. Activity Name ' + command.name + ' - Error: ' + err, true));
		});
	}

	public sendInitialState(): void {
		this.sendCurrentState();
	}

	public sendUpdates = () => {
		this.sendCurrentState();
	};

	private sendCurrentState(): void {
		const harmonyController = this.controller as IHarmonyControllerService;

		this.socketController
			.send(this.socketMessageIdentifier + '_currentChannel', harmonyController.getCurrentTvChannel());

		// send state of all activities
		harmonyController.getStateOfActivities()
			.then((activites: ReadonlyArray<IHarmonyActivity>) =>  {
				let activityOnExists = false;
				activites.forEach(activity => {
					if (activity.isOn) {
						activityOnExists = true;
						this.socketController
							.send(this.socketMessageIdentifier + '_currentActivity', activity.name);
					}

					this.socketController
						.send(`${this.socketMessageIdentifier}_activity_${activity.name}_state`, activity.isOn);
				});

				// if there is no activity currently running, send power off activity type
				if (!activityOnExists) {
					this.socketController
						.send(this.socketMessageIdentifier + '_currentActivity', 'PowerOff');
				}


			}).catch((err) => this.socketController.log(
			'[Harmony] Could not send activity. - Error: ' + err, true));
	}
}