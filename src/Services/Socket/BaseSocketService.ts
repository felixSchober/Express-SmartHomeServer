import {Job, RecurrenceRule, scheduleJob} from 'node-schedule';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {PollingIntervalRule} from '../../Interfaces/PollingIntervalRule';
import {ISocketController} from '../../Interfaces/ISocketController';
import {ISocketService} from '../../Interfaces/ISocketService';
import {Server, Socket} from 'socket.io';
import * as moment from 'moment';


export abstract class BaseSocketService implements ISocketService {
	public socketName: string;
	public socketMessageIdentifier: string;
	protected sockets: Socket[];
	public io: Server;
	public controller: IDeviceController;
	public socketController: ISocketController;
	pollingIntervalRule: PollingIntervalRule;
	pollingInterval: number;
	public sendUpdates: () => void;


	protected constructor(socketName: string, io: Server, socketMessageIdentifier: string, controller: IDeviceController, socketController: ISocketController, pollingIntervalRule?: PollingIntervalRule) {
		this.socketName = socketName;
		this.socketMessageIdentifier = socketMessageIdentifier;
		this.pollingIntervalRule = pollingIntervalRule || new PollingIntervalRule(10);
		this.pollingInterval = this.pollingIntervalRule.getSeconds();
		this.io = io;
		this.controller = controller;
		this.sockets = [];

		this.socketController = socketController;
		this.socketController.addSocketService(this);
	}

	public initializeSocketActor(): Job{
		const rule = this.pollingIntervalRule.createScheduleRecurrenceRule();
		return scheduleJob(rule, () => {
			console.log(`[Schedule] (${moment().format('HH:mm:ss')}) > ${this.socketName}`);
			this.sendUpdates();
		});
	}

	public abstract addSocketObserver(socket: Socket) : void;

	public abstract sendInitialState() : void;
}