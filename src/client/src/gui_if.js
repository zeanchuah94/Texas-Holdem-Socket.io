"use strict";
/* =========================
    GUI 関連処理
  =========================*/

/* 
  入室プレイヤーの名前を表示する
*/
function gui_setPlayerName (name, seat) {
  let seatloc = $('.seat' + seat);
  seatloc.children('.name-chips').children('.player-name').html(name);
}

/*
   ゲーム画面に切り替える 
*/
function gui_enterTheGame(){
  $('#mainContent').hide();
  $('#gameContent').show();
}

/* 
  ゲーム情報リセットする
*/
function gui_resetGameInfo(){
  $("#board").children().hide();
  $("#game-message").hide();
  $("#poker_table").find(".role_text").empty();
  
  $("#poker_table").find(".holecard1").removeAttr("style");
  $("#poker_table").find(".holecard2").removeAttr("style");
}

/* 
  ディーラーボタン
*/
function gui_place_dealer_button (seat) {
  $('#button').removeClass().addClass('seat' + seat + '-button');
  $('#button').show();
}

function gui_hide_dealer_button () {
  gui_place_dealer_button(-3);
}
/* --------------------- */

/* 
  カード画像表示関数
*/
function gui_renderHandCard(div,card,folded){
  //div 差し替え対象のdiv
  //card 差し替えカード種類  suit: 柄 value:数字
  //folded true(見せない)・ false(見せる)

  let suit,value,image_url;
  if(folded){
    //カード見せない
    image_url = url("./images/cardback.png");
  } else {
    suit = cardSuitNameConverter(card.suit);
    value = cardValueNameConverter(card.value);
    //カード見せる
    image_url = getCardImageUrl(suit,value);
  }
  return div.css('background-image', image_url);
}

function cardValueNameConverter (value) {
  let valueName = null;
  switch(value){
    case 'A': //クローバー/クラブ
      valueName = 'ace';
      break;
    case 'J': //スペードー
      valueName = 'jack';
      break;
    case 'Q': //ハート
      valueName = 'queen';
      break;
    case 'K': //ダイヤ
      valueName = 'king';
      break;
    default: //例外
      valueName = value;
      break;
  }
  return valueName;
}

function cardSuitNameConverter (suit) {
  let suitName = null;
  switch(suit){
    case '♣': //クローバー/クラブ
      suitName = 'clubs';
      break;
    case '♠': //スペードー
      suitName = 'spades';
      break;
    case '♥': //ハート
      suitName = 'hearts';
      break;
    case '♦': //ダイヤ
      suitName = 'diamonds';
      break;
    default: //例外
      alert('Unknown suit ' + suit);
      suitName = 'unknown';
      break;
  }
  return suitName;
}

function getCardImageUrl (suit,value) {
  return "url('./images/" + value + "_of_" + suit + ".png')";
}


/* 
  手番行動ボタン表示
*/
function gui_renderActions(data){
  if (data.myStatus == 'Their Turn') {
    $('#action-options').show();
    socket.emit('evaluatePossibleMoves', {});
  } else if (data.myStatus == 'Fold') {
    $('#action-options').hide();
  } else {
    $('#action-options').hide();
  }
}

/* 
  テーブル上のカード表示
*/
function gui_renderTableCards(data){
  let tableBoard = $('#board');
  if (data.community != undefined){
    console.log('rendertablecards');
    let communityCards = data.community;
    let id,targetDiv;
    for(let x= 0; x < communityCards.length; x++){
        if(x < 3){
          id = '#flop' + (x + 1);
        } else if(x == 3) {
          id = '#turn';
        } else {
          id = '#river';
        }
        targetDiv = tableBoard.children(id);
        gui_renderHandCard(
          targetDiv,
          communityCards[x],
          false
        );
        targetDiv.show();
    }
  } else {
    tableBoard.children().hide();
  }
}

/* 
  ゲームの情報表示
*/
function gui_renderBasicInfo(data){
  //自分がディーラーの場合
  if(data.isDealer){
    gui_place_dealer_button(data.seat);
  }    
  if(data.myStatus == "Their Turn"){
    $("#mycards").addClass("glow");
  } else {
    $("#mycards").removeClass("glow");
  }
      
  //所持金表示
  $('#mycards > .name-chips').children('.chips').html("所持金: " + data.myMoney);
  if(data.myStatus == "Fold"){ //投了した場合
      $('#mycards > .bet').html("FOLD");
      $('#mycards > .holecards').children().hide();
  } else{
      $('#mycards > .bet').html("Bet: $" + data.myBet);
      gui_updateBetModal(data.myMoney,data.bigBlind);
  }
  
  //Flopに入った場合、テーブルのカードを開示する
  gui_renderTableCards(data);
  

  //ゲーム情報表示
  if (data.currBet == undefined) data.currBet = 0;
  $('#game-stage').html("現在: " + data.stage);
  $('#game-round').html("ラウンド: " + data.round);
  $('#total-pot').html("ポット金額: $" + data.pot);
  $('#top-raise').html("TOP RAISE: $" + data.topBet);
  $('#cardrole').html('');

  //相手のみの情報をフィルターして反映と表示
  const opponentArray = data.players.filter((item)=>{
    return item.username != data.username
  });

  console.log(opponentArray);

  opponentArray.forEach(opp => {
    console.log(opp.seat);
    let oppSeat = $('.seat' + opp.seat);
    oppSeat.find('.chips').html("所持金: " + opp.money);
    if(opp.status == 'Fold'){
      oppSeat.children('.bet').html("FOLD")
      oppSeat.children('.holecards').children().hide();
    } else if(opp.status == 'Their Turn') {
      //相手の手番の場合
      oppSeat.addClass("glow");
    } else {
      oppSeat.children('.bet').html("Bet: $" + opp.bet);
      oppSeat.removeClass("glow");
    }
    
    if(opp.isDealer){
      gui_place_dealer_button(opp.seat);
    }
    
  });
}

  /* 
    賭け金表示関連　Raise Bet
  */
function gui_updateBetDisplay() {
  $('#betAmount').html(
    $('#betRangeSlider').val()
  );
}

function gui_updateBetModal(playerMoney,minBet) {
  //ここだけrerender時呼び出してプレイヤーの所持金を元にベット上限金額を更新する
  $('#betRangeSlider').value = minBet;
  $('#betRangeSlider').attr({
    max: playerMoney,
    min: minBet
  });
}

function gui_updateRaiseDisplay() {
  $('#raiseAmount').html(
      $('#raiseRangeSlider').val()
  );
}