"""Reproducible checks for the 2023 Break the Code article.

This file is audit material, not part of the public Jekyll site.  It models
the 20 physical tiles in IELLO's rulebook, including the two physically
distinct but visually identical green 5 tiles.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from itertools import combinations
from math import log2
from typing import Callable, Iterable, Sequence


@dataclass(frozen=True, order=True)
class Tile:
    id: str
    value: int
    color: str


DECK = tuple(
    [
        Tile(f"B{value}", value, "B")
        for value in range(10)
        if value != 5
    ]
    + [
        Tile(f"W{value}", value, "W")
        for value in range(10)
        if value != 5
    ]
    + [Tile("G5a", 5, "G"), Tile("G5b", 5, "G")]
)
TILES = {tile.id: tile for tile in DECK}
COLOR_ORDER = {"B": 0, "G": 1, "W": 2}


def code(hand: Iterable[Tile]) -> tuple[Tile, ...]:
    return tuple(
        sorted(
            hand,
            key=lambda tile: (tile.value, COLOR_ORDER[tile.color], tile.id),
        )
    )


def visible(hand: Iterable[Tile]) -> tuple[str, ...]:
    return tuple(f"{tile.color}{tile.value}" for tile in code(hand))


def take(*tile_ids: str) -> tuple[Tile, ...]:
    return tuple(TILES[tile_id] for tile_id in tile_ids)


def remaining(*hands: Sequence[Tile]) -> tuple[Tile, ...]:
    used = {tile.id for hand in hands for tile in hand}
    return tuple(tile for tile in DECK if tile.id not in used)


def value_sum(hand: Sequence[Tile], start: int = 0, length: int | None = None) -> int:
    ordered = code(hand)
    selected = ordered[start:] if length is None else ordered[start : start + length]
    return sum(tile.value for tile in selected)


def color_sum(hand: Sequence[Tile], color: str) -> int:
    return sum(tile.value for tile in hand if tile.color == color)


def color_count(hand: Sequence[Tile], color: str) -> int:
    return sum(tile.color == color for tile in hand)


def number_count(hand: Sequence[Tile], predicate: Callable[[int], bool]) -> int:
    return sum(predicate(tile.value) for tile in hand)


def number_positions(hand: Sequence[Tile], value: int) -> tuple[int, ...]:
    return tuple(
        index
        for index, tile in enumerate(code(hand))
        if tile.value == value
    )


def consecutive_edges(hand: Sequence[Tile]) -> tuple[int, ...]:
    ordered = code(hand)
    return tuple(
        index
        for index in range(len(ordered) - 1)
        if ordered[index + 1].value - ordered[index].value == 1
    )


def same_color_edges(hand: Sequence[Tile]) -> tuple[int, ...]:
    ordered = code(hand)
    return tuple(
        index
        for index in range(len(ordered) - 1)
        if ordered[index + 1].color == ordered[index].color
    )


def pair_count(hand: Sequence[Tile]) -> int:
    counts = Counter(tile.value for tile in hand)
    return sum(count == 2 for count in counts.values())


def max_min_difference(hand: Sequence[Tile]) -> int:
    ordered = code(hand)
    return ordered[-1].value - ordered[0].value


def unique_visible(hands: Iterable[Sequence[Tile]]) -> list[tuple[str, ...]]:
    return sorted({visible(hand) for hand in hands})


def assert_example_1_1() -> None:
    own = take("B0", "B4", "G5a", "W8", "B9")
    pool = remaining(own)
    deals = []
    for opponent_1 in combinations(pool, 5):
        if consecutive_edges(opponent_1) != (0, 2):
            continue
        if color_sum(opponent_1, "W") != 7:
            continue
        if value_sum(opponent_1) != 15:
            continue
        if number_positions(opponent_1, 6):
            continue
        if color_sum(opponent_1, "B") != 8:
            continue

        pool_2 = remaining(own, opponent_1)
        for opponent_2 in combinations(pool_2, 5):
            if max_min_difference(opponent_2) != 7:
                continue
            if color_sum(opponent_2, "W") != 18:
                continue
            if color_count(opponent_2, "B") != 2:
                continue
            if number_positions(opponent_2, 6):
                continue
            if number_positions(opponent_2, 2) != (0, 1):
                continue
            center = remaining(own, opponent_1, opponent_2)
            deals.append((opponent_1, opponent_2, center))

    opponent_1_codes = unique_visible(opponent_1 for opponent_1, _, _ in deals)
    opponent_2_codes = unique_visible(opponent_2 for _, opponent_2, _ in deals)
    centers = unique_visible(center for _, _, center in deals)
    expected_centers = [
        ("W1", "B3", "G5", "B6", "W6"),
        ("W1", "G5", "B6", "W6", "B8"),
    ]
    assert len(deals) == 2, deals
    assert opponent_1_codes == [("W0", "B1", "W3", "W4", "B7")]
    assert opponent_2_codes == [
        ("B2", "W2", "B3", "W7", "W9"),
        ("B2", "W2", "W7", "B8", "W9"),
    ]
    assert centers == expected_centers, centers
    print("Example 1.1 physical deals:", len(deals))
    print("Example 1.1 opponent 1 codes:", opponent_1_codes)
    print("Example 1.1 opponent 2 codes:", opponent_2_codes)
    print("Example 1.1 center codes:", centers)


def assert_example_1_2_and_1_3() -> None:
    own = take("G5a", "W6", "W7", "B8", "W9")
    pool = remaining(own)

    sum_35 = unique_visible(
        hand for hand in combinations(pool, 5) if value_sum(hand) == 35
    )
    assert sum_35 == [("G5", "B6", "B7", "W8", "B9")], sum_35

    sum_34 = unique_visible(
        hand for hand in combinations(pool, 5) if value_sum(hand) == 34
    )
    assert sum_34 == [
        ("B4", "B6", "B7", "W8", "B9"),
        ("W4", "B6", "B7", "W8", "B9"),
    ], sum_34
    print("Example 1.2 code:", sum_35)
    print("Example 1.3 codes:", sum_34)


def inspect_example_1_4() -> None:
    own = take("B0", "W0", "B1", "W2", "B4")
    pool = remaining(own)
    deals = []
    for opponent_1 in combinations(pool, 5):
        if same_color_edges(opponent_1):
            continue
        if consecutive_edges(opponent_1) != (1, 2):
            continue
        if value_sum(opponent_1, 2, 3) != 20:
            continue
        if value_sum(opponent_1, 0, 3) != 14:
            continue

        pool_2 = remaining(own, opponent_1)
        for opponent_2 in combinations(pool_2, 5):
            if consecutive_edges(opponent_2) != (2,):
                continue
            if color_sum(opponent_2, "W") != 20:
                continue
            if value_sum(opponent_2, 0, 3) != 17:
                continue
            if pair_count(opponent_2) != 1:
                continue
            center = remaining(own, opponent_1, opponent_2)
            deals.append((opponent_1, opponent_2, center))

    opponent_1_codes = unique_visible(opponent_1 for opponent_1, _, _ in deals)
    opponent_2_codes = unique_visible(opponent_2 for _, opponent_2, _ in deals)
    center_codes = unique_visible(center for _, _, center in deals)
    assert opponent_1_codes == [("B3", "G5", "W6", "B7", "W7")]
    assert opponent_2_codes == [("W3", "B6", "W8", "B9", "W9")]
    assert center_codes == [("W1", "B2", "W4", "G5", "B8")]

    print("Example 1.4 physical deals:", len(deals))
    print(
        "Example 1.4 opponent 1 codes:",
        opponent_1_codes,
    )
    print(
        "Example 1.4 opponent 2 codes:",
        opponent_2_codes,
    )
    print(
        "Example 1.4 center codes:",
        center_codes,
    )


def inspect_example_1_5() -> None:
    actual_own = take("B0", "B1", "B3", "W3", "B7")
    pool = remaining(actual_own)

    opponent_candidates = []
    for opponent in combinations(pool, 5):
        if color_sum(opponent, "W") != 20:
            continue
        if value_sum(opponent, 1, 3) != 12:
            continue
        if value_sum(opponent, 2, 3) != 19:
            continue
        if value_sum(opponent, 0, 3) != 5:
            continue
        opponent_candidates.append(opponent)

    rationally_deducing = []
    target_clues = {
        "same_color_edges": (0, 1),
        "black_sum": 11,
        "total_sum": 14,
    }
    for opponent in opponent_candidates:
        possible_targets = []
        for target in combinations(remaining(opponent), 5):
            if same_color_edges(target) != target_clues["same_color_edges"]:
                continue
            if color_sum(target, "B") != target_clues["black_sum"]:
                continue
            if value_sum(target) != target_clues["total_sum"]:
                continue
            possible_targets.append(target)
        target_codes = unique_visible(possible_targets)
        if target_codes == [visible(actual_own)]:
            rationally_deducing.append(opponent)

    opponent_codes = unique_visible(opponent_candidates)
    rational_codes = unique_visible(rationally_deducing)
    assert opponent_codes == [
        ("W0", "W1", "W4", "W7", "W8"),
        ("W1", "B2", "W2", "W8", "W9"),
    ]
    assert rational_codes == [("W1", "B2", "W2", "W8", "W9")]

    print(
        "Example 1.5 opponent codes before meta-inference:",
        opponent_codes,
    )
    print(
        "Example 1.5 opponent codes if a correct guess implies unique deduction:",
        rational_codes,
    )


def partition_summary(
    hands: Sequence[Sequence[Tile]],
    response: Callable[[Sequence[Tile]], object],
) -> dict[str, float | int]:
    groups: Counter[object] = Counter(response(hand) for hand in hands)
    total = len(hands)
    entropy = -sum(
        (count / total) * log2(count / total)
        for count in groups.values()
    )
    expected_physical_remaining = sum(count * count for count in groups.values()) / total
    return {
        "outcomes": len(groups),
        "entropy_bits": round(entropy, 4),
        "expected_physical_remaining": round(expected_physical_remaining, 2),
        "largest_partition": max(groups.values()),
    }


def inspect_global_partitions() -> None:
    hands = list(combinations(DECK, 5))
    questions: dict[str, Callable[[Sequence[Tile]], object]] = {
        "total_sum": value_sum,
        "left_3_sum": lambda hand: value_sum(hand, 0, 3),
        "middle_3_sum": lambda hand: value_sum(hand, 1, 3),
        "right_3_sum": lambda hand: value_sum(hand, 2, 3),
        "black_sum": lambda hand: color_sum(hand, "B"),
        "white_sum": lambda hand: color_sum(hand, "W"),
        "black_count": lambda hand: color_count(hand, "B"),
        "white_count": lambda hand: color_count(hand, "W"),
        "odd_count": lambda hand: number_count(hand, lambda value: value % 2 == 1),
        "even_count": lambda hand: number_count(hand, lambda value: value % 2 == 0),
        "consecutive_edges": consecutive_edges,
        "same_color_edges": same_color_edges,
        "max_min_difference": max_min_difference,
        "pair_count": pair_count,
        "middle_at_least_5": lambda hand: code(hand)[2].value >= 5,
    }
    for value in range(10):
        questions[f"position_{value}"] = (
            lambda hand, target=value: number_positions(hand, target)
        )

    print("All physical 5-tile hands:", len(hands))
    print("All visible 5-tile codes:", len(unique_visible(hands)))
    summaries = {
        name: partition_summary(hands, response)
        for name, response in questions.items()
    }
    expected_outcomes = {
        "total_sum": 38,
        "left_3_sum": 23,
        "middle_3_sum": 24,
        "right_3_sum": 23,
        "black_sum": 35,
        "white_sum": 35,
        "black_count": 6,
        "white_count": 6,
        "odd_count": 6,
        "even_count": 6,
        "consecutive_edges": 16,
        "same_color_edges": 16,
        "max_min_difference": 8,
        "pair_count": 3,
        "middle_at_least_5": 2,
        "position_0": 3,
        "position_1": 7,
        "position_2": 10,
        "position_3": 10,
        "position_4": 10,
        "position_5": 10,
        "position_6": 10,
        "position_7": 10,
        "position_8": 7,
        "position_9": 3,
    }
    assert {
        name: summary["outcomes"]
        for name, summary in summaries.items()
    } == expected_outcomes
    for name, summary in summaries.items():
        print(name, summary)


def inspect_example_2_1() -> None:
    own = take("G5a", "B8", "W8", "B9", "W9")
    pool = remaining(own)
    candidates = [
        hand
        for hand in combinations(pool, 5)
        if value_sum(hand) == 10 and color_sum(hand, "W") == 5
    ]
    codes = unique_visible(candidates)
    assert len(candidates) == 10
    assert len(codes) == 10
    print("Example 2.1 codes:", codes)

    questions: dict[str, Callable[[Sequence[Tile]], object]] = {
        "even_count": lambda hand: number_count(hand, lambda value: value % 2 == 0),
        "black_count": lambda hand: color_count(hand, "B"),
        "position_1": lambda hand: number_positions(hand, 1),
    }
    expected_group_sizes = {
        "even_count": [10],
        "black_count": [2, 4, 4],
        "position_1": [1, 2, 3, 4],
    }
    expected_remaining = {
        "even_count": 10.0,
        "black_count": 3.6,
        "position_1": 3.0,
    }
    for name, response in questions.items():
        groups: defaultdict[object, list[tuple[str, ...]]] = defaultdict(list)
        for hand in candidates:
            groups[response(hand)].append(visible(hand))
        assert sorted(map(len, groups.values())) == expected_group_sizes[name]
        summary = partition_summary(candidates, response)
        assert summary["expected_physical_remaining"] == expected_remaining[name]
        normalized = {
            str(answer): sorted(group_codes)
            for answer, group_codes in sorted(groups.items(), key=lambda item: str(item[0]))
        }
        print(name, summary, normalized)


def main() -> None:
    assert len(DECK) == 20
    assert_example_1_1()
    assert_example_1_2_and_1_3()
    inspect_example_1_4()
    inspect_example_1_5()
    inspect_example_2_1()
    inspect_global_partitions()


if __name__ == "__main__":
    main()
