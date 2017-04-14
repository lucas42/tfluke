const Pubsub = require('lucos_pubsub'),
	Announcements = require('./announcements');

function pageLoad() {
	(function initFooter() {
		const footer = document.getElementById('footer');

		const soundButton = document.createElement("button");
		soundButton.setAttribute("class", "soundButton");
		soundButton.addEventListener("click", toggleSound);
		updateSoundButton(soundButton);
		footer.appendChild(soundButton);

		// The data-refreshable flag should only be set on pages served by service worker
		if (!footer || !footer.dataset.refreshable) return;
		footer.addEventListener("click", refresh, false);
		footer.dataset.listening = true;
	 })();
}

function toggleSound(event) {
	if (this.dataset.enabled) {
		Announcements.disable();
	} else {
		Announcements.enable();
	}
	updateSoundButton(this);
	event.stopPropagation();
}
function updateSoundButton(soundButton) {
	if (Announcements.isEnabled()) {
		soundButton.dataset.enabled = true;
		soundButton.setAttribute("title", "Sound Enabled");
		soundButton.textContent = "🔊";
	} else {
		delete soundButton.dataset.enabled;
		soundButton.setAttribute("title", "Sound Muted");
		soundButton.textContent = "🔇";
	}
}

/**
 * Refresh the client-side data
 *
 * Should only be available on pages served by service worker
 * Therefore can make http calls not understood by server
 **/
function refresh() {
	var footer = this;
	footer.dataset.loading = true;
	fetch('/refresh').then(response => {
		if (response.status != 204) {
			footer.dataset.failure = true;
			response.text().then(text => {
				console.error(text);
			});
		} else {
			delete footer.dataset.failure;
			Pubsub.send('refreshComplete');
		}
		delete footer.dataset.loading;
	});

}

// If the page is still loading, wait till it's done to do stuff
if (Document.readyState == "loading") {
	document.addEventListener('DOMContentLoaded', pageLoad);

// If the page has already loaded, do stuff now
} else {
	pageLoad();
}

// When the event's time changes, update the DOM accordingly
Pubsub.listen('updateEventTime', function (eventData) {
	var DOMNode = document.getElementById(eventData.id);
	if (!DOMNode) return;
	if (DOMNode.dataset.eventtype == "vehicle") {
		DOMNode.querySelector('.stoptime').textContent = eventData.vehicleReadableTime;
	} else if (DOMNode.dataset.eventtype == "station") {
		DOMNode.querySelector('.departtime').textContent = eventData.stationReadableTime;
	}
});

// When an event is removed, remove it from the DOM too.
Pubsub.listen('eventRemoved', function (eventData) {
	var DOMNode = document.getElementById(eventData.id);
	if (!DOMNode) return;
	DOMNode.parentNode.removeChild(DOMNode);
});


(function swHelperInit() {
	var registration;
	if ('serviceWorker' in navigator) {
		registration = navigator.serviceWorker.register('/serviceworker.js');
	} else {
		registration = new Promise(function(resolve, reject) {
			throw "no service worker support";
		});
	}
	registration.then(function swRegistered(registration) {
		console.log('ServiceWorker registration successful with scope: ' + registration.scope);
		registration.update();
	}).catch(function swError(error) {
		console.error('ServiceWorker registration failed: ' + error);
	});
})();