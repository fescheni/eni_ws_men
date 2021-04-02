///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// WEBSERVER Pi
/// V.1.89.35 Logfile und HOF
///
/// 30.03.21
///////////////////////////////////////////////////////////

var http = require('http').createServer(ENI_ReqResHandler); //require http server, and create server with function ENI_ReqResHandler
var fs = require('fs'); //require filesystem module
var fsA = require('fs'); 
var io = require('socket.io')(http) //require socket.io module and pass the http object (server)
var Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
var LED_gn = new Gpio(4, 'out'); //use GPIO pin 4 as output
var LED_rt = new Gpio(27, 'out'); //use GPIO pin 27 as output
// // // var LED_gn2 = new Gpio(22, 'out'); //use GPIO pin 22 as output
var PushButton = new Gpio(17, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases shoul$

// ISM Intertechno
const pigpio = require('pigpio');
const GPIOISM = pigpio.Gpio;
const GPIO_ISM = 22;	// ISM Output für Radio On-Off-Keying
const ISMout = new GPIOISM(GPIO_ISM, {mode: GPIOISM.ISMout});
const sync = 2700;    // microseconds
const s_pulse = 250;
const s_gap = 300;
const l_gap = 1300;
const pause = 10200;

// ISM Tormax
const g_s_pulse = 550;	// microseconds
const g_s_gap = 480;
const g_l_pulse = 1000;
const g_l_gap = 1000;
const g_pause = 1750;

var clickD1Count = 0;
var TMP_Data = "";
var TMP_Status = "";
var util = require('util');
var UsersConnected = [];
var XBeeVal1 = [];
var XBeeValA = [];
var XBeeValB = [];

// Read and log CONFIGURATION File
console.log("--- ENI_CONFIG ---");
let ENI_CONFIG = require('./data/ENI_config.json');
// // // console.log(ENI_CONFIG);
// // // console.log("---");
// // // console.log(ENI_CONFIG.XBeeMAC[1]);
// // // console.log(ENI_CONFIG.XBeePA1[0]);
// // // console.log(ENI_CONFIG.MarkisenCmSek);
// // // console.log(ENI_CONFIG.StuDekoOFF);
// // // console.log("---");
for (intInit = 1; intInit < ENI_CONFIG.XBeeMAC.length; intInit = intInit + 2) {
	console.log("  :: " + ENI_CONFIG.XBeeMAC[intInit]);
}
console.log("--- ENI_CONFIG END ---");

// HTML REQ RES HANDLER
http.listen(8083); //listen to port 8083
console.log('Rasp Webserver ENI is running listening on port 8083 ... MQTT t');

function ENI_ReqResHandler (req, res) { //create server with req=Request and res=Response
  fs.readFile(__dirname + '/public/index.html', function(err, data) { //read file index.html in public folder
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 on error
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
    res.write(data); //write data from index.html
    return res.end();
  });
}

// SOCKET CONNECTION
io.on("connection", function(socket) {
	/////socket.join('mein_raum');
	var LED_Status = 0; //static variable for current status

	// *** Abhängig von SERVER LOCATION / RPI-SERIAL > Elemente in index.html ein-oder ausblenden
	var RpiSerial = ENIserial();  // Read Raspberry-Pi SERIAL NUMBERin File: /proc/cpuinfo, Eintrag gegen Ende: <Serial   : 00000000070e92f5>
	console.log("ON CONNECTION: RpiSerial of Board: " + RpiSerial);
	if (RpiSerial == "00000000070e92f5") {
		socket.emit("men/sys/ServerLocation", ["MEN", ENI_CONFIG.BezMain, ENI_CONFIG.XBeeMAC[2], ENI_CONFIG.XBeeMAC[4], ENI_CONFIG.XBeeMAC[6], ENI_CONFIG.XBee_3_Bez[0], ENI_CONFIG.XBee_3_Bez[1]]);
		// // // socket.emit("men/sys/ServerLocation", ["MEN", ENI_CONFIG.BezMain, ENI_CONFIG.XBeeMAC[2], ENI_CONFIG.XBeeMAC[4], ENI_CONFIG.XBeeMAC[6]]);
	} else {
		socket.emit("men/sys/ServerLocation", ["OTHER", ENI_CONFIG.BezMain, ENI_CONFIG.XBeeMAC[2], ENI_CONFIG.XBeeMAC[4], ENI_CONFIG.XBeeMAC[6]]);
	};

	// *** Abhängig von USER-URL > Elemente in index.html ein-oder ausblenden
	var UserURL = socket.handshake.headers.referer;
	if (UserURL.substr(UserURL.length - 5) == "eniqx") {
		socket.emit("men/sys/UserURL", "ADMIN");
		console.log("USR URL: " + "eniqx");
	} else {
		socket.emit("men/sys/UserURL", "OTHER");
		console.log("USR URL: " + "NOT eniqx");
	};

	// *** READ File
	// // // fs.readFile('/home/pi/eni_nodejs/test.dat', 'utf8', function(errX, dataX) {
		// // // console.log("DATA DATA DATA: " + dataX);
		// // // socket.emit("men/XBee/LOG", dataX);
	// // // });
		
	// // // io.emit("men/Server", "Server: TEST: " + "  " + Date());

		
///////////////////////////////////////////////////////////////////////////////////////////////////////
				// // [  ] Ab hier VERSUCHE mit IsLocalRpi und SERIAL-NUMBER und File ENI_configTEST.json
		// var ENI_CONFIG_TMP = util.inspect(require('./data/ENI_configTEST.json'));
				// // // var ENIdatSync = fsA.readFileSync('./data/ENI_configTEST.json', 'utf8'); 
				// Display the file data 
				
		// console.log("ON CONNECTION: ENI_CONFIG_TMP: : " + ENI_CONFIG_TMP); 

				// // // // // fsA.open('./data/ENI_configTEST.json', 'r', function (err, f) { 
					// // // // // console.log("MENserialConfig: fsA.open: " + f); 
				// // // // // }); 
				// // END: VERSUCHE mit IsLocalRpi und SERIAL-NUMBER
///////////////////////////////////////////////////////////////////////////////////////////////////////
	
	// USER HANDLING: CONNECTED 
	UsersConnected.push(" * " + Date().substr(0,24) + " [" + socket.id + "] " + socket.handshake.address);

	console.log("*** Server: User connected: " + " [" + socket.id + "] " + socket.handshake.address);
	io.emit("men/users/connected", "User connected: " + " [" + socket.id + "] " + socket.handshake.address
	+ "<br> socket.handshake.headers.referer: " + socket.handshake.headers.referer
	+ "<br> socket.handshake.url : " + socket.handshake.url
	+ "<br> socket.request.headers.cookie: " + socket.request.headers.cookie);
	// // // + "<br><br> INSPECT(socket.handshake): " + util.inspect(socket.handshake)
	// // + "<br><br> INSPECT(socket.request): " + util.inspect(socket.request)


	socket.on("men/users/connected", function(msg) {
		var strTmp = "";
		for (var i = 0; i < UsersConnected.length; i++) {
			strTmp += "<br>" + UsersConnected[i];
		}
		io.emit("men/users/connected", "Users connected:" + strTmp);
	});

	// BUTTON WATCH on RPi 
	PushButton.watch(function (err, value) { //Watch for hardware interrupts on PushButton
		if (err) { //if an error
		console.error('There was an error', err); //output error message to console
		return;
		}
		LED_Status = value;
		socket.emit('men/rasp/but1', LED_Status); //send button status to client
	});

	// INTERVAL
    // Interval immer schliessen! in socket.on("disconnect" ...
	// https://swizec.com/blog/kids-always-remember-to-clear-your-intervals
	var myInterval = setInterval(function timeout() {

			// TEST: Sichtbare Bereiche abhängig von User
			// // // io.emit("men/sys/visible", 1);
			// // // // // if (intVISIBLE == 1) {intVISIBLE = 0}else {intVISIBLE = 1};
			// // // // // io.emit("men/sys/visible", intVISIBLE);
		
		// Display Zufallszahl und Datum/Zeit
		intZufall = getRndInteger(1, 9);
        io.emit("men/Server", "Server (rnd): " + intZufall + "&nbsp&nbsp&nbsp&nbsp&nbsp" + Date().substr(0, 24));
      }, 1000);
	
	socket.on('men/rasp/but1', function(data) { //get men/rasp/but1 switch status from client
		LED_Status = data;
		// MQTT PUBLISH
		client.publish('eni/D1_01/TASTER','1'); // MQTT publish
		// LED GN UPDATE
		console.log('men/rasp/but1: ' + LED_Status);
		if (LED_Status != LED_gn.readSync()) { //only change LED_gn if status has changed
			LED_gn.writeSync(LED_Status); //turn LED_gn on or off
		}
		// // StubeGNklein(0);
	});
		
	socket.on("men/Rpi/LEDrt", function() {
		// Kugel D1 aktuell LED RED auf Rpi
		// Toggle LED
		TMP_Data = LED_rt.readSync();
		if (TMP_Data == "1") {
			LED_rt.writeSync(0);
		} else if (TMP_Data == "0") {
			LED_rt.writeSync(1);
		} else {
		}
		// Status Read
		TMP_Data = LED_rt.readSync();
		if (TMP_Data == "1") {
			TMP_Status = "red";
		} else if (TMP_Data == "0") {
			TMP_Status = "grey";
		} else {
			TMP_Status = "white";
		}
		// Status Send
		io.emit("men/Rpi/LEDrt", TMP_Status);
		console.log("men/Rpi/LEDrt: " + TMP_Status);
		// // StubeGNklein(1);
	});

	socket.on("men/XBee/LOG", async function() {
		// *** READ File
		fs.readFile('/home/pi/eni_nodejs/data/log.dat', 'utf8', function(errX, dataX) {
			console.log("DATA: LOGFILE: " + dataX);
			socket.emit("men/XBee/LOG/disp", dataX);
		});
	});

	socket.on("men/XBee/HOF", async function() {
		// *** READ File
		fs.readFile('/home/pi/eni_nodejs/data/HallOfFame.dat', 'utf8', function(errX, dataX) {
			console.log("DATA: HallOfFame: " + dataX);
			socket.emit("men/XBee/HOF/disp", dataX);
		});
	});


	socket.on("men/Xbee/Status", async function() {
		// // console.log("Server: before Xbee_Status_Request()");
		console.log("-------------------------------------------------");
		console.log("-------------------------------------------------");
		console.log("--- men/XBee/Status: ");

		// Loop für Statusabfrage von allen XBee's
		for (intStatus = 3; intStatus < ENI_CONFIG.XBeeMAC.length; intStatus = intStatus + 2) {
			XBeeMACsta = ENI_CONFIG.XBeeMAC[intStatus];
				console.log("  :: XBee/Status: XBeeMACsta: " + XBeeMACsta);
			XBeeStatusSelect = "ALL_PINS";	// In XBee.OnData alle Pins updaten
			Xbee_Status_Request(XBeeMACsta);
			await mySleep(150);
		}
	});

	socket.on("men/XBee", async function(XData) {
		// XBee PARSER
		console.log("-------------------------------------------------");
		console.log("-------------------------------------------------");
		console.log("--- men/XBee: " + XData);
		
		XBeeNr1 = XData[0];
		XBeeIO1 = XData[1];
		XBeeVal1[0] = XData[2];
		// Symbolischer Name XBeeName1 der XBeeMAC zuweisen
		// // // XBeeName1 = ENI_CONFIG.XBeeMAC[XBeeNr1 * 2];
		XBeeMAC = ENI_CONFIG.XBeeMAC[XBeeNr1 *2 + 1]; // XBeeMAC aufgrund von XBee-Nummer bestimmen
		// // // for (intXBeeLoop = 2; intXBeeLoop < ENI_CONFIG.XBeeMAC.length; intXBeeLoop = intXBeeLoop + 2) {
			// // // if (XBeeName1 == ENI_CONFIG.XBeeMAC[intXBeeLoop]) {
				// // // XBeeMAC = ENI_CONFIG.XBeeMAC[intXBeeLoop + 1];
			// // // }	
		// // // }

		// Button Color für XBee 1-3 zuordnen
		if (XBeeNr1 == 1) {
			XBeeColor1 = ENI_CONFIG.XBee_1_Col;
		}
		if (XBeeNr1 == 2) {
			XBeeColor1 = ENI_CONFIG.XBee_2_Col;
		}
		if (XBeeNr1 == 3) {
			XBeeColor1 = ENI_CONFIG.XBee_3_Col;
		}
		
		// Status Request
		XBeeStatusSelect = "ONE_PIN";	// In XBee.OnData nur ein Pin updaten
		console.log("--- men/XBee: VOR Status_Request");
		Xbee_Status_Request(XBeeMAC);
		// ... warten nach Status Request ...
		console.log("--- men/XBee: VOR await");
		await mySleep(100);	// Wartezeit bis XBee Status ausgewertet: <= 65 ms ist zu kurz, ab 70 ms ist OK
		console.log("--- men/XBee: NACH await");

		// Status auswerten und entsprechend Value toggle ...
		console.log("--- men/XBee: XBeeIO1:       " + XBeeIO1);
		console.log("--- men/XBee: XBeeDigSampl: ", XBeeDigSampl);
		XBeeVal1[0] = XBeeDigSampl.digitalSamples[XBeeIO1];
		console.log("--- men/XBee: XBeeVal1[0]:      " + XBeeVal1[0]);
		if (XBeeVal1[0] == 1) {
			XBeeVal1[0] = [0x04];	// OFF
			XBeeLog1 = "off";
		} else {
			XBeeVal1[0] = [0x05];	// ON
			XBeeLog1 = "on";
		}

		// XBeeIO1 konvertieren und neue Value senden
		if (XBeeIO1 == "DIO0") {XBeeIO1 = "D0"; XBeeVal1[1] = XBeeColor1[0]};
		if (XBeeIO1 == "DIO1") {XBeeIO1 = "D1"; XBeeVal1[1] = XBeeColor1[1]};
		if (XBeeIO1 == "DIO2") {XBeeIO1 = "D2"; XBeeVal1[1] = XBeeColor1[2]};
		if (XBeeIO1 == "DIO3") {XBeeIO1 = "D3"; XBeeVal1[1] = XBeeColor1[3]};
		if (XBeeIO1 == "DIO4") {XBeeIO1 = "D4"; XBeeVal1[1] = XBeeColor1[4]};
		if (XBeeIO1 == "DIO5") {XBeeIO1 = "D5"; XBeeVal1[1] = XBeeColor1[5]};
		if (XBeeIO1 == "DIO6") {XBeeIO1 = "D6"; XBeeVal1[1] = XBeeColor1[6]};
		if (XBeeIO1 == "DIO7") {XBeeIO1 = "D7"; XBeeVal1[1] = XBeeColor1[7]};
		if (XBeeIO1 == "DIO10") {XBeeIO1 = "P0"; XBeeVal1[1] = XBeeColor1[8]};
		if (XBeeIO1 == "DIO11") {XBeeIO1 = "P1"; XBeeVal1[1] = XBeeColor1[9]};
		if (XBeeIO1 == "DIO12") {XBeeIO1 = "P2"; XBeeVal1[1] = XBeeColor1[10]};
		XBee_AT_Request(XBeeMAC, XBeeIO1, XBeeVal1[0]);
		// Button update
		// // // console.log("--- men/XBee/" + XBeeName1 + "/" + XBeeIO1 + "  XBeeVal1[0]: " + XBeeVal1[0]);
		io.emit("men/XBee/"  + XBeeNr1 + "/" + XBeeIO1, XBeeVal1); // XBee Anzeige auf GUI updaten
		
		// *** LOG File append
		fs.appendFile('/home/pi/eni_nodejs/data/log.dat', " * " + Date().substr(0,24) + " [" +  socket.handshake.address + "] XBee: " + XBeeNr1 + " " + XBeeIO1 + " " + XBeeLog1, function() {
			// // // 
		});
	});

	socket.on("men/XBee/progA", async function(XDataA) {
		console.log("PROG A ----------------------------------------------------");
		XBeeProgA = XDataA;
		switch (XBeeProgA) {
			// LED Programm Gruppe A
			case 11:
				ProgDauerA = ENI_CONFIG.XBeePA1[1];
				ProgLEDminA = ENI_CONFIG.XBeePA1[2];
				ProgLEDmaxA = ENI_CONFIG.XBeePA1[3];
				ProgLEDinclA = ENI_CONFIG.XBeePA_IO;
				break;
			case 12:
				ProgDauerA = ENI_CONFIG.XBeePA2[1];
				ProgLEDminA = ENI_CONFIG.XBeePA2[2];
				ProgLEDmaxA = ENI_CONFIG.XBeePA2[3];
				ProgLEDinclA = ENI_CONFIG.XBeePA_IO;
				break;
		};

		P1_timeA = Date.now() + ProgDauerA * 1000;	// Aktuelle Zeit (in Millisekunden seit 1. Jan. 1970) + Programmdauer
		while (Date.now() <= P1_timeA) {
			// console.log("P1 WHILE 1");

			switch (XBeeProgA) {
				// LED Programm Gruppe A
				case 11:
					XBeeLOCp1 = 1;
					XBeeMACp1 = ENI_CONFIG.XBeeMAC[3];
					XBeeColorA = ENI_CONFIG.XBee_1_Col;
					XBeeEmitA = "PA1";
					break;
				case 12:
					XBeeLOCp1 = 1;
					XBeeMACp1 = ENI_CONFIG.XBeeMAC[3];
					XBeeColorA = ENI_CONFIG.XBee_1_Col;
					XBeeEmitA = "PA2";
					break;
			};

			io.emit("men/XBee/" + XBeeEmitA, "yellow");
			await mySleep(200);
			io.emit("men/XBee/" + XBeeEmitA, "blue");

			// Pause zwischen LED
			XtimeA = getRndInteger(ProgLEDminA, ProgLEDmaxA) * 1000;
			await mySleep(XtimeA);
		
			// Diödeli welche in P1 einbezogen sind und Zufallsauswahl
			IOforP1 = ProgLEDinclA;
			IOrndA = getRndInteger(0, IOforP1.length - 1);
			IOactA = IOforP1[IOrndA];

			// XBee Status Request
			console.log("*** --- PROG vor Status_Request: IOactA: " + IOactA + "  XBeeMACp1: " + XBeeMACp1);
			XBeeStatusSelect = "ONE_PIN";	// In XBee.OnData nur ein Pin updaten
			Xbee_Status_Request(XBeeMACp1);
			// ... warten nach Status Request ...
			await mySleep(100);	// Wartezeit bis XBee Status ausgewertet: <= 65 ms ist zu kurz, ab 70 ms ist OK

			// Update Status
			io.emit("men/xbee/pA_disp", "PA XBee random: IOactA: " + IOactA + " digitalSample: " + XBeeDigSampl.digitalSamples[IOactA]);
			
			// Status auswerten und entsprechend Value toggle ...
			if (XBeeDigSampl.digitalSamples[IOactA] == 1) {
				XBeeValA[0] = [0x04];	// OFF
			} else {
				XBeeValA[0] = [0x05];	// ON
			}
			// Neue Value senden ...
			if (IOactA == "DIO0") {IOactA = "D0"; XBeeValA[1] = XBeeColorA[0]};
			if (IOactA == "DIO1") {IOactA = "D1"; XBeeValA[1] = XBeeColorA[1]};
			if (IOactA == "DIO2") {IOactA = "D2"; XBeeValA[1] = XBeeColorA[2]};
			if (IOactA == "DIO3") {IOactA = "D3"; XBeeValA[1] = XBeeColorA[3]};
			if (IOactA == "DIO4") {IOactA = "D4"; XBeeValA[1] = XBeeColorA[4]};
			if (IOactA == "DIO5") {IOactA = "D5"; XBeeValA[1] = XBeeColorA[5]};
			if (IOactA == "DIO6") {IOactA = "D6"; XBeeValA[1] = XBeeColorA[6]};
			if (IOactA == "DIO7") {IOactA = "D7"; XBeeValA[1] = XBeeColorA[7]};
			if (IOactA == "DIO10") {IOactA = "P0"; XBeeValA[1] = XBeeColorA[8]};
			if (IOactA == "DIO11") {IOactA = "P1"; XBeeValA[1] = XBeeColorA[9]};
			if (IOactA == "DIO12") {IOactA = "P2"; XBeeValA[1] = XBeeColorA[10]};
			console.log("*** --- PROG A vor AT_Request");
			XBee_AT_Request(XBeeMACp1, IOactA, XBeeValA[0]);
			// Button update
			io.emit("men/XBee/" + XBeeLOCp1 + "/" + IOactA, XBeeValA);
		};
		io.emit("men/XBee/" + "PA1", "blueviolet");
		io.emit("men/XBee/" + "PA2", "blueviolet");
		
		// Wenn Programm Ende
		if (XBeeProgA == 12 || XBeeProgA == 22) {
			await mySleep(500);
			iProgEndA = 0;
			do {
				IOactA = ProgLEDinclA[iProgEndA];
				// // console.log("*** --- PROG END: FOR LOOP: iProgEndA: " + iProgEndA + "  IOactA: " + IOactA + " ProgLEDinclA.length: " + ProgLEDinclA.length);

				io.emit("men/XBee/" + XBeeEmitA, "yellow");
				await mySleep(200);
				io.emit("men/XBee/" + XBeeEmitA, "blue");
				
				// Neue Value senden ...
				XBeeValA[0] = [0x04];	// OFF
				if (IOactA == "DIO0") {IOactA = "D0"; XBeeValA[1] = XBeeColorA[0]};
				if (IOactA == "DIO1") {IOactA = "D1"; XBeeValA[1] = XBeeColorA[1]};
				if (IOactA == "DIO2") {IOactA = "D2"; XBeeValA[1] = XBeeColorA[2]};
				if (IOactA == "DIO3") {IOactA = "D3"; XBeeValA[1] = XBeeColorA[3]};
				if (IOactA == "DIO4") {IOactA = "D4"; XBeeValA[1] = XBeeColorA[4]};
				if (IOactA == "DIO5") {IOactA = "D5"; XBeeValA[1] = XBeeColorA[5]};
				if (IOactA == "DIO6") {IOactA = "D6"; XBeeValA[1] = XBeeColorA[6]};
				if (IOactA == "DIO7") {IOactA = "D7"; XBeeValA[1] = XBeeColorA[7]};
				if (IOactA == "DIO10") {IOactA = "P0"; XBeeValA[1] = XBeeColorA[8]};
				if (IOactA == "DIO11") {IOactA = "P1"; XBeeValA[1] = XBeeColorA[9]};
				if (IOactA == "DIO12") {IOactA = "P2"; XBeeValA[1] = XBeeColorA[10]};

				XBeeMACp1 = ENI_CONFIG.XBeeMAC[3];
				XBee_AT_Request(XBeeMACp1, IOactA, XBeeValA[0]);
				// Button update
				io.emit("men/XBee/" + XBeeLOCp1 + "/" + IOactA, XBeeValA);
				await mySleep(5000);
				iProgEndA++;
			}
			while (iProgEndA < ProgLEDinclA.length);
			io.emit("men/XBee/" + "PA1", "blueviolet");
			io.emit("men/XBee/" + "PA2", "blueviolet");
		};
	});

	socket.on("men/XBee/progB", async function(XDataB) {
		console.log("PROG B ----------------------------------------------------");
		XBeeProgB = XDataB;
		switch (XBeeProgB) {
			// LED Programm Gruppe B
			case 21:
				ProgDauerB = ENI_CONFIG.XBeePB1[1];
				ProgLEDminB = ENI_CONFIG.XBeePB1[2];
				ProgLEDmaxB = ENI_CONFIG.XBeePB1[3];
				ProgLEDinclB = ENI_CONFIG.XBeePB_IO;
				break;
			case 22:
				ProgDauerB = ENI_CONFIG.XBeePB2[1];
				ProgLEDminB = ENI_CONFIG.XBeePB2[2];
				ProgLEDmaxB = ENI_CONFIG.XBeePB2[3];
				ProgLEDinclB = ENI_CONFIG.XBeePB_IO;
				break;
		};

		P1_timeB = Date.now() + ProgDauerB * 1000;	// Aktuelle Zeit (in Millisekunden seit 1. Jan. 1970) + Programmdauer
		while (Date.now() <= P1_timeB) {
			// console.log("P1 WHILE 1");

			switch (XBeeProgB) {
				// LED Programm Gruppe B
				case 21:
					XBeeLOCp2 = 2;
					XBeeMACp2 = ENI_CONFIG.XBeeMAC[5];
					XBeeColorB = ENI_CONFIG.XBee_2_Col;
					XBeeEmitB = "PB1";
					break;
				case 22:
					XBeeLOCp2 = 2;
					XBeeMACp2 = ENI_CONFIG.XBeeMAC[5];
					XBeeColorB = ENI_CONFIG.XBee_2_Col;
					XBeeEmitB = "PB2";
					break;
			};

			io.emit("men/XBee/" + XBeeEmitB, "yellow");
			await mySleep(200);
			io.emit("men/XBee/" + XBeeEmitB, "blue");

			// Pause zwischen LED
			XtimeB = getRndInteger(ProgLEDminB, ProgLEDmaxB) * 1000;
			await mySleep(XtimeB);
		
			// Diödeli welche in P1 einbezogen sind und Zufallsauswahl
			IOforP2 = ProgLEDinclB;
			IOrndB = getRndInteger(0, IOforP2.length - 1);
			IOactB = IOforP2[IOrndB];

			// XBee Status Request
			console.log("*** --- PROG vor Status_Request: IOactB: " + IOactB + "  XBeeMACp2: " + XBeeMACp2);
			XBeeStatusSelect = "ONE_PIN";	// In XBee.OnData nur ein Pin updaten
			Xbee_Status_Request(XBeeMACp2);
			// ... warten nach Status Request ...
			await mySleep(100);	// Wartezeit bis XBee Status ausgewertet: <= 65 ms ist zu kurz, ab 70 ms ist OK

			// Update Status
			io.emit("men/xbee/pB_disp", "PB XBee random: IOactB: " + IOactB + " digitalSample: " + XBeeDigSampl.digitalSamples[IOactB]);
			
			// Status auswerten und entsprechend Value toggle ...
			if (XBeeDigSampl.digitalSamples[IOactB] == 1) {
				XBeeValB[0] = [0x04];	// OFF
			} else {
				XBeeValB[0] = [0x05];	// ON
			}
			// Neue Value senden ...
			if (IOactB == "DIO0") {IOactB = "D0"; XBeeValB[1] = XBeeColorB[0]};
			if (IOactB == "DIO1") {IOactB = "D1"; XBeeValB[1] = XBeeColorB[1]};
			if (IOactB == "DIO2") {IOactB = "D2"; XBeeValB[1] = XBeeColorB[2]};
			if (IOactB == "DIO3") {IOactB = "D3"; XBeeValB[1] = XBeeColorB[3]};
			if (IOactB == "DIO4") {IOactB = "D4"; XBeeValB[1] = XBeeColorB[4]};
			if (IOactB == "DIO5") {IOactB = "D5"; XBeeValB[1] = XBeeColorB[5]};
			if (IOactB == "DIO6") {IOactB = "D6"; XBeeValB[1] = XBeeColorB[6]};
			if (IOactB == "DIO7") {IOactB = "D7"; XBeeValB[1] = XBeeColorB[7]};
			if (IOactB == "DIO10") {IOactB = "P0"; XBeeValB[1] = XBeeColorB[8]};
			if (IOactB == "DIO11") {IOactB = "P1"; XBeeValB[1] = XBeeColorB[9]};
			if (IOactB == "DIO12") {IOactB = "P2"; XBeeValB[1] = XBeeColorB[10]};
			console.log("*** --- PROG B vor AT_Request   >>>>>>>>>>> " + XBeeMACp2);
			XBee_AT_Request(XBeeMACp2, IOactB, XBeeValB[0]);
			// Button update
			io.emit("men/XBee/" + XBeeLOCp2 + "/" + IOactB, XBeeValB);
		};
		io.emit("men/XBee/" + "PB1", "blueviolet");
		io.emit("men/XBee/" + "PB2", "blueviolet");
		
		// Wenn Programm Ende
		if (XBeeProgB == 12 || XBeeProgB == 22) {
			await mySleep(500);
			iProgEndB = 0;
			do {
				IOactB = ProgLEDinclB[iProgEndB];
				// // console.log("*** --- PROG END: FOR LOOP: iProgEndB: " + iProgEndB + "  IOactB: " + IOactB + " ProgLEDinclB.length: " + ProgLEDinclB.length);

				io.emit("men/XBee/" + XBeeEmitB, "yellow");
				await mySleep(200);
				io.emit("men/XBee/" + XBeeEmitB, "blue");
				
				// Neue Value senden ...
				XBeeValB[0] = [0x04];	// OFF
				if (IOactB == "DIO0") {IOactB = "D0"; XBeeValB[1] = XBeeColorB[0]};
				if (IOactB == "DIO1") {IOactB = "D1"; XBeeValB[1] = XBeeColorB[1]};
				if (IOactB == "DIO2") {IOactB = "D2"; XBeeValB[1] = XBeeColorB[2]};
				if (IOactB == "DIO3") {IOactB = "D3"; XBeeValB[1] = XBeeColorB[3]};
				if (IOactB == "DIO4") {IOactB = "D4"; XBeeValB[1] = XBeeColorB[4]};
				if (IOactB == "DIO5") {IOactB = "D5"; XBeeValB[1] = XBeeColorB[5]};
				if (IOactB == "DIO6") {IOactB = "D6"; XBeeValB[1] = XBeeColorB[6]};
				if (IOactB == "DIO7") {IOactB = "D7"; XBeeValB[1] = XBeeColorB[7]};
				if (IOactB == "DIO10") {IOactB = "P0"; XBeeValB[1] = XBeeColorB[8]};
				if (IOactB == "DIO11") {IOactB = "P1"; XBeeValB[1] = XBeeColorB[9]};
				if (IOactB == "DIO12") {IOactB = "P2"; XBeeValB[1] = XBeeColorB[10]};

				XBeeMACp2 = ENI_CONFIG.XBeeMAC[5];
				XBee_AT_Request(XBeeMACp2, IOactB, XBeeValB[0]);
				// Button update
				io.emit("men/XBee/" + XBeeLOCp2 + "/" + IOactB, XBeeValB);
				await mySleep(5000);
				iProgEndB++;
			}
			while (iProgEndB < ProgLEDinclB.length);
			io.emit("men/XBee/" + "PB1", "blueviolet");
			io.emit("men/XBee/" + "PB2", "blueviolet");
		};
	});



	socket.on("men/XBee/P0", function(XData) {
		// // // XData = "yellow";
		// Toggle LED
		console.log("men/XBee/P0: " + XData);
		if (XData == "lime") {
			StubeGNklein(0);
			io.emit("men/XBee/P0", "grey");
		} else {
			StubeGNklein(1);
			io.emit("men/XBee/P0", "lime");
		}
	});


	/////function Xbee_Status_Response(TMP_Data) {
	/////	console.log("function Xbee_Status_Response: EMIT");
	/////	io.emit("men/xbee/status", "x11ya");
	/////};
	
	socket.on("men/Markise", function(MarkiseData) {
		ModParam = MarkiseData[0];
		Reg = parseInt(MarkiseData[1]);
		Seg = parseInt(MarkiseData[2]);
		FZeit = MarkiseData[3];
		ModbusConnect();
	});

	socket.on("men/ISM", function(data) {
		ISM_Data = data;
		// // console.log("ISM: 1 " + ISM_Data);
		ISMparser();
	});

	socket.on("disconnect", function() {
		// CLEAR INTERVAL
		// https://tsh.io/blog/socket-io-tutorial-real-time-communication/
		clearInterval(myInterval);

		// REMOVE USER
		// // // const index = UsersConnected.indexOf(" [" + socket.id + "]")

			for (var i = 0; i < UsersConnected.length; i++) {
				// // // strTmp = UsersConnected[i];
				if (UsersConnected[i].includes(socket.id)) {
					UsersConnected.splice(i, 1);
				}
			}

		// // // if (index > -1) { UsersConnected.splice(index, 1) }

		console.log("*** Server: User disconnected:  " + " [" + socket.id + "]");
		io.emit("men/users/connected", "User disconnected: " + " [" + socket.id + "]");
	});
});

	
process.on('SIGINT', function () { //on ctrl+c
  LED_gn.writeSync(0); // Turn LED_gn off
  LED_gn.unexport(); // Unexport LED_gn GPIO to free resources
  PushButton.unexport(); // Unexport Button GPIO to free resources
  process.exit(); //exit completely
});


///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// MQTT Client
///////////////////////////////////////////////////////////
var mqtt = require('mqtt');
var options = {
	port: 1883,
	username: 'eni_rasp_mqtt',
	password: 'e1r2m3',
	clientId: 'RaspClient_' + Math.random().toString(16).substr(2, 8),
};
var client  = mqtt.connect('mqtt://enidata.dyndns.org', options);


/// MQTT SUBSCRIBE ////////////////////////////////////////
client.on('connect', function () {
	console.log('--- MQTT Client connected.');
	client.subscribe('rasp/LED/rt');

	// Auskommentieren, um bei erfolgreicher Verbindung außerdem eine Test-Nachricht an /lights zu senden
	// client.publish('lights', '{"colorID": "1", "color": [255, 0, 255], "state": "on"}')
})


/// MQTT ON MESSAGE ///////////////////////////////////////
client.on('message', function (topic, message) {
	/// MQTT PARSER
	if (topic !== 'rasp/LED/rt') {
		return console.log('MQTT Client: Skipping unhandled topic "' + topic + '" ...');
	}
	console.log('MQTT Client: New Message: ' + topic + ' ' + message.toString());

				
	if (message.toString() == "1") {
		LED_rt.writeSync(1); //turn LED_rt on
	} else {
		LED_rt.writeSync(0); //turn LED_rt off
	}
	
	io.emit("men/xbee/status", "MQTT: on('message')");

	///// if (LED_gn.readSync() = 1) { //toggle LED_gn
   /////     LED_gn.writeSync(0); //turn LED_gn off
   ///// } else {
      ///// LED_gn.writeSync(1); //turn LED_gn on
   ///// }

   
  // Einkommentieren, um Client nach Empfangen einer Nachrichten am Laufen zu lassen.
  // client.end()
})


///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// XBee Serial
/// 22.11.2020 Basiert auf XBeeTest_6.js
///////////////////////////////////////////////////////////
var SerialPort = require("serialport");
var xbee_api = require("xbee-api");
var C = xbee_api.constants;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});

