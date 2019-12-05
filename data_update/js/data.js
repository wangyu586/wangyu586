
/*Mvvm*********************************************************************************************/
function Mvvm(obj){
	this.el = obj.el?obj.el:"";
	this.data={};
	this.methods = obj.methods && typeof obj.methods === "object"? obj.methods:{};
	this.compiler;
	this.observer;
	this.init(obj);
}

Mvvm.prototype.init = function(obj){
	let dom = document.querySelector(this.el);
	if(dom === null){
		console.warn("Do not have available elements.");
		return;
	}
	this.emptyData(obj);
	this.compiler = new MvvmCompiler(dom);
	this.observer = new MvvmObserver(this.data);
	this.watcher = new MvvmWatcher(this);
	this.initData(obj);
}

Mvvm.prototype.emptyData = function(obj){
    if(obj.data && typeof obj.data === "object"){
		let tempObj =JSON.parse(JSON.stringify(obj.data));
		for(let item in tempObj){
			tempObj[item] = "";
		}
		this.data = tempObj;
	}else{
		console.warn("Mvvm.data must be an object!");
	}
}

Mvvm.prototype.initData = function(obj){
	//console.log(this.data);
    if(obj.data && typeof obj.data === "object"){
		//console.log("初始化数据")
		for(let item in obj.data){
			this.data[item] = obj.data[item];
			//console.log(obj.data[item]);
		}
		//console.log(this.data);
	}else{
		console.warn("Mvvm.data is an object!");
	}
}

/*Compiler*********************************************************************************************/

function MvvmCompiler(dom){
	this.rootDom = dom;
	this.elements = [];
	this.parseDom(dom);
}

MvvmCompiler.prototype.parseDom = function(target){
	if(target){
		//console.log("-----------------------------------");
		//console.log("开始解析节点："+target.id);
		let obj = this.compile(target);	
		//console.log("解析结果：");
		//console.log(obj);
		this.elements.push(obj);
		if(target.children && target.children.length >0){
			for(let i=0; i< target.children.length; i++){
				//console.log(target.children[i]);
				this.parseDom(target.children[i]);
			}
		}else{
			//console.log("没有子节点");
		}
	}
}
//解析指令打包成一个对象返回
MvvmCompiler.prototype.compile = function(target){
	let output={events:[],attrs:{},vars:[],id:"",hasChild:true,text:"",dom:target};
	if(target.id && target.id !== null){
		output.id = target.id;
	}
	if(target.attributes && target.attributes !== null){
		for(let i=0; i<target.attributes.length;i++){
			if(/^(v-)[A-Za-z]{1,}[\:][A-Za-z0-9]{1,}$/.test(target.attributes[i].nodeName)){
				let instructArr = target.attributes[i].nodeName.split(":");
				let instruct = instructArr[0];
				let instructAttr = instructArr[1];
				switch(instruct){
					case "v-on":
						output.events.push({
							[instructAttr]:target.attributes[i].nodeValue
						});
						break;
					case "v-bind":
						output.attrs[target.attributes[i].nodeValue] = instructAttr;
						
						break;
					default:
						break;
				}
			}
		}
	}
	if(target.children && target.children.length === 0){	
		let content = target.innerHTML;
		output.hasChild = false;
		output.text = content;
		let reg = /\{\{[A-Za-z\$\_][A-Za-z0-9]{0,}\}\}/g;
		let regRes = content.match(reg);
		if(regRes && regRes.length>0){
			for(let k=0; k<regRes.length; k++){
				regRes[k] = regRes[k].replace(/\{\{([A-Za-z\$\_][A-Za-z0-9]{0,})\}\}/,"$1");
				output.vars.push(regRes[k]);
			}
		}
	}
	return output;
}

/*Observer*********************************************************************************************/

function MvvmObserver(data){
	this.data = data;
	this.updateData ={data:{}};
	this.init();
}

MvvmObserver.prototype.init = function(){
	this.observe(this.data,true);
}

