import {IHarmonyActivity} from '../../interfaces/Devices/Harmony/IHarmonyActivity';
import {IHarmonyControllerService} from '../../interfaces/Devices/Harmony/IHarmonyControllerService';
import {ILightControllerService} from '../../interfaces/Devices/Light/ILightControllerService';
import {IDeviceController} from '../../interfaces/IDeviceController';
import {ISwitchStateChangeCommand} from '../../interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import {Server, Socket} from 'socket.io';
import {ISocketController} from '../../interfaces/ISocketController';


export class HarmonySocketService extends BaseSocketService {


	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, pollingInterval, socketMessageIdentifier, controller, socketController);
	}

	protected addSocketObserver(socket: Socket) {
		this.sockets.push(socket);


		// Harmony ACTIVITY SWITCHING
		socket.on(this.socketMessageIdentifier + '_activity', (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Harmony] Received activity turn on change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
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
						'[Harmony] Activity change successful. New State for Activity ' + command.name + ': ' + newState, false)
					// TODO: Push new harmony state
				})
				.catch((err) => this.socketController.log(
					'[Harmony] Activity change NOT successful. Activity Name ' + command.name + ' - Error: ' + err, true));
		});

		// Harmony CHANNEL SWITCHING
		socket.on(this.socketMessageIdentifier + '_channel', (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Harmony] Received channel change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const harmonyController = this.controller as IHarmonyControllerService;

			// execute promise
			harmonyController.changeTvChannel(command.state).then((newState: string) => {
					this.socketController.log(
						'[Harmony] TV channel change successful. New State for Activity ' + command.name + ': ' + newState, false)
					// TODO: Push new harmony state
				})
				.catch((err) => this.socketController.log(
					'[Harmony] TV channel change NOT successful. Activity Name ' + command.name + ' - Error: ' + err, true));
		});
	}

	protected sendInitialState() {
		this.sendCurrentState();
	}

	protected sendUpdates() {
		this.sendCurrentState();
	}

	private sendCurrentState(){
		const harmonyController = this.controller as IHarmonyControllerService;

		this.socketController
			.send(this.socketMessageIdentifier + '_currentChannel', harmonyController.getCurrentTvChannel());

		// send current activity
		harmonyController.getCurrentActivity()
			.then((activity: IHarmonyActivity) =>  {
				this.socketController
					.send(this.socketMessageIdentifier + '_currentActivity', activity.name);
				this.socketController
					.send(`${this.socketMessageIdentifier}_activity_${activity.name}_state`, activity.isOn);
			}).catch((err) => this.socketController.log(
			'[Harmony] Could not send activity. - Error: ' + err, true));
	}
}