import {Server, Socket} from 'socket.io';
import {IGraphValues} from '../../Interfaces/Dashboard/IGraphValues';
import {IPowerControllerService} from '../../Interfaces/Devices/Power/IPowerControllerService';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISocketController} from '../../Interfaces/ISocketController';
import {ISwitchStateChangeCommand} from '../../Interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';
import {PollingIntervalRule} from "../../Interfaces/PollingIntervalRule";
import {GraphStates} from "../Devices/GraphStates";

export class PowerSocketService extends BaseSocketService {

	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
	}

	public addSocketObserver(socket: Socket) {
		this.sockets.push(socket);

		this.socketController.log(`[Socket] New Observer for topic ${this.socketMessageIdentifier}`, false);
		socket.on(this.socketMessageIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Power] Received power change command via socket but message is invalid';
				this.socketController.log(logMessage, true);
				return;
			} else {
				this.socketController.log(`[Power] Received change command for ${command.name}. New State: ${command.state}`, false);
			}

			const powerController = this.controller as IPowerControllerService;
			let promise: Promise<boolean>;
			if (command.state === 'toggle') {
				promise = powerController.togglePlugState(command.name);
			} else {
				const state = command.state === 'on';
				promise = powerController.updatePlugState(command.name, state);
			}

			promise.then((newState: boolean) => {

					this.socketController.log(
						'[Power] State change successful. New State for plug ' + command.name + ': ' + newState, false);
					this.socketController.send(this.socketMessageIdentifier + '_' + command.name, newState);
				})
				.catch((err: any) => this.socketController.log(
					'[Power] State change NOT successful. Plug ' + command.name + ' - Error: ' + err, true));
		});
	}

	public sendInitialState() {
		const powerController = this.controller as IPowerControllerService;
		for (const name of powerController.devices) {
			this.socketController.log('[Power] Send initial power level for device ' + name, false);
			powerController.isPlugRelayOn(name)
				.then((isOn) =>
					this.socketController.send(this.socketMessageIdentifier + '_' + name, isOn))
				.catch((err) =>
					this.socketController.log('[Power] Could not get initial plug state for plug '
					+ name + '. Error: ' + err, true));
		}
	}

	public sendUpdates = () => {
		const powerController = this.controller as IPowerControllerService;

		powerController.updatePowerState()
			.then((powerState: GraphStates) => {
				const aggregatedGraph: IGraphValues[] = [];
				let aggregatedPowerValue = 0;

				// send current power levels
				let index = 0;
				for(const name of powerState.historyStatesKeys) {
					const currentPower = powerState.currentStates[index];
					const graphValues = powerState.formatForDashboard(name);

					aggregatedGraph.push(graphValues);
					aggregatedPowerValue += currentPower;

					this.socketController.send('powerLevelValue_' + name, currentPower);
					this.socketController.send('powerLevelHistory_' + name, [graphValues]);
					index++;
				}

				this.socketController.send('powerLevelHistory_Total', aggregatedGraph);
				this.socketController.send('powerLevelValue_Total', aggregatedPowerValue);

			})
			.catch((err) => this.socketController.log('Could not power history entries. Error: ' + err, true));
	};


}