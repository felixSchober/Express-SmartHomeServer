import {IDeviceController} from '../../IDeviceController';
import {IAggregatedLightResult} from './IAggregatedLightResult';
import {ILight} from './ILight';
import {ILightGroupState} from './ILightGroupState';
import {ILightSceneState} from './ILightSceneState';

export interface ILightControllerService extends IDeviceController {
	currentGroupStates: { [p: string]: ILightSceneState };

	getSensors(): Promise<any>;
	getSensorTemperature(sensorId: string): Promise<number>

	getLights(): Promise<IAggregatedLightResult>;
	getSingleLight(lightName: string): Promise<ILight>;
	getCachedLightStateIfPossible(): Promise<IAggregatedLightResult>;
	setLightState(lightName: string, state: boolean): Promise<boolean>;
	toggleLightState(lightName: string): Promise<boolean>;

	performGroupStateAction(newGroupState: ILightGroupState, groupId: string): Promise<any>;
	toggleScene(groupId: string, sceneId: string, restoreSceneId: string, transitionTime: number): Promise<ILightSceneState>;
}