var sp = new SerialPort("/dev/ttyAMA0", {
  baudRate: 9600,
});

sp.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(sp);

/// XBee OPEN
sp.on("open", function() {
  var frame_obj = { // AT Request to be sent
	type: 0x17, // xbee_api.constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST
	id: 0x01, // optional, nextFrameId() is called per default
	destination64: "0013A20041671ACF",
	destination16: "fffe", // optional, "fffe" is default
	remoteCommandOptions: 0x02, // optional, 0x02 is default
	command: "P0",
	commandParameter: [ 0x05 ] // Can either be string or byte array.
  };
});

/// XBee ON DATA: All frames parsed by the XBee will be emitted here
xbeeAPI.parser.on("data", function(frame) {
	// commandStatus: 0=OK,	1=ERROR, 2=Invalid command, 3=Invalid parameter, 4=Remote command transmission failed
	var XBeeValOnDat = [];	
	console.log("-------------------------------------------------");
	console.log("Xbee ON DATA");
	console.log("-------------------------------------------------");
	// // // // // // // console.log("--- XBee ON DATA > frame: ", frame);
	// // // // // // // console.log("--- frame.remote64:      ", frame.remote64);
	// // // // // // // console.log("--- frame.command:       ", frame.command);
    // // // // // // // console.log("--- frame.commandStatus: ", frame.commandStatus);
	if (frame.command == "IS") {
		// IS: Force Sample. Forces a read of ALL enabled digital and analog input lines.
		var DigSamp = [99,99,99,99,99,99,99,99,99,99,99];
		XBeeDigSampl = frame;
		if (XBeeStatusSelect == "ALL_PINS") {
			// Update all Pins
			if  (frame.commandStatus != 0) {
				DigSamp[0] = 99;
				DigSamp[1] = 99;
				DigSamp[2] = 99;
				DigSamp[3] = 99;
				DigSamp[4] = 99;
				DigSamp[5] = 99;
				DigSamp[6] = 99;
				DigSamp[7] = 99;
				DigSamp[8] = 99;
				DigSamp[9] = 99;
				DigSamp[10] = 99;
			} else {
				DigSamp[0] = frame.digitalSamples.DIO0;
				DigSamp[1] = frame.digitalSamples.DIO1;
				DigSamp[2] = frame.digitalSamples.DIO2;
				DigSamp[3] = frame.digitalSamples.DIO3;
				DigSamp[4] = frame.digitalSamples.DIO4;
				DigSamp[5] = frame.digitalSamples.DIO5;
				DigSamp[6] = frame.digitalSamples.DIO6;
				DigSamp[7] = frame.digitalSamples.DIO7;
				DigSamp[8] = frame.digitalSamples.DIO10;
				DigSamp[9] = frame.digitalSamples.DIO11;
				DigSamp[10] = frame.digitalSamples.DIO12;
			}
			console.log("--- IS: ALL_PINS: DigSamp    : ", DigSamp, "  frame.remote64: " + frame.remote64.toUpperCase());
			
			// XBeeMAC dem symbolischen Namen für Lokalität XBee Loc zuweisen
			for (intOnDatMAC = 3; intOnDatMAC < ENI_CONFIG.XBeeMAC.length; intOnDatMAC = intOnDatMAC + 2) {
				if (frame.remote64.toUpperCase() == ENI_CONFIG.XBeeMAC[intOnDatMAC]) {
					XBeeNrStat = (intOnDatMAC + 1) / 2 - 1; // XBee-Nummer aufgrund von XBee-MAC bestimmen
				}	
			}

			// Button Color für XBee 1-3 zuordnen
			if (XBeeNrStat == 1) {
				XBeeColorStat = ENI_CONFIG.XBee_1_Col;
			}
			if (XBeeNrStat == 2) {
				XBeeColorStat = ENI_CONFIG.XBee_2_Col;
			}
			if (XBeeNrStat == 3) {
				XBeeColorStat = ENI_CONFIG.XBee_3_Col;
			}
					
			// Update Button
			XBeeValOnDat[0] = DigSamp[0];
			XBeeValOnDat[1] = XBeeColorStat[0] 
			io.emit("men/XBee/" + XBeeNrStat + "/D0", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[1];
			XBeeValOnDat[1] = XBeeColorStat[1] 
			io.emit("men/XBee/" + XBeeNrStat + "/D1", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[2];
			XBeeValOnDat[1] = XBeeColorStat[2] 
			io.emit("men/XBee/" + XBeeNrStat + "/D2", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[3];
			XBeeValOnDat[1] = XBeeColorStat[3] 
			io.emit("men/XBee/" + XBeeNrStat + "/D3", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[4];
			XBeeValOnDat[1] = XBeeColorStat[4] 
			io.emit("men/XBee/" + XBeeNrStat + "/D4", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[5];
			XBeeValOnDat[1] = XBeeColorStat[5] 
			io.emit("men/XBee/" + XBeeNrStat + "/D5", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[6];
			XBeeValOnDat[1] = XBeeColorStat[6] 
			io.emit("men/XBee/" + XBeeNrStat + "/D6", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[7];
			XBeeValOnDat[1] = XBeeColorStat[7] 
			io.emit("men/XBee/" + XBeeNrStat + "/D7", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[8];
			XBeeValOnDat[1] = XBeeColorStat[8] 
			io.emit("men/XBee/" + XBeeNrStat + "/P0", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[9];
			XBeeValOnDat[1] = XBeeColorStat[9] 
			io.emit("men/XBee/" + XBeeNrStat + "/P1", XBeeValOnDat);
			XBeeValOnDat[0] = DigSamp[10];
			XBeeValOnDat[1] = XBeeColorStat[10] 
			io.emit("men/XBee/" + XBeeNrStat + "/P2", XBeeValOnDat);
		} else {
			// Update only ONE PIN
			console.log("--- IS: PIN");
		}
		// XBeeDigSampl = frame.digitalSamples.DIO10;
		// // // console.log("--- IS: P0:          ", frame.digitalSamples.DIO10);
		// // console.log("--- IS: digitalSamples: ", XBeeDigSampl);
	} else {
		// NOT IS, das heisst: Force Sample of EINZELNER digital (or analog) input line.
		// XBeeMAC der Nummer des XBee (gem. ENI_config.json) zuweisen
		for (intOnDatMAC = 3; intOnDatMAC < ENI_CONFIG.XBeeMAC.length; intOnDatMAC = intOnDatMAC + 2) {
			if (frame.remote64.toUpperCase() == ENI_CONFIG.XBeeMAC[intOnDatMAC]) {
				XBeeNrStat = (intOnDatMAC + 1) / 2 - 1; // XBee-Nummer aufgrund von XBee-MAC bestimmen
			}	
		}

		// // // console.log("--- XBee ON DATA: frame:   ", frame);
		console.log("--- SINGLE: XBeeNrStat: ", XBeeNrStat);
		console.log("--- SINGLE: command:  ", frame.command);
		console.log("--- SINGLE: commandData:  ", frame.commandData);
		if  (frame.commandStatus != 0) {
			// Antwort von XBee keine oder unklar > Button grau
			XBeeValOnDat[0] = 99;
			console.log("--- SINGLE: XBee NO ANSWERT > XBeeValOnDat: ", XBeeValOnDat);
			// Upate Button	
			io.emit("men/XBee/" + XBeeNrStat + "/" + frame.command, XBeeValOnDat);
		} else {
			// Update XBee Anzeige auf GUI geschieht vor der effektiven Antwort des XBee
			// Ist das XBee nicht erreichbar oder sonst Error, dann wird im GUI auf GRAU gesetzt (im ersten Teil des if).
		}
	}
	// Upate Status
	io.emit("men/xbee/status", "XBee:  ON DATA: frame (util): " + util.inspect(frame));

	// // // Folgend Versuche mit frame Auswertung, noch mal stehen lassen ...
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame (util): " + util.inspect(frame.digitalSamples));
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame.digitalSamples: " + frame.digitalSamples);	
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame.remote64: " + frame.remote64);
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame.commandData: " + toString(frame.commandData));
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame.command: " + frame.command);
	// io.emit("men/xbee/status", "XBee:  ON DATA: frame.commandStatus: " + frame.commandStatus);
	// io.emit("men/xbee/status", "XBee:  ON DATA: commandParameter: " + frame.commandParameter);
});

function Xbee_Status_Request(fStatMAC) {
	console.log("-------------------------------------------------");
	console.log("XBee STATUS REQUEST: fStatMAC: " + fStatMAC);
	console.log("-------------------------------------------------");
	var frame_obj = {};
	frame_obj.type = 0x17;					// xbee_api.constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST
	frame_obj.id = 0x02;					// optional, nextFrameId() is called per default
	frame_obj.destination16 = "fffe";		// optional, "fffe" is default
	frame_obj.destination64 = fStatMAC;
	frame_obj.remoteCommandOptions = 0x02;	// optional, 0x02 is default
	frame_obj.command = "IS";				// IS = Statusabfrage: Force Sample. Forces a read of all enabled digital and analog input lines.
	frame_obj.commandParameter = [];		// Can either be string or byte array.

	xbeeAPI.builder.write(frame_obj);
};

function XBee_AT_Request(fReqMAC, fReqIO, fReqVal) {
	// // // XData = "yellow";
	// Toggle LED
	console.log("-------------------------------------------------");
	console.log("--- XBee AT REQUEST   > fReqIO: " + fReqIO + " fReqVal: " + fReqVal);
	console.log("-------------------------------------------------");
	var frame_obj = {};
	frame_obj.type = 0x17;					// xbee_api.constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST
	frame_obj.id = 0x02;					// optional, nextFrameId() is called per default
	frame_obj.destination16 = "fffe";		// optional, "fffe" is default
	frame_obj.destination64 = fReqMAC;
	frame_obj.remoteCommandOptions = 0x02;	// optional, 0x02 is default
	frame_obj.command = fReqIO;				// Request von einzelnem IO resp. einzelner digital input line.
	frame_obj.commandParameter = fReqVal;	// Can either be string or byte array.

	// // // // // io.emit("men/XBee/Stube/P0", XBeeVal);
	xbeeAPI.builder.write(frame_obj);
};

function StubeGNklein(par) {
	if (par == 1) {
		var frame_obj = { // AT Request to be sent
			type: 0x17, // xbee_api.constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST
			id: 0x02, // optional, nextFrameId() is called per default
			// Stube Kugel: 0013A20041553652	D2: LED gn klein
			// Stube unten:	0013A20041671ACF	P0: LED gn (D10)
			// commandParameter: ON = 0x05, OFF = 0x04
			destination64: "0013A20041671ACF",
			destination16: "fffe", // optional, "fffe" is default
			remoteCommandOptions: 0x02, // optional, 0x02 is default
			command: "P0",
			commandParameter: [ 0x05 ] // Can either be string or byte array.
		};
		XBeeVal = [0x05];
	} else {
		var frame_obj = { // AT Request to be sent
			type: 0x17, // xbee_api.constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST
			id: 0x03, // optional, nextFrameId() is called per default
			destination64: "0013A20041671ACF",
			destination16: "fffe", // optional, "fffe" is default
			remoteCommandOptions: 0x02, // optional, 0x02 is default
			command: "P0",
			commandParameter: [ 0x04 ] // Can either be string or byte array.
		};
		XBeeVal = [0x04];
	}
	xbeeAPI.builder.write(frame_obj);
};


///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// MODBUS TCP
///////////////////////////////////////////////////////////

// create an empty modbus ModbusClient
var ModbusRTU = require("modbus-serial");
// var ModbusRTU = require("../index");
var ModbusClient = new ModbusRTU();
// // // var ModParam = "";

// open connection to a serial port
function ModbusConnect() {
    ModbusClient.connectTCP("192.168.10.2", 502)
        .then(setModbusClient)
        .then(function() {
            console.log(new Date().toISOString(), "ModbusClient: TCP connected."); })
        .catch(function(e) {
            console.log(new Date().toISOString(), e.message); });
}

function setModbusClient() {
    ModbusClient.setID(1);
    // // // ModbusClient.setTimeout(1000);
	console.log ("--- ModbusClient: setID");
	
	// PARSER for MQTT-Daten Markisen
	if (ModParam.includes("UP")) {
		ModUPDOWN();
	}
	if (ModParam.includes("DOWN")) {
		// Fahrzeit Berechnung, Fahrzeit an Millenium in 1/10 Sekunden
		// 	Markisen Fahrgeschwindigkeit in [cm/Sek.], enthalten in Configuration: ENI_CONFIG.MarkisenCmSek
		FZeitRaw = FZeit;
		console.log ("FZeitRaw:   " + FZeitRaw);
		if (FZeitRaw == 0) {
			FZeit = 0;	
		} else {
			if (FZeitRaw < 20) {
				FZeit = 20;	
			} else {
				FZeit = FZeitRaw;	
			}
			dblFZeit = FZeit / ENI_CONFIG.MarkisenCmSek * 10;
			FZeit = Math.round(dblFZeit);
		}
		console.log ("FZeit 1/10: " + FZeit);
		ModUPDOWN();
	}
	if (ModParam == "men/SuedWENIG") {
		ModSuedWENIG();
	}
}

function ModUPDOWN() {
// // // function ModUPDOWN(Reg, Seg, FZeit) {
	console.log("ModbusClient: function ModUPDOWN");
	// // // console.log("ModbusClient: ModFahrweg: " + YData);	
	
	ModbusClient.writeRegister(Reg, Seg)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: " + Reg + ", " + Seg);
			io.emit("men/modbus/status1", "<br>writeRegister: " + Reg + ", " + Seg); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status1", "ModbusClient ERROR: Status 1"); });
	
	ModbusClient.writeRegister(14, FZeit)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 14 , " + FZeit);
			io.emit("men/modbus/status2", "<br>writeRegister: 14, " + FZeit); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status2", "ModbusClient ERROR: Status 2"); });

	ModbusClient.writeRegister(12, 1)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 1");
			io.emit("men/modbus/status3", "<br>writeRegister: 12, 1"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status3", "ModbusClient ERROR: Status 3"); });

	ModbusClient.writeRegister(12, 0)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 0");
			io.emit("men/modbus/status4", "<br>writeRegister: 12, 0"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status4", "ModbusClient ERROR: Status 4"); })
		.then(ModClose);

	setTimeout(ModButColorGreen, 150);
	setTimeout(ModButColorViol, 550);
}

function ModSuedWENIG() {
	console.log("ModbusClient: function ModSuedWENIG");

	ModbusClient.writeRegister(13, 512)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 13, 512");
			io.emit("men/modbus/status1", "ModbusClient: writeRegister: 13, 512"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status1", "ModbusClient ERROR: Status 1"); });
	ModbusClient.writeRegister(14, 130)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 14 , 130");
			io.emit("men/modbus/status2", "ModbusClient: writeRegister: 14, 130"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status2", "ModbusClient ERROR: Status 2"); });
	ModbusClient.writeRegister(12, 1)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 1");
			io.emit("men/modbus/status3", "ModbusClient: writeRegister: 12, 1"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status3", "ModbusClient ERROR: Status 3"); });
	ModbusClient.writeRegister(12, 0)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 0");
			io.emit("men/modbus/status4", "ModbusClient: writeRegister: 12, 0"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status4", "ModbusClient ERROR: Status 4"); }) ;

	ModbusClient.writeRegister(13, 8)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 13, 8");
			io.emit("men/modbus/status1", "ModbusClient: writeRegister: 13, 8"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status1", "ModbusClient ERROR: Status 1"); });
	ModbusClient.writeRegister(14, 190)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 14 , 190");
			io.emit("men/modbus/status2", "ModbusClient: writeRegister: 14, 190"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status2", "ModbusClient ERROR: Status 2"); });
	ModbusClient.writeRegister(12, 1)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 1");
			io.emit("men/modbus/status3", "ModbusClient: writeRegister: 12, 1"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status3", "ModbusClient ERROR: Status 3"); });
	ModbusClient.writeRegister(12, 0)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 0");
			io.emit("men/modbus/status4", "ModbusClient: writeRegister: 12, 0"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status4", "ModbusClient ERROR: Status 4"); }) ;

	ModbusClient.writeRegister(13, 2)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 13, 2");
			io.emit("men/modbus/status1", "ModbusClient: writeRegister: 13, 2"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status1", "ModbusClient ERROR: Status 1"); });
	ModbusClient.writeRegister(14, 150)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 14 , 150");
			io.emit("men/modbus/status2", "ModbusClient: writeRegister: 14, 130"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status2", "ModbusClient ERROR: Status 2"); });
	ModbusClient.writeRegister(12, 1)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 1");
			io.emit("men/modbus/status3", "ModbusClient: writeRegister: 12, 1"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status3", "ModbusClient ERROR: Status 3"); });
	ModbusClient.writeRegister(12, 0)
        .then(function(d) {
            console.log("ModbusClient: writeRegister: 12, 0");
			io.emit("men/modbus/status4", "ModbusClient: writeRegister: 12, 0"); })
        .catch(function(e) {
            console.log("ModbusClient Error: " + e.message);
			io.emit("men/modbus/status4", "ModbusClient ERROR: Status 4"); })
		.then(ModClose);

	setTimeout(ModButColorGreen, 150);
	setTimeout(ModButColorViol, 550);
}

function ModClose() {
	ModbusClient.close();
	console.log("ModbusClient: CLOSE ");		
}

function ModButColorGreen() {
	console.log("ModButColor: Green");
	io.emit(ModParam, "#33ff33");
}
function ModButColorViol() {
	console.log("ModButColor: Viol");
	io.emit(ModParam, "#e6ccff");
}


///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// ISM 433 MHz Radio
///////////////////////////////////////////////////////////

// ISM PARSER
function ISMparser() {
	tmpISM = ISM_Data.replace(/\//g, "");						// Die für MQTT-Schreibweise benötigten / werden durch "" ersetzt.
	ISMsendDATA = ENI_CONFIG[tmpISM][1];						// Aus den Config-Daten (JSON-Array-Notation) wird der entsprechende ISM-Send-Code extrahiert.
	console.log("ISM: TEST:   " + ISM_Data + " : " + tmpISM);	// Beispiel: "StuDekoON": ["Intertechno","s01011110001010101010001010010000p"],
	console.log("ISMsendDATA: " + ISMsendDATA);

	if(ENI_CONFIG[tmpISM][0] == "Intertechno") {
		ISMsendIntertechno(ISMsendDATA);
	}
	if(ENI_CONFIG[tmpISM][0] == "Tormax") {
		ISMsendTormax(ISMsendDATA);
	}
}

// ISM SEND CODE
function ISMsendIntertechno(data) {
	ISMout.digitalWrite(0);
	pigpio.waveClear();
	waveform = [];

	// // console.log("ISMsendIntertechno: " + data);
	ISMButColorGreen();
	
	for (intRep = 1; intRep <= ENI_CONFIG.RepeatIntertechno; intRep++) {
		for (i = 0; i <= data.length; i++) {
			switch (data.charAt(i)) {
				case '0':
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: s_gap});
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: l_gap});
					break;
				case '1':
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: l_gap});
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: s_gap});
					break;
				case 's': // Sync
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: sync});
					break;
				case 'p': // Pause
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: s_pulse});
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: pause});
					break;
			}
		}
	}

	pigpio.waveAddGeneric(waveform);
	waveId = pigpio.waveCreate();
	if (waveId >= 0) {
	  console.log("waveId: " + waveId);
	  pigpio.waveTxSend(waveId, pigpio.WAVE_MODE_ONE_SHOT);
	}

	while (pigpio.waveTxBusy()) {}
	
	ISMout.digitalWrite(0);
	pigpio.waveDelete(waveId);
	
	ISMButColorViol();
}

function ISMsendTormax(data) {
	ISMout.digitalWrite(0);
	pigpio.waveClear();
	waveform = [];

	// // console.log("ISMsendTormax: " + data);
	ISMButColorGreen();
	
	for (intRep = 1; intRep <= ENI_CONFIG.RepeatTormax; intRep++) {
		for (i = 0; i <= data.length; i++) {
			switch (data.charAt(i)) {
				case 'a':
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: g_s_pulse});
					break;
				case 'b':
					waveform.push({ gpioOn: GPIO_ISM, gpioOff: 0, usDelay: g_l_pulse});
					break;
				case 'i':
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: g_s_gap});
					break;
				case 'm':
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: g_l_gap});
					break;
				case 'x': // Pause
					waveform.push({ gpioOn: 0, gpioOff: GPIO_ISM, usDelay: g_pause});
					break;
			}
		}
	}

	pigpio.waveAddGeneric(waveform);
	waveId = pigpio.waveCreate();
	if (waveId >= 0) {
	  console.log("waveId: " + waveId);
	  pigpio.waveTxSend(waveId, pigpio.WAVE_MODE_ONE_SHOT);
	}

	while (pigpio.waveTxBusy()) {}
	
	ISMout.digitalWrite(0);
	pigpio.waveDelete(waveId);

	ISMButColorViol();
}

function ISMButColorGreen() {
	// // console.log("ISMButColor: Green: " + ISM_Data);
	io.emit("men/ISM/" + ISM_Data, "#33ff33");
}

function ISMButColorViol() {
	// // console.log("ISMButColor: Viol" + ISM_Data);
	io.emit("men/ISM/" + ISM_Data, "#9999ff");
}

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/// ALLGEMEINE FUNKTIONEN
///////////////////////////////////////////////////////////

// Generiert Integer Random Number zwischen min und max, min und max einschliesslich
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function mySleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function ENIserial() {
	// Liest Serienummer des Raspberry Pi aus
	var TMPcont = fs.readFileSync('/proc/cpuinfo', 'utf8');
	var TMPcont_array = TMPcont.split("\n");
	var x = 0;
	var serial_line = "";
	while (x < TMPcont_array.length) {
		TMPserial_line = TMPcont_array[x];
		if (TMPserial_line.startsWith("Serial")) {
			return TMPserial_line.split(":")[1].slice(1);
		} x++;
	}
} 
