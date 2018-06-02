import {IDeviceController} from '../IDeviceController';
import {IAggregatedLightResult} from './IAggregatedLightResult';
import {ILight} from './ILight';
import {ILightGroupState} from './ILightGroupState';

export interface ILightControllerService extends IDeviceController {
	currentGroupStates: { [id: string] : ILightGroupState};

	getSensors(): Promise<any>;
	getSensorTemperature(sensorId: string): Promise<number>

	getLights(): Promise<IAggregatedLightResult>;
	getSingleLight(lightName: string): Promise<ILight>;
	getCachedLightStateIfPossible(): Promise<IAggregatedLightResult>;
	setLightState(lightName: string, state: boolean): Promise<boolean>;
	toggleLightState(lightName: string): Promise<boolean>;

	performGroupStateAction(newGroupState: ILightGroupState, groupId: string): Promise<any>;
	toggleScene(groupId: string, sceneId: string, restoreScene: boolean, transitionTime: number): Promise<boolean>
}