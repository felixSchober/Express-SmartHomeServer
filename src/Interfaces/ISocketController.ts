import {Server, Socket} from 'socket.io';
import {ISocketService} from './ISocketService';

export interface ISocketController {
	io: Server;

	send(topic: string, message: any) : void;
	log(logMessage: string, isError: boolean) : void;
	getSocketHandler(socket: Socket) : void;

	addSocketService(service: ISocketService): void;
}