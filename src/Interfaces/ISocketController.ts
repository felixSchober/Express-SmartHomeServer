import {Server, Socket} from 'socket.io';
import {ISocketService} from './ISocketService';

export interface ISocketController {
	io: Server;

	send(topic: string, message: any) : void;
	log(logMessage: string, isError: boolean) : void;
	addSocketService(service: ISocketService): void;


	// This is needed because we want to pass this function as a handler for the socket connections.
	// However, when we do so normally by providing the function as a "instance" function to the
	// on connection callback the 'this' scope changes and we no longer have access to the class instance.
	getSocketHandler: (socket: Socket) => void;

}