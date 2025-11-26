class Card {
    constructor(suit, rank) {
        this.suit = suit; // 'h', 'd', 'c', 's'
        this.rank = rank; // 2-14 (11=J, 12=Q, 13=K, 14=A)
    }

    toString() {
        const suits = { 'h': '♥', 'd': '♦', 'c': '♣', 's': '♠' };
        const ranks = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
        return `${ranks[this.rank] || this.rank}${suits[this.suit]}`;
    }
    
    get color() {
        return (this.suit === 'h' || this.suit === 'd') ? 'red' : 'black';
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['h', 'd', 'c', 's'];
        for (let suit of suits) {
            for (let rank = 2; rank <= 14; rank++) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}

class HandEvaluator {
    static evaluate(cards) {
        // cards is an array of 5 to 7 Card objects
        // Returns an object { rank: number, name: string, value: number }
        // Rank: 0=High Card, 1=Pair, ..., 8=Straight Flush, 9=Royal Flush (treated as SF usually but good for display)
        
        // We need to find the best 5-card hand from the given cards
        // If more than 5 cards, we check all combinations (simplified: just take 7 cards logic)
        // For this simple version, let's assume we always evaluate 7 cards (2 hole + 5 community) or fewer if early?
        // Actually, standard is to evaluate 7 cards.
        
        if (cards.length < 5) return { rank: 0, name: "Incomplete", value: 0 };

        // Sort by rank descending
        cards.sort((a, b) => b.rank - a.rank);

        // Check for Flush
        const flushSuit = this.getFlushSuit(cards);
        let flushCards = [];
        if (flushSuit) {
            flushCards = cards.filter(c => c.suit === flushSuit);
        }

        // Check for Straight
        const straightCards = this.getStraightCards(cards);

        // Check for Straight Flush
        if (flushSuit && straightCards) {
             // We need to check if the straight cards are also flush cards
             // This is a bit tricky. Better: get all flush cards, check if they form a straight.
             const sf = this.getStraightCards(flushCards);
             if (sf) {
                 return { rank: 8, name: "Straight Flush", value: 8000000 + sf[0].rank };
             }
        }

        // Check for Four of a Kind
        const quads = this.getNOfAKind(cards, 4);
        if (quads) {
            return { rank: 7, name: "Four of a Kind", value: 7000000 + quads[0].rank * 100 + quads[4].rank };
        }

        // Check for Full House
        const trips = this.getNOfAKind(cards, 3);
        if (trips) {
            // We have trips, look for a pair among the REST
            const remaining = cards.filter(c => c.rank !== trips[0].rank);
            const pair = this.getNOfAKind(remaining, 2);
            if (pair) {
                return { rank: 6, name: "Full House", value: 6000000 + trips[0].rank * 100 + pair[0].rank };
            }
        }

        // Flush
        if (flushSuit) {
            return { 
                rank: 5, 
                name: "Flush", 
                value: 5000000 + flushCards[0].rank * 10000 + flushCards[1].rank * 1000 + flushCards[2].rank * 100 + flushCards[3].rank * 10 + flushCards[4].rank 
            };
        }

        // Straight
        if (straightCards) {
            return { rank: 4, name: "Straight", value: 4000000 + straightCards[0].rank };
        }

        // Three of a Kind
        if (trips) {
             const kickers = cards.filter(c => c.rank !== trips[0].rank).slice(0, 2);
             return { rank: 3, name: "Three of a Kind", value: 3000000 + trips[0].rank * 1000 + kickers[0].rank * 10 + kickers[1].rank };
        }

        // Two Pair
        const pair1 = this.getNOfAKind(cards, 2);
        if (pair1) {
            const remaining = cards.filter(c => c.rank !== pair1[0].rank);
            const pair2 = this.getNOfAKind(remaining, 2);
            if (pair2) {
                const kicker = remaining.filter(c => c.rank !== pair2[0].rank)[0];
                return { rank: 2, name: "Two Pair", value: 2000000 + pair1[0].rank * 100 + pair2[0].rank * 10 + kicker.rank };
            }
            
            // One Pair
            const kickers = remaining.slice(0, 3);
            return { rank: 1, name: "Pair", value: 1000000 + pair1[0].rank * 10000 + kickers[0].rank * 100 + kickers[1].rank * 10 + kickers[2].rank };
        }

        // High Card
        return { 
            rank: 0, 
            name: "High Card", 
            value: cards[0].rank * 10000 + cards[1].rank * 1000 + cards[2].rank * 100 + cards[3].rank * 10 + cards[4].rank 
        };
    }

    static getFlushSuit(cards) {
        const counts = {};
        for (let c of cards) {
            counts[c.suit] = (counts[c.suit] || 0) + 1;
            if (counts[c.suit] >= 5) return c.suit;
        }
        return null;
    }

    static getStraightCards(cards) {
        // Remove duplicates for straight check
        const uniqueRanks = [...new Set(cards.map(c => c.rank))];
        // Handle Ace low (A, 2, 3, 4, 5) -> 14, 2, 3, 4, 5
        if (uniqueRanks.includes(14)) uniqueRanks.push(1);
        uniqueRanks.sort((a, b) => b - a);

        for (let i = 0; i < uniqueRanks.length - 4; i++) {
            if (uniqueRanks[i] - uniqueRanks[i+4] === 4) {
                // Found straight. Now reconstruct the hand.
                // If top is Ace (14) and bottom is 10, normal.
                // If top is 5 and bottom is 1 (Ace), we need to map 1 back to 14 for finding the card object.
                const straightRanks = uniqueRanks.slice(i, i+5);
                return straightRanks.map(r => cards.find(c => c.rank === (r === 1 ? 14 : r)));
            }
        }
        return null;
    }

    static getNOfAKind(cards, n) {
        const counts = {};
        for (let c of cards) {
            counts[c.rank] = (counts[c.rank] || 0) + 1;
        }
        for (let rank in counts) {
            if (counts[rank] >= n) {
                // Return the n cards
                return cards.filter(c => c.rank == rank).slice(0, n);
            }
        }
        return null;
    }
}
