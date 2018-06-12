import {Server, Socket} from 'socket.io';
import {ISocketController} from '../Interfaces/ISocketController';
import {ISocketLogMessage} from '../Interfaces/ISocketLogMessage';
import {ISocketMessage} from '../Interfaces/ISocketMessage';
import {ISocketService} from '../Interfaces/ISocketService';
import * as moment from 'moment';

export class SocketController implements ISocketController {
	public io: Server;
	socketServices: ISocketService[];


	constructor(io: Server) {
		this.io = io;
		this.socketServices = [];
	}

	public addSocketService(service: ISocketService): void{
		this.socketServices.push(service);
	}

	public getSocketHandler(socket: Socket) {
		const handshake = socket.handshake;
		const clientIp = handshake.address;

		console.log(`[Socket] Client with ip ${clientIp} connected.`);
		this.io.emit('welcome', {});

		// Setup default handlers
		socket.on('error', SocketController.socketOnErrorHandler);
		socket.on('disconnect', SocketController.socketOnDisconnectHandler);

		// set up socket observers
		for (const socketService of this.socketServices) {
			socketService.addSocketObserver(socket);
			console.log(`\t[Socket] Socket Observer from ${socketService.socketName} initialized.`);
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

	private static socketOnErrorHandler(error: any) {
		console.error('[Socket] Error in socket pipeline: ' + error);
	}

	private static socketOnDisconnectHandler(clientIp: string) {
		console.log(`[Socket] Client with ip ${clientIp} disconnected.`);
	}

	public send(topic: string, message: any) {
		const socketMessage: ISocketMessage = {topic: topic, data: message};
		this.io.emit('message', socketMessage);
	}

	private sendInitialStates() {
		for(const socketService of this.socketServices) {
			socketService.sendInitialState();
			console.log(`\t[Socket] Socket ${socketService.socketName} is sending initial state to dashboard.`);
		}
	}




}