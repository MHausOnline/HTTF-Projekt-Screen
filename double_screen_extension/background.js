import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
const socket = io();

function registerData(request, sender, sendResponse){
	io.emit(request.type,request.data)
}
browser.runtime.onMessage.addListener(sendData)

function sendMessage(event,message){
	browser.tabs
	.query({
		currentWindow: true,
		active: true,
	})
	.then(
		(tabs)=>{
			browser.tabs.sendMessage(
			tabs,
			message
			)
		}
	)
}

socket.on("connect", () => {
	let events = ["messageAll","messageAdmin","set_uuid","joined_room"]
	for(let ev of events){
		socket.io.on(ev,(data)=>{sendMessage(ev,data)})
	}
});

