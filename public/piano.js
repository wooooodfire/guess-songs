/* Socket.io + Piano engine */

var socket = io();

// ── DOM refs ───────────────────────────────────────────
var messages = document.getElementById('messages');
var errorform = document.getElementById('errorform');
var roomform = document.getElementById('roomform');
var roominput = document.getElementById('roominput');
var nameinput = document.getElementById('nameinput');
var chatform = document.getElementById('chatform');
var chatinput = document.getElementById('chatinput');
var hostroomform = document.getElementById('hostroomform');
var hostroominput = document.getElementById('hostroominput');
var hostnameinput = document.getElementById('hostnameinput');
var mainform = document.getElementById('mainform');
var hostansform = document.getElementById('hostansform');
var showinfo = document.getElementById('showinfo');
var main = document.getElementById('main');

// ── State ──────────────────────────────────────────────
var isHostUser = false;

// ── Player login ────────────────────────────────────────
roomform.addEventListener('submit', function (e) {
	e.preventDefault();
	if (roominput.value && nameinput.value) {
		socket.emit('login', nameinput.value, roominput.value);
	}
});

// ── Host login ──────────────────────────────────────────
hostroomform.addEventListener('submit', function (e) {
	e.preventDefault();
	if (hostroominput.value && hostnameinput.value) {
		isHostUser = true;
		socket.emit('hostLogin', hostnameinput.value, hostroominput.value);
	}
});

// ── Chat ────────────────────────────────────────────────
chatform.addEventListener('submit', function (e) {
	e.preventDefault();
	if (chatinput.value) {
		socket.emit('chat message', chatinput.value);
		chatinput.value = '';
	}
});

// ── Host answer ─────────────────────────────────────────
hostansform.addEventListener('submit', function (e) {
	e.preventDefault();
	var hostansinput = document.getElementById('hostansinput');
	if (hostansinput.value) {
		socket.emit('host answer', hostansinput.value);
		hostansinput.value = '';
		hostansform.classList.remove('open');
	}
});

// ── Socket events ───────────────────────────────────────
socket.on('chat message', function (msg, name) {
	var item = document.createElement('li');
	item.textContent = name ? name + '：' + msg : msg;

	if (msg && msg.indexOf('猜對了答案') === 0) {
		item.className = 'correct';
	} else if (msg && (
		msg.indexOf('已經加入房間') === 0 ||
		msg.indexOf('Host已經加入房間') === 0 ||
		msg.indexOf('Host出了題目') === 0 ||
		msg.indexOf('已離開房間') >= 0 ||
		msg.indexOf('Host已離開房間') >= 0
	)) {
		item.className = 'system';
	}

	messages.appendChild(item);
	var scroller = document.getElementById('scroller');
	scroller.scrollTop = scroller.scrollHeight;
});

socket.on('connectionFail', function (msg) {
	showError(msg.message);
});

socket.on('connectionSuccess', function (msg) {
	clearError();
	roominput.value = '';
	nameinput.value = '';
	hostroominput.value = '';
	hostnameinput.value = '';
	mainform.classList.add('collapsed');
	main.classList.add('open');

	var selfNameItem = document.createElement('h2');
	selfNameItem.id = 'selfName';
	selfNameItem.textContent = 'Player：' + msg.username;
	showinfo.appendChild(selfNameItem);

	var selfRoomItem = document.createElement('h3');
	selfRoomItem.id = 'selfRoom';
	selfRoomItem.textContent = 'Room：' + msg.roomNum;
	showinfo.appendChild(selfRoomItem);
});

socket.on('hostConnectionFail', function (msg) {
	showError(msg.message);
});

socket.on('hostConnectionSuccess', function (msg) {
	clearError();
	isHostUser = true;
	roominput.value = '';
	nameinput.value = '';
	hostroominput.value = '';
	hostnameinput.value = '';
	mainform.classList.add('collapsed');
	hostansform.classList.add('open');
	main.classList.add('open');

	var selfNameItem = document.createElement('h2');
	selfNameItem.id = 'selfHostName';
	selfNameItem.textContent = 'Host：' + msg.username;
	showinfo.appendChild(selfNameItem);

	var selfRoomItem = document.createElement('h3');
	selfRoomItem.id = 'selfRoom';
	selfRoomItem.textContent = 'Room：' + msg.roomNum;
	showinfo.appendChild(selfRoomItem);
});

