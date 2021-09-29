"use strict";
var socket = io();
let PLAYERS = [];
let GAMEOBJECTS = [];
let KEYS = {};
let loadedlevel = {}

let msgs_html = document.getElementById("msgs");
let TYPINGUSERS_html = document.getElementById('TYPINGUSERS');

let in_chat = false;


socket.once("users", (USERS)=>{
    USERS.forEach(v=>{
        if(PLAYERS.findIndex((v2)=>v2.id === v.id) === -1){
            new player(v.x,v.y,v.id,v.nickname)
        }
    })
})

socket.on("level",(level)=>{
    loadedlevel = level;
    buildcurrentlevel();
    setTimeout(()=>{
        racemanager.setcheckpoints();

    },100)
})

socket.on('system message', function(msg) {
    makemsg(msg,true);
});

socket.on('msg', function(msg) {
    makemsg(msg);
});

socket.on('userchange', (data)=>{

    if(data.change === "add"){
        if(PLAYERS.findIndex((v)=>v.id === data.user) === -1){
            new player(0,0,data.user,data.nickname);
        }
    }else if(data.change === "remove"){
    PLAYERS.splice(PLAYERS.findIndex((v)=>v.id === data.user),1); 
    }
    
});

socket.on('nickchange', (data)=>{

    PLAYERS[PLAYERS.findIndex((v)=>v.id === data.user)].nickname = data.nick
    
});

socket.on("move", (data)=>{
    let playerindex = PLAYERS.findIndex((v)=>v.id === data.user)
    if(playerindex !== -1){
        PLAYERS[playerindex].x = data.xc;
        PLAYERS[playerindex].y = data.yc;
    }else{
        console.log("this user doesnt exsist")
    }
})

socket.on("col", (data)=>{
    let playerindex = PLAYERS.findIndex((v)=>v.localplayer)
    if(playerindex !== -1){
        PLAYERS[playerindex].xa += data.xa;
        PLAYERS[playerindex].ya += data.ya;
    }else{
        console.log("this user doesnt exsist")
    }
})

socket.on("dmg", (data)=>{
    let playerindex = PLAYERS.findIndex((v)=>v.id === data.user)
    if(playerindex===-1){return}
    PLAYERS[playerindex].health -=data.dmg/2
})

let cavas = document.getElementById("canvas");
let ctx = cavas.getContext("2d");
canvas.height = 600;
canvas.width = 600;

class gameobject{

    constructor(x,y,width,height,type = "platform"){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.settype();
        GAMEOBJECTS.push(this);
    }
  
    update(){
        
    }
  
    render(mode){

        if(mode === this.rendermode){
            ctx.lineWidth = 2;
            ctx.globalAlpha = this.opac;
            ctx.strokeStyle = this.strokecolor;
            ctx.fillStyle = this.fillcolor;
            ctx.shadowColor = this.shadowcolor;
            ctx.strokeRect(camera.x+this.x,camera.y+this.y,this.width,this.height);
            ctx.fillRect(camera.x+this.x,camera.y+this.y,this.width,this.height);
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1;
        }
  
  
    }
  
    ballcollision(x,y,r){
      let testX = x;
      let testY = y;
  
      if (x < this.x){testX = this.x;}     
      else if (x > this.x+this.width){testX = this.x+this.width; }  
      if (y < this.y){testY = this.y; }    
      else if (y > this.y+this.height){testY = this.y+this.height; }  
    
      if (distance(testX,x,testY,y) <= r) {return true}
      return false;
    }
  
    settype(){
        this.hascol = true;
        this.rendermode = "overplayer";
        this.opac = 1;
        this.shadowcolor = "black";

        switch(this.type){
            case "platform":
            this.strokecolor = "black"
            this.fillcolor = "white";
            
            break;

            case "goal":
            this.strokecolor = "yellow"
            this.fillcolor = "yellow";
            this.hascol = false;
            this.rendermode = "underplayer";
            break;

            case "checkpoint":
            this.strokecolor = "lightblue"
            this.fillcolor = "lightblue";
            this.hascol = false;
            this.rendermode = "underplayer";
            this.checked = false;
            break;

            default:
            this.strokecolor = "black"
            this.fillcolor = "pink";
            break;


        }
    }
  
}

class player{

