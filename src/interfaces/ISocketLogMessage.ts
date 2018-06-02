import {Moment} from 'moment';

export interface ISocketLogMessage {
	time: Moment;
	message: string;
	isError: boolean;
}