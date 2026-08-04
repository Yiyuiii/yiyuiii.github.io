import itertools
import json
import subprocess
from collections import deque
from fractions import Fraction
from functools import lru_cache
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def node_json(source: str):
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", source],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(completed.stdout)


def make24_results(left: Fraction, right: Fraction):
    results = {
        left + right,
        left * right,
        left - right,
        right - left,
    }
    if right != 0:
        results.add(left / right)
    if left != 0:
        results.add(right / left)
    return results


@lru_cache(maxsize=None)
def make24_solvable(values: tuple[Fraction, ...], positive_integer_only: bool):
    if len(values) == 1:
        return values[0] == 24
    for left_index, right_index in itertools.combinations(range(len(values)), 2):
        rest = tuple(
            value
            for index, value in enumerate(values)
            if index not in (left_index, right_index)
        )
        for result in make24_results(values[left_index], values[right_index]):
            if positive_integer_only and (
                result.denominator != 1 or result.numerator <= 0
            ):
                continue
            next_values = tuple(sorted((*rest, result)))
            if make24_solvable(next_values, positive_integer_only):
                return True
    return False


def reference_make24_pools():
    exact = set()
    integer = set()
    for numbers in itertools.combinations_with_replacement(range(1, 11), 4):
        values = tuple(Fraction(value) for value in numbers)
        if not make24_solvable(values, False):
            continue
        signature = ",".join(map(str, numbers))
        exact.add(signature)
        if make24_solvable(values, True):
            integer.add(signature)
    return {
        "all": exact,
        "fraction": exact - integer,
        "integer": integer,
    }


def test_javascript_make24_pools_match_an_independent_fraction_solver():
    javascript = node_json(
        """
        await import('./assets/js/toy-make-24.js');
        const logic = globalThis.yiyuiiiToyMake24Logic;
        const pools = logic.buildPuzzlePools();
        console.log(JSON.stringify(Object.fromEntries(
          Object.entries(pools).map(([key, values]) => [key, values.map(logic.numbersSignature)])
        )));
        """
    )
    reference = reference_make24_pools()
    assert {key: set(values) for key, values in javascript.items()} == reference
    assert {key: len(values) for key, values in reference.items()} == {
        "all": 566,
        "fraction": 10,
        "integer": 556,
    }


def lights_masks(size: int):
    masks = []
    for row in range(size):
        for column in range(size):
            mask = 0
            for row_delta, column_delta in (
                (0, 0),
                (-1, 0),
                (1, 0),
                (0, -1),
                (0, 1),
            ):
                next_row = row + row_delta
                next_column = column + column_delta
                if 0 <= next_row < size and 0 <= next_column < size:
                    mask ^= 1 << (next_row * size + next_column)
            masks.append(mask)
    return masks


def reference_lights_distances(size: int):
    distances = {0: 0}
    queue = deque([0])
    masks = lights_masks(size)
    while queue:
        board = queue.popleft()
        distance = distances[board]
        for mask in masks:
            neighbour = board ^ mask
            if neighbour in distances:
                continue
            distances[neighbour] = distance + 1
            queue.append(neighbour)
    return distances


def test_javascript_lights_catalogs_match_independent_breadth_first_search():
    javascript = node_json(
        """
        await import('./assets/js/toy-lights-out.js');
        const logic = globalThis.yiyuiiiToyLightsOutLogic;
        console.log(JSON.stringify(Object.fromEntries([3, 4].map(size => [
          size,
          logic.buildBoardCatalog(size).map(({board, distance}) => [board, distance]),
        ]))));
        """
    )
    for size in (3, 4):
        actual = {board: distance for board, distance in javascript[str(size)]}
        assert actual == reference_lights_distances(size)
