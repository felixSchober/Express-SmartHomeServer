import {IAggregatedLightResult} from '../../interfaces/Devices/Light/IAggregatedLightResult';
import {ILightControllerService} from '../../interfaces/Devices/Light/ILightControllerService';
import {IDeviceController} from '../../interfaces/IDeviceController';
import {ISocketController} from '../../interfaces/ISocketController';
import {ISwitchStateChangeCommand} from '../../interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import { Socket, Server } from '@types/socket.io';
import {RecurrenceRule, scheduleJob, Job} from '@types/node-schedule';

export class LightSocketService extends BaseSocketService {

	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, pollingInterval, socketMessageIdentifier, controller, socketController);
	}

	public sendInitialState() {
		this.sendInitialLightStates();
	}

	public addSocketObserver(socket: Socket) {
		this.sockets.push(socket);

		// LIGHT EVENTS
		socket.on(this.socketMessageIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Lights] Received light change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const lightController = this.controller as ILightControllerService;
			let promise: Promise;

			// TODO: Use enum
			if (command.state === 'toggle') {
				promise = lightController.toggleLightState(command.name);
			} else {
				const state = command.state === 'on';
				promise = lightController.setLightState(command.name, state);
			}

			// execute promise
			promise.then((newState: boolean) => this.socketController.log(
				'[Lights] State change successful. New State for Light ' + command.name + ': ' + newState, false))
			.catch((err) => this.socketController.log(
					'[Lights] State change NOT successful. Light Name ' + command.name + ' - Error: ' + err, true));
		});

	}

	public sendUpdates() {
		const lightController = this.controller as ILightControllerService;
		lightController.getCachedLightStateIfPossible()
			.then((result) => this.sendLightState(result))
			.catch((err) => this.socketController.log('Could not get light states ' + err, true));
	}

	sendInitialLightStates() {
		const lightController = this.controller as ILightControllerService;

		lightController.getLights()
			.then((result) => this.sendLightState(result))
			.catch((err) => this.socketController.log('Could not get initial light states ' + err, true));
	}

	private sendLightState(lightStates: IAggregatedLightResult) {
		this.socketController.send(this.socketMessageIdentifier + '_CountTotal', lightStates.totalCount);
		this.socketController.send( this.socketMessageIdentifier + '_CountOn', lightStates.onCount);
		this.socketController.send( this.socketMessageIdentifier + '_CountOff', lightStates.offCount);

		// send individual light states
		for(const l of lightStates.lights){
			this.socketController.send(this.socketMessageIdentifier + '_' + l.name, l.stateOn);
		}
	}
}