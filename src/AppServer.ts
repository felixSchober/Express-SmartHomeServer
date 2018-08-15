import * as bodyParser from 'body-parser';
import * as cookieParser from "cookie-parser";
import * as express from "express";
import {Server} from 'http';
import * as http from 'http';
import * as logger from "morgan";
import * as path from "path";
import {Helpers} from './Helpers';
import errorHandler = require("errorhandler");
import * as SocketIO from "socket.io";
import {ISocketController} from './Interfaces/ISocketController';
import {ISocketService} from './Interfaces/ISocketService';
import {CalendarService} from './Services/Devices/CalendarService';
import {HarmonyService} from './Services/Devices/HarmonyService';
import {HueService} from './Services/Devices/HueService';
import {PowerService} from './Services/Devices/PowerService';
import {CalendarSocketService} from './Services/Socket/CalendarSocketService';
import {HarmonySocketService} from './Services/Socket/HarmonySocketService';
import {LightSocketService} from './Services/Socket/LightSocketService';
import {PowerSocketService} from './Services/Socket/PowerSocketService';
import {SocketController} from './Services/SocketController';
import {ClimateSocketService} from "./Services/Socket/ClimateSocketService";
import {iTunesService} from "./Services/Devices/iTunesService";
import {ITunesSocketService} from "./Services/Socket/iTunesSocketService";

export class AppServer {

	public app: express.Application;
	public server : Server;

	/**
	 * Bootstrap the application by providing
	 *
	 * @class AppServer
	 * @method bootstrap
	 * @static
	 * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
	 */
	public static bootstrap(): AppServer {
		return new AppServer();
	}

	/**
	 * Constructor.
	 *
	 * @class AppServer
	 * @constructor
	 */
	constructor() {

		Helpers.displayWelcomeMessage();

		//create expressjs application
		this.app = express();
		this.server = http.createServer();

		//configure application
		this.config();

		// configure database
		this.setupDatabase();

		//add sockets
		this.socketSetup();
	}


	/**
	 * Configure application
	 *
	 * @class AppServer
	 * @method config
	 */
	private config() {

		console.log('######################################### CONFIG #########################################\n');

		//add static paths
		this.app.use(express.static(path.join(__dirname, "public")));
		console.log('\t\tUse public dir ' + path.join(__dirname, "public"));

		//configure pug
		this.app.set("views", path.join(__dirname, "views"));
		this.app.set("view engine", "pug");
		console.log('\t\tUse views ' + path.join(__dirname, "views"));


		//use logger middleware
		this.app.use(logger("dev"));
		console.log('\t\tUse morgan as logger middleware');


		//use json form parser middleware
		this.app.use(bodyParser.json());
		console.log('\t\tUse json body parser');


		//use query string parser middleware
		this.app.use(bodyParser.urlencoded({
			extended: true
		}));
		console.log('\t\tUse query parser');


		//use cookie parser middleware
		this.app.use(cookieParser("SECRET_GOES_HERE"));
		console.log('\t\tUse cookie parser');


		//catch 404 and forward to error handler
		this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
			err.status = 404;
			next(err);
		});
		console.log('\t\tUse 404 error handler');


		//error handling
		this.app.use(errorHandler());

		console.log('\n##########################################################################################\n\n')
	}

	private setupDatabase(){
		console.log('######################################## DATABASE ########################################\n');

		// TODO: add mongo db
		//const database = require('./config/database');
		//database.connect(database.remoteUrl);

		console.log('\n##########################################################################################\n\n');
	}

	private socketSetup(){
		console.log('######################################### SOCKET #########################################\n');
		const io = SocketIO.listen(this.server);

		// create the socket controller service
		console.log('\t\tInitializing socket controller');
		const socketController = new SocketController(io);

		// create the device services
		console.log('\t\tCreating device controllers');
		const calendarService = new CalendarService();
		const harmonyService = new HarmonyService();
		const hueService = new HueService(10 * 60, 10);
		const powerService = new PowerService(hueService, 10);
		const musicService = new iTunesService();

		// Load socket modules
		console.log('\t\tCreating socket device controllers');
		//const calendar: ISocketService = new CalendarSocketService('Calendar', io, 'calendar', calendarService, socketController);
		const harmony = new HarmonySocketService('Harmony', io, 5, 'harmony', harmonyService, socketController);
		const hue = new LightSocketService('Light', io, 10, 'lights', hueService, socketController);
		const hueTemp = new ClimateSocketService('HueTemp', io, 10, 'hueTemp', hueService, socketController);
		const power = new PowerSocketService('Power', io, 10, 'power', powerService, socketController);
		const musicSocket = new ITunesSocketService('music', io, 10, 'music', musicService, socketController);

		console.log('\t\tRegistering socket connection handler');
		io.on('connection', socketController.getSocketHandler);
		console.log('\n##########################################################################################\n\n')
	}



}