const express = require('express');
const { fchown } = require('fs');
const app = express();
const http = require('http');
const { SocketAddress } = require('net');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  
});


let USERS = [];
let TYPING_USERRS = [];

currentlevel = 0;
const LEVELS = [

  {"content":[{"x":100,"y":770,"w":700,"h":30,"t":"platform"},{"x":770,"y":250,"w":30,"h":520,"t":"platform"},{"x":110,"y":540,"w":470,"h":30,"t":"platform"},{"x":550,"y":230,"w":30,"h":310,"t":"platform"},{"x":230,"y":570,"w":90,"h":200,"t":"goal"},{"x":580,"y":350,"w":190,"h":30,"t":"checkpoint","e":null},{"x":720,"y":-190,"w":80,"h":440,"t":"platform"},{"x":1080,"y":-340,"w":20,"h":20,"t":"platform"},{"x":1070,"y":-320,"w":20,"h":20,"t":"platform"},{"x":550,"y":-530,"w":250,"h":340,"t":"platform"},{"x":160,"y":-800,"w":640,"h":270,"t":"platform"},{"x":330,"y":-380,"w":70,"h":190,"t":"platform"},{"x":-50,"y":-800,"w":210,"h":610,"t":"platform"},{"x":350,"y":-530,"w":30,"h":150,"t":"checkpoint","e":null},{"x":350,"y":-190,"w":30,"h":200,"t":"checkpoint"},{"x":-290,"y":-550,"w":60,"h":780,"t":"platform"},{"x":-800,"y":-800,"w":750,"h":60,"t":"platform"},{"x":-580,"y":-550,"w":290,"h":40,"t":"platform"},{"x":-800,"y":-740,"w":50,"h":510,"t":"platform"},{"x":-750,"y":-280,"w":230,"h":50,"t":"platform"},{"x":-580,"y":0,"w":290,"h":40,"t":"platform"},{"x":-800,"y":-230,"w":50,"h":1030,"t":"platform"},{"x":-750,"y":770,"w":850,"h":30,"t":"platform"},{"x":-230,"y":-420,"w":180,"h":30,"t":"checkpoint","e":null},{"x":-520,"y":-270,"w":230,"h":30,"t":"checkpoint"},{"x":-750,"y":0,"w":170,"h":40,"t":"checkpoint"},{"x":-380,"y":230,"w":150,"h":80,"t":"platform"},{"x":-750,"y":230,"w":270,"h":80,"t":"platform"},{"x":-380,"y":310,"w":40,"h":270,"t":"platform"},{"x":-600,"y":530,"w":220,"h":50,"t":"platform"},{"x":-340,"y":530,"w":230,"h":50,"t":"platform"},{"x":-70,"y":370,"w":490,"h":30,"t":"platform"},{"x":80,"y":230,"w":20,"h":140,"t":"checkpoint","e":null},{"x":350,"y":400,"w":20,"h":140,"t":"checkpoint"},{"x":-110,"y":10,"w":690,"h":220,"t":"platform"},{"x":1330,"y":580,"w":20,"h":20,"t":"platform"},{"x":-320,"y":310,"w":30,"h":220,"t":"checkpoint","e":null},{"x":1630,"y":520,"w":20,"h":20,"t":"platform"}],"spawn":{"x1":390,"x2":90,"y1":570,"y2":200},"name":"loong"},
  
  {"content":[{"x":-800,"y":620,"w":1600,"h":180,"t":"platform"},{"x":-800,"y":-800,"w":190,"h":1420,"t":"platform"},{"x":-610,"y":-800,"w":1410,"h":160,"t":"platform"},{"x":640,"y":-640,"w":160,"h":1260,"t":"platform"},{"x":-270,"y":110,"w":420,"h":180,"t":"platform"},{"x":-610,"y":-640,"w":470,"h":480,"t":"platform"},{"x":150,"y":-290,"w":180,"h":580,"t":"platform"},{"x":-10,"y":290,"w":40,"h":330,"t":"goal"},{"x":330,"y":220,"w":310,"h":40,"t":"checkpoint","e":"0"},{"x":240,"y":-640,"w":40,"h":350,"t":"checkpoint"},{"x":-210,"y":-160,"w":40,"h":270,"t":"checkpoint"}],"spawn":{"x1":30,"x2":120,"y1":290,"y2":330},"name":"racetrack"},

  
]

