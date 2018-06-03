import {Server, Socket} from 'socket.io';
import {IGraphValues} from '../../interfaces/Dashboard/IGraphValues';
import {IPowerControllerService} from '../../interfaces/Devices/Power/IPowerControllerService';
import {IPowerState} from '../../interfaces/Devices/Power/IPowerState';
import {IDeviceController} from '../../interfaces/IDeviceController';
import {ISocketController} from '../../interfaces/ISocketController';
import {ISwitchStateChangeCommand} from '../../interfaces/ISwitchStateChangeCommand';
import {BaseSocketService} from './BaseSocketService';

export class PowerSocketService extends BaseSocketService {

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

		socket.on(this.socketMessageIdentifier, (command: ISwitchStateChangeCommand) => {
			if (!command) {
				const logMessage = '[Power] Received power change command via socket but message is invalid';
				this.socketController.log(logMessage, false);
				return;
			}

			const powerController = this.controller as IPowerControllerService;
			let promise: Promise;
			if (command.state === 'toggle') {
				promise = powerController.togglePlugState(command.name);
			} else {
				const state = command.state === 'on';
				promise = powerController.updatePlugState(command.name, state);
			}

			promise.then((newState: boolean) => this.socketController.log(
				'[Power] State change successful. New State for plug ' + command.name + ': ' + newState, false))
				.catch((err: any) => this.socketController.log(
					'[Power] State change NOT successful. Plug ' + command.name + ' - Error: ' + err, true));
		});
	}

	protected sendInitialState() {
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

	protected sendUpdates() {
		const powerController = this.controller as IPowerControllerService;

		powerController.updatePowerState()
			.then((powerState: IPowerState) => {
				const aggregatedGraph: IGraphValues[] = [];

				// send current power levels
				for(const name of powerState.powerHistoryKeys) {
					const currentPower = powerState.powerStates[name];
					const graphValues = this.formatForDashboard(powerState, name);

					aggregatedGraph.push(graphValues);

					this.socketController.send('powerLevelValue_' + name, currentPower);
					this.socketController.send('powerLevelHistory_' + name, [graphValues]);
				}

				this.socketController.send('powerLevelHistory_Total', aggregatedGraph);
			})
			.catch((err) => this.socketController.log('Could not power history entries. Error: ' + err, true));
	}

	private formatForDashboard(powerState: IPowerState, deviceIndexName: string): IGraphValues {
		const powerHistoryValues = powerState.powerHistories[deviceIndexName];
		let timeStamps = powerState.timestamps;

		// convert timestamps to full iso strings
		const serializedTimestamps = [];
		for(const ts of timeStamps){
			serializedTimestamps.push(ts.toISOString(true))
		}

		return {
			name: deviceIndexName,
			labels: serializedTimestamps,
			values: powerHistoryValues
		};
	}


}