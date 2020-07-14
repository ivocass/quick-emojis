const WHATSAPP_DATA_KEY = "quick-emojis-whatsapp-enabled";
const MESSENGER_DATA_KEY = "quick-emojis-messenger-enabled";

document.addEventListener("DOMContentLoaded", function () {
	document.querySelector("#whatsapp-toggle").addEventListener("click", onWhatsAppClicked);
	document.querySelector("#messenger-toggle").addEventListener("click", onMessengerClicked);

	// we use 'chrome.storage.local' instead of 'localStorage' to use the extension's context
	// otherwise, 'localStorage' uses only the context of the popup, which can't be accessed by
	// content-script
	chrome.storage.local.get(WHATSAPP_DATA_KEY, function (data) {
		console.log("data", data);
		let enabled = true;

		if (data && data.hasOwnProperty(WHATSAPP_DATA_KEY)) {
			if (data[WHATSAPP_DATA_KEY] === false) {
				enabled = false;
			}
		}

		let input = document.querySelector("#whatsapp-input");

		input.checked = enabled;
	});

	chrome.storage.local.get(MESSENGER_DATA_KEY, function (data) {
		console.log("data", data);
		let enabled = true;

		if (data && data.hasOwnProperty(MESSENGER_DATA_KEY)) {
			if (data[MESSENGER_DATA_KEY] === false) {
				enabled = false;
			}
		}

		let input = document.querySelector("#messenger-input");

		input.checked = enabled;
	});

	document.querySelector("#quick-emojis-source-code-button").addEventListener("click", () => {
		window.open("https://github.com/ivocass/quick-emojis");
	});

	document.querySelector("#quick-emojis-donate-button").addEventListener("click", () => {
		window.open("https://paypal.me/IvoCass");
	});
});

function onWhatsAppClicked() {
	let input = document.querySelector("#whatsapp-input");

	input.checked = !input.checked;

	chrome.storage.local.set({ [WHATSAPP_DATA_KEY]: input.checked }, function (value) {
		console.log("value", value);
	});
}

function onMessengerClicked() {
	let input = document.querySelector("#messenger-input");

	input.checked = !input.checked;

	chrome.storage.local.set({ [MESSENGER_DATA_KEY]: input.checked }, function (value) {
		console.log("value", value);
	});
}
