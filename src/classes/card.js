//2-10 J,Q,K,A 4枚ずつ 計52枚
const Card = function (value, suit) {
  this.value = value;
  this.suit = suit;

  const constructor = (function () {})(this);

  this.compare = (card) => {
    if (this.value < card.getValue()) return -1;
    if (this.value == card.getValue()) return 0;
    return 1;
  };

  this.isGreater = (card) => {
    return this.value > card.getValue() ? true : false;
  };

  this.getValue = () => {
    return this.value;
  };

  this.getSuit = () => {
    return this.suit;
  };

};

module.exports = Card;
