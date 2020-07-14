/**
 * TODO: refactor to handle all apps at once.
 */
console.log("running");

const DEFAULT_EMOJIS = "👌🏻,👏🏻,😁,😆,😝,😅,😂,🤣,😎,😮,😔,🤩,😍";

const SLIDE_ANIM_DURATION = 250;

// thanks to Astigmatic for the font Yellowtail (https://fonts.google.com/specimen/Yellowtail)
const LOGO_IMG_SOURCE = chrome.runtime.getURL("assets/quick-emojis-logo48.png");
const LOGO_NAME_IMG_SOURCE = chrome.runtime.getURL("assets/quick-emojis-logo-name.png");
const TIMES_ICON_SVG_SOURCE = chrome.runtime.getURL("assets/timesIcon.svg");
const DARK_MODE_ICON_SOURCE = chrome.runtime.getURL("assets/dark-mode-icon.png");
const DARK_MODE_ITEM_KEY = "quick-emojis-dark-mode-enabled";
const DARK_MODE_CLASS_NAME = "quick-emojis-dark-mode";
const MESSENGER_DATA_KEY = "quick-emojis-messenger-enabled";

let darkModeEnabled = localStorage.getItem(DARK_MODE_ITEM_KEY) === "true" ? true : false;

let slidingCustomizationPanel = false;

// to reuse the element
let emojiBar;

// check if the user disabled the extension for Messenger
chrome.storage.local.get(MESSENGER_DATA_KEY, function (data) {
	if (data && data.hasOwnProperty(MESSENGER_DATA_KEY)) {
		if (data[MESSENGER_DATA_KEY] === false) {
			return;
		}
	}

	init();
});

function init() {
	if (darkModeEnabled) document.body.classList.add(DARK_MODE_CLASS_NAME);

	document.addEventListener("click", clickListener);

	tryToAddEmojiBar();
}

let checkIntervalId;
let checkTimeoutId;

// assume the app is loading, so for five seconds try to add the emojiBar
function tryToAddEmojiBar() {
	clearInterval(checkIntervalId);
	clearTimeout(checkTimeoutId);

	checkTimeoutId = setTimeout(() => {
		clearInterval(checkIntervalId);
	}, 5000);

	checkIntervalId = setInterval(() => {
		// once the emojiBar's parent is available..
		if ($("._4u-c._1wfr._9hq") !== null) {
			addEmojiBar();

			clearInterval(checkIntervalId);
			clearTimeout(checkTimeoutId);
		}
	}, 10);
}

// in Chrome. every time the user changes chats, the ui is rerendered and the bar needs to be added
function clickListener() {
	if ($("#quick-emoji-bar") === null) {
		tryToAddEmojiBar();
	}
}

function addEmojiBar(scrollsToBottom = true) {
	let container = $("._4u-c._1wfr._9hq");

	// no container means the chat isn't rendered yet
	if (!container) {
		console.log("emojiBar parent not found");
		return;
	}

	if (!emojiBar) {
		emojiBar = document.createElement("div");
		emojiBar.id = "quick-emoji-bar";

		addEmojiButtons();

		// we need to execute with delay, otherwise document.querySelector would return old elements
		emojiBar.addEventListener("click", (e) => {
			setTimeout(() => {
				emojiBarClickListener(e);
			}, 100);
		});
	}

	// 'container' is the closest element with unique classes
	container.lastChild.lastChild.appendChild(emojiBar);

	if (scrollsToBottom) {
		setTimeout(() => {
			emojiBar.parentElement.scrollTop = emojiBar.parentElement.scrollHeight;
		}, 100);
	}
}

function addEmojiButtons() {
	// reset if saving
	emojiBar.innerHTML = "";

	let emojis = localStorage.getItem("quick-emojis");

	if (!emojis) {
		emojis = DEFAULT_EMOJIS;
	}

	emojis = emojis.split(",");

	for (let i = 0; i < emojis.length; i++) {
		let btn = document.createElement("div");
		btn.className = "quick-emoji-button";
		btn.innerHTML = emojis[i];
		emojiBar.appendChild(btn);
	}

	let cogImg = document.createElement("img");
	cogImg.id = "quick-emojis-cog-button";
	cogImg.className = "quick-emoji-button";
	cogImg.title = "Customize";

	cogImg.src = chrome.runtime.getURL("assets/cog-icon.png");

	emojiBar.appendChild(cogImg);
}

// we listen to clicks on the bar instead of adding a listener to each button
function emojiBarClickListener(e) {
	if (e.target.id === "quick-emojis-cog-button") {
		if ($("#quick-emojis-customization-panel") === null) {
			showCustomizationPanel();
		} else {
			hideCustomizationPanel();
		}

		return;
	}

	// if user clicked on one of the emojis
	if (e.target.classList.contains("quick-emoji-button")) {
		let message = e.target.innerHTML;

		// get the div closest to the input, that has unique classes
		let element = $("._5rp7._5rp8");

		if (element) {
			element = element.lastChild;
		}

		// drill down to find a SPAN element
		while (element !== null) {
			if (element.nodeName === "SPAN" && element.parentElement.classList.contains("_1mf")) {
				break;
			} else {
				element = element.lastChild;
			}
		}

		if (element) {
			sendMessage(element, message, e.shiftKey);
		} else {
			console.log("Input not found.");
		}
	}
}

