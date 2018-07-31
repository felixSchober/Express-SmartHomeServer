import {AggregatedLightResult} from '../../Interfaces/Devices/Light/AggregatedLightResult';
import {ILightControllerService} from '../../Interfaces/Devices/Light/ILightControllerService';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISocketController} from '../../Interfaces/ISocketController';
import {ISwitchStateChangeCommand} from '../../Interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import {Server, Socket} from 'socket.io';
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";
import {ITemperatureSensorResult} from "../../Interfaces/Devices/ITemperatureSensorResult";

export class ClimateSocketService extends BaseSocketService {

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
	}

	public sendUpdates = () => {
		this.sendCurrentState();
	};

	sendInitialLightStates() {
		this.sendCurrentState();
	}

	private sendCurrentState() {
		const lightController = this.controller as ILightControllerService;

		lightController.getSensorTemperatures()
			.then((temperatures: ITemperatureSensorResult[]) => {
				for (const temperature of temperatures) {
					const topic = `${this.socketMessageIdentifier}_temperature_${temperature.name}`;
					this.socketController.send(topic, temperature.temperature);
				}
			})

	}
}