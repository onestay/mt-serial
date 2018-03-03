const SerialPort = require('serialport/test');
const WebSocket = require('ws');
const moment = require('moment');
require('moment-duration-format');

const portPath = process.argv[3];

const port = new SerialPort(portPath);
const ws = new WebSocket('ws://localhost:3000/ws');

function writeMessage(m) {
	const b = Buffer.from(m);

	port.write(b, (err) => {
		if (err) {
			console.error(err);
		}
	});
}

ws.on('open', () => {
	console.log('WS Connection opened');
});

ws.on('message', (data) => {
	const d = JSON.parse(data);
	if (d.dataType === 'timeUpdate') {
		if (d.t >= 3600) {
			writeMessage(`time_update ${moment.duration(d.t, 'seconds').format('h:mm:ss', { trim: 'false' })}`);
		} else {
			writeMessage(`time_update ${moment.duration(d.t, 'seconds').format('mm:ss', { trim: 'false' })}`);
		}
	}
});

port.on('data', (data) => {
	console.log('Received:\t', data.toString('utf8'));
});