socket.on('hostConnectionSuccessOthers', function (msg) {
	if (isHostUser) return;
	var selfHostNameItem = document.createElement('h2');
	selfHostNameItem.id = 'yourHostName';
	selfHostNameItem.textContent = 'Host：' + msg.username;
	showinfo.appendChild(selfHostNameItem);
});

socket.on('hostDisconnection', function () {
	var el = document.getElementById('yourHostName');
	if (el) el.remove();
	var el2 = document.getElementById('selfHostName');
	if (el2) el2.remove();
});

socket.on('point', function (msg) {
	var pointMsg = document.getElementById('pointMsg');
	pointMsg.textContent = msg;
	pointMsg.classList.remove('pop');
	void pointMsg.offsetWidth;
	pointMsg.classList.add('pop');
});

socket.on('scoreboard', function (scores) {
	var tbody = document.getElementById('scoreboardBody');
	tbody.innerHTML = '';
	// Sort by score descending
	var entries = Object.entries(scores).sort(function (a, b) { return b[1] - a[1]; });
	entries.forEach(function (entry) {
		var tr = document.createElement('tr');
		var tdName = document.createElement('td');
		tdName.textContent = entry[0];
		var tdScore = document.createElement('td');
		tdScore.textContent = entry[1];
		tdScore.className = 'score-val';
		tr.appendChild(tdName);
		tr.appendChild(tdScore);
		tbody.appendChild(tr);
	});
});

socket.on('hostRestart', function () {
	hostansform.classList.add('open');
});

// ── Error helpers ──────────────────────────────────────
function showError(message) {
	var existing = document.getElementById('errorMsg');
	if (existing) {
		existing.textContent = message;
		return;
	}
	var p = document.createElement('p');
	p.id = 'errorMsg';
	p.textContent = message;
	errorform.appendChild(p);
}

function clearError() {
	var existing = document.getElementById('errorMsg');
	if (existing) existing.remove();
}

// ────────────────────────────────────────────────────────
// Piano engine
// ────────────────────────────────────────────────────────

