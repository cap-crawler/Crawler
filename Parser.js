const puppeteer = require('puppeteer');

// var url = process.argv[2];

function printarray(array){
	for(var i=0; i<array.length; i++){
		if(typeof(array[i]) == "string") process.stdout.write(array[i].replace(/\n/gi, " ")+"\n");
		else process.stdout.write(""+array[i]+"\n");
	}
}

function show(array){
	for(var i=0; i<array.length; i++){
		if(typeof(array[i]) == "string"){
			printarray(array);
			return;
		}
		else show(array[i]);
	}
}

async function parse(url){
	const browser = await puppeteer.launch({
	    args: ["--no-sandbox", "--disable-web-security", "--user-data-dir=data", '--enable-features=NetworkService', '--start-fullscreen',  '--window-size=1920,1080']
	});
	const page = await browser.newPage();
	await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36");
	await page.goto(url);
	await page.waitFor(3000);
	const nodes = await page.evaluate((url) => {
		var bodywidth = document.body.scrollWidth;
		var bodyheight = document.body.scrollHeight;
		var y_max = 0;
		function getpos(node) {
			var position = new Object;
			position.x = 0;
			position.y = 0;
			position.w = node.offsetWidth;
			if(node){
				position.x = node.offsetLeft + node.clientLeft;
				position.y = node.offsetTop + node.clientTop;
				if(node.offsetParent) {
					var parentpos = getpos(node.offsetParent);
					position.x += parentpos.x;
					position.y += parentpos.y;
					if(["SPAN","EM", "B"].includes(node.nodeName)){
						var parent_ = getpos(node.parentNode);
						if(position.x+position.w > parent_.x+parent_.w)  position.x = parent_.x;
					}
				}
			}
			return position;
		}
		function checkad(link){
			if(link == "#") return false;
			if(link[0] == "/") return false;
			let link_machine = link.split('.')[0].split('/')[2];
			let link_domain = link.split('.')[1];
			let url_machine = url.split('.')[0].split('/')[2];
			let url_domain = url.split('.')[1];
			if(link_domain != url_domain || link_machine != url_machine) return true;
			else return false;
		}
		function recur(root, indent, is_link, is_ad, framewidth, frameheight){
			let contents = root.childNodes;
			let result = new Array();
			let attributes = new Array(); //(type, content, x, y, w, h, fontsize, bg_color, indent) : node의 attribute
			let childindent = indent;
			let isad = is_ad;
			for(var i=0; i<contents.length; i++){
				attributes = new Array();
				let node = contents[i];
				let newframewidth = framewidth;
				let newframeheight = frameheight;
				if(["SCRIPT", "#comment", "STYLE", "NOSCRIPT"].includes(node.nodeName)) continue;
				if(node.nodeValue != null){
					if(node.nodeValue.trim().length != 0 && node.nodeName == "#text" && isad == false){ //text node 체크
						attributes.push("text");
						attributes.push(node.nodeValue.trim());
						if(node.parentNode.innerHTML != node.nodeValue){ //태그가 없는 text node 체크
							let spantext = document.createTextNode(node.nodeValue);
							let insertspan = document.createElement('span');
							insertspan.appendChild(spantext);
							node.parentNode.insertBefore(insertspan, node);
							node.parentNode.removeChild(node);
							node = spantext;
							childindent += 1;
						}
						node = node.parentNode;
						let x = getpos(node).x + node.offsetWidth / 2 + framewidth;
						let y = getpos(node).y + node.clientTop + node.offsetHeight / 2 + frameheight;
						if(x <= 0 || y <= 0) continue;
						attributes.push(x);
						attributes.push(y);
						let w = node.offsetWidth;
						let h = node.offsetHeight;
						if(w <= 1.0 || h <= 1.0) continue;
						if(y + h/2 > y_max) y_max = y + h/2;
						attributes.push(w);
						attributes.push(h);
						let size = window.getComputedStyle(node,null).getPropertyValue('font-size');
						size = size.split('p')[0]*1
						attributes.push(size);
						if(size <= 0) continue;
						let bgcolor = window.getComputedStyle(node,null).getPropertyValue('background-color');
						attributes.push(bgcolor);
						attributes.push(childindent);
					}
				}
				else{
					if(window.getComputedStyle(node,null).getPropertyValue('display') == "none") continue;
					let position = window.getComputedStyle(node,null).getPropertyValue('position');
					let z_index = window.getComputedStyle(node,null).getPropertyValue('z-index');
					if(node.nodeName == "IFRAME"){
						newframewidth = framewidth + getpos(node).x;
						newframeheight = frameheight + getpos(node).y;
						node = node.contentWindow.document.body;
						if(node == null){
							continue;
						}
					}
					else if(node.nodeName == "IMG"){ //img node 체크
						if(is_link == false){
							attributes.push("img");
							attributes.push(node.src);
							let x = getpos(node).x + node.offsetWidth / 2 + framewidth;;
							let y = getpos(node).y + node.offsetHeight / 2 + frameheight;
							if(x <= 0 || y <= 0) continue;
							attributes.push(x);
							attributes.push(y);
							let w = node.offsetWidth;
							let h = node.offsetHeight;
							if(w <= 1 || h <= 1) continue;
							attributes.push(w);
							attributes.push(h);
							attributes.push(0);
							attributes.push("rgba(0, 0, 0, 0)");
							attributes.push(childindent);
						}
					}
					if(node.childNodes != null && position != "fixed" && (z_index == "auto" || z_index < 10000)){
						let islink = is_link;
						if(node.nodeName == "A"){
							let href = node.getAttribute("href");
							if(href != "#") islink = true;
							if(href == null || checkad(href) == true) isad = true;
						}
						result.push(recur(node,indent+1,islink,isad,newframewidth,newframeheight));
						isad = is_ad;
					}
				}
				result.push(attributes);
			}
			return result;
		}
		body = document.querySelector("body");
		if(bodyheight <= 1000) return [recur(body,0,false,0,0,0), 1200, y_max];
		return [recur(body,0,false,0,0,0), bodywidth, bodyheight];
	}, url);
	await browser.close();
	await show(nodes);
	await process.stdout.write(""+nodes[nodes.length-2]+"\n");
	await process.stdout.write(""+nodes[nodes.length-1]+"\n");
	await process.stdout.write(""+url+"\n");
}
// parse(url);
process.stdin.setEncoding("utf-8");
process.stdout.setEncoding("utf-8");
process.stdin.on('readable', () => {
	var url = process.stdin.read();
	if(url){
		parse(url);
	}
});