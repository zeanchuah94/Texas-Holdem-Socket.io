$(document).ready(function () {
    $('#hostButton').click(()=>{hostGame()});
    $('#joinButton').click(()=>{joinGame()});

    $('#fold-button').click(()=>{fold()});
    $('#call-button').click(()=>{call()});
    $('#check-button').click(()=>{check()});
    $('#raise-button').click(()=>{triggerRaise()});
    $('#closeRaise-button').click(()=>{triggerRaise()});
    $('#confirmRaise-button').click(()=>{raise()});
    $('#bet-button').click(()=>{triggerBet()});
    $('#closeBet-button').click(()=>{triggerBet()});
    $('#confirmBet-button').click(()=>{bet()});

    $('#raiseRangeSlider').change(() => {gui_updateRaiseDisplay()});
    $('#betRangeSlider').change(() => {gui_updateBetDisplay()});
});

const socket = io();

socket.on('enterRoom',(data)=>{    
    console.log('main js new client enterRoom');
    console.log(data);
    console.log('----------------------');

    if(data != undefined){
        if(data.role == "host"){
            $('#startGameBtn').click(()=>{startGame(data.roomid)});
            $('#startGameBtn').show();
        }
            for(let x= 0; x < data.players.length; x++){
              gui_setPlayerName(data.players[x],x);  
              $('.seat' + x).show();
            }
    }
});

//自分の席にmycardsのid追加 (手札や役職バインド用)
socket.on('bindSeat',(data)=>{
    return $('.seat' + data.seat).attr('id','mycards');
});

//カードを配る
socket.on('dealt', function (data) {
      gui_resetGameInfo();

      console.log('======' + data.username + ' の手札は======');
      console.log(data);
      console.log('========================');

      let handCards = data.cards;
      for(let x= 0; x < handCards.length; x++){
        var target = $('#mycards > .holecards').children('.holecard'+(x+1));
        gui_renderHandCard(target,handCards[x],false);
      }
  });
  
/* 
    ゲーム開始後ラウンドごとにプレイヤー各自のステータス更新
*/
socket.on('rerender', function (data) {
    console.log('-----emit rerender------');
    console.log(data);

    gui_renderBasicInfo(data);
    gui_renderActions(data);
});

/* 
  手番時できる行動とその処理
*/
socket.on('displayPossibleMoves', function (data) {
  console.log('-----displaying possible  moves -------');
  console.log(data);
  console.log('----- possible  moves ここまで -------');

  if (data.fold == 'yes') $('#fold-button').show();
  else $('#fold-button').hide();
  if (data.check == 'yes') $('#check-button').show();
  else $('#check-button').hide();
  if (data.bet == 'yes') $('#bet-button').show();
  else $('#bet-button').hide();
  if (data.call != 'no' || data.call == 'all-in') {
    $('#call-button').show();
    if (data.call == 'all-in') $('#call-button').text('All In');
    else $('#call-button').text('Call $' + data.call);
  } else $('#call-button').hide();
  if (data.raise == 'yes') $('#raise-button').show();
  else $('#raise-button').hide();
});

