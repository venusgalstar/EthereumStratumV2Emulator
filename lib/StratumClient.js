const EventEmitter = require("events").EventEmitter;
const net = require("net");
const { exit } = require("process");


function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

class StratumClient extends EventEmitter {
	constructor(port, host) {
		super();

		console.log("port:", port);
		console.log("host:", host);
		this.socket = net.connect(port, host);

		this.handlers = {};
		this.id = 0;

		let buffer = "";

		this.socket.on('close', function() {
			console.log('Connection closed');
			exit(0)
		});

		this.socket.on("data", data => {
			buffer += data;


			console.log("data", new Buffer(data).toString("ascii"));
			
			const parts = buffer.split("\n");

			buffer = parts.pop();

			for(let part of parts) {
				const object = JSON.parse(part);

				if("result" in object) {
					const handler = this.handlers[object.id];

					if(object.error === null) {
						handler.resolve(object.result);
					} else {
						handler.reject(new Error(handler.error));
					}
				}

				if("params" in object) {
					this.emit(object.method, ...object.params);
				}

			}
		});
	}

	async send(method, ...params) {
		return await new Promise((resolve, reject) => {
			const id = this.id++;

			this.handlers[id] = { resolve, reject };

			this.socket.write(JSON.stringify({
				id,
				method,
				params
			}) + "\n");

			console.log("send", JSON.stringify({
				id,
				method,
				params
			}));

		});
	}
}

module.exports = StratumClient;
