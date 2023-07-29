
var canvas = document.querySelector('#canvas');
var c = canvas.getContext('2d');
c.clearRect(0, 0, canvas.width, canvas.height);

let viewport_firework_spawn_width_percentage = 40;

var colors = [
	{ red: 255, green: 0, blue: 0 },
	{ red: 0, green: 255, blue: 0 },
	{ red: 0, green: 0, blue: 255 },
	{ red: 255, green: 255, blue: 0 },
	{ red: 255, green: 0, blue: 255 },
	{ red: 0, green: 255, blue: 255 },
];

let fireworks = [];

let firework_probability_percentage = 3;

let loops_delay = 0;

let interval;

class Particle {
	constructor(x, y, firework, color) {
		this.x = x;
		this.y = y;
		this.gravity = 0.7 * (753 / window.innerHeight);
		this.lifeSpan = random(450, 0);
		this.firework = firework;
		this.radius = random(3, 2);
		this.color = color;
		if (this.firework) {
			this.vx = random(-3, 3);
			this.vy = random(-12, -20);
			this.gravity = 0.3 * (753 / window.innerHeight);
		} else {
			this.vx = random(3, -3); 	//firework radius on X axis
			this.vy = random(3, -3); 	// firework radius on Y axis
			this.vy = this.vy * random(6, 1);
			this.vx = this.vx * random(6, 1);
			this.gravity = 0.1 * (753 / window.innerHeight);
			if (random(600, 1) < 3) {
				this.vx *= random(2, 1);
				this.vy *= random(2, 1);
			}
		}
	}

	done() {
		if (this.lifeSpan < 0) {
			return true;
		} else {
			return false;
		}
	}

	draw() {
		if (!this.firework) {
			circle(this.x, this.y, this.radius, `rgba(${this.color.red},${this.color.green},${this.color.blue},${this.lifeSpan / 255})`);
		} else {
			let color = `rgba(${this.color.red},${this.color.green},${this.color.blue},255)`;
			circle(this.x, this.y, this.radius, color);
		}

	}

	update() {
		this.y += this.vy;
		this.x += this.vx;
		this.vy += this.gravity;
		if (this.firework) {
			this.x += random(2, -2);
			this.radius = random(4, 2);
		} else {
			this.vy *= .9;
			this.vx *= .9;
			this.lifeSpan -= 4;
			if (this.lifeSpan < 0) {
				this.done();
			}
		}
	}
}

class Firework {
	constructor() {
		this.color = { red: 255, green: 255, blue: 255 };
		this.rgb = this.color;
		this.firework = new Particle(random((canvas.width / 2) - (canvas.width * viewport_firework_spawn_width_percentage / 200), (canvas.width / 2) + (canvas.width * viewport_firework_spawn_width_percentage / 200)),
			canvas.height, true, { red: 255, green: 255, blue: 255 });
		this.exploded = false;
		this.particles = [];
	}
	done() {
		if (this.exploded && this.particles.length === 0) {
			return true;
		} else {
			return false;
		}
	}
	explode() {
		for (let i = 0; i < 500; i++) {
			this.particles.push(new Particle(this.firework.x, this.firework.y, false,
				(Math.random() > 0.20 ? colors[Math.floor(Math.random() * colors.length)] : { red: 255, green: 255, blue: 255 })
			));
		}
	}
	update() {
		if (!this.exploded) {
			this.firework.draw();
			this.firework.update();
			if (this.firework.vy > 0) {
				this.firework.vy = 0;
				this.exploded = true;
				this.explode();
			}
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			this.particles[i].draw();
			this.particles[i].update();
			if (this.particles[i].done()) {
				this.particles.splice(i, 1);
			}
		}
	}
}

function loop() {

	c.fillStyle = "rgba(0,0,0,1)";
	c.clearRect(0, 0, canvas.width, canvas.height);

	loops_delay -= 1;

	if (loops_delay <= 0) {
		fireworks.push(new Firework());
		if (Math.random() < 0.25) loops_delay = Math.round(random(5, 15));
		else loops_delay = Math.round(random(30, 100));
	}

	for (let i = fireworks.length - 1; i >= 0; i--) {
		fireworks[i].update();
		if (fireworks[i].done()) {
		}
	}

	if (fireworks.length >= 10) {
		fireworks.splice(0, 1);
	}
}

window.addEventListener('resize', () => {
	init();
});

function random(max, min) {
	this.max = max;
	this.min = min;
	let x = Math.random() * (this.max - this.min) + this.min;
	return x;
}

function circle(x, y, radius, color) {
	this.radius = radius;
	this.x = x;
	this.y = y;
	this.color = color;

	c.fillStyle = this.color;

	c.beginPath();

	c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
	c.fill();
}

function init() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	loops_delay = 0;
	// delete all fireworks
	fireworks = [];
}

var fireworks_are_playing = false;

function start_fireworks() {
	if (!enable_fireworks) return;
	if (fireworks_are_playing) return;
	// delete all fireworks
	fireworks = [];
	init();
	fireworks_are_playing = true;
	interval = setInterval(loop, 16);
}
function stop_fireworks() {
	clearInterval(interval);
	fireworks_are_playing = false;
	// delete all fireworks
	fireworks = [];
	c.clearRect(0, 0, canvas.width, canvas.height);
}

$(document).ready(function () {
	init();
});
