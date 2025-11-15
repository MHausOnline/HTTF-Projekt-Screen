import {io} from "./socket/node_modules/socket.io/client-dist/socket.io.esm.min.js";

const socket = io("http://localhost:8000");

socket.emit("join_room",{"room":""})

function sendData(request, sender, sendResponse){
	socket.emit(request.type,request.data)
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

console.log("running...")


