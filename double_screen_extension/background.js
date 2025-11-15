import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
const socket = io("http://172.18.246.18:5000");

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

socket.io.on("connect", () => {
	let events = ["messageAll","messageAdmin","set_uuid","joined_room"]
	for(let ev of events){
		socket.on(ev,(data)=>{sendMessage({"type":ev,"data":data})})
	}
});

