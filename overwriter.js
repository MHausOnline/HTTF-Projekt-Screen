if(!document.eventListenerIsOverwritten){
	Element.prototype.eventListenerFrozen = false;
	
	Element.prototype.origAddEventListener = Element.prototype.addEventListener
	Element.prototype.addEventListener = function(a,b,c){
			console.log(this,a)
			if(!this.eventListenerJson) this.eventListenerJson = {};
			if(!this.eventListenerJson[a]) this.eventListenerJson[a] = [];
			this.eventListenerJson[a].push(b)
			
			let newB = function(){
				if(!this.eventListenerFrozen){
					b(...arguments)
				}
			}
			newB.bind(this)
			this.origAddEventListener(a,newB,c)
	}
	

	Element.prototype.origRemoveEventListener  = Element.prototype.removeEventListener;
	Element.prototype.removeEventListener = function(a,b,c) {
		this.origRemoveEventListener(a,b,c);
		if(this.eventListenerJson && this.eventListenerJson[a] && this.eventListenerJson[a].includes(b)){
			 let removeIndex = this.eventListenerJson[a].indexOf(b)
			 this.eventListenerJson[a].splice(removeIndex,1)
		}
	};
	document.eventListenerIsOverwritten = true;
	
	function makeTrusted(event,target){
		if(target==undefined) target = document.createElement("div")
		let trustedFakeEvent = {}
		for(let prop in event){
			if(typeof event[prop]=== "function"){
				trustedFakeEvent[prop] = event[prop].bind(event)
			}else{
				trustedFakeEvent[prop] = event[prop]
			}
		}
		trustedFakeEvent.constructor = event.constructor
		trustedFakeEvent.isTrusted = true
		trustedFakeEvent.target = target;
		trustedFakeEvent.currentTarget = target;
		trustedFakeEvent.srcElement = target;
		trustedFakeEvent.view = window;
		return trustedFakeEvent
	}
	
	let overwriteAttributes = ["onafterprint","onbeforeprint","onbeforeunload","onhashchange","onload","onmessage","onoffline","ononline","onpagehide","onpageshow","onpopstate","onresize","onstorage","onunload","onblur","onchange","oncontextmenu","onfocus","oninput","oninvalid","onreset","onsearch","onselect","onsubmit","onkeydown","onkeypress","onkeyup","onclick","ondblclick","onmousedown","onmousemove","onmouseout","onmouseover","onmouseup","onmousewheel","onwheel","ondrag","ondragend","ondragenter","ondragleave","ondragover","ondragstart","ondrop","onscroll","oncopy","oncut","onpaste","onabort","oncanplay","oncanplaythrough","oncuechange","ondurationchange","onemptied","onended","onerror","onloadeddata","onloadedmetadata","onloadstart","onpause","onplay","onplaying","onprogress","onratechange","onseeked","onseeking","onstalled","onsuspend","ontimeupdate","onvolumechange","onwaiting","ontoggle"]
	Element.prototype.higherAccessDispatch = function(event){
		if(event.type == "click"){
			this.eventListenerFrozen = true;
			let savedProps = {}
			for(let el of overwriteAttributes){
				if(el.includes(event.type)){
					savedProps[el] = this[el]
					delete this[el]
				}
			}
			
			this.click()
			
			for(let el in savedProps){
				 this[el] = savedProps[el]
			}
			this.eventListenerFrozen = false;
		}
		let fakeEvent = makeTrusted(event,this)
		if(this.eventListenerJson && this.eventListenerJson[event.type]){
			for(let eventHandler of this.eventListenerJson[event.type]){
				eventHandler(fakeEvent)
			}
		}
		
	}
	
	Node.prototype.getElementPath = function(){
		let path= []
		let current = this
		while(current.parentNode){
			let index = [...current.parentNode.childNodes].indexOf(current)
			path.unshift([index, current.tagName])
			current = current.parentNode
		}
		return path
	}
	
	document.getElementByPath = function(path){
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
	
	
	document.getSerializedNode = function(parseNode){
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
	
	document.makeNodeFromSerialized = function(json){
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
			let element = document.createAttributeNode(json.localName)
			element.value = json.value
			return element
		}else if(json.nodeType == 3){
			let element = document.createTextNode(json.textContent)
			return element
		}
	}
	
	document.getSerialized = function(parseNode){
		let serializedChildren = []
		for(let child of parseNode.childNodes){
			if(child.nodeName!=="SCRIPT") serializedChildren.push(document.getSerialized(child))
		}
		let parsed = document.getSerializedNode(parseNode)
		
		let events;
		if(parsed.eventListenerJson){
			events = Object.keys(parsed.eventListenerJson||{})
			delete parsed.eventListenerJson
		}else{
			events = []
		}
		return {"node": parsed,"children":serializedChildren, "events":events}
	}
	
	document.makeFromSerialized = function(json){
		let parent = document.makeNodeFromSerialized(json.node)
		for(let listener of json.events){
			parent.addEventListener(listener,()=>{console.log(listener)})
		}
		for(let child of json.children){
			parent.appendChild(document.makeFromSerialized(child))
		}
		return parent
	}
	
	document.serializeSocketJson = function(element){
		return {
			"content": document.getSerialized(element),
			"path": element.getElementPath()
			}
	}
	
	document.parseSocketJson = function(json){
		let element = document.getElementByPath(json.path)
		element.replaceWith(document.makeFromSerialized(json.content))
	}
	
	
}

