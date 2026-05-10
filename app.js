const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 4500;

// ── View engine & static files ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render('index.html');
});

// ── Room state ─────────────────────────────────────────────────────────────
let rooms = {};  // roomId -> { name: [], host: '', hostID: '', ans: '', start: false }

function createRoom(roomId) {
	if (!rooms[roomId]) {
		rooms[roomId] = { name: [], host: '', hostID: '', ans: '', start: false };
	}
	return rooms[roomId];
}

function isRoomEmpty(roomId) {
	const room = rooms[roomId];
	if (!room) return true;
	return room.name.length === 0 && room.host.length === 0;
}

function cleanupRoom(roomId) {
	if (isRoomEmpty(roomId)) {
		delete rooms[roomId];
	}
}

function isNameTaken(roomId, username) {
	const room = rooms[roomId];
	if (!room) return false;
	const inPlayers = room.name.includes(username);
	const isHostName = room.host === username;
	return inPlayers || isHostName;
}

// ── Socket connection handler ───────────────────────────────────────────────
io.on('connection', (socket) => {
	console.log('a user connected');

	let myname = '';
	let myroom = '';
	let mypoint = 0;
	let isHost = false;

	// ── Player login ─────────────────────────────────────────────────────────
	socket.on('login', (username, roomNum) => {
		createRoom(roomNum);

		if (isNameTaken(roomNum, username)) {
			socket.emit('connectionFail', {
				success: false,
				message: '使用者名稱重複',
			});
			return;
		}

		socket.nickname = username;
		myname = username;
		myroom = roomNum;
		socket.join(roomNum);

		console.log('-------------Someone Join US! --------------');
		console.log(`${socket.nickname}已加入${[...socket.rooms][1]}房間`);

		socket.emit('connectionSuccess', {
			success: true,
			message: '歡迎加入！連線成功',
			username,
			roomNum,
		});

		io.to(myroom).emit('chat message', `已經加入房間`, socket.nickname);

		// Fix #1: Use socket.to(myroom) instead of socket.broadcast
		// so the event is only sent to others in the same room
		socket.to(myroom).emit('connectionSuccessOthers', {
			success: true,
			message: `歡迎使用者 ${username} 連線成功`,
		});

		rooms[roomNum].name.push(username);

		console.log('現在所有的users');
		console.log(rooms);
		console.log('--------------------------------------------');
		console.log('');
	});

	// ── Host login ───────────────────────────────────────────────────────────
	socket.on('hostLogin', (username, roomNum) => {
		createRoom(roomNum);

		// Fix #5: Also check if the username matches any player name
		if (rooms[roomNum].host.length > 0) {
			socket.emit('hostConnectionFail', {
				success: false,
				message: '已經有Host了',
			});
			return;
		}

		if (rooms[roomNum].name.includes(username)) {
			socket.emit('hostConnectionFail', {
				success: false,
				message: '使用者名稱重複',
			});
			return;
		}

		socket.nickname = username;
		myname = username;
		myroom = roomNum;
		isHost = true;

		console.log(`我是Host嗎${isHost}`);
		socket.join(roomNum);

		console.log('-------------Someone Join US! --------------');
		console.log(`Host: ${socket.nickname}已加入${[...socket.rooms][1]}房間`);

		socket.emit('hostConnectionSuccess', {
			success: true,
			message: '歡迎加入！連線成功',
			username,
			roomNum,
		});

		io.to(myroom).emit('hostConnectionSuccessOthers', {
			success: true,
			message: `您們的主持人${username}`,
			username,
		});

		io.to(myroom).emit('chat message', `Host已經加入房間`, socket.nickname);

		rooms[roomNum].host = username;
		rooms[roomNum].hostID = socket.id;

		console.log('現在所有的users');
		console.log(rooms);
		console.log('--------------------------------------------');
		console.log('');
	});

	// ── Room join ────────────────────────────────────────────────────────────
	socket.on('room number', (msg) => {
		socket.join(msg);
		console.log(`${socket.nickname}已加入${[...socket.rooms][1]}房間`);
	});

	// ── Disconnect ───────────────────────────────────────────────────────────
	socket.on('disconnect', () => {
		console.log('============Disconnect=============');
		const room = rooms[myroom];

		if (!room) {
			console.log('---Room not found---');
			return;
		}

		if (isHost) {
			io.to(myroom).emit('chat message', `Host已離開房間`, room.host);
			room.host = '';
			room.hostID = '';
			io.to(myroom).emit('hostDisconnection');
		} else {
			const index = room.name.indexOf(myname);

			if (index !== -1) {
				// Fix #3: splice returns an array, extract the element
				const [removedName] = room.name.splice(index, 1);
				io.to(myroom).emit('chat message', `已離開房間`, removedName);
				console.log(`使用者離開: ${removedName}`);
			}
		}

		// Fix #2: Correct operator precedence—use strict equality checks
		if (room.name.length === 0 && room.host.length === 0) {
			delete rooms[myroom];
		}

		console.log('---現在所有使用者---');
		console.log(rooms);
		console.log('===================================');
		console.log('');
	});

	// ── Set nickname ─────────────────────────────────────────────────────────
	socket.on('send-nickname', (nickname) => {
		socket.nickname = nickname;
		console.log(socket.nickname);
	});

	// ── Input relay (host controls game) ─────────────────────────────────────
	socket.on('keydown', (msg) => {
		if (isHost) {
			io.to(myroom).emit('playKeyDown', msg);
		}
	});

	socket.on('keyup', (msg) => {
		if (isHost) {
			io.to(myroom).emit('playKeyUp', msg);
		}
	});

	socket.on('mousedown', (msg) => {
		if (isHost) {
			io.to(myroom).emit('playMouseDown', msg);
		}
	});

	socket.on('mouseup', (msg) => {
		if (isHost) {
			io.to(myroom).emit('playMouseUp', msg);
		}
	});

	// ── Chat & guess ────────────────────────────────────────────────────────
	socket.on('chat message', (msg) => {
		console.log(`[${socket.nickname}]在房間${[...socket.rooms][1]}傳送: ${msg}`);
		io.to([...socket.rooms][1]).emit('chat message', msg, socket.nickname);

		if (!myroom || !rooms[myroom]) return;

		if (msg == rooms[myroom].ans) {
			mypoint++;
			io.to(myroom).emit('chat message', `猜對了答案！「${rooms[myroom].ans}」`, socket.nickname);
			io.to(myroom).emit('chat message', `現在得分：${mypoint}`, socket.nickname);
			socket.emit('point', mypoint);
			rooms[myroom].ans = '';

			// Fix #4: Notify the host that the round ended so the answer form reappears
			io.to(rooms[myroom].hostID).emit('hostRestart');
			console.log(rooms[myroom].hostID);
		}
	});

	// ── Host sets answer ─────────────────────────────────────────────────────
	socket.on('host answer', (msg) => {
		if (!myroom || !rooms[myroom]) return;

		rooms[myroom].ans = msg;
		console.log(`Host出的答案${msg}`);
		io.to(myroom).emit('chat message', `Host出了題目，趕快來猜吧！`, socket.nickname);
	});
});

// ── Start server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
	console.log(`listening on ${PORT}`);
});