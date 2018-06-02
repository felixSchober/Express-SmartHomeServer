import {Server} from 'socket.io';
import {ISocketService} from './ISocketService';

export interface ISocketController {
	io: Server;

	send(topic: string, message: any);
	log(logMessage: string, isError: boolean);
	getSocketHandler(socketModules: ISocketService[]);
}