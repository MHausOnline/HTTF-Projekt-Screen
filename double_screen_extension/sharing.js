function getElementByPath(path){
	let current = document
	for(let step of path){
		if(current.childNodes[step[0]].tagName = step[1]){
			current = current.childNodes[step[0]]
		}else{
			console.error("Unparsable")
			return undefined
			break
		}
	}
	return current
}


function getSerializedNode(parseNode){
	let serializedInfo = {}
	if(parseNode.nodeName =="CANVAS"){
		serializedInfo.canvasContent = parseNode.getContext("2d").getImageData(0,0,parseNode.scrollWidth,parseNode.scrollHeight);
	}
	for(let prop in parseNode){
		if(typeof parseNode[prop]!= "function"){
			serializedInfo[prop] = parseNode[prop]
		}
	}
	if(parseNode.nodeType == 1){
		serializedInfo.attributeJson = {}
		for(let attrName of parseNode.getAttributeNames()){
			if(!overwriteAttributes.includes(attrName.toLowerCase())){
				serializedInfo.attributeJson[attrName] = parseNode.getAttribute(attrName)
			}else{
				if(!serializedInfo.eventListenerJson) serializedInfo.eventListenerJson = {}
				if(!serializedInfo.eventListenerJson[attrName.replace("on","")]) serializedInfo.eventListenerJson[attrName.replace("on","")] = []
				serializedInfo.eventListenerJson[attrName.replace("on","")].push(parseNode.getAttribute(attrName))
			}
		}
	}
	if(parseNode.nodeName =="A"){
		if(serializedInfo.attributeJson["href"]) delete serializedInfo.attributeJson["href"]
		if(!serializedInfo.eventListenerJson) serializedInfo.eventListenerJson = {}
		if(!serializedInfo.eventListenerJson["click"]) serializedInfo.eventListenerJson["click"] = []
	}
	return serializedInfo
}

function makeNodeFromSerialized(json){
	if(json.nodeType == 1){
		let element = document.createElement(json.tagName)
		if(json.nodeName =="CANVAS"){
			element.getContext("2d").putImageData(json.canvasContent);
			delete json.canvasContent
		}
		for(let prop in json){
			let desc = Object.getOwnPropertyDescriptor(element, prop)
			if(typeof json[prop]!= "function" && desc && desc.writable){
				element[prop] = json[prop]
			}
		}
		for(let attrName in json.attributeJson){
			element.setAttribute(attrName,json.attributeJson[attrName])
		}
		return element
	}else if(json.nodeType == 2){
		let element = createAttributeNode(json.localName)
		element.value = json.value
		return element
	}else if(json.nodeType == 3){
		let element = document.createTextNode(json.textContent)
		return element
	}
}

function getSerialized(parseNode){
	let serializedChildren = []
	for(let child of parseNode.childNodes){
		if(child.nodeName!=="SCRIPT") serializedChildren.push(getSerialized(child))
	}
	let parsed = getSerializedNode(parseNode)
	
	let events;
	if(parsed.eventListenerJson){
		events = Object.keys(parsed.eventListenerJson||{})
		delete parsed.eventListenerJson
	}else{
		events = []
	}
	return {"node": parsed,"children":serializedChildren, "events":events}
}


var role = "passive"
var room

let infoDiv = document.createElement("div")
infoDiv.style.zIndex = 1000
infoDiv.style.backgroundColor = "white" 
infoDiv.style.position = "sticky"
infoDiv.style.bottom = "0px"

let joinButton = document.createElement("button")
joinButton.innerText = "Join a screen"
joinButton.addEventListener("click",joinFunc)
infoDiv.appendChild(joinButton)

let shareButton = document.createElement("button")
shareButton.innerText = "Expand screen"
shareButton.addEventListener("click",shareFunc)
infoDiv.appendChild(shareButton)

document.body.appendChild(infoDiv)

function askQuestion(question){
	return prompt(question)
}

function parseSocketJson(json){
	let element = getElementByPath(json.path)
	element.replaceWith(makeFromSerialized(json.content))
}

function socketListener(message,sender,sendRes){
	if(message.type == "set_role"){
		role = message.data.role
	}else if(message.type == "joined_room"){
		role = message.data.role
	}else if(message.type == "messageAll" && role=="client"){
		parseSocketJson(message.data)
	}else if(message.type == "messageAdmin" && role=="admin"){
		let target = getElementByPath(message.data.path)
		target.higherAccessDispatch(message.data.event)
	}
}

function socketUpdater(mutation,observer){
	let change = serializeSocketJson(mutation.target)
	browser.runtime.sendMessage({"type":"sendAll","data":change})
}

function sendInteraction(element,event){
	if(role=="client"){
		browser.runtime.sendMessage({"type":"sendAdmin","data":{"path":element.getElementPath(),"event":event}})
	}
}

function joinFunc(){
	joinButton.remove()
	shareButton.remove()
	browser.runtime.sendMessage({"type":"roleAdmin","data":{}})
	let roomId = askQuestion("What id?")
	browser.runtime.sendMessage({"type":"join_room","data":{"room":roomId}})
}
function shareFunc(){
	joinButton.remove()
	shareButton.remove()
	browser.runtime.sendMessage({"type":"roleAdmin","data":{}})
	browser.runtime.sendMessage({"type":"join_room","data":{"room":Math.floor(Math.random()*1000)}})
	let observer = new MutationObserver(socketUpdater);
	observer.observe(document.body, {
	  subtree: true,
	  childList: true
	})
}


function makeFromSerialized(json){
	let parent = makeNodeFromSerialized(json.node)
	for(let listener of json.events){
		parent.addEventListener(listener,function(){sendInteraction(this,listener)})
	}
	for(let child of json.children){
		parent.appendChild(makeFromSerialized(child))
	}
	return parent
}

function serializeSocketJson(element){
	return {
		"content": getSerialized(element),
		"path": element.getElementPath()
		}
}


browser.runtime.onMessage.addListener(socketListener)




