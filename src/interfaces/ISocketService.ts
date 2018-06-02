import { Socket, Server } from '@types/socket.io'
import {Job} from 'node-schedule';
import {IDeviceController} from './IDeviceController';
import {ISocketController} from './ISocketController';

export interface ISocketService {
	socketName: string;
	io: Server;
	socketController: ISocketController;
	controller: IDeviceController;
	initializeSocketActor() : Job;
	sendInitialState() : void;
	addSocketObserver(socket: Socket);
}