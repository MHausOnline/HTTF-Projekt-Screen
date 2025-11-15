if(!document.eventListenerIsOverwritten){
	Element.prototype.eventListenerFrozen = false;
	
	Element.prototype.origAddEventListener = Element.prototype.addEventListener
	Element.prototype.addEventListener = function(a,b,c){
			if(!this.eventListenerJson) this.eventListenerJson = {};
			if(!this.eventListenerJson[a]) this.eventListenerJson[a] = [];
			this.eventListenerJson[a].push(b)
			
			let newB = (function(){
				if(!this.eventListenerFrozen){ 
					if(b instanceof Function) b.bind(this)(...arguments)
				}
			}).bind(this)
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
	
	
}

