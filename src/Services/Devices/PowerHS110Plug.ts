import {IPlug} from '../../Interfaces/Devices/Power/IPlug';
import {ITuple} from '../../Interfaces/ITuple';

export class PowerHS110Plug implements IPlug {

	private plugController: any;

	public currentPowerState: number;
	public ip: string;
	public name: string;
	public isOn: boolean;


	constructor(ip: string, name: string, plugController: any) {
		this.ip = ip;
		this.name = name;
		this.plugController = plugController;
		this.isOn = false;
	}

	public getCachedPowerForPlug(): number {
		return this.currentPowerState;
	}

	public getLivePowerForPlug(): Promise<ITuple<string, number>> {
		return new Promise((resolve, reject) => {

			this.plugController.getDevice({host: this.ip})
				.then((device: any) => {
					device.emeter.getRealtime().then((response: any) => {
						// we need to differentiate between hardware version 1 and 2.
						// the responses are different
						let t: ITuple<string, number>;
						if (response.power != null) {
							t = {obj1: this.name, obj2: response.power};
						} else {
							t = {obj1: this.name, obj2: response.power_mw/1000};
						}
						this.currentPowerState = t.obj2;
						resolve(t);
						})
						.catch(function (err: any) {
							reject(err);
						});
				})
				.catch(function (err: any) {
					reject(err);
				});
		});
	}

	public getRawPlugState(): Promise<any> {
		return new Promise((resolve, reject) => {
			this.plugController.getDevice({host: this.ip})
				.then((device: any) => {

					// get plug state
					device.getSysInfo()
						.then((response: any) => {
							resolve(response);
						})
						.catch((err: any) => {
							console.error('[POWER]:\tgetRawPlugState(' + this.name + ') - Could not get power level from HS110 API. Error: ' + err);
							reject({success: false, error: err, device: this.ip});
						});
				}).catch((err: any) => {
				console.error('[POWER]:\tgetRawPlugState(' + this.name + ') - Could not get device from HS110 API. Error: ' + err);
				reject({success: false, error: err, device: this.ip});
			});
		});
	}

	public isPlugRelayOn(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this.getRawPlugState()
				.then((response) => {
					this.isOn = response.relay_state === 1;
					resolve(this.isOn);
				}).catch((err) => {
				console.error('[POWER]:\tgetPlugState(' + this.name + ') - Could not get device from HS110 API. Error: ' + err);
				reject({success: false, error: err, device: this.ip});
			});
		});
	}

	public registerPlugPowerEvent(callbackOn: () => void, callbackOff: () => void): void {
		this.plugController.getDevice({host: this.ip})
			.then((device: any) => {
				device.on('power-on', callbackOn);
				device.on('power-off', callbackOff);
				console.log(`[Power] registerPlugPowerEvent(${this.name}, ${callbackOn}, ${callbackOff})
				 - registered plug state changes`);
			})
			.catch((err: any) => {
				console.error(`[Power] registerPlugPowerEvent(${this.name}, ${callbackOn}, ${callbackOff})
				 - Could not get device from HS110 API. ` + err);
			});
	}

	public togglePlugState(): Promise<boolean> {
		return new Promise((resolve, reject) => {

			this.plugController.getDevice({host: this.ip})
				.then((device: any) => {
					device.togglePowerState()
						.then((newState: boolean) => {
							this.isOn = newState;
							resolve(newState)
						})
						.catch((err: any) => reject(err));
				})
				.catch(function (err: any) {
					console.error('[POWER]:\ttogglePlugState() - Could not get device from HS110 API. Error: ' + err);
					reject(err);
				});
		});
	}

	public updatePlugState(stateOn: boolean): Promise<boolean> {
		return new Promise((resolve, reject) => {

			this.plugController.getDevice({host: this.ip})
				.then((device: any) => {
					// do not wait for promise to complete
					//noinspection JSIgnoredPromiseFromCall
					device.setPowerState(stateOn);
					this.isOn = stateOn;
					resolve(stateOn);
				})
				.catch((err: any) => {
					console.error('[POWER]:\tupdatePlugState() - Could not get device from HS110 API. Error: ' + err);
					reject(err);
				});
		});
	}

}