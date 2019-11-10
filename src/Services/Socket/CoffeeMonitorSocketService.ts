import { BaseSocketService } from './BaseSocketService';
import { IDeviceController } from '../../Interfaces/IDeviceController';
import { ISocketController } from '../../Interfaces/ISocketController';
import { Server, Socket } from 'socket.io';
import { PollingIntervalRule } from '../../Interfaces/PollingIntervalRule';
import { INummericalMonitorService } from '../../Interfaces/INummericalMonitorService';

export class CoffeeMonitorSocketService extends BaseSocketService {

    constructor(socketName: string,
        io: Server,
        pollingInterval: number,
        socketMessageIdentifier: string,
        controller: INummericalMonitorService,
        socketController: ISocketController) {
            super(socketName, io, socketMessageIdentifier, controller, socketController, new PollingIntervalRule(pollingInterval));
    }




    public addSocketObserver(socket: Socket): void {
        // this socket does not listen        
    }    
    
    public sendInitialState(): void {
        const monitor = this.controller as INummericalMonitorService;
        monitor.start()
            .then((count) => {
                this.socketController.send(this.socketMessageIdentifier, count);
            })
            .catch((err) =>
					this.socketController.log('[Coffee] Could not get initial coffee state'
					+ name + '. Error: ' + JSON.stringify(err), true));
    }

    public sendUpdates = () => {
        const monitor = this.controller as INummericalMonitorService;
        monitor.run()
            .then((count) => {
                this.socketController.send(this.socketMessageIdentifier, count);
            })
            .catch((err) =>
                    this.socketController.log('[Coffee] Could not get coffee state Error: ' + JSON.stringify(err), true));
    }
}