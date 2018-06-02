import {Job, RecurrenceRule, scheduleJob} from 'node-schedule';
import {IDeviceController} from '../../interfaces/IDeviceController';
import {ISocketController} from '../../interfaces/ISocketController';
import {ISocketService} from '../../interfaces/ISocketService';
import { Socket, Server } from '@types/socket.io'


export abstract class BaseSocketService implements ISocketService {
	public socketName: string;
	public socketMessageIdentifier: string;
	protected sockets: Socket[];
	protected io: Server;
	public controller: IDeviceController;
	public socketController: ISocketController;
	pollingInterval: number;


	protected constructor(socketName: string, io: Server, pollingInterval: number, socketMessageIdentifier: string, controller: IDeviceController, socketController: ISocketController) {
		this.socketName = socketName;
		this.socketMessageIdentifier = socketMessageIdentifier;
		this.pollingInterval = pollingInterval;
		this.io = io;
		this.controller = controller;
		this.socketController = socketController;
		this.sockets = [];
	}

	public initializeSocketActor(): Job{
		const rule = new RecurrenceRule('*',
			'*',
			'*',
			'*',
			'*',
			'*',
			'*/' + this.pollingInterval);

		return scheduleJob(rule, this.sendUpdates);
	}

	protected abstract addSocketObserver(socket: Socket);


	protected abstract sendInitialState();

	protected abstract sendUpdates();


}