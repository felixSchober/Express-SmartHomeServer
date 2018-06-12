import {Job, RecurrenceRule, scheduleJob} from 'node-schedule';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {IPollingIntervalRule} from '../../Interfaces/IPollingIntervalRule';
import {ISocketController} from '../../Interfaces/ISocketController';
import {ISocketService} from '../../Interfaces/ISocketService';
import {Server, Socket} from 'socket.io';


export abstract class BaseSocketService implements ISocketService {
	public socketName: string;
	public socketMessageIdentifier: string;
	protected sockets: Socket[];
	public io: Server;
	public controller: IDeviceController;
	public socketController: ISocketController;
	pollingIntervalRule: IPollingIntervalRule;
	pollingInterval: number;


	protected constructor(socketName: string, io: Server, socketMessageIdentifier: string, controller: IDeviceController, socketController: ISocketController, pollingIntervalRule?: IPollingIntervalRule) {
		this.socketName = socketName;
		this.socketMessageIdentifier = socketMessageIdentifier;
		this.pollingIntervalRule = pollingIntervalRule || {second: '*', minute: '*/15', hour: '*', day: '*'};
		this.pollingInterval = 15;
		this.io = io;
		this.controller = controller;
		this.sockets = [];

		this.socketController = socketController;
		this.socketController.addSocketService(this);
	}

	public initializeSocketActor(): Job{
		const rule = new RecurrenceRule('*',
			'*',
			'*',
			'*',
			this.pollingIntervalRule.hour,
			this.pollingIntervalRule.minute,
			this.pollingIntervalRule.second);

		return scheduleJob(rule, this.sendUpdates);
	}

	public abstract addSocketObserver(socket: Socket) : void;

	public abstract sendInitialState() : void;

	public abstract sendUpdates() : void;


}