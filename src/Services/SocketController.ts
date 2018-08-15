import {Server, Socket} from 'socket.io';
import {ISocketController} from '../Interfaces/ISocketController';
import {ISocketLogMessage} from '../Interfaces/ISocketLogMessage';
import {ISocketMessage} from '../Interfaces/ISocketMessage';
import {ISocketService} from '../Interfaces/ISocketService';
import * as moment from 'moment';

export class SocketController implements ISocketController {
	public io: Server;
	socketServices: ISocketService[];

	// log the messages
	private readonly topicDictionary: {[id: string]: any};

	constructor(io: Server) {
		this.io = io;

		if (!io) throw Error('IO is not defined.');
		this.socketServices = [];
		this.topicDictionary = {};
	}

	public addSocketService(service: ISocketService): void{
		if (!service.io) throw Error(`The service ${service.socketName} does not have the socket server (io) initialized.`);

		console.log(`\t\t\tSocket ${service.socketName} added`);
		this.socketServices.push(service);

		console.log(`\t\t\tAdd socket actor for ${service.socketName}.`);
		service.initializeSocketActor();
	}

	// see documentation in the interface declaration
	getSocketHandler = (socket: Socket) => {
		const handshake = socket.handshake;
		const clientIp = handshake.address;

		console.log(`[Socket] Client with ip ${clientIp} connected.`);

		if (!this.io) throw Error('the socket server (io) is undefined. Please initialize the controller.');

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
	};

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
		// did we send that topic before? if not log it
		if (this.topicDictionary[topic] === undefined) {
			this.topicDictionary[topic] = message;
			this.log(`[Socket] New Topic: ${topic}`, false);
		}

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