const timehandler = {

  besttimes:[

    {user:null,time:Infinity},
    
    
    ],
  

}


class player{

  constructor(x,y,id,nick){
      this.x = x;
      this.y = y;
      this.xa = 0;
      this.ya = 0;
      this.id = id;
      this.size = 10;
      this.nickname = nick
      USERS.push(this);
  }

}


function changeuserlist(act,id,nick){

  if(act === "add"){
    new player(LEVELS[currentlevel].spawn.x1,LEVELS[currentlevel].spawn.y1,id,nick)
    
    io.emit('userchange', {change:"add",user:id,nickname:nick});
  }else if(act === "remove"){
    USERS.splice(USERS.findIndex((v)=>v.id === id),1); 
    io.emit('userchange', {change:"remove",user:id});
  }

}

io.on('connection', (socket) => {

    socket.nickname = "user_"+randomrange(1,1000);
    changeuserlist("add",socket.id,socket.nickname);
    io.emit('system message', socket.nickname + " has joined");
    console.log(socket.nickname + " has joined")
    socket.emit('users', USERS);
    socket.emit('level', LEVELS[currentlevel]);
    socket.emit("times",timehandler.besttimes)

    socket.on("move" ,(data)=>{
      let userindex = USERS.findIndex((v)=>v.id === socket.id)
      USERS[userindex].x = data.xc;
      USERS[userindex].y = data.yc;
      USERS[userindex].xa = data.xa;
      USERS[userindex].ya = data.ya;
      if(Math.sqrt((data.xa**2)+(data.ya**2)) > 10){
        socket.disconnect();
      }

      socket.broadcast.emit("move",{user:socket.id,xc:data.xc,yc:data.yc})
    })

    socket.on("col", (data)=>{
      if(Math.sqrt((data.xa**2)+(data.ya**2)) > 10){
        socket.disconnect();
      }
      io.to(data.user).emit("col",{xa:data.xa,ya:data.ya});

      let collided = USERS[USERS.findIndex((v)=>v.id === data.user)]
      if(collided === undefined){return}
      
      let speed1 = Math.abs(Math.sqrt((data.xa**2)+(data.ya**2)));
      let speed2 = Math.abs(Math.sqrt((collided.xa**2)+(collided.ya**2)));
      
      io.emit("dmg",{dmg:speed2,user:socket.id});
      io.emit("dmg",{dmg:speed1,user:data.user});
    })

    socket.on("msg", (msg)=>{
      if(msg.length < 80){
        io.emit("msg", socket.nickname + " : " + msg);
      }else{
        socket.emit("system message", "please keep your messages short")
      }
    })

    socket.on("nickname", (nick)=>{
      if(nick.length > 20){nick = "mynamewastoolong"}
      let userindex = USERS.findIndex((v)=>v.id === socket.id)
      io.emit("system message", socket.nickname + " has changed their name to " + nick); 
      USERS[userindex].nickname = nick;
      io.emit("nickchange", {user:socket.id,nick:nick}); 
      socket.nickname = nick
    })

    socket.on('typing', () => {
      if( TYPING_USERRS.findIndex((findid)=>findid.id === socket.id) === -1  ){
        TYPING_USERRS.push({nickname:socket.nickname,id:socket.id})
        io.emit('typing',TYPING_USERRS);
        setTimeout(()=>{
          TYPING_USERRS.splice(TYPING_USERRS.findIndex((findid)=>findid.id === socket.id),1); 
          io.emit('typing',TYPING_USERRS);
        },3000)
      }
    });

    socket.on("laptime",(time)=>{
      if(time<timehandler.besttimes[0].time){
        timehandler.besttimes[0].time = time;
        timehandler.besttimes[0].user = socket.nickname;
        io.emit("times",timehandler.besttimes)
      }
    })
   

    socket.on('disconnect', () => {
      io.emit('system message', socket.nickname + " has left");
      console.log(socket.nickname + " has left")
      changeuserlist("remove",socket.id);
    });

  });

server.listen(PORT, () => {
  console.log('listening on *:3000');
});


function distance(x1,x2,y1,y2){
  return Math.sqrt(((x2-x1)**2)+((y2-y1)**2));
}

function randomrange(min, max) { 
  return Math.floor(Math.random() * (max - min + 1) + min)
}