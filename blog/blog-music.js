const MUSIC_ASSET_BASE = "../assets";
const MUSIC_STATE_KEY = "mkdm-ele-music-state";
const albumTracks = [
	{ rank: 1, song: "神探", album: "神经志", file: "1-神探-神经志.mp3", cover: "神经志.jpg" },
	{ rank: 2, song: "蝉想", album: "夏狂热", file: "2-蝉想-夏狂热.mp3", cover: "夏-狂热.jpg" },
	{ rank: 3, song: "频率", album: "苏打绿同名", file: "3-频率-苏打绿同名.mp3", cover: "苏打绿同名专辑.jpg" },
	{ rank: 4, song: "望春风", album: "陶喆同名专辑", file: "4-望春风-陶喆同名专辑.mp3", cover: "陶喆同名专辑.jpg" },
	{ rank: 5, song: "沙龙", album: "H3M", file: "5-沙龙-H3M.mp3", cover: "H3M.jpg" },
	{ rank: 6, song: "太聪明", album: "Groupies吉他手", file: "6-太聪明-Groupies吉他手.mp3", cover: "吉他手.jpg" },
	{ rank: 7, song: "回车诺比的梦", album: "冬未了", file: "7-回车诺比的梦-冬未了.mp3", cover: "冬-未了.jpg" },
	{ rank: 8, song: "水星记", album: "飞行器的执行周期", file: "8-水星记-飞行器的执行周期.mp3", cover: "飛行器的執行週期.jpg" },
	{ rank: 9, song: "黑洞里", album: "橙月", file: "9-黑洞里-橙月.mp3", cover: "橙月.jpg" },
	{ rank: 10, song: "蝴蝶", album: "黑色柳丁", file: "10-蝴蝶-黑色柳丁.mp3", cover: "黑色柳丁.jpg" },
	{ rank: 11, song: "盖世英雄", album: "盖世英雄", file: "11-盖世英雄-盖世英雄.mp3", cover: "盖世英雄.jpg" },
	{ rank: 12, song: "浮躁", album: "浮躁", file: "12-浮躁-浮躁.mp3", cover: "浮躁.jpg" },
	{ rank: 13, song: "燕窝", album: "你在烦恼什么", file: "13-燕窝-你在烦恼什么.mp3", cover: "你在烦恼什么.jpg" },
	{ rank: 14, song: "蝴蝶山", album: "背面是我", file: "14-蝴蝶山-背面是我.mp3", cover: "背面是我.jpg" },
	{ rank: 15, song: "月食", album: "实况电影", file: "15-月食-实况电影.mp3", cover: "实况电影.jpg" },
	{ rank: 16, song: "桥豆麻袋", album: "小梦大半", file: "16-桥豆麻袋-小梦大半.mp3", cover: "小梦大半.jpg" },
	{ rank: 17, song: "莉莉安", album: "安和桥北", file: "17-莉莉安-安河桥北.mp3", cover: "安和桥北.jpg" },
	{ rank: 18, song: "一千年以后", album: "编号89757", file: "18-一千年以后-编号89757.mp3", cover: "编号89757.jpg" },
	{ rank: 19, song: "艾米莉", album: "耳鬼出风", file: "19-艾米莉-耳鬼出风.mp3", cover: "耳鬼出风.jpg" },
	{ rank: 20, song: "让我想一想", album: "让我想一想", file: "20-让我想一想-让我想一想.mp3", cover: "让我想一想.jpg" },
];

let activeTrackIndex = 0;
let pendingMusicSeek = 0;

function $(selector) {
	return document.querySelector(selector);
}

function padRank(rank) {
	return rank < 10 ? `0${rank}` : `${rank}`;
}

function formatTime(seconds) {
	if (!Number.isFinite(seconds)) {
		return "0:00";
	}
	const minutes = Math.floor(seconds / 60);
	const rest = Math.floor(seconds % 60);
	return `${minutes}:${rest < 10 ? "0" : ""}${rest}`;
}

function getTrackUrl(file) {
	return encodeURI(`${MUSIC_ASSET_BASE}/music/${file}`);
}

function getCoverUrl(file) {
	return encodeURI(`${MUSIC_ASSET_BASE}/Album/${file}`);
}

function getSavedMusicState() {
	try {
		return JSON.parse(localStorage.getItem(MUSIC_STATE_KEY) || "null");
	} catch (error) {
		return null;
	}
}

