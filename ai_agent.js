class AIAgent {
    constructor(name) {
        this.name = name;
    }

    decide(gameState) {
        // gameState contains:
        // - communityCards
        // - myHand
        // - currentBet
        // - myChips
        // - pot
        // - stage (pre-flop, flop, turn, river)

        // Simple heuristic for now
        const handStrength = this.evaluateHandStrength(gameState.myHand, gameState.communityCards);

        // Random factor to make it less predictable
        const random = Math.random();

        // If there is no bet to call (check is possible)
        if (gameState.currentBet === 0) {
            if (handStrength > 0.7) {
                return { action: 'raise', amount: Math.min(gameState.myChips, 50) }; // Small raise
            } else {
                return { action: 'check' };
            }
        }

        // Facing a bet
        if (handStrength > 0.8) {
            return { action: 'raise', amount: Math.min(gameState.myChips, gameState.currentBet * 2) };
        } else if (handStrength > 0.4) {
            return { action: 'call' };
        } else {
            // Bluff chance
            if (random > 0.9) {
                return { action: 'raise', amount: Math.min(gameState.myChips, gameState.currentBet * 2) };
            }
            return { action: 'fold' };
        }
    }

    evaluateHandStrength(hand, communityCards) {
        // A real implementation would run a Monte Carlo simulation or use a lookup table.
        // Here we just do a very rough estimate based on rank.

        const allCards = [...hand, ...communityCards];
        const evalResult = HandEvaluator.evaluate(allCards);

        // Normalize value roughly
        // High Card: < 1M
        // Pair: 1M - 2M
        // Two Pair: 2M - 3M
        // Trips: 3M - 4M
        // Straight: 4M - 5M
        // Flush: 5M - 6M
        // Full House: 6M - 7M
        // Quads: 7M - 8M
        // SF: 8M+

        const score = evalResult.value;

        if (score > 6000000) return 0.95; // Full House +
        if (score > 5000000) return 0.9; // Flush
        if (score > 4000000) return 0.8; // Straight
        if (score > 3000000) return 0.7; // Trips
        if (score > 2000000) return 0.6; // Two Pair
        if (score > 1000000) return 0.4; // Pair

        // High card logic
        // If pre-flop (only 2 cards)
        if (communityCards.length === 0) {
            const rank1 = hand[0].rank;
            const rank2 = hand[1].rank;
            if (rank1 === rank2) return 0.8; // Pocket pair
            if (rank1 > 12 || rank2 > 12) return 0.6; // High cards
            return 0.2;
        }

        return 0.1; // Weak
    }
}
