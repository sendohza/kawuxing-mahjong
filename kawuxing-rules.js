(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KawuxingRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SUITS = ["tong", "tiao"];
  const HONORS = ["zhong", "fa", "bai"];
  const HDISP = { zhong: "中", fa: "发", bai: "白" };
  const PATTERN_VALUES = {
    "碰碰胡": 2,
    "明四归": 2,
    "卡五星": 2,
    "暗四归": 4,
    "清一色": 4,
    "手抓一": 4,
    "小三元": 4,
    "大三元": 8,
    "七对": 4,
    "龙七对": 8,
    "双龙七对": 16,
    "超超豪华七对": 128,
    "三元七对": 32,
    "龙三元七对": 256,
    "双龙三元七对": 512,
    "清七对": 16,
    "清碰碰胡": 8,
    "清龙七对": 32,
    "清双龙七对": 64,
    "清超超豪华七对": 512,
  };
  const BASE_BET = 10;

  function cloneTile(tile) {
    return { suit: tile.suit, val: tile.val };
  }

  function mkDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (let val = 1; val <= 9; val++) {
        for (let count = 0; count < 4; count++) deck.push({ suit, val });
      }
    }
    for (const honor of HONORS) {
      for (let count = 0; count < 4; count++) deck.push({ suit: "hon", val: honor });
    }
    return deck;
  }

  function tid(tile) {
    return tile.suit + "_" + tile.val;
  }

  function teq(left, right) {
    return !!left && !!right && left.suit === right.suit && left.val === right.val;
  }

  function tdisp(tile) {
    return tile.suit === "tong" || tile.suit === "tiao" ? tile.val : HDISP[tile.val] || "?";
  }

  function tdispSuit(tile) {
    if (tile.suit === "tong") return "筒";
    if (tile.suit === "tiao") return "条";
    return "";
  }

  function tcls(tile) {
    return tile.suit === "hon" ? tile.val : tile.suit;
  }

  function tsk(tile) {
    const suitOrder = { tong: 0, tiao: 1, hon: 2 };
    const value = typeof tile.val === "number" ? tile.val : HONORS.indexOf(tile.val) + 10;
    return suitOrder[tile.suit] * 100 + value;
  }

  function srt(tiles) {
    return [...tiles].sort((left, right) => tsk(left) - tsk(right));
  }

  function shf(tiles, random = Math.random) {
    for (let index = tiles.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
    }
    return tiles;
  }

  function cnts(hand) {
    const counts = {};
    for (const tile of hand) counts[tid(tile)] = (counts[tid(tile)] || 0) + 1;
    return counts;
  }

  function rm(hand, tile, needed) {
    const result = [...hand];
    let removed = 0;
    for (let index = result.length - 1; index >= 0 && removed < needed; index--) {
      if (teq(result[index], tile)) {
        result.splice(index, 1);
        removed++;
      }
    }
    return result;
  }

  function tileFromId(id) {
    const parts = id.split("_");
    const value = parts.slice(1).join("_");
    return { suit: parts[0], val: Number.isNaN(Number(value)) ? value : Number(value) };
  }

  function canMelds(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;
    const sorted = srt(tiles);
    const first = sorted[0];
    const counts = cnts(sorted);
    const id = tid(first);

    if (counts[id] >= 3 && canMelds(rm(sorted, first, 3))) return true;
    if (first.suit !== "hon") {
      const value = first.val;
      const second = { suit: first.suit, val: value + 1 };
      const third = { suit: first.suit, val: value + 2 };
      if (value + 2 <= 9 && counts[tid(second)] > 0 && counts[tid(third)] > 0) {
        let remaining = rm(sorted, first, 1);
        remaining = rm(remaining, second, 1);
        remaining = rm(remaining, third, 1);
        if (canMelds(remaining)) return true;
      }
    }
    return false;
  }

  function is7p(hand) {
    if (hand.length !== 14) return false;
    const counts = cnts(hand);
    let pairs = 0;
    for (const id in counts) {
      if (counts[id] % 2 !== 0) return false;
      pairs += counts[id] / 2;
    }
    return pairs === 7;
  }

  function canWin(hand) {
    if (hand.length % 3 !== 2) return false;
    if (is7p(hand)) return true;
    const counts = cnts(hand);
    for (const id in counts) {
      if (counts[id] >= 2 && canMelds(rm(hand, tileFromId(id), 2))) return true;
    }
    return false;
  }

  function waits(hand) {
    const deck = mkDeck();
    const seen = new Set();
    const result = [];
    for (const tile of deck) {
      const id = tid(tile);
      if (seen.has(id)) continue;
      seen.add(id);
      if (canWin([...hand, cloneTile(tile)])) result.push(cloneTile(tile));
    }
    return result;
  }

  function detect(hand, winTile, melds) {
    const patterns = [];
    const counts = cnts(hand);
    const pungLikeMelds = melds.filter(meld => meld.t === "peng" || meld.t === "gang").length;
    let concealedTriplets = 0;

    for (const id in counts) {
      if (counts[id] >= 3) {
        const tile = tileFromId(id);
        if (!melds.some(meld => teq(meld.ts[0], tile))) concealedTriplets++;
      }
    }

    const allTiles = [...hand];
    for (const meld of melds) allTiles.push(...meld.ts);
    const tongCount = allTiles.filter(tile => tile.suit === "tong").length;
    const tiaoCount = allTiles.filter(tile => tile.suit === "tiao").length;
    const cleanSuit = tongCount === allTiles.length || tiaoCount === allTiles.length;
    const allCounts = cnts(allTiles);
    const zhongCount = allCounts.hon_zhong || 0;
    const faCount = allCounts.hon_fa || 0;
    const baiCount = allCounts.hon_bai || 0;
    const honorTriplets = [zhongCount, faCount, baiCount].filter(count => count >= 3).length;
    const honorPairs = [zhongCount, faCount, baiCount].filter(count => count >= 2).length;
    const sevenPairs = is7p(hand);

    if (winTile && winTile.val === 5 && (winTile.suit === "tong" || winTile.suit === "tiao")) patterns.push("卡五星");
    if (winTile && melds.some(meld => meld.t === "peng" && teq(meld.ts[0], winTile))) patterns.push("明四归");
    if (winTile && !sevenPairs && hand.filter(tile => teq(tile, winTile)).length === 4) patterns.push("暗四归");
    if (pungLikeMelds + concealedTriplets === 4) patterns.push("碰碰胡");

    if (sevenPairs) {
      const hasThreeDragonPairs = zhongCount >= 2 && faCount >= 2 && baiCount >= 2;
      const fours = Object.values(counts).filter(count => count === 4).length;
      if (hasThreeDragonPairs && fours >= 2) patterns.push("双龙三元七对");
      else if (hasThreeDragonPairs && fours >= 1) patterns.push("龙三元七对");
      else if (hasThreeDragonPairs) patterns.push("三元七对");
      else if (fours >= 3) patterns.push("超超豪华七对");
      else if (fours >= 2) patterns.push("双龙七对");
      else if (fours >= 1) patterns.push("龙七对");
      else patterns.push("七对");
    }

    if (cleanSuit) patterns.push("清一色");
    if (melds.length === 4) {
      const remainingHand = hand.filter(tile => !winTile || !teq(tile, winTile)).length;
      if (remainingHand <= 1) patterns.push("手抓一");
    }
    if (honorTriplets === 2 && honorPairs >= 2) patterns.push("小三元");
    if (honorTriplets >= 3) patterns.push("大三元");
    return patterns;
  }

  function calc(patterns, isSelf, isKongDraw, isLast) {
    let multiplier = 1;
    for (const pattern of patterns) if (PATTERN_VALUES[pattern]) multiplier *= PATTERN_VALUES[pattern];
    if (multiplier === 1 && !isSelf) return null;
    if (isKongDraw) multiplier *= 2;
    if (isLast) multiplier *= 2;
    return multiplier;
  }

  function calcLD(patterns, isSelf, isKongDraw, isLast, isLDWinner, isLDPayer) {
    let multiplier = 1;
    for (const pattern of patterns) if (PATTERN_VALUES[pattern]) multiplier *= PATTERN_VALUES[pattern];
    if (multiplier === 1 && !isSelf && !isLDPayer) return null;
    if (isKongDraw) multiplier *= 2;
    if (isLast) multiplier *= 2;
    if (isLDWinner) multiplier *= 2;
    if (isLDPayer) multiplier *= 2;
    return multiplier;
  }

  return {
    BASE_BET,
    HDISP,
    HONORS,
    PATTERN_VALUES,
    SUITS,
    calc,
    calcLD,
    canMelds,
    canWin,
    cnts,
    detect,
    is7p,
    mkDeck,
    rm,
    shf,
    srt,
    tcls,
    tdisp,
    tdispSuit,
    teq,
    tid,
    tsk,
    waits,
  };
});
