import {openHab} from '../../config/openHab';
import {Helpers} from '../../Helpers';
import {IHarmonyActivity} from '../../Interfaces/Devices/Harmony/IHarmonyActivity';
import {IHarmonyControllerService} from '../../Interfaces/Devices/Harmony/IHarmonyControllerService';

export class HarmonyService implements IHarmonyControllerService {

	private readonly channelNumberMapping: {[id: string]: number[]};
	private currentChannelName: string;
	private readonly channelList: string[];
	private readonly activityNameList: string[];

	constructor(){
		this.channelNumberMapping = {
			'ARD': [1],
			'ZDF': [2],
			'SAT1': [3],
			'RTL': [4],
			'RTL2': [5],
			'VOX': [6],
			'PRO7': [7],
			'KABEL': [8],
			'NTV': [9],
			'N24': [1, 0],
			'ZDFINFO': [1, 1],
			'ZDFNEO': [1, 8],
			'KABEL1DOKU': [1, 3],
			'RTLNITRO': [3, 4],
			'TELE5': [1, 2],
			'SIXX': [1, 1],
			'ARTE': [1, 6],
			'CNN': [1, 7],
			'EUROSPORT': [1, 4],
			'SAT1GOLD': [2, 2],
			'3SAT': [5, 6],
			'BR': [4, 6],
			'SPORT1': [2, 0],
			'EINSPLUS': [1, 1],
			'SWR': [6, 7],
			'TAGESSCHAU24': [1, 5],
			'PRO7MAX': [2, 3],
			'WDW': [3, 7]
		};
		this.currentChannelName = 'ARD';
		this.channelList = ['ARD',
			'ZDF',
			'SAT1',
			'RTL',
			'RTL2',
			'VOX',
			'PRO7',
			'KABEL',
			'NTV',
			'N24',
			'ZDFINFO',
			'ZDFNEO',
			'KABEL1DOKU',
			'RTLNITRO',
			'TELE5',
			'SIXX',
			'ARTE',
			'CNN',
			'EUROSPORT',
			'SAT1GOLD',
			'3SAT',
			'BR',
			'SPORT1',
			'EINSPLUS',
			'SWR',
			'TAGESSCHAU24',
			'PRO7MAX',
			'WDW']
		this.activityNameList = [
			'Fernsehen',
			'Amazon Video',
			'Netflix',
			'Starte Apple TV',
			'Radio',
			'XBOX',
			'Alexa',
			'Airplay Music',
			'iTunes',
			'Netflix Weiter'
		];
	}



	public changeTvChannel(channelName: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const changeChannelFunctionName = `[Harmony]:\tchangeChannel(${channelName}) - `;
			const channelNumberList = this.channelNumberMapping[channelName];
			console.log(changeChannelFunctionName + `Switching to ${channelName} (${channelNumberList})`);

			this.currentChannelName = channelName;
			let currentNumber = channelNumberList[0];
			Helpers.doOpenHabPostRequest('items/' + openHab.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
				.then((result) => {

					// channel number is > 9 -> do another request to change the second part
					if (channelNumberList.length > 1) {
						let currentNumber = channelNumberList[1];
						Helpers.doOpenHabPostRequest('items/' + openHab.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
							.then(() => {
								resolve(channelName);
							})
							.catch(function (err) {
								console.error(changeChannelFunctionName +'Could not send second channel command. Error: ' + err);
								reject({success: false, error: err, message: 'Could not send second channel command'});
							});
					} else {
						resolve(channelName);
					}
				})
				.catch((err) => {
					console.error(changeChannelFunctionName + 'Error while performing request. Error: ' + err);
					reject({success: false, error: err, channelName: channelName});
				});
		});
	}

	public getCurrentActivity(): Promise<IHarmonyActivity> {
		return new Promise((resolve, reject) => {
			Helpers.doOpenHabGetRequest('items/HarmonyHub_CurrentActivity')
				.then(function (result) {

					const isActivityRunning = (result.data.state !== 'PowerOff');

					const response: IHarmonyActivity = {
						isOn: isActivityRunning,
						name: result.data.state
					};
					resolve(response);
				})
				.catch(function (err) {
					console.error('[HARMONY]:\tgetCurrentActivity - Error while performing request. Error: ' + err);
					reject('Error while performing request.' + err);
				});
		});
	}

	public getCurrentTvChannel(): number {
		return this.channelList.indexOf(this.currentChannelName);
	}

	public startActivity(activityName: string): Promise<IHarmonyActivity> {
		return new Promise((resolve, reject) => {
			Helpers.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', activityName)
				.then((result) => {
					const response: IHarmonyActivity = {
						isOn: true,
						name: activityName
					};
					resolve(response);
				})
				.catch((err) => {
					console.error(`[HARMONY]:\tstartActivity(${activityName}) - Error while performing request. Error: ` + err);
					reject({success: false, error: err, device: activityName});
				});
		});
	}

	public stopActivity(): Promise<IHarmonyActivity> {
		return new Promise((resolve, reject) => {
			Helpers.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', 'PowerOff')
				.then(() => {
					this.getCurrentActivity().then(result => resolve(result));
				})
				.catch((err) => {
					console.error('[HARMONY]:\tstopActivity() - Error while performing request. Error: {1}' + err);
					reject({success: false, error: err});
				});
		});
	}

	getAllActivityNames(): string[] {
		return this.activityNameList;
	}

	getStateOfActivities(): Promise<IHarmonyActivity[]> {
		return new Promise<IHarmonyActivity[]>((resolve, reject) => {
			this.getCurrentActivity()
				.then((currentActivity: IHarmonyActivity) => {
					// prepare list
					const result: IHarmonyActivity[] = [];

					const activityNames = this.getAllActivityNames();
					activityNames.forEach(aName =>{
						if (aName === currentActivity.name) {
							result.push(currentActivity);
						} else {
							const a: IHarmonyActivity = {
								name: aName,
								isOn: false
							};
							result.push(a);
						}
					});
					resolve(result);
				})
				.catch((err) => {
					console.error('[HARMONY]:\tgetStateOfActivities() - Error while performing request. Error: ' + err);
					reject({success: false, error: err});
				});
		});
	}







}