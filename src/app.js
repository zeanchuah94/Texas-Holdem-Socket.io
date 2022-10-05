//サーバー側処理
const express = require("express");
const http = require("http");
const Game = require("./classes/game");
const socketio = require("socket.io");

const dummyInfo = require("./dummy.json");

const app = express();
const server = http.createServer(app);
const io = socketio(server,{log: true});

const PORT = process.env.PORT || 4000;
let rooms = [];

app.use("/",express.static(__dirname + "/client"));

io.on('connection',(socket)=>{
    //接続クライアント数
    const clientCount = io.engine.clientsCount;

    //test
    socket.on('host',(data,callback)=>{
        console.log(socket.id, 'がhost');
        const game = new Game(dummyInfo.roomID,dummyInfo.hostName);
        socket.join(dummyInfo.roomID);
        game.setMaxPlayer(dummyInfo.maxPlayer);
        game.addPlayer(dummyInfo.hostName,socket,dummyInfo.hostId,0);
        rooms.push(game);
        game.emitPlayers('enterRoom',{
            roomid: dummyInfo.roomID,
            name: dummyInfo.hostName,
            players: game.getPlayersArray(),
            role: "host"
        });
        socket.emit('bindSeat',{
            seat: 0,
            name: dummyInfo.hostName
        });
        callback('ok');
    });

    socket.on('join',(data,callback)=>{
        const game = rooms.find((room)=>room.getCode() === dummyInfo.roomID);
        console.log(socket.id, 'がclient');
        if(game != undefined && clientCount < game.getMaxPlayer() && !game.roundInProgress){
            socket.join(dummyInfo.roomID);   
            let playersCount = game.getNumPlayers();            
            game.addPlayer(dummyInfo.player + playersCount,socket,dummyInfo.playerid + playersCount,playersCount);
            game.emitPlayers('enterRoom',{
                roomid: dummyInfo.roomID,
                name: dummyInfo.player + playersCount,
                players: game.getPlayersArray(),
                role: "player",
            });
            socket.emit('bindSeat',{
                seat: playersCount,
                name: dummyInfo.player + playersCount
            });
          callback('ok');
        } else {
          callback('in game');
        }
    });

    ///

    
    // if(socket.connected){
    //     console.log('socket id:',socket.id, '　が接続されました');
    //     if(rooms.length < 1){
    //         console.log("接続ソケット数 === " + clientCount);
    //         console.log(socket.id, 'がhost');
    //         //ルーム人数上限未満な場合ルームに入れる
    //         if(clientCount < dummyInfo.maxPlayer){
    //             // socket.join(dummyInfo.roomID);   
    
    //             const game = new Game(dummyInfo.roomID,dummyInfo.hostName);
    //             game.setMaxPlayer(dummyInfo.maxPlayer);
    //             game.addPlayer(dummyInfo.hostName,socket,dummyInfo.hostId);
    //             rooms.push(game);
    //             game.emitPlayers('hostRoom',{
    //                 roomid: dummyInfo.roomID,
    //                 players: game.getPlayersArray(),
    //             });
    //         }
    //     } else {
    //         const game = rooms.find((room)=>room.getCode() === dummyInfo.roomID);
    //         console.log(socket.id, 'がclient');
    //         console.log(game.getMaxPlayer());
    //         if(game != undefined && clientCount < game.getMaxPlayer()){
    //             // console.log(game.players.length);
    //             // socket.join(dummyInfo.roomID);  
    //             game.addPlayer(dummyInfo.player01_name,socket,dummyInfo.player01_id);
    //             console.log(game.getNumPlayers());
    //             console.log(game.getPlayersArray());
    //             // game.emitPlayers('joinRoom',{
    //             //     name: dummyInfo.hostName,
    //             //     roomid: dummyInfo.roomID,
    //             //     players: game.getPlayersArray(),
    //             //     seat: 1
    //             // });
    //         }
    //         return;   
    //     }
    // })

    // 部屋内のsocket詳細を確認できる
    // const tests = await io.in(dummyInfo.roomID).fetchSockets(); 
    // tests.forEach(test => {
    //     console.log(test.id);
    // });
    socket.on('startGame', (data) => {
        //配信者がゲーム開始を押す時
        console.log(data);
        const game = rooms.find((r) => r.getCode() == data);
        if(game != undefined){
            console.log('host start game');
            // game.emitPlayers('gameBegin', { code: data });
            game.startGame();
        }
    });

    //現在手番のプレイヤーが行える行動を計算する
    socket.on('evaluatePossibleMoves', () => {
        console.log('---evaluatePossibleMoves---');
        const game = rooms.find(
          (r) => r.findPlayer(socket.id).socket.id === socket.id
        );
        if (game.roundInProgress) {
          const possibleMoves = game.getPossibleMoves(socket);
          socket.emit('displayPossibleMoves', possibleMoves);
        }
      });

      //プレイヤー選択した行動を反映する
      socket.on('moveMade', (data) => {
        console.log('-------movemade action-------');
        console.log(data);
        // worst case complexity O(num_rooms * num_players_in_room)
        const game = rooms.find(
          (r) => r.findPlayer(socket.id).socket.id === socket.id
        );
    
        if (game != undefined) {
          if (data.move == 'fold') {
            game.fold(socket);
          } else if (data.move == 'check') {
            game.check(socket);
          } else if (data.move == 'bet') {
            game.bet(socket, data.bet);
          } else if (data.move == 'call') {
            game.call(socket);
          } else if (data.move == 'raise') {
            game.raise(socket, data.bet);
          }
        } else {
          console.log("ERROR: can't find game!!!");
        }
      });

      //レイズの上限額を書き換える
      socket.on('raiseModalData', () => {
        const game = rooms.find(
          (r) => r.findPlayer(socket.id).socket.id === socket.id
        );
        if (game != undefined) {
          socket.emit('updateRaiseModal', {
            topBet: game.getCurrentTopBet(),
            usernameMoney:
              game.getPlayerBetInStage(game.findPlayer(socket.id)) +
              game.findPlayer(socket.id).getMoney(),
          });
        }
      });

    socket.on('disconnect',(reason)=>{
        console.log('------' + socket.id + ' disconnected---------');
        const game = rooms.find(
          (r) => r.findPlayer(socket.id).socket.id === socket.id
        );

        if(game != undefined){
          const player = game.findPlayer(socket.id);
          game.disconnectPlayer(player);
          if (game.players.length == 0 || game.getHostName() == player.getUsername()) {
            console.log("testtest");
            if (this.rooms != undefined && this.rooms.length !== 0) {
              this.rooms = this.rooms.filter((a) => a != game);
            }
            //一時的に
            rooms = [];
          }
        }
        console.log(reason);
        console.log('--------end disconnected-------');

    });
})



server.listen(PORT, () => console.log(`hosting on port ${PORT}`));
