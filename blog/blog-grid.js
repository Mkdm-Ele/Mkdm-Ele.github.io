(function () {
	const canvas = document.getElementById("blogGrid");
	if (!canvas) {
		return;
	}

	const ctx = canvas.getContext("2d");
	const isPhone = /Mobile|Android|iOS|iPhone|iPad|iPod|Windows Phone/i.test(
		navigator.userAgent
	);
	const squareSize = isPhone ? 50 : 40;
	const speed = isPhone ? 0.03 : 0.05;
	const borderColor = isPhone
		? "rgba(255, 255, 255, 0.2)"
		: "rgba(255, 255, 255, 0.1)";
	let offset = { x: 0, y: 0 };
	let hoveredSquare = null;
	let currentOpacity = 0;
	let targetOpacity = 0;

	function resizeCanvas() {
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.floor(canvas.offsetWidth * dpr);
		canvas.height = Math.floor(canvas.offsetHeight * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function updateHover(event) {
		const rect = canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		const startX = Math.floor(offset.x / squareSize) * squareSize;
		const startY = Math.floor(offset.y / squareSize) * squareSize;
		hoveredSquare = {
			x: Math.floor((mouseX + offset.x - startX) / squareSize),
			y: Math.floor((mouseY + offset.y - startY) / squareSize),
		};
		targetOpacity = 0.6;
	}

	function clearHover() {
		hoveredSquare = null;
		targetOpacity = 0;
	}

	function draw() {
		const dpr = window.devicePixelRatio || 1;
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, width, height);

		currentOpacity += (targetOpacity - currentOpacity) * 0.12;
		offset.x = (offset.x - speed + squareSize) % squareSize;
		offset.y = (offset.y - speed + squareSize) % squareSize;

		const startX = Math.floor(offset.x / squareSize) * squareSize;
		const startY = Math.floor(offset.y / squareSize) * squareSize;

		for (let x = startX; x < width + squareSize; x += squareSize) {
			for (let y = startY; y < height + squareSize; y += squareSize) {
				const squareX = Math.round(x - (offset.x % squareSize));
				const squareY = Math.round(y - (offset.y % squareSize));
				const gridX = Math.floor((x - startX) / squareSize);
				const gridY = Math.floor((y - startY) / squareSize);

				if (
					hoveredSquare &&
					gridX === hoveredSquare.x &&
					gridY === hoveredSquare.y
				) {
					ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
					ctx.shadowBlur = 15;
					ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
					ctx.fillRect(squareX, squareY, squareSize, squareSize);
					ctx.shadowColor = "transparent";
					ctx.shadowBlur = 0;
				}

				ctx.strokeStyle = borderColor;
				ctx.lineWidth = isPhone ? 1 : 0.5;
				ctx.strokeRect(squareX, squareY, squareSize, squareSize);
			}
		}

		const gradient = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.sqrt(width * width + height * height) / 2
		);
		gradient.addColorStop(0, "rgba(6, 6, 6, 0)");
		gradient.addColorStop(1, "#060606");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		requestAnimationFrame(draw);
	}

	window.addEventListener("resize", resizeCanvas);
	canvas.addEventListener("mousemove", updateHover);
	canvas.addEventListener("mouseleave", clearHover);
	resizeCanvas();
	draw();
})();
