# Mixology Value Mapping Details (2026-04-17)

Baseline: before-values from git HEAD, after-values from current workspace.

## 1. Glass Mapping

| Removed ID | Before (maxPortions / bonus) | Replacement ID | After (maxPortions / bonus) |
|---|---|---|---|
| coupe | 3 / anticipation, surprise | highball | 3 / joy, anticipation |

## 2. Addon Mapping (thickness/sweetness/strength)

### 2.1 Ice

| Removed ID | Before | Replacement ID | After | Delta (new-old) |
|---|---|---|---|---|
| less_ice | 0 / 0 / 0 | normal | 0 / 0 / -1 | 0 / 0 / -1 |

### 2.2 Garnish

| Removed ID | Before | Replacement ID | After | Delta (new-old) |
|---|---|---|---|---|
| lemon | 0 / +1 / 0 | bitters | 0 / -1 / +1 | 0 / -2 / +1 |

### 2.3 Decoration

| Removed ID | Before | Replacement ID | After | Delta (new-old) |
|---|---|---|---|---|
| orange | 0 / +1 / 0 | mint | 0 / 0 / -1 | 0 / -1 / -1 |

## 3. Ingredient Mapping (thickness/sweetness/strength)

| Removed ID | Before | Replacement ID | After | Delta (new-old) |
|---|---|---|---|---|
| brandy | +2 / +1 / +3 | whiskey | +2 / 0 / +3 | 0 / -1 / 0 |
| sake | 0 / 0 / +1 | vodka | 0 / -1 / +2 | 0 / -1 / +1 |
| absinthe | 0 / -2 / +4 | tequila | +1 / -1 / +3 | +1 / +1 / -1 |
| juice_grapefruit | 0 / -1 / 0 | juice_cranberry | +1 / -1 / 0 | +1 / 0 / 0 |
| juice_watermelon | 0 / +2 / 0 | juice_orange | +1 / +2 / 0 | +1 / 0 / 0 |
| juice_passion | +1 / 0 / 0 | juice_mango | +2 / +3 / 0 | +1 / +3 / 0 |
| coconut_milk | +2 / +1 / 0 | cream | +3 / +1 / 0 | +1 / 0 / 0 |
| ginger_beer | 0 / +1 / 0 | tonic | 0 / -1 / -1 | 0 / -2 / -1 |
| egg_white | +2 / 0 / 0 | cream | +3 / +1 / 0 | +1 / +1 / 0 |
| honey | +2 / +3 / 0 | syrup | +1 / +3 / 0 | -1 / 0 / 0 |
| mint | +1 / +2 / 0 | syrup | +1 / +3 / 0 | 0 / +1 / 0 |
| matcha | +1 / -1 / 0 | coffee | +1 / -2 / 0 | 0 / -1 / 0 |
| chambord | +1 / +3 / +1 | kahlua | +2 / +2 / +1 | +1 / -1 / 0 |
| limoncello | 0 / +2 / +1 | triple_sec | +1 / +2 / +1 | +1 / 0 / 0 |
| chartreuse | +1 / 0 / +2 | sambuca | 0 / +1 / +2 | -1 / +1 / 0 |

## 4. Full Kept Elements Snapshot (After Simplification)

### 4.1 Glass Types

| ID | maxPortions | bonus |
|---|---:|---|
| martini | 2 | trust, joy |
| highball | 3 | joy, anticipation |
| rock | 2 | sadness, fear |

### 4.2 Spirit

| ID | Value (thickness/sweetness/strength) |
|---|---|
| vodka | 0 / -1 / +2 |
| rum | +1 / +1 / +2 |
| whiskey | +2 / 0 / +3 |
| tequila | +1 / -1 / +3 |

### 4.3 Juice

| ID | Value (thickness/sweetness/strength) |
|---|---|
| juice_orange | +1 / +2 / 0 |
| juice_lemon | 0 / -2 / 0 |
| juice_cranberry | +1 / -1 / 0 |
| juice_mango | +2 / +3 / 0 |

### 4.4 Mixer

| ID | Value (thickness/sweetness/strength) |
|---|---|
| soda | -1 / 0 / -1 |
| tonic | 0 / -1 / -1 |
| syrup | +1 / +3 / 0 |
| cream | +3 / +1 / 0 |
| coffee | +1 / -2 / 0 |

### 4.5 Liqueur

| ID | Value (thickness/sweetness/strength) |
|---|---|
| triple_sec | +1 / +2 / +1 |
| kahlua | +2 / +2 / +1 |
| baileys | +3 / +3 / +1 |
| sambuca | 0 / +1 / +2 |

### 4.6 Ice

| ID | Value (thickness/sweetness/strength) |
|---|---|
| no_ice | 0 / 0 / +1 |
| normal | 0 / 0 / -1 |
| more_ice | 0 / 0 / -2 |

### 4.7 Garnish

| ID | Value (thickness/sweetness/strength) |
|---|---|
| none | 0 / 0 / 0 |
| bitters | 0 / -1 / +1 |

### 4.8 Decoration

| ID | Value (thickness/sweetness/strength) |
|---|---|
| none | 0 / 0 / 0 |
| mint | 0 / 0 / -1 |
