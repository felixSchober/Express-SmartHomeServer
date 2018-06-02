import {CoreOptions, Options} from 'request';
import * as request from 'request';
import {openHab} from './config/openHab';
import {IRequestResponse} from './interfaces/IRequestResponse';
import {ITuple} from './interfaces/ITuple';
import {IValueType} from './interfaces/IValueType';
import * as moment from 'moment';


export class Helpers {

	public static getFirstAndLastDayOfWeek(): ITuple<Date, Date> {
		let today, todayNumber, mondayNumber, sundayNumber, monday, sunday;
		today = new Date();
		todayNumber = today.getDay();
		mondayNumber = 1 - todayNumber;
		sundayNumber = 7 - todayNumber;
		monday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+mondayNumber);
		sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+sundayNumber );

		return {obj1: monday, obj2: sunday};
	}

	public static getFirstDayOfCurrentMonth(): Date {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1 );
	}

	public static addDaysToDate(date: Date, days: number): Date {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	public static performRequest (options: Options, sender: string, debug: boolean, parseJson?: boolean): Promise<IRequestResponse> {
		return new Promise(function (resolve, reject) {

			if (debug) {
				console.log(sender + '\t' + options.method + ' REQUEST: ' + options.baseUrl);
			}

			// default for parseJson is true
			parseJson = parseJson || true;

			request(options, function (err: string, response: any, body: any) {
				if (err) {
					console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Error while connecting to URI. Error: ' + err);
					reject(err);
					return;
				}

				if (!response) {
					console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Response was null.');
					reject('response was null');
					return;
				}

				const res: IRequestResponse = {status: response.statusCode, data: null};

				if ((response.statusCode !== 200 || response.statusCode !== 204) && (body == null || body === '')) {
					console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Body was empty but status is 200 OK');
					reject(res);
					return;
				}


				// already parse data if response is 200
				if (response.statusCode === 200) {
					if (parseJson) {
						try {
							res.data = JSON.parse(body);
						} catch (err) {
							console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - JSON could not parse body although status is 200 OK and parseJSON is ' + parseJson + '\n More details: \n');
							console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - ERROR: ' + err);
							console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - STACK:' + err.stack);
							console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Response BODY' + body);

							res.data = body;
						}
					}
				} else {
					console.error('[' + sender + ']:\tperformRequest(' + options.baseUrl + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Status is not 200 OK. STATUS: ' + response.statusCode);
					res.data = body
				}

				resolve(res);
			});
		});
	}

	public static sortValueListDescending(list: IValueType[]): IValueType[] {
		list.sort(function (a, b) {

			if (a.value < b.value) return 1;
			if (a.value > b.value) return -1;
			return 0;
		});
		return list;
	}

	public static sortValueListAscending(list: IValueType[]): IValueType[] {
		list.sort(function (a, b) {

			if (a.value > b.value) return 1;
			if (a.value < b.value) return -1;
			return 0;
		});
		return list;
	}

	public static doOpenHabGetRequest(path: string): Promise<IRequestResponse> {
		const options: Options = {
			url: 'http://' + openHab.url + ':' + openHab.port + '/rest/' + path,
			method: 'GET'
		};
		return Helpers.performRequest(options, '[OPENHAB]', true);
	}

	public static doOpenHabPostRequest(path: string, body: any): Promise<IRequestResponse> {
		const options: Options = {
			uri: 'http://' + openHab.url + ':' + openHab.port + '/rest/' + path,
			method: 'POST',
			body: body
		};
		return Helpers.performRequest(options, '[OPENHAB]', true, false);
	};

	public static checkIfDateToday (d: Date): boolean {
		const today = new Date();
		return (d.setHours(0, 0, 0, 0) == today.setHours(0, 0, 0, 0));
	}

	public static checkIfDateTomorrow(d: Date): boolean {
		// create tomorrow object
		const today = moment();
		const tomorrow = today.add(1, 'days').toDate();
		return (d.setHours(0, 0, 0, 0) == tomorrow.setHours(0, 0, 0, 0));
	}

	public static displayWelcomeMessage(): void {
		console.log('   _____                      _   _    _                         _____                          ');
		console.log('  / ____|                    | | | |  | |                       / ____|                         ');
		console.log(' | (___  _ __ ___   __ _ _ __| |_| |__| | ___  _ __ ___   ___  | (___   ___ _ ____   _____ _ __ ');
		console.log('  \\___ \\| \'_ ` _ \\ / _` | \'__| __|  __  |/ _ \\| \'_ ` _ \\ / _ \\  \\___ \\ / _ \\ \'__\\ \\ / / _ \\ \'__|');
		console.log('  ____) | | | | | | (_| | |  | |_| |  | | (_) | | | | | |  __/  ____) |  __/ |   \\ V /  __/ |   ');
		console.log(' |_____/|_| |_| |_|\\__,_|_|   \\__|_|  |_|\\___/|_| |_| |_|\\___| |_____/ \\___|_|    \\_/ \\___|_|   ');
		console.log('\n\n\n');
	}
}