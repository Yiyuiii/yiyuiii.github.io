"""Reproducible checks for the 2025 Age of Innovation article.

This audit script checks only the article's own mathematical model. It does
not claim that the model is an official rule, a balance result, or an optimal
strategy for Age of Innovation.
"""

from __future__ import annotations

from dataclasses import dataclass


STARTING_RESOURCES = 83.0
ROUND_INCOME = 9.0
TERMINAL_RESOURCES = 355.0
OBSERVED_SCORE = 205.0
ARTICLE_Y = 0.19
ROUNDS = 5


def terminal_resource(x: float) -> float:
    """Apply R[t + 1] = x * R[t] + 9 for five transitions."""

    resource = STARTING_RESOURCES
    for _ in range(ROUNDS):
        resource = x * resource + ROUND_INCOME
    return resource


def solve_x() -> float:
    """Solve the article's terminal-resource equation by bisection."""

    low, high = 1.0, 2.0
    for _ in range(100):
        middle = (low + high) / 2
        if terminal_resource(middle) > TERMINAL_RESOURCES:
            high = middle
        else:
            low = middle
    return (low + high) / 2


def resource_path(x: float) -> list[float]:
    """Return R0 through R5 under the article's recurrence."""

    values = [STARTING_RESOURCES]
    for _ in range(ROUNDS):
        values.append(x * values[-1] + ROUND_INCOME)
    return values


def one_resource_path(x: float, y: float) -> tuple[list[float], list[float]]:
    """Track one T1 resource through the article's resource/score recurrence."""

    resources = [1.0]
    scores = [0.0]
    for _ in range(ROUNDS):
        scores.append(scores[-1] + y * resources[-1])
        resources.append(x * resources[-1])
    return resources, scores


def score_from_all_modeled_resources(x: float, y: float) -> float:
    """Apply y to the resource stock before each of the five transitions."""

    return y * sum(resource_path(x)[:-1])


@dataclass(frozen=True)
class PowerChargeResult:
    terminal_resource: float
    net_score: float


def power_charge(
    x: float,
    y: float,
    *,
    power: int,
    remaining_transitions: int,
) -> PowerChargeResult:
    """Reproduce the assumptions behind the article's power-charge table.

    Assumptions inferred from the table:
    - one power is valued at 0.5 generic resource;
    - charging N power costs max(N - 1, 0) victory points;
    - the gained resource follows the same x/y recurrence.
    """

    starting_value = power * 0.5
    terminal_value = starting_value * x**remaining_transitions
    generated_score = starting_value * y * sum(
        x**step for step in range(remaining_transitions)
    )
    return PowerChargeResult(
        terminal_resource=terminal_value,
        net_score=generated_score - max(power - 1, 0),
    )


def main() -> None:
    x = solve_x()
    assert abs(terminal_resource(x) - TERMINAL_RESOURCES) < 1e-9

    resources, article_scores = one_resource_path(x, ARTICLE_Y)
    displayed_resources, displayed_scores = one_resource_path(1.27, ARTICLE_Y)
    assert round(x, 2) == 1.27
    assert round(resources[-1], 2) == 3.35
    assert round(article_scores[-1], 2) == 1.63
    assert int(displayed_resources[-1] * 100) / 100 == 3.30
    assert int(displayed_scores[-1] * 100) / 100 == 1.62

    stock_exposure = sum(resource_path(x)[:-1])
    y_needed_for_205 = OBSERVED_SCORE / stock_exposure
    points_explained_by_article_y = score_from_all_modeled_resources(x, ARTICLE_Y)
    unexplained_points = OBSERVED_SCORE - points_explained_by_article_y

    assert round(y_needed_for_205, 6) == 0.246749
    assert round(points_explained_by_article_y, 2) == 157.85
    assert round(unexplained_points, 2) == 47.15

    t4_charge_2 = power_charge(
        x,
        ARTICLE_Y,
        power=2,
        remaining_transitions=2,
    )
    assert abs(t4_charge_2.terminal_resource - 1.61) < 0.02
    assert round(t4_charge_2.net_score, 2) == -0.57

    t3_charge_3 = power_charge(
        x,
        ARTICLE_Y,
        power=3,
        remaining_transitions=3,
    )
    assert abs(t3_charge_3.terminal_resource - 3.06) < 0.04
    assert round(t3_charge_3.net_score, 2) == -0.89

    t1_charge_1 = power_charge(
        x,
        ARTICLE_Y,
        power=1,
        remaining_transitions=5,
    )
    assert abs(t1_charge_1.terminal_resource - 1.65) < 0.03
    assert abs(t1_charge_1.net_score - 0.81) < 0.01

    print(f"x solving the article equation: {x:.12f}")
    print("R0..R5:", [round(value, 6) for value in resource_path(x)])
    print(
        "one-resource multipliers:",
        [round(value, 6) for value in resources],
    )
    print(
        "one-resource score path at y=0.19:",
        [round(value, 6) for value in article_scores],
    )
    print(
        "article table basis at x=1.27:",
        [round(value, 6) for value in displayed_resources],
        [round(value, 6) for value in displayed_scores],
    )
    print(f"resource-stock exposure: {stock_exposure:.6f}")
    print(f"y required to explain all 205 points: {y_needed_for_205:.9f}")
    print(f"points explained by y=0.19: {points_explained_by_article_y:.6f}")
    print(f"unexplained points: {unexplained_points:.6f}")

    print("power-charge examples under the article's inferred assumptions:")
    for remaining_transitions in range(5, -1, -1):
        label = f"T{6 - remaining_transitions}"
        row = []
        for power in range(1, 5):
            result = power_charge(
                x,
                ARTICLE_Y,
                power=power,
                remaining_transitions=remaining_transitions,
            )
            row.append(
                (
                    power,
                    round(result.terminal_resource, 3),
                    round(result.net_score, 3),
                )
            )
        print(label, row)


if __name__ == "__main__":
    main()
