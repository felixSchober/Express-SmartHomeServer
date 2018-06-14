import {AggregatedLightResult} from '../../Interfaces/Devices/Light/AggregatedLightResult';
import {ILightControllerService} from '../../Interfaces/Devices/Light/ILightControllerService';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISocketController} from '../../Interfaces/ISocketController';
import {ISwitchStateChangeCommand} from '../../Interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import {Server, Socket} from 'socket.io';
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";

export class LightSocketService extends BaseSocketService {

	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
	}

	public sendInitialState() {
		this.sendInitialLightStates();
	}

	public addSocketObserver(socket: Socket) {
		this.sockets.push(socket);

		// LIGHT EVENTS
		this.socketController.log(`[Socket] New Observer for topic ${this.socketMessageIdentifier}`, false);
		socket.on(this.socketMessageIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Lights] Received light change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const lightController = this.controller as ILightControllerService;
			let promise: Promise<boolean>;

			// TODO: Use enum
			if (command.state === 'toggle') {
				promise = lightController.toggleLightState(command.name);
			} else {
				const state = command.state === 'on';
				promise = lightController.setLightState(command.name, state);
			}

			// execute promise
			promise.then((newState: boolean) => {
				this.socketController.log(
					'[Lights] State change successful. New State for Light ' + command.name + ': ' + newState, false);

				// send new state
				this.socketController.send(this.socketMessageIdentifier + '_' + command.name, newState);
				})
			.catch((err) => this.socketController.log(
					'[Lights] State change NOT successful. Light Name ' + command.name + ' - Error: ' + err, true));
		});

	}

	public sendUpdates = () => {
		const lightController = this.controller as ILightControllerService;
		lightController.getCachedLightStateIfPossible()
			.then((result) => this.sendLightState(result))
			.catch((err) => this.socketController.log('Could not get light states ' + err, true));
	};

	sendInitialLightStates() {
		const lightController = this.controller as ILightControllerService;

		lightController.getLights()
			.then((result) => this.sendLightState(result))
			.catch((err) => this.socketController.log('Could not get initial light states ' + err, true));
	}

	private sendLightState(lightStates: AggregatedLightResult) {
		this.socketController.send(this.socketMessageIdentifier + '_CountTotal', lightStates.totalCount);
		this.socketController.send( this.socketMessageIdentifier + '_CountOn', lightStates.onCount);
		this.socketController.send( this.socketMessageIdentifier + '_CountOff', lightStates.offCount);

		// send individual light states
		for(const l of lightStates.lights){
			this.socketController.send(this.socketMessageIdentifier + '_' + l.name, l.stateOn);
		}
	}
}