/* 
    ゲーム終了、全員の手札と役を開示する 
*/
socket.on('reveal', function (data) {
    console.log('SOCKET ON REVEAL!!!');
    console.log(data);

    $('#action-options').hide();

    let winners = "";
    for (var i = 0; i < data.winners.length; i++) {  
      winners.concat(', ', data.winners[i]); 
    }
    $('#game-message').html('勝者は: ' + data.winners);
    $('#game-message').show();
    $('#game-stage').html('現在: Game End');

    //ホストのみ再戦/new gameを表示させる
    if(data.host == data.username){
      $('#startGameBtn').html('再戦');
      $('#startGameBtn').show();
    }

    //相手の状態更新
    data.allPlayerCards.forEach(function (pdata) {
      let playerSeat = $('.seat' + pdata.seat);
      //役表示
      playerSeat.children('.role_text').html(pdata.handRole);
      //所持金更新
      playerSeat.children('.name-chips > .chips').html('所持金: ' + pdata.money);
      //手札開示
      for(let x= 0; x < pdata.handCards.length; x++){
        console.log(pdata.handCards[x]);
        gui_renderHandCard(
          playerSeat.children('.holecards').children('.holecard' + (x + 1)),
          pdata.handCards[x],
          false
        );
      }
    });
  });

  /* 
    行える行動なし！　全員FOLDしたら発火される
  */
  socket.on('endHand', function (data) {
    console.log('END HAND TRIGGERED');
    console.log(data);

    $('#action-options').hide();

    $('#game-message').html('勝者は: ' + data.winner);
    $('#game-message').show();
    $('#game-stage').html('現在: Game End');

    //ホストのみ再戦/new gameを表示させる
    if(data.host == data.username){
      $('#startGameBtn').html('再戦');
      $('#startGameBtn').show();
    }

    //相手の状態更新
    data.cards.forEach(function (pdata) {
      let playerSeat = $('.seat' + pdata.seat);
      //所持金更新
      playerSeat.children('.name-chips > .chips').html('所持金: ' + pdata.money);
      //手札開示
      if(pdata.text == "Fold"){
        playerSeat.children('.holecards').children().hide();
        playerSeat.children('.role_text').html("FOLD");
      } else {
        playerSeat.children('.role_text').html("YOU WIN");
      }
    });

    //todo 演出の追加など
  });


/* 
  RaiseのBet上限と下限を更新
*/
socket.on('updateRaiseModal', function (data) {
  console.log(data);
  $('#raiseRangeSlider').value = data.topBet;
  $('#raiseRangeSlider').attr({
    max: data.usernameMoney,
    min: data.topBet,
  });
});
/////////


/* 
  通信切断時の処理
*/
socket.on('playerDisconnected', function (data) {
  console.log("in main.js disconeectd");
  console.log("name = " + data.playername);
  console.log("playerseat = " + data.seat);
  
  gui_setPlayerName("",data.seat);
  $('.seat' + data.seat).hide();
});

/* 
  HOSTゲーム終了させる・切断した場合の処理
*/
socket.on('hostEndGame', function (data) {
  $("#gameContent").hide();
  $("#disconnectText").html(data.hostname + "がゲームを終了しました")
  $("#disconnectPanel").show();
  console.log("HOST END GAME!!!");
});


/* ==================
      基本処理関数
==================== */
function hostGame(){
    let hostid =  document.getElementById('hostid').value;
    socket.emit('host', hostid,(res)=>{
        if(res == 'ok'){
            gui_enterTheGame();
        }
    });
}

function joinGame(){
    let playerid = document.getElementById('playerid').value;
    console.log(playerid);
    socket.emit('join',playerid,(res)=>{
        if(res == 'ok'){
          gui_enterTheGame();
        } else if(res == 'in game'){
          alert("ゲーム進行中のため加入できません");
        }
    });
}

function startGame(roomid){
    socket.emit('startGame',roomid);
    $('#startGameBtn').hide();
}


//====================手番行動リスト========================================
function fold() {
  console.log('clicked fold');
  socket.emit('moveMade', { move: 'fold', bet: 'Fold' });
};

function bet() {
    console.log('bet');
    socket.emit('moveMade', {
      move: 'bet',
      bet: parseInt($('#betRangeSlider').val()),
    });
    triggerBet();
};

function call() {
  console.log('clicked call');
  socket.emit('moveMade', { move: 'call', bet: 'Call' });
}

function check() {
  socket.emit('moveMade', { move: 'check', bet: 'Check' });
};

function triggerRaise(){
  $('#raise-modal').toggle();
  socket.emit('raiseModalData', {});
}

function triggerBet(){
  $('#bet-modal').toggle();
}

function raise() {
  if (
    parseInt($('#raiseRangeSlider').val()) == $('#raiseRangeSlider').prop('min')
  ) {
    alert('現在の額より高い金額でレイズしてください');
  } 
  else {
    socket.emit('moveMade', {
      move: 'raise',
      bet: parseInt($('#raiseRangeSlider').val()),
    });
    triggerRaise();
  }
};