function getAlbumDOM() {
	return {
		sidebar: $("#albumSidebar"),
		scrim: $("#albumSidebarScrim"),
		toggle: $("#musicToggle"),
		list: $("#albumList"),
		player: $("#musicPlayer"),
		audio: $("#albumAudio"),
		coverBox: $("#playerCoverBox"),
		cover: $("#playerCover"),
		rank: $("#playerRank"),
		song: $("#playerSong"),
		album: $("#playerAlbum"),
		currentTime: $("#currentTime"),
		duration: $("#duration"),
		progress: $("#musicProgress"),
		play: $("#playPause"),
		prev: $("#prevTrack"),
		next: $("#nextTrack"),
		close: $(".music-close"),
	};
}

function saveMusicState() {
	const DOM = getAlbumDOM();
	if (!DOM.audio) {
		return;
	}
	try {
		localStorage.setItem(
			MUSIC_STATE_KEY,
			JSON.stringify({
				index: activeTrackIndex,
				time: Number.isFinite(DOM.audio.currentTime) ? DOM.audio.currentTime : 0,
				paused: DOM.audio.paused,
			})
		);
	} catch (error) {
	}
}

function renderMusicShell() {
	document.body.insertAdjacentHTML(
		"beforeend",
		`<button class="music-toggle" id="musicToggle" type="button" aria-label="Open music player">&lt;</button>
		<div class="music-sidebar-scrim" id="albumSidebarScrim" aria-hidden="true"></div>
		<aside class="music-sidebar" id="albumSidebar" aria-hidden="true">
			<div class="sidebar-head">
				<div class="sidebar-title">
					<span class="music-kicker">Mkdm-Ele picks</span>
					<h2>My Top 20 Chinese albums</h2>
				</div>
				<button class="music-close" type="button" aria-label="Close album sidebar"><span></span></button>
			</div>
			<div class="album-list-wrap">
				<ol class="album-list" id="albumList"></ol>
			</div>
			<div class="music-player" id="musicPlayer">
				<div class="player-now">
					<div class="player-cover" id="playerCoverBox">
						<img id="playerCover" src="${getCoverUrl("神经志.jpg")}" alt="">
					</div>
					<div class="player-copy">
						<span id="playerRank">No.01</span>
						<h3 id="playerSong">神探</h3>
						<p id="playerAlbum">神经志</p>
					</div>
				</div>
				<div class="player-progress">
					<span id="currentTime">0:00</span>
					<input id="musicProgress" type="range" min="0" max="1000" value="0" aria-label="Playback progress">
					<span id="duration">0:00</span>
				</div>
				<div class="player-controls">
					<button class="control-button prev" id="prevTrack" type="button" aria-label="Previous album"></button>
					<button class="control-button play" id="playPause" type="button" aria-label="Play"></button>
					<button class="control-button next" id="nextTrack" type="button" aria-label="Next album"></button>
				</div>
				<audio id="albumAudio" preload="metadata"></audio>
			</div>
		</aside>`
	);
}

function renderAlbumList() {
	const DOM = getAlbumDOM();
	DOM.list.innerHTML = "";
	albumTracks.forEach((track, index) => {
		const item = document.createElement("li");
		const button = document.createElement("button");
		button.type = "button";
		button.className = "album-item";
		button.innerHTML = `<span class="album-rank">${padRank(track.rank)}</span>
			<span class="album-copy"><span class="album-name">${track.album}</span><span class="album-song">${track.song}</span></span>`;
		button.addEventListener("click", () => {
			selectTrack(index, { autoplay: true, direction: index >= activeTrackIndex ? 1 : -1 });
		});
		item.appendChild(button);
		DOM.list.appendChild(item);
	});
}

function updateAlbumButtons() {
	document.querySelectorAll(".album-item").forEach((button, index) => {
		button.classList.toggle("is-active", index === activeTrackIndex);
	});
}