(function () {
	var isStart = false;

	var start = document.getElementById('start');
	start.addEventListener('click', function () {
		if (!isStart) {
			isStart = true;
			start.textContent = '關閉鍵盤聲音';
			start.classList.add('active');
		} else {
			isStart = false;
			start.textContent = '開啟鍵盤聲音';
			start.classList.remove('active');
		}
	});

	var keys = [
		'A2', 'Bb2', 'B2', 'C3', 'Db3', 'D3', 'Eb3', 'E3',
		'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3', 'C4',
		'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4',
		'A4', 'Bb4', 'B4', 'C5',
	];

	var codes = [
		90, 83, 88, 67, 70, 86, 71, 66, 78, 74, 77, 75,
		81, 50, 87, 69, 52, 82, 53, 84, 89, 55, 85, 56,
		73, 57, 79, 80,
	];

	var pedal = 32;
	var tonic = 'A2';
	var intervals = {};
	var depressed = {};

	function pianoClass(name) { return '.piano-' + name; }
	function soundId(id) { return 'sound-' + id; }
	function sound(id) { return document.getElementById(soundId(id)); }

	function press(key) {
		var audio = sound(key);
		if (depressed[key]) return;
		clearInterval(intervals[key]);
		if (audio) {
			audio.pause();
			audio.volume = 1.0;
			if (audio.readyState >= 2) {
				audio.currentTime = 0;
				audio.play();
				depressed[key] = true;
			}
		}
		$(pianoClass(key)).addClass('pressed');
	}

	function fade(key) {
		var audio = sound(key);
		var stepfade = function () {
			if (audio) {
				if (audio.volume < 0.03) kill(key)();
				else if (audio.volume > 0.2) audio.volume *= 0.95;
				else audio.volume -= 0.01;
			}
		};
		return function () {
			clearInterval(intervals[key]);
			intervals[key] = setInterval(stepfade, 5);
		};
	}

	function kill(key) {
		var audio = sound(key);
		return function () {
			clearInterval(intervals[key]);
			if (audio) audio.pause();
			$(pianoClass(key)).removeClass('pressed');
		};
	}

	var fadeout = true;
	var sustaining = false;

	// ── Mouse events ────────────────────────────────────
	keys.forEach(function (key) {
		$(pianoClass(key)).mousedown(function () {
			if (isHostUser) socket.emit('mousedown', key);
			press(key);
		});
		if (fadeout) {
			$(pianoClass(key)).mouseup(function () {
				if (isHostUser) socket.emit('mouseup', key);
				depressed[key] = false;
				if (!sustaining) fade(key)();
			});
		} else {
			$(pianoClass(key)).mouseup(function () {
				if (isHostUser) socket.emit('mouseup', key);
				depressed[key] = false;
				if (!sustaining) kill(key)();
			});
		}
	});

	// ── Socket relay ───────────────────────────────────
	socket.on('playMouseDown', function (key) { press(key); });

	socket.on('playMouseUp', function (key) {
		depressed[key] = false;
		if (!sustaining) {
			if (fadeout) fade(key)();
			else kill(key)();
		}
	});

	// ── Keyboard events ─────────────────────────────────
	// Only trigger piano when not typing in input/textarea
	$(document).keydown(function (event) {
		var tag = event.target.tagName.toLowerCase();
		if (tag === 'input' || tag === 'textarea') return;

		if (isHostUser) socket.emit('keydown', event.which);

		if (event.which === pedal) {
			sustaining = true;
			$(pianoClass('pedal')).addClass('piano-sustain');
		}
		var keyStr = keydown(event.which);
		if (keyStr) press(keyStr);
	});

	$(document).keyup(function (event) {
		var tag = event.target.tagName.toLowerCase();
		if (tag === 'input' || tag === 'textarea') return;

		if (isHostUser) socket.emit('keyup', event.which);

		if (event.which === pedal) {
			sustaining = false;
			$(pianoClass('pedal')).removeClass('piano-sustain');
			Object.keys(depressed).forEach(function (key) {
				if (!depressed[key]) {
					if (fadeout) fade(key)();
					else kill(key)();
				}
			});
		}
		var keyStr = keyup(event.which);
		if (keyStr) {
			depressed[keyStr] = false;
			if (!sustaining) {
				if (fadeout) fade(keyStr)();
				else kill(keyStr)();
			}
		}
	});

	socket.on('playKeyDown', function (msg) {
		if (msg === pedal) {
			sustaining = true;
			$(pianoClass('pedal')).addClass('piano-sustain');
		}
		var keyStr = keydown(msg);
		if (keyStr) press(keyStr);
	});

	socket.on('playKeyUp', function (msg) {
		if (msg === pedal) {
			sustaining = false;
			$(pianoClass('pedal')).removeClass('piano-sustain');
			Object.keys(depressed).forEach(function (key) {
				if (!depressed[key]) {
					if (fadeout) fade(key)();
					else kill(key)();
				}
			});
		}
		var keyStr = keyup(msg);
		if (keyStr) {
			depressed[keyStr] = false;
			if (!sustaining) {
				if (fadeout) fade(keyStr)();
				else kill(keyStr)();
			}
		}
	});

	function keydown(code) {
		if (isStart !== true) return null;
		var offset = codes.indexOf(code);
		if (offset >= 0) {
			var idx = keys.indexOf(tonic) + offset;
			return idx < keys.length ? keys[idx] : null;
		}
		return null;
	}

	function keyup(code) {
		if (isStart !== true) return null;
		var offset = codes.indexOf(code);
		if (offset >= 0) {
			var idx = keys.indexOf(tonic) + offset;
			return idx < keys.length ? keys[idx] : null;
		}
		return null;
	}
})();