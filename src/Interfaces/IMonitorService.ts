import { IDeviceController } from './IDeviceController';

export interface IMonitorService extends IDeviceController{
    run(): Promise<any>;
    start(): Promise<any>;
}