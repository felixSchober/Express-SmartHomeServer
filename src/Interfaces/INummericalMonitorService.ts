import { IDeviceController } from './IDeviceController';

export interface INummericalMonitorService extends IDeviceController{
    run(): Promise<number>;
    start(): Promise<number>;
}