function updatePlayButton() {
	const DOM = getAlbumDOM();
	const isPlaying = DOM.audio && !DOM.audio.paused;
	DOM.play.classList.toggle("play", !isPlaying);
	DOM.play.classList.toggle("pause", isPlaying);
	DOM.play.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function updateProgress() {
	const DOM = getAlbumDOM();
	const duration = DOM.audio.duration;
	const current = DOM.audio.currentTime;
	DOM.currentTime.textContent = formatTime(current);
	DOM.duration.textContent = formatTime(duration);
	DOM.progress.value = Number.isFinite(duration) && duration > 0
		? Math.round((current / duration) * 1000)
		: 0;
}

function animatePlayer(direction) {
	const DOM = getAlbumDOM();
	const className = direction < 0 ? "is-sliding-prev" : "is-sliding-next";
	DOM.player.classList.remove("is-sliding-prev", "is-sliding-next");
	DOM.player.offsetWidth;
	DOM.player.classList.add(className);
	setTimeout(() => DOM.player.classList.remove(className), 360);
}

function updatePlayer(track, direction = 1) {
	const DOM = getAlbumDOM();
	DOM.rank.textContent = `No.${padRank(track.rank)}`;
	DOM.song.textContent = track.song;
	DOM.album.textContent = track.album;
	DOM.coverBox.dataset.album = track.album;
	DOM.coverBox.classList.remove("is-placeholder");
	DOM.cover.hidden = false;
	DOM.cover.alt = track.album;
	DOM.cover.src = getCoverUrl(track.cover);
	DOM.audio.src = getTrackUrl(track.file);
	DOM.audio.load();
	updateAlbumButtons();
	updateProgress();
	animatePlayer(direction);
}

function selectTrack(index, options = {}) {
	activeTrackIndex = (index + albumTracks.length) % albumTracks.length;
	updatePlayer(albumTracks[activeTrackIndex], options.direction || 1);
	if (options.autoplay) {
		playSelectedTrack();
	} else {
		updatePlayButton();
	}
}

function playSelectedTrack() {
	const DOM = getAlbumDOM();
	if (!DOM.audio.src) {
		updatePlayer(albumTracks[activeTrackIndex], 1);
	}
	const playPromise = DOM.audio.play();
	if (playPromise && playPromise.catch) {
		playPromise.then(updatePlayButton).catch(updatePlayButton);
	} else {
		updatePlayButton();
	}
}

function openMusicSidebar() {
	const DOM = getAlbumDOM();
	DOM.sidebar.classList.add("is-open");
	DOM.scrim.classList.add("is-open");
	DOM.toggle.classList.add("is-hidden");
	DOM.sidebar.setAttribute("aria-hidden", "false");
	DOM.scrim.setAttribute("aria-hidden", "false");
}

function closeMusicSidebar() {
	const DOM = getAlbumDOM();
	DOM.sidebar.classList.remove("is-open");
	DOM.scrim.classList.remove("is-open");
	DOM.toggle.classList.remove("is-hidden");
	DOM.sidebar.setAttribute("aria-hidden", "true");
	DOM.scrim.setAttribute("aria-hidden", "true");
}

function initMusicPlayer() {
	renderMusicShell();
	renderAlbumList();

	const DOM = getAlbumDOM();
	const savedState = getSavedMusicState();
	if (
		savedState &&
		Number.isInteger(savedState.index) &&
		savedState.index >= 0 &&
		savedState.index < albumTracks.length
	) {
		activeTrackIndex = savedState.index;
		pendingMusicSeek = Number(savedState.time) || 0;
	}
	updatePlayer(albumTracks[activeTrackIndex], 1);

	DOM.toggle.addEventListener("click", openMusicSidebar);
	DOM.close.addEventListener("click", closeMusicSidebar);
	DOM.scrim.addEventListener("click", closeMusicSidebar);
	DOM.play.addEventListener("click", () => {
		if (DOM.audio.paused) {
			playSelectedTrack();
		} else {
			DOM.audio.pause();
		}
	});
	DOM.prev.addEventListener("click", () => selectTrack(activeTrackIndex - 1, { autoplay: true, direction: -1 }));
	DOM.next.addEventListener("click", () => selectTrack(activeTrackIndex + 1, { autoplay: true, direction: 1 }));
	DOM.cover.addEventListener("error", () => {
		DOM.cover.hidden = true;
		DOM.coverBox.classList.add("is-placeholder");
	});
	DOM.audio.addEventListener("play", updatePlayButton);
	DOM.audio.addEventListener("play", saveMusicState);
	DOM.audio.addEventListener("pause", updatePlayButton);
	DOM.audio.addEventListener("pause", saveMusicState);
	DOM.audio.addEventListener("loadedmetadata", () => {
		if (pendingMusicSeek > 0 && Number.isFinite(DOM.audio.duration)) {
			DOM.audio.currentTime = Math.min(pendingMusicSeek, DOM.audio.duration);
			pendingMusicSeek = 0;
		}
		updateProgress();
	});
	DOM.audio.addEventListener("timeupdate", () => {
		updateProgress();
		saveMusicState();
	});
	DOM.audio.addEventListener("ended", () => selectTrack(activeTrackIndex + 1, { autoplay: true, direction: 1 }));
	DOM.progress.addEventListener("input", () => {
		if (Number.isFinite(DOM.audio.duration) && DOM.audio.duration > 0) {
			DOM.audio.currentTime = (DOM.progress.value / 1000) * DOM.audio.duration;
		}
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeMusicSidebar();
		}
	});
	window.addEventListener("beforeunload", saveMusicState);
	if (savedState && savedState.paused === false) {
		setTimeout(playSelectedTrack, 150);
	}
}

document.addEventListener("DOMContentLoaded", initMusicPlayer);
