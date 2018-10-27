# Smart Home Controller Server

This project is a controller express server for the [Smart Home Dashboard](https://github.com/felixSchober/Angular-SmartHomeDashboard). It communicates with the dashboard via via [Socket.io](https://socket.io/).

## Architecture

It is written in typescript which is compiled by grunt.
`AppServer.ts` is the main entry point for the initialisation of the socket services. A "device-service" always consits of two components: 

1. Device Controller Service
2. Socket Service

### Device Controller Service

Provides methods for the socket service to control the devices and also get information about the current device states (e.g. what music is currently playing).

### Socket Service

Have to extend the `BaseSocketService` class. This means the services have to implement three methods

#### `sendInitialState()`

Send the initial state of every device to the receiver (the dashboard client). This method is called each time a new dashboard client connects to the server.

##### Example

Example of a light controller sending light states to the dashboard

```typescript
sendInitialLightStates() {
	const lightController = this.controller as ILightControllerService;

	lightController.getLights()
		.then((result) => this.sendLightState(result))
		.catch((err) => this.socketController.log('Could not get initial light states ' + err, true));
}

private sendLightState(lightStates: AggregatedLightResult) {
	this.socketController
	    .send(this.socketMessageIdentifier + '_CountTotal', lightStates.totalCount);
	this.socketController
	    .send( this.socketMessageIdentifier + '_CountOn', lightStates.onCount);
	this.socketController
	    .send( this.socketMessageIdentifier + '_CountOff', lightStates.offCount);

	// send individual light states
	for(const l of lightStates.lights){
		this.socketController.send(this.socketMessageIdentifier + '_' + l.name, l.stateOn);
	}
}
```

#### `addSocketObserver()`

This method is called when a new dashboard client (re)connects to the server. It registers the client and listens for commands from the client with `socket.on(...)`.

##### Example

Example of a light controller receiving light commands from a dashboard client.

```typescript
public addSocketObserver(socket: Socket) {
	this.sockets.push(socket);

	// LIGHT EVENTS
	this.socketController
	    .log(`[Socket] New Observer for topic ${this.socketMessageIdentifier}`, false);
	socket.on(this.socketMessageIdentifier, (command: ISwitchStateChangeCommand) => {
		if (!command) {
			const logMessage = '[Lights] Received light change command via socket but message is invalid';
			this.socketController.log(logMessage, false);
			return;
		}

		const lightController = this.controller as ILightControllerService;
		let promise: Promise<boolean>;

		if (command.state === 'toggle') {
			promise = lightController.toggleLightState(command.name);
		} else {
			const state = command.state === 'on';
			promise = lightController.setLightState(command.name, state);
		}

		// execute promise
		promise.then((newState: boolean) => {
			this.socketController.log(
				'[Lights] State change successful. New State for Light ' + command.name + ': ' + newState, false);

			// send new state
			this.socketController
			.send(this.socketMessageIdentifier + '_' + command.name, newState);
		})
		.catch((err) => this.socketController.log(
				'[Lights] State change NOT successful. Light Name ' + command.name + ' - Error: ' + err, true));
	});
}
```

#### `sendUpdates()`

This method is periodically called whenever there is a scheduled update. The interval can be configured with the last constructor parameter `pollingIntervalRule?: PollingIntervalRule`.

It is important that this method is not an instance method but a variable with type `sendUpdates: () => void`.

##### Example

Example of a light controller sending updated light states

```typescript
public sendUpdates = () => {
		const lightController = this.controller as ILightControllerService;
		lightController.getCachedLightStateIfPossible()
			.then((result) => this.sendLightState(result))
			.catch((err) => this.socketController.log('Could not get light states ' + err, true));
};
```