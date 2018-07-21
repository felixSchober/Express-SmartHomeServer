import {IDeviceController} from '../../IDeviceController';
import {IHarmonyActivity} from './IHarmonyActivity';

export interface IHarmonyControllerService extends IDeviceController {
	getCurrentActivity(): Promise<IHarmonyActivity>;
	startActivity(activityName: string): Promise<IHarmonyActivity>;
	stopActivity(): Promise<IHarmonyActivity>;

	changeTvChannel(channelName: string): Promise<any>;
	getCurrentTvChannel(): number;
	getAllActivityNames(): string[]
	getStateOfActivities(): Promise<ReadonlyArray<IHarmonyActivity>>;
}