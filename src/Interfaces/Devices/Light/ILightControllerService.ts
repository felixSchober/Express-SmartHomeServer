import {IDeviceController} from '../../IDeviceController';
import {AggregatedLightResult} from './AggregatedLightResult';
import {ILight} from './ILight';
import {ILightGroupState} from './ILightGroupState';
import {ILightSceneState} from './ILightSceneState';
import {ITemperatureSensorResult} from "../ITemperatureSensorResult";
import {ITuple} from "../../ITuple";

export interface ILightControllerService extends IDeviceController {
	currentGroupStates: { [p: string]: ILightSceneState };

	getSensors(): Promise<any>;
	getSensorTemperature(sensorId: string): Promise<ITuple<string, number>>;
	getSensorTemperatures(): Promise<ReadonlyArray<ITemperatureSensorResult>>;

	getLights(): Promise<AggregatedLightResult>;
	getSingleLight(lightName: string): Promise<ILight>;
	getCachedLightStateIfPossible(): Promise<AggregatedLightResult>;
	setLightState(lightName: string, state: boolean): Promise<boolean>;
	toggleLightState(lightName: string): Promise<boolean>;

	performGroupStateAction(newGroupState: ILightGroupState, groupId: string): Promise<any>;
	toggleScene(groupId: string, sceneId: string, restoreSceneId: string, transitionTime: number): Promise<ILightSceneState>;
}