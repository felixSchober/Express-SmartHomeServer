import {ILight} from '../../interfaces/Devices/Light/ILight';
import {IPowerLight} from '../../interfaces/Devices/Power/IPowerLight';
import {HueService} from './HueService';

export class HueLight implements IPowerLight{

	public bri: number;
	public id: string;
	public name: string;
	public stateOn: boolean;
	public type: string;
	public uniqueId: string;
	public power: number;

	constructor(bri: number, id: string, name: string, stateOn: boolean, type: string, uniqueId: string) {
		this.bri = bri;
		this.id = id;
		this.name = name;
		this.stateOn = stateOn;
		this.type = type;
		this.uniqueId = uniqueId;
		this.power = -1;
	}

	public changeState(newState: boolean): Promise<boolean> {
		return new Promise((resolve, reject) => {

			const path = 'lights/' + this.id + '/state';

			let reqBody;
			if (this.type === 'On/Off plug-in unit') {
				reqBody = { on: newState };
			} else {
				reqBody = {	on: newState, bri: 254 };
			}

			HueService.doHuePutRequest(path, reqBody)
				.then(() => {
					this.stateOn = newState;
					console.log(`[Hue]:\tsetLightState(${this.id}, ${newState}) - Performed request to hue API`);
					resolve(newState);
				})
				.catch((err) => {
					console.error(`[Hue]:\tsetLightState(${this.id}, ${newState}) - - Could not complete hue action change request: ` + err);
					reject(err);
				});
		});
	}

	public update(): Promise<ILight> {
		return new Promise((resolve, reject) => {

			const path = 'lights/' + this.id;
			HueService.doHueGetRequest(path)
				.then((result) => {

					const data = result.data;
					this.stateOn = data.state.on;
					this.bri = data.state.bri;
					resolve(this);
				})
				.catch((err) => {
					console.error('[Hue]:\tgetSingleLight(' + this.name + ') - Could not complete request Error: ' + err);
					reject(err);
				});
		});
	}



}