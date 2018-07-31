import {ILightControllerService} from '../../Interfaces/Devices/Light/ILightControllerService';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISocketController} from '../../Interfaces/ISocketController';
import {BaseSocketService} from './BaseSocketService';
import {Server, Socket} from 'socket.io';
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";
import {GraphStates} from "../Devices/GraphStates";

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
		this.sendCurrentState();
	}

	public addSocketObserver(socket: Socket) {
		this.sockets.push(socket);
	}

	public sendUpdates = () => {
		this.sendCurrentState();
	};

	private sendCurrentState() {
		const lightController = this.controller as ILightControllerService;

		lightController.updateSensorTemperatures()
			.then((temperatureStates: GraphStates) => {
				let index = 0;
				for (const tempStateName of temperatureStates.historyStatesKeys) {
					const currentTemperature = temperatureStates.currentStates[index];
					const graphValues = temperatureStates.formatForDashboard(tempStateName);

					const topic = `${this.socketMessageIdentifier}_temperature_${tempStateName}`;
					this.socketController.send(topic + '_current', currentTemperature);
					this.socketController.send(topic + '_history', [graphValues]);

					index++;
				}
			})

	}
}