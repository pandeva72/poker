class Game {
    constructor() {
        this.deck = new Deck();
        this.ai = new AIAgent("AI");

        this.players = {
            user: { name: "You", chips: 1000, hand: [], currentBet: 0, folded: false, allIn: false },
            ai: { name: "AI", chips: 1000, hand: [], currentBet: 0, folded: false, allIn: false }
        };

        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.dealer = 'user';
        this.turn = null;
        this.stage = 'pre-flop';
        this.gameOver = false;
        this.actionsThisRound = 0;

        this.ui = {
            communityCards: document.getElementById('community-cards'),
            pot: document.getElementById('pot-amount'),
            userHand: document.getElementById('user-hand'),
            aiHand: document.getElementById('ai-hand'),
            userChips: document.getElementById('user-chips'),
            aiChips: document.getElementById('ai-chips'),
            userAction: document.getElementById('user-action'),
            aiAction: document.getElementById('ai-action'),
            controls: document.getElementById('controls'),
            message: document.getElementById('game-message'),
            raiseControls: document.getElementById('raise-controls'),
            raiseSlider: document.getElementById('raise-slider'),
            raiseAmount: document.getElementById('raise-amount'),
            btnFold: document.getElementById('btn-fold'),
            btnCheck: document.getElementById('btn-check'),
            btnCall: document.getElementById('btn-call'),
            btnRaise: document.getElementById('btn-raise'),
            btnConfirmRaise: document.getElementById('btn-confirm-raise')
        };

        this.bindEvents();
        this.startNewHand();
    }

    bindEvents() {
        this.ui.btnFold.addEventListener('click', () => this.handleUserAction('fold'));
        this.ui.btnCheck.addEventListener('click', () => this.handleUserAction('check'));
        this.ui.btnCall.addEventListener('click', () => this.handleUserAction('call'));
        this.ui.btnRaise.addEventListener('click', () => {
            this.ui.raiseControls.classList.remove('hidden');
            const minRaise = Math.max(20, this.currentBet * 2);
            this.ui.raiseSlider.min = minRaise;
            this.ui.raiseSlider.max = this.players.user.chips + this.players.user.currentBet; // Total chips available for bet
            this.ui.raiseSlider.value = minRaise;
            this.ui.raiseAmount.innerText = minRaise;
        });

        this.ui.raiseSlider.addEventListener('input', (e) => {
            this.ui.raiseAmount.innerText = e.target.value;
        });

        this.ui.btnConfirmRaise.addEventListener('click', () => {
            const amount = parseInt(this.ui.raiseSlider.value);
            this.handleUserAction('raise', amount);
            this.ui.raiseControls.classList.add('hidden');
        });
    }

    startNewHand() {
        if (this.players.user.chips <= 0 || this.players.ai.chips <= 0) {
            this.showMessage(this.players.user.chips <= 0 ? "Game Over! You lost." : "Game Over! You won!");
            return;
        }

        this.deck.reset();
        this.players.user.hand = [];
        this.players.ai.hand = [];
        this.players.user.folded = false;
        this.players.ai.folded = false;
        this.players.user.currentBet = 0;
        this.players.ai.currentBet = 0;
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.stage = 'pre-flop';
        this.gameOver = false;
        this.actionsThisRound = 0;

        this.ui.userAction.innerText = '';
        this.ui.aiAction.innerText = '';
        this.ui.message.style.display = 'none';

        // Switch dealer
        this.dealer = this.dealer === 'user' ? 'ai' : 'user';

        this.showMessage("New Hand", 1000);

        this.postBlinds();

        this.players.user.hand.push(this.deck.deal());
        this.players.ai.hand.push(this.deck.deal());
        this.players.user.hand.push(this.deck.deal());
        this.players.ai.hand.push(this.deck.deal());

        this.updateUI();

        // Heads up: Dealer is SB, Opponent is BB. Dealer acts first pre-flop.
        this.turn = this.dealer;
        this.nextTurn();
    }

    postBlinds() {
        const sb = 10;
        const bb = 20;

        const sbPlayer = this.dealer === 'user' ? this.players.user : this.players.ai;
        const bbPlayer = this.dealer === 'user' ? this.players.ai : this.players.user;

        this.bet(sbPlayer, sb);
        this.bet(bbPlayer, bb);

        this.currentBet = bb;
    }

    bet(player, amount) {
        if (player.chips < amount) {
            amount = player.chips;
            player.allIn = true;
        }
        player.chips -= amount;
        player.currentBet += amount;
        this.pot += amount;
    }

    nextTurn() {
        if (this.gameOver) return;

        this.updateUI();
        this.updateControls();

        if (this.turn === 'ai') {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }

    aiTurn() {
        const gameState = {
            communityCards: this.communityCards,
            myHand: this.players.ai.hand,
            currentBet: this.currentBet - this.players.ai.currentBet,
            myChips: this.players.ai.chips,
            pot: this.pot,
            stage: this.stage
        };

        const decision = this.ai.decide(gameState);
        this.handleAction('ai', decision.action, decision.amount);
    }

    handleUserAction(action, amount) {
        this.handleAction('user', action, amount);
    }

    handleAction(playerKey, action, amount) {
        const player = this.players[playerKey];
        const opponent = this.players[playerKey === 'user' ? 'ai' : 'user'];

        this.ui[`${playerKey}Action`].innerText = action.toUpperCase();
        this.actionsThisRound++;

        if (action === 'fold') {
            player.folded = true;
            this.endHand(opponent === this.players.user ? 'user' : 'ai');
            return;
        }

        if (action === 'call') {
            const amountToCall = this.currentBet - player.currentBet;
            this.bet(player, amountToCall);
        } else if (action === 'raise') {
            // amount is total bet
            let totalBet = amount;
            if (!totalBet) {
                // If AI didn't specify, min raise
                totalBet = this.currentBet * 2;
            }

            const added = totalBet - player.currentBet;
            this.bet(player, added);
            this.currentBet = player.currentBet;

            // Re-open betting for opponent
            this.actionsThisRound = 1; // Reset actions count effectively as this is a new aggression
        } else if (action === 'check') {
            // Check
        }

        if (this.isRoundOver()) {
            setTimeout(() => this.nextStage(), 1000);
        } else {
            this.turn = playerKey === 'user' ? 'ai' : 'user';
            this.nextTurn();
        }
    }

    isRoundOver() {
        if (this.players.user.folded || this.players.ai.folded) return true;

        const betsEqual = this.players.user.currentBet === this.players.ai.currentBet;

        // If bets are equal, we need to ensure everyone had a chance to act.
        // Pre-flop: BB must act.
        // Post-flop: Check-Check or Bet-Call.

        if (this.stage === 'pre-flop') {
            // If bets equal and pot > blinds (someone raised and called) OR
            // If bets equal and BB checked (pot == blinds)
            // actionsThisRound is not reliable if we reset it on raise.

            // If bets are equal:
            // If currentBet == BB (limped pot): Round over if BB checked.
            // If currentBet > BB (raised pot): Round over if caller called.

            // Simplified: If bets are equal and both players have acted at least once (or BB checked).
            // But 'actionsThisRound' is tricky.

            // Let's rely on: If bets are equal AND (it's not the start of the round OR we are back to the first actor?)
            // No.

            // If bets are equal, and the CURRENT player just acted (Called or Checked).
            // Then it is over.
            // Exception: Pre-flop, if SB calls, bets equal, but BB has option.

            if (betsEqual) {
                if (this.stage === 'pre-flop' && this.currentBet === 20 && this.turn === (this.dealer === 'user' ? 'ai' : 'user')) {
                    // This is the BB's turn to check. If they check, round over.
                    // But this function is called AFTER action.
                    // So if BB just checked, turn is now SB.
                    // If BB checked, round over.
                    return true;
                }
                // If SB called (bets equal), but BB hasn't acted (turn is BB).
                // Wait, handleAction switches turn BEFORE calling this? No, I put it in else.
                // Ah, I need to check BEFORE switching turn?
                // My code switches turn in the else block of isRoundOver.

                // So current 'this.turn' is the player who just acted.

                // If pre-flop, bets equal (20), and actor was SB. NOT OVER.
                if (this.stage === 'pre-flop' && this.currentBet === 20 && this.turn === this.dealer) {
                    return false;
                }

                return true;
            }
            return false;
        } else {
            // Post-flop
            // If bets equal.
            // If Check-Check: Over.
            // If Bet-Call: Over.
            // If first actor checks: Not over.

            // If bets equal:
            // If actionsThisRound == 0? Impossible.
            // If actionsThisRound == 1 (Check), not over.
            // If actionsThisRound >= 2, over.

            return betsEqual && this.actionsThisRound >= 2;
        }
    }

    nextStage() {
        this.players.user.currentBet = 0;
        this.players.ai.currentBet = 0;
        this.currentBet = 0;
        this.actionsThisRound = 0;
        this.ui.userAction.innerText = '';
        this.ui.aiAction.innerText = '';

        if (this.stage === 'pre-flop') {
            this.stage = 'flop';
            this.communityCards.push(this.deck.deal());
            this.communityCards.push(this.deck.deal());
            this.communityCards.push(this.deck.deal());
        } else if (this.stage === 'flop') {
            this.stage = 'turn';
            this.communityCards.push(this.deck.deal());
        } else if (this.stage === 'turn') {
            this.stage = 'river';
            this.communityCards.push(this.deck.deal());
        } else if (this.stage === 'river') {
            this.stage = 'showdown';
            this.showdown();
            return;
        }

        this.updateUI();

        // Post-flop: BB (Opponent of Dealer) acts first.
        // Dealer is 'user' -> BB is 'ai'. AI acts first.
        this.turn = this.dealer === 'user' ? 'ai' : 'user';
        this.nextTurn();
    }

    showdown() {
        this.updateUI(true); // Show cards

        const userHand = HandEvaluator.evaluate([...this.players.user.hand, ...this.communityCards]);
        const aiHand = HandEvaluator.evaluate([...this.players.ai.hand, ...this.communityCards]);

        let winner = '';
        if (userHand.value > aiHand.value) {
            winner = 'user';
            this.showMessage(`You Win! ${userHand.name} beats ${aiHand.name}`);
        } else if (aiHand.value > userHand.value) {
            winner = 'ai';
            this.showMessage(`AI Wins! ${aiHand.name} beats ${userHand.name}`);
        } else {
            winner = 'split';
            this.showMessage(`Split Pot! ${userHand.name}`);
        }

        setTimeout(() => this.endHand(winner), 3000);
    }

    endHand(winner) {
        if (winner === 'user') {
            this.players.user.chips += this.pot;
        } else if (winner === 'ai') {
            this.players.ai.chips += this.pot;
        } else {
            this.players.user.chips += Math.floor(this.pot / 2);
            this.players.ai.chips += Math.floor(this.pot / 2);
        }

        this.updateUI();
        setTimeout(() => this.startNewHand(), 2000);
    }

    updateUI(showShowdown = false) {
        // Community Cards
        this.ui.communityCards.innerHTML = '';
        this.communityCards.forEach(card => {
            this.ui.communityCards.appendChild(this.createCardEl(card));
        });

        // Pot
        this.ui.pot.innerText = this.pot;

        // Chips
        this.ui.userChips.innerText = this.players.user.chips;
        this.ui.aiChips.innerText = this.players.ai.chips;

        // Hands
        this.ui.userHand.innerHTML = '';
        this.players.user.hand.forEach(card => {
            this.ui.userHand.appendChild(this.createCardEl(card));
        });

        this.ui.aiHand.innerHTML = '';
        this.players.ai.hand.forEach(card => {
            if (showShowdown) {
                this.ui.aiHand.appendChild(this.createCardEl(card));
            } else {
                const back = document.createElement('div');
                back.className = 'card back';
                this.ui.aiHand.appendChild(back);
            }
        });
    }

    updateControls() {
        if (this.turn === 'ai' || this.gameOver) {
            this.ui.controls.classList.add('hidden');
            return;
        }
        this.ui.controls.classList.remove('hidden');

        // Check is only allowed if currentBet == user.currentBet
        if (this.currentBet === this.players.user.currentBet) {
            this.ui.btnCheck.classList.remove('hidden');
            this.ui.btnCall.classList.add('hidden');
        } else {
            this.ui.btnCheck.classList.add('hidden');
            this.ui.btnCall.classList.remove('hidden');
            this.ui.btnCall.innerText = `Call ${this.currentBet - this.players.user.currentBet}`;
        }
    }

    createCardEl(card) {
        const el = document.createElement('div');
        el.className = `card ${card.color}`;
        el.innerText = card.toString();
        return el;
    }

    showMessage(msg, duration = 0) {
        this.ui.message.innerText = msg;
        this.ui.message.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                this.ui.message.style.display = 'none';
            }, duration);
        }
    }
}

// Start the game
window.onload = () => {
    const game = new Game();
};
