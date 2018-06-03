import {ICalendarEvent, ICalendarRepeatingFrequency} from '../interfaces/Devices/Calendar/ICalendarEvent';

export class CalendarEvent implements ICalendarEvent{

	public calendarName: string;
	public description: string;
	public end: Date;
	public location: string;
	public organizerMail: string;
	public organizerName: string;
	public repeating: ICalendarRepeatingFrequency;
	public sequence: string;
	public start: Date;
	public status: string;
	public summary: string;
	public uid: string;


	constructor(calendarName: string, description: string, end: Date, location: string, organizerMail: string, organizerName: string, sequence: string, start: Date, status: string, summary: string, uid: string) {
		this.calendarName = calendarName;
		this.description = description;
		this.end = end;
		this.location = location;
		this.organizerMail = organizerMail;
		this.organizerName = organizerName;
		this.sequence = sequence;
		this.start = start;
		this.status = status;
		this.summary = summary;
		this.uid = uid;
	}

	public copy(): CalendarEvent {
		const copy = new CalendarEvent(this.calendarName, this.description, this.end, this.location, this.organizerMail, this.organizerName, this.sequence, this.start, this.status, this.summary, this.uid);
		copy.repeating = this.repeating;
		return copy;
	}
}