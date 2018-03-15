const SerialPort = require('serialport/test');
const WebSocket = require('ws');
const moment = require('moment');
const commandLineArgs = require('command-line-args');

require('moment-duration-format');

// if the timer display is ready
let readyState = false;
const args = [
	{
		name: 'debug',
		alias: 'd',
		type: Boolean,
		defaultValue: false,
	},
	{
		name: 'port',
		alias: 'p',
		type: String,
	},
	{
		name: 'cutHours',
		alias: 'c',
		type: Boolean,
		defaultValue: false,
	},
	{
		name: 'emulate',
		type: Boolean,
		defaultValue: false,
	},
	{
		name: 'wsAdress',
		alias: 'w',
		type: String,
	},
];

const options = commandLineArgs(args);

if (options.emulate) {
	const MockBinding = SerialPort.Binding;
	MockBinding.createPort(options.port, { echo: true, record: true });
	readyState = true;
}

const port = new SerialPort(options.port);
let ws;

function writeMessage(m) {
	if (!readyState) {
		console.log('Attemp to send message, but clock isnt ready');
		return;
	}
	port.write(m, (err) => {
		if (err) {
			console.error(err);
		}
	});
}

function parseTime(d) {
	if (d.t <= 3600 && !options.cutHours) {
		return moment.duration(d.t, 'seconds').format('mm:ss', { trim: false });
	}
	return moment.duration(d.t, 'seconds').format('hh:mm:ss', { trim: false });
}

const initWs = () => {
	const wsTimeout = 5000;
	let timerState = 2;
	ws = new WebSocket(options.wsAdress);

	ws.on('open', () => {
		console.log('WS Connection opened');
	});

	ws.on('message', (data) => {
		const d = JSON.parse(data);
		if (d.dataType === 'timeUpdate') {
			if (options.debug) {
				console.log(`websocket time update data: ${d}`);
			}

			writeMessage(parseTime(d));
		} else if (d.dataType === 'stateUpdate') {
			if (d.state === 2) {
				writeMessage('        ');
			}
		}
	});

	ws.on('close', () => {
		console.log('Websocket disconnected. Reconnecting in 5 seconds');
		setTimeout(initWs, wsTimeout);
	});

	ws.on('error', (e) => {
		console.log(`Websocket error: ${e}`);
	});
};

initWs();

port.on('data', (data) => {
	console.log('Received:\t', data.toString('utf8'));

	if (data.toString('utf-8') === 'clock online') {
		readyState = true;
	}
});

function cleanup() {
	console.log('exiting... closing ws and serial port');
	ws.close(1000);
	port.close();
	process.exit(0);
}

process.on('SIGINT', cleanup);
