import {Server} from 'socket.io';
import {ISocketController} from '../interfaces/ISocketController';
import {ISocketService} from '../interfaces/ISocketService';

export class SocketController implements ISocketController {
	
	public getSocketHandler(io: Server, socketModules: ISocketService[]) {
	}

	public log(io: Server, logMessage: string, isError: boolean) {
	}

	public send(io: Server, topic: string, message: any) {
	}

}