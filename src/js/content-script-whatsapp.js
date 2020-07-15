/**
 * TODO: refactor to handle all apps at once.
 */

const DEFAULT_EMOJIS = "👍,👌,👏,😁,😆,😝,😅,😂,🤣,😎,😮,😔,🤩,😍";

const SLIDE_ANIM_DURATION = 250;

// thanks to Astigmatic for the font Yellowtail (https://fonts.google.com/specimen/Yellowtail)
const LOGO_IMG_SOURCE = chrome.runtime.getURL("assets/quick-emojis-logo48-whatsapp.png");
const LOGO_NAME_IMG_SOURCE = chrome.runtime.getURL("assets/quick-emojis-logo-name.png");
const TIMES_ICON_SVG_SOURCE = chrome.runtime.getURL("assets/timesIcon.svg");
const DARK_MODE_ICON_SOURCE = chrome.runtime.getURL("assets/dark-mode-icon.png");
const DARK_MODE_ITEM_KEY = "quick-emojis-dark-mode-enabled";
const DARK_MODE_CLASS_NAME = "quick-emojis-dark-mode";
const WHATSAPP_DATA_KEY = "quick-emojis-whatsapp-enabled";

let darkModeEnabled = localStorage.getItem(DARK_MODE_ITEM_KEY) === "true" ? true : false;

let slidingCustomizationPanel = false;

// to reuse the element
let emojiBar;

// in Chrome we can use 'mousedown' to insert the emoji bar while the chat is rendering.
// if using 'click', the insertion is not seamless. the bar blinks.
// in Firefox, the bar's parentElement is not available during 'mousedown'.
let mainMouseEvent = navigator.userAgent.indexOf("Chrome") > -1 ? "mousedown" : "click";

// check if the user disabled the extension for WhatsApp
chrome.storage.local.get(WHATSAPP_DATA_KEY, function (data) {
	if (data && data.hasOwnProperty(WHATSAPP_DATA_KEY)) {
		if (data[WHATSAPP_DATA_KEY] === false) {
			return;
		}
	}

	init();
});

function init() {
	if (darkModeEnabled) document.body.classList.add(DARK_MODE_CLASS_NAME);

	document.addEventListener(mainMouseEvent, mainMouseEventListener);
}

// every time the user changes chats, the ui is rerendered and the bar needs to be added
function mainMouseEventListener() {
	if ($("#quick-emoji-bar") === null) {
		addEmojiBar();
	}
}

function addEmojiBar(scrollsToBottom = true) {
	let container = $("#main");
	let footer = $("._2vJ01");

	// no container means the chat isn't rendered yet
	if (!container || !footer) {
		// console.log("container/footer not found");
		return;
	}

	if (!emojiBar) {
		emojiBar = document.createElement("div");
		emojiBar.id = "quick-emoji-bar";

		addEmojiButtons();

		emojiBar.addEventListener("click", emojiBarClickListener);
	}

	// container.insertBefore(emojiBar, footer);
	footer.insertBefore(emojiBar, footer.firstChild);

	if (scrollsToBottom) {
		let messagesContainer = $("._2-aNW");

		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
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
		btn.innerText = emojis[i];
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

	if (e.target.classList.contains("quick-emoji-button")) {
		let message = e.target.innerHTML;

		// we target the input's parent instead of the input itself, as the chat input has the same
		// classes as the app's search input
		let inputParent = $("div._2FVVk._2UL8j");

		if (inputParent) {
			let input = inputParent.children[1];

			if (input) {
				sendMessage(input, message, e.shiftKey);
			} else {
				console.log("Input not found.");
			}
		} else {
			console.log("Input parent not found.");
		}
	}
}

// thanks to Rodrigo Manguinho (https://stackoverflow.com/a/41251257)
// @onlyAppend: when holding down shift, don't send automatically, just add the emoji to the input
function sendMessage(input, message, onlyAppend) {
	var evt = new Event("input", {
		bubbles: true,
	});

	let inputContent = input.innerHTML.trim();

	let inputWasEmpty = inputContent === "" || inputContent === "<br>";

	input.innerText = inputWasEmpty ? message : inputContent + message;
	input.dispatchEvent(evt);

	if (!onlyAppend && inputWasEmpty) {
		$("button._1U1xa").click();
	}

	setCursorAtTheEnd(input);
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
		<button id="quick-emojis-source-code-button"
		class="quick-emojis-customization-button"
		title="https://github.com/ivocass/quick-emojis">📖 Source code</button>
		<button id="quick-emojis-donate-button"
		class="quick-emojis-customization-button"
		title="https://paypal.me/IvoCass">🥳 Donate</button>
		<button id="quick-emojis-save-button" 
		class="quick-emojis-customization-button">💾 Save</button>

		<button id="quick-emojis-dark-mode-button" title="Toggle dark mode">
		<img  src=${DARK_MODE_ICON_SOURCE}
		></img>
		</button>

		<button id="quick-emojis-cancel-button" title="Close">
		<img src=${TIMES_ICON_SVG_SOURCE}
		></img>
		</button>

		
	</div>`);

	// let container = $("._3h-WS");
	let container = $("#main");

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
an input, but a div with 'contenteditable' set to true
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