MvvmObserver.prototype.update = function(data,key,newVal){
	let obj = {srcObj:data,updateKey:key,updateVal:newVal};
	this.updateData.data = obj;
}

MvvmObserver.prototype.observe = function($data,root,rootIndex){
	let __this =this;
	if (!$data || typeof $data !== 'object') {
	    return;
	}
	Object.keys($data).forEach(function(key) {
	    __this.defineReactive($data, key, $data[key], root,rootIndex);
	});
}

MvvmObserver.prototype.defineReactive= function(data, key, val, root,rootIndex){
	let __this = this;
	    if(root){
			rootIndex = key;
		}
		//console.log("添加子属性:"+rootIndex+"---"+key);
		//this.observe(val,false,rootIndex); // 监听子属性
		
		let index = rootIndex;
	    Object.defineProperty(data, key, {
	        enumerable: true, // 可枚举
	        configurable: false, // 不能再define
	        get: function() {
	            return val;
	        },
	        set: function(newVal) {
				if(val !== newVal){
					val = newVal;
					__this.update(data,key,newVal);
				}else{
					return;
				}
	        }
	    });
}

/*Watcher*********************************************************************************************/
//,this.data,this.compiler,this.observer,this.methods
function MvvmWatcher(mvvm){
	this.compiler = mvvm.compiler;
	this.observer = mvvm.observer;
	this.mvvm = mvvm;
	this.data = mvvm.data;
	this.methods = mvvm.methods;
	this.init();
}

MvvmWatcher.prototype.init = function(){
	this.addUpdater();
	this.addEvents();
}

MvvmWatcher.prototype.addUpdater = function(){
	let __this = this;
	let data = this.observer.updateData;
	//console.log(data);
	let dataVal = data["data"];
	Object.defineProperty(data, "data", {
	    enumerable: true, // 可枚举
	    configurable: false, // 不能再define
	    get: function(val) {
			//console.log(val);
	        //return data["data"];
			return dataVal;
	    },
	    set: function(newVal) {
			if(dataVal !== newVal){
				dataVal = newVal;
				__this.updateData(newVal);
			}else{
				return;
			}
	    }
	});
}

MvvmWatcher.prototype.updateData = function(newVal){
	let __this = this;
	//console.log("---update-----------------------------------------------------------");
	let compilerData = this.compiler.elements;
	for(let i=0; i<compilerData.length; i++){
		for(let item in compilerData[i].attrs){
			if(item ===newVal.updateKey){
				//console.log("更改DOm");
				compilerData[i].dom.setAttribute(compilerData[i].attrs[item],newVal.updateVal);
			}
		}
	
		for(let k=0; k<compilerData[i].vars.length; k++){
			if(compilerData[i].vars[k] === newVal.updateKey){
				let reg = new RegExp("\{\{"+newVal.updateKey+"\}\}");
				let htmlStr = compilerData[i].text.replace(reg,newVal.updateVal); 
				__this.updateText(compilerData[i].dom,htmlStr);
			}
		}
	}
}

MvvmWatcher.prototype.updateText = function(dom,str){
	let reg = /\{\{([A-Za-z\$\_][A-Za-z0-9]{0,})\}\}/g;
	let arr = str.match(reg);
	for(let i=0; i<arr.length; i++){
		str = str.replace(/\{\{([A-Za-z\$\_][A-Za-z0-9]{0,})\}\}/, this.data[ arr[i].replace(reg,"$1")] );
	}
	dom.innerHTML = str;
}

MvvmWatcher.prototype.addEvents = function(){
	//console.log("addEvents");
	let dataArr = this.compiler.elements;
	for(let i=0; i<dataArr.length; i++){
		for(let j=0; j<dataArr[i].events.length; j++){
			for(let item in dataArr[i].events[j]){			
				dataArr[i].dom.addEventListener(item,this.methods[ dataArr[i].events[j][item] ].bind(this.mvvm));
			}
		}
	}
}

