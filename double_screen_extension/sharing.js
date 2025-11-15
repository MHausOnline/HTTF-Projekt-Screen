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

function makeFromSerialized(json){
	let parent = makeNodeFromSerialized(json.node)
	for(let listener of json.events){
		parent.addEventListener(listener,function(){console.log(listener,this.getElementPath())})
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

function parseSocketJson(json){
	let element = getElementByPath(json.path)
	element.replaceWith(makeFromSerialized(json.content))
}