// thanks to Rodrigo Manguinho (https://stackoverflow.com/a/41251257)
// @onlyAppend: when holding down shift, don't send automatically, just add the emoji to the input
function sendMessage(input, message, onlyAppend) {
	let inputContent = input.innerHTML === '<br data-text="true">' ? "" : input.lastChild.innerText;

	let inputWasEmpty = inputContent === "";

	let span;
	let dispatcher = input;

	// out of all the 14,000,605 possible ways to edit an input, this is the one that works in
	// Messenger
	if (inputWasEmpty) {
		// when the input is empty, there's actually a <br> inside. we need to add a span next to it
		// with our text, dispatch an event, and then remove our span.
		// the <br> will be removed by the app.
		span = document.createElement("span");
		span.innerText = message;

		input.appendChild(span);
	} else {
		// when the input isn't empty, we can just replace the text, but we need to dispatch the
		// event on the input's child.
		input.lastChild.innerText = inputContent + message;

		dispatcher = input.lastChild;
	}

	dispatcher.dispatchEvent(new Event("input", { bubbles: true }));

	// this is the span we added if the input was originally empty
	if (span && span.parentElement) {
		span.parentElement.removeChild(span);
	}

	setCursorAtTheEnd(input);

	if (!onlyAppend && inputWasEmpty) {
		$("._30yy._38lh._7kpi").click();
	}
}

function showCustomizationPanel() {
	if (slidingCustomizationPanel) {
		return;
	}

	let bar = htmlToElement(`
	<div id="quick-emojis-customization-panel" class="slide-in">

		<div id="logos-container">
		
			<img id="logo-img" src=${LOGO_IMG_SOURCE}
			></img>

			<img id="logo-name-img" src=${LOGO_NAME_IMG_SOURCE}
			></img>

		</div>
		

		<div>
		
		</div>
		
		

		<input id="quick-emojis-input">
		</input>

		<div>
		<button id="quick-emojis-source-code-button" class="hover-background">📖 Source code</button>
		<button id="quick-emojis-donate-button" class="hover-background">🥳 Donate</button>
		<button id="quick-emojis-save-button" class="hover-background">💾 Save</button>

		<button id="quick-emojis-dark-mode-button" title="Toggle dark mode">
		<img  src=${DARK_MODE_ICON_SOURCE}
		></img>
		</button>

		<button id="quick-emojis-cancel-button" title="Close">
		<img src=${TIMES_ICON_SVG_SOURCE}
		></img>
		</button>

		
	</div>`);

	let container = document.body;

	if (!container) {
		console.log("showCustomizationPanel( ) - container not found");
		return;
	}

	container.appendChild(bar);

	$("#quick-emojis-source-code-button").addEventListener("click", sourceCodeClickListener);
	$("#quick-emojis-donate-button").addEventListener("click", donateClickListener);
	$("#quick-emojis-save-button").addEventListener("click", saveClickListener);
	$("#quick-emojis-cancel-button").addEventListener("click", hideCustomizationPanel);
	$("#quick-emojis-dark-mode-button").addEventListener("click", toggleDarkMode);

	let emojis = localStorage.getItem("quick-emojis");

	if (!emojis) {
		emojis = DEFAULT_EMOJIS;
	}

	$("#quick-emojis-input").value = emojis;
	$("#quick-emojis-input").focus();

	slidingCustomizationPanel = true;

	setTimeout(() => {
		slidingCustomizationPanel = false;
	}, SLIDE_ANIM_DURATION);
}

function toggleDarkMode() {
	darkModeEnabled = !darkModeEnabled;

	if (darkModeEnabled) {
		document.body.classList.add(DARK_MODE_CLASS_NAME);
	} else {
		document.body.classList.remove(DARK_MODE_CLASS_NAME);
	}

	localStorage.setItem(DARK_MODE_ITEM_KEY, darkModeEnabled);
}

function hideCustomizationPanel() {
	if (slidingCustomizationPanel) {
		return;
	}

	let customizationBar = $("#quick-emojis-customization-panel");

	customizationBar.className = "slide-out";

	setTimeout(() => {
		if (customizationBar && customizationBar.parentElement) {
			customizationBar.parentElement.removeChild(customizationBar);
		}
		slidingCustomizationPanel = false;
	}, SLIDE_ANIM_DURATION);
}

function $(identifier) {
	return document.querySelector(identifier);
}

function saveClickListener() {
	let input = $("#quick-emojis-input");

	if (!input) {
		return;
	}

	localStorage.setItem("quick-emojis", input.value);

	hideCustomizationPanel();

	addEmojiButtons();
}

function sourceCodeClickListener() {
	window.open("https://github.com/ivocass/quick-emojis");
}

function donateClickListener() {
	window.open("https://paypal.me/IvoCass");
}

/* we need to set the input's cursor caret at the end, but it's hard because it's actually not
an input
thanks to Eisa Qasemi https://stackoverflow.com/a/36376460 */
function setCursorAtTheEnd(input) {
	if (!input.lastChild) {
		return;
	}

	var selection = document.getSelection();
	var range = document.createRange();
	var contenteditable = input;

	if (contenteditable.lastChild.nodeType == 3) {
		range.setStart(contenteditable.lastChild, contenteditable.lastChild.length);
	} else {
		range.setStart(contenteditable, contenteditable.childNodes.length);
	}
	selection.removeAllRanges();
	selection.addRange(range);
}

// thanks to Mark Amery (https://stackoverflow.com/a/35385518)
function htmlToElement(html) {
	var template = document.createElement("template");
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}
