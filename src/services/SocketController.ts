import {Server, Socket} from 'socket.io';
import {ISocketController} from '../interfaces/ISocketController';
import {ISocketLogMessage} from '../interfaces/ISocketLogMessage';
import {ISocketMessage} from '../interfaces/ISocketMessage';
import {ISocketService} from '../interfaces/ISocketService';
import * as moment from 'moment';

export class SocketController implements ISocketController {
	public io: Server;
	socketServices: ISocketService[];


	constructor(io: Server, socketModules: ISocketService[]) {
		this.io = io;
		this.socketServices = socketModules;
	}

	public getSocketHandler(socket: Socket) {
		const handshake = socket.handshake;
		const clientIp = handshake.address;

		console.log('[Socket] Client with ip {0} connected.'.format(clientIp));
		this.io.emit('welcome', {});

		// Setup default handlers
		socket.on('error', this.socketOnErrorHandler);
		socket.on('disconnect', this.socketOnDisconnectHandler);

		// set up socket observers
		for (const socketService of this.socketServices) {
			socketService.addSocketObserver(socket);
			console.log('\t[Socket] Socket Observer from {0} initialized.'.format(socketService.socketName));
		}

		// send initial states
		this.sendInitialStates();
	}

	public log(logMessage: string, isError: boolean) {
		const message: ISocketLogMessage = {
			time: moment(),
			message: logMessage,
			isError: isError };

		this.io.emit('log', message);

		if (isError) {
			console.error(logMessage);
		} else {
			console.log(logMessage);
		}
	}

	private socketOnErrorHandler(error: any) {
		console.error('[Socket] Error in socket pipeline: ' + error);
	}

	private socketOnDisconnectHandler(clientIp: string) {
		console.log('[Socket] Client with ip {0} disconnected.'.format(clientIp));
	}

	public send(topic: string, message: any) {
		const socketMessage: ISocketMessage = {topic: topic, data: message};
		this.io.emit('message', socketMessage);
	}

	private sendInitialStates() {
		for(const socketService of this.socketServices) {
			socketService.sendInitialState();
			console.log('\t[Socket] Socket {0} is sending initial state to dashboard.'.format(socketService.socketName));
		}
	}




}