    constructor(x,y,id,nick){
        this.x = x;
        this.y = y;
        this.id = id;
        this.size = 20;
        this.nickname = nick;
        this.health = 100;
        
        this.localplayer = this.id === socket.id;
        if(this.localplayer === true){

            this.xa = 0
            this.ya = 0
            this.dir = 0
            this.dira = 0;
            this.speed = 0;
            this.speeda = 0.04;
            this.color= "black";
            setTimeout(v=>{this.respawn()},100)

        }else{
            this.color = "grey";
        }
        
        PLAYERS.push(this);

    }


    update(){
        
        if (!this.localplayer){if(this.health <= 0){this.health=100} return}

        if(this.health <= 0){this.restart()}
        

        if(KEYS["w"] && !in_chat){
            this.speed += this.speeda;
        }

        if(KEYS["s"] && !in_chat){
            this.speed -= this.speeda;
        }

        if(KEYS["a"] && !in_chat){
            this.dira -= 0.01;
        }

        if(KEYS["d"] && !in_chat){
            this.dira += 0.01;
        }
        this.xa *= 0.94;
        this.ya *= 0.94;
        this.dira *= 0.9;
        this.speed *= 0.93;

        this.xa += Math.cos(this.dir)*this.speed;
        this.ya += Math.sin(this.dir)*this.speed;


        // player col
        PLAYERS.forEach(v=>{
            if(v.id === this.id){return;}

            this.x += this.xa;
            if(distance(this.x,v.x,this.y,v.y) < this.size+v.size){
                this.x -= this.xa;
                socket.emit("col",{xa:this.xa/2,ya:0,user:v.id}) 
                this.xa *=-0.4;
            }else{this.x -= this.xa}

            this.y += this.ya;
            if(distance(this.x,v.x,this.y,v.y) < this.size+v.size){
                this.y -= this.ya;
                socket.emit("col",{xa:0,ya:this.ya/2,user:v.id})
                this.ya *=-0.4;
            }else{this.y -= this.ya}


        })

        camera.infocus(this);
        border.collision(this);

        GAMEOBJECTS.forEach(v=>{
            if(v.hascol){
                this.x += this.xa;
                if(v.ballcollision(this.x,this.y,this.size)){
                    this.x -= this.xa;
                    this.xa *=-0.4;
                }else{this.x -= this.xa}
    
                this.y += this.ya;
                if(v.ballcollision(this.x,this.y,this.size)){
                    this.y -= this.ya;
                    this.ya *=-0.4;
                }else{this.y -= this.ya}
            }else{
                if(v.ballcollision(this.x,this.y,this.size)){
                    if(v.type=== "checkpoint"){
                        if(!v.checked){
                            v.checked = true;
                            racemanager.r_checkpoints ++;
                        }
                    }else if(v.type==="goal"){
                        racemanager.check_win();
                    }
                }
            }

        })


        let curpos = {x:this.x.toFixed(1),y:this.y.toFixed(1)};
        this.dir += this.dira;
        this.x += this.xa;
        this.y += this.ya;
        this.x = Math.round(this.x * 100) / 100;
        this.y = Math.round(this.y * 100) / 100;
        if(!(curpos.x === this.x.toFixed(1) && curpos.y === this.y.toFixed(1))){
            socket.emit("move", {xc:this.x,yc:this.y,xa:this.xa,ya:this.ya})
        }
        
    }

    render(part ="player"){
        
        if(part === "text" ){
            if(this.localplayer){
                ctx.strokeText("x : "+ Math.round(this.x),10,10)
                ctx.strokeText("y : "+ Math.round(this.y),10,20)
                ctx.strokeText("Players online : "+ PLAYERS.length,10,45)
                ctx.strokeText("Laps : "+ racemanager.laps,10,55)

            }
        }else{
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(camera.x+this.x-this.size/100,camera.y+this.y-this.size/100, this.size, 0,Math.PI*2)
            ctx.fill();
            if (this.localplayer){
                


                // ctx.beginPath();
                // ctx.lineWidth=3;
                // ctx.strokeStyle =  "blue"
                // ctx.moveTo(camera.x+this.x,camera.y+this.y);
                // ctx.lineTo(camera.x+this.x +(this.xa*this.speed*this.size*5),camera.y+ this.y + (this.ya*this.speed*this.size*5));
                // ctx.stroke();
                // ctx.lineWidth=1;
                
                ctx.beginPath();
                ctx.lineWidth=3;
                ctx.strokeStyle =  "rgb(171, 84, 84)"
                ctx.moveTo(camera.x+this.x,camera.y+this.y);
                ctx.lineTo(camera.x+this.x +Math.cos(this.dir)*this.size,camera.y+ this.y + Math.sin(this.dir)*this.size);
                ctx.stroke();
                ctx.lineWidth=1;
                
            }
            
    
            ctx.strokeStyle =  "grey"
            ctx.strokeText(this.nickname,camera.x+this.x-this.size,camera.y+this.y-this.size-10)
            
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "red";
            ctx.moveTo(camera.x+this.x-(this.size),camera.y+this.y-(this.size+5));
            ctx.lineTo(camera.x+this.x-(this.size)+(this.size*2),camera.y+this.y-(this.size+5));
            ctx.stroke();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            
            
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "green";
            ctx.moveTo(camera.x+this.x-(this.size),camera.y+this.y-(this.size+5));
            ctx.lineTo(camera.x+this.x-(this.size)+((this.health/100)*this.size*2),camera.y+this.y-(this.size+5));
            ctx.stroke();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;

        }

    }

    restart(){

        this.x = loadedlevel.spawn.x1+this.size;
        this.y = loadedlevel.spawn.y1+this.size;
        this.xa = 0;
        this.ya = 0;
        this.size = 20;
        this.health = 100;
        this.dir = 0;
        this.dira = 0;
        this.speed = 0;
        this.speeda = 0.04;
        camera.x = camera.width/2;
        camera.y = camera.width/2;
        racemanager.laps =0;
        racemanager.r_checkpoints =0;
        socket.emit("move", {xc:this.x,yc:this.y,xa:this.xa,ya:this.ya})
        this.respawn();


    }

    respawn(){

        this.x = loadedlevel.spawn.x1+this.size;
        this.y = loadedlevel.spawn.y1+this.size;
        PLAYERS.forEach(v=>{
            if (v.localplayer) return;
            while(distance(this.x,v.x,this.y,v.y) < this.size+v.size){
                let xrand = randomrange(loadedlevel.spawn.x1+this.size,loadedlevel.spawn.x1+loadedlevel.spawn.x2-this.size)
                let yrand = randomrange(loadedlevel.spawn.y1+this.size,loadedlevel.spawn.y1+loadedlevel.spawn.y2-this.size)
                this.x = xrand
                this.y = yrand
                socket.emit("move", {xc:this.x,yc:this.y,xa:this.xa,ya:this.ya})
            }
        })
        camera.x -= this.x;
        camera.y -= this.y;

    }
    
}

const camera = {

    x:canvas.width/2,
    y:canvas.width/2, 
    width:canvas.width,
    height:canvas.height,
    triggerzone:3,
    infocus:function(obj){

        if(obj.x+camera.x < camera.width/camera.triggerzone){
            if(obj.xa === 0){
                camera.x += 1
            }else{
                camera.x += Math.abs(obj.xa)
            }
        }

        if(obj.x+camera.x > camera.width-(camera.width/camera.triggerzone)){
            if(obj.xa === 0){
                camera.x -= 1
            }else{
                camera.x -= Math.abs(obj.xa)
            }
        }

        if(obj.y+camera.y < camera.height/camera.triggerzone){
            if(obj.ya === 0){
                camera.y += 1
            }else{
                camera.y += Math.abs(obj.ya)
            }
        }

        if(obj.y+camera.y > camera.height-(camera.height/camera.triggerzone)){
            if(obj.ya === 0){
                camera.y -= 1
            }else{
                camera.y -= Math.abs(obj.ya)
            }
        }

    }


        
}

const border = {

    x1:-800,
    y1:-800,
    x2:800,
    y2:800,

    collision:function(obj){
        if(obj.x-obj.size < border.x1){obj.xa *= -0.4; obj.x = border.x1+obj.size+1}
        if(obj.y-obj.size < border.y1){obj.ya *= -0.4; obj.y = border.y1+obj.size+1}

        if(obj.x+obj.size > border.x2){obj.xa *= -0.4; obj.x = border.x2-obj.size-1}
        if(obj.y+obj.size > border.y2){obj.ya *= -0.4; obj.y = border.y2-obj.size-1}
    },

    render:function(){
        ctx.setLineDash([8,8]);
        ctx.lineWidth = 5;
        ctx.strokeStyle = "black"
        ctx.strokeRect(camera.x+border.x1,camera.y+border.y1,Math.abs(border.x1)+border.x2,Math.abs(border.y1)+border.y2);
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
    },

}

const racemanager = {

    checkpoints:0,
    r_checkpoints:0,
    laps:0,
    setcheckpoints:function(){
        racemanager.checkpoints = 0;
        racemanager.r_checkpoints = 0;
        racemanager.laps=0;
        loadedlevel.content.forEach((v)=>{
            if(v.t === "checkpoint"){
                racemanager.checkpoints++;
            } 
        });
    },
    check_win:function(){
        if(racemanager.r_checkpoints === this.checkpoints){
            racemanager.laps ++;
            racemanager.r_checkpoints = 0;
            GAMEOBJECTS.forEach(v=>{if(v.type==="checkpoint"){v.checked = false}})
        }
    },


}


function distance(x1,x2,y1,y2){
    return Math.sqrt(((x2-x1)**2)+((y2-y1)**2));
}

function randomrange(min, max) { 
    return Math.floor(Math.random() * (max - min + 1) + min)
}


window.requestAnimationFrame(main); 

let lastRenderTime = 0;
let GameSpeed = 60;

function main(currentTime){
    window.requestAnimationFrame(main);
    const sslr = (currentTime- lastRenderTime)/1000
    if (sslr < 1 / GameSpeed) {return}
    lastRenderTime = currentTime;  
    render();
    update();
}

function update(){
PLAYERS.forEach((v)=>v.update())
}

function render(){
ctx.clearRect(0,0,cavas.width,cavas.height);

GAMEOBJECTS.forEach(v=>{v.render("underplayer")});
PLAYERS.forEach((v)=>v.render());
GAMEOBJECTS.forEach(v=>{v.render("overplayer")});
border.render();
PLAYERS.forEach((v)=>v.render("text"));


}


function makemsg(msg,system=false){
    let item = document.createElement('li');
    if(system){item.classList.add("system")}
    item.textContent = msg;
    msgs_html.appendChild(item);
    msgs_html.scrollTop = msgs_html.scrollHeight;
}

function buildcurrentlevel(){
    loadedlevel.content.forEach(v=>{
        new gameobject(v.x,v.y,v.w,v.h,v.t);
    })
}

addEventListener("keydown", e => {
    // console.log("key: ",e.key);
    KEYS[e.key] = true;
});


addEventListener("keyup", e => {
    KEYS[e.key] = false;
});


let msg_form = document.getElementById("msg_form")
msg_form.addEventListener('submit', function(e) {
    e.preventDefault();
    let msg = document.getElementById("msg_input");
    if (msg.value) {
        if(msg.value.charAt(0)  === "/"){
            let cmd = msg.value.substr(1);
            switch(cmd){

                case "players":
                    let playerdata = PLAYERS.reduce((total,curplayer,i)=>{
                        return total+ "Player"+i+": "+curplayer.x + "X "+curplayer.y+ "Y ,"  ;
                    },"")
                    makemsg(playerdata);
                    break;
                case "frog":
                    makemsg("🐸");
                    break;
                case "speedy123":
                    let playerindex = PLAYERS.findIndex((v)=>v.localplayer)
                    PLAYERS[playerindex].speeda = 0.1;
                    break;
                case "speen":
                    let playerindex2 = PLAYERS.findIndex((v)=>v.localplayer)
                    PLAYERS[playerindex2].dira = 400;
                    break;
                case "ping":
                    makemsg("pong");
                    break;
                case "help":
                    makemsg("please enter /info to see help",true);
                    break;
                case "info":
                    makemsg("please enter /help to see info",true);
                    break;
                case "respawn":
                    let playerindex3 = PLAYERS.findIndex((v)=>v.localplayer)
                    PLAYERS[playerindex3].restart();
                    break;
                case "clearchat":
                    msgs_html.innerHTML = "";
                    break;
                default:
                    makemsg(cmd+ " is not a valid command",true);
                    break;

            }
        }else{
            socket.emit("msg",msg.value)
        }
        msg.value = "";
    }
  });

msg_form.addEventListener('input', function(e) {
socket.emit("typing", 1);

});

msg_form.addEventListener('focusin', function(e) {
    in_chat = true;
    msg_form.addEventListener('focusout', function(e) {in_chat = false} ,{once:true});
});

socket.on("typing", (USERS)=>{
    TYPINGUSERS_html.value = USERS.reduce((total,v)=>{
        if(v.id === socket.id){return total}
        return v.nickname+" "+total
    },"")

    let schreib = document.getElementById("schreib");
    if(TYPINGUSERS_html.value.length === 0){
      schreib.style.visibility = "hidden"
    }else{
      schreib.style.visibility = "visible"
    }
  })


let nick_form = document.getElementById("nick_form")
nick_form.addEventListener('submit', function(e) {
    e.preventDefault();
    let nick = document.getElementById("nick_input");
    if (nick.value) {
        socket.emit("nickname",nick.value)
        nick.value = "";
    }
});