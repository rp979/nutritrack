# NutriTrack — Personal Health Tracker

NutriTrack is a full-featured personal health and nutrition tracking web app built with HTML, CSS, and JavaScript. Integrates the USDA FoodData Central API to search over 400,000 real food items.

## Features

| Tab | Description |
|---|---|
| Dashboard | Daily overview — calories, macros, sleep, weight, and progress vs targets |
| Daily Log | Search real foods via USDA API or add manually. Tracks all macros per day |
| Macro Calculator | Personalized calorie and macro targets using Mifflin-St Jeor formula |
| Meal Planner | Plan breakfast, lunch, dinner, and snacks for each day of the week |
| Compare Foods | Side-by-side macro comparison of up to 8 foods with protein density scoring |
| Body Stats | BMI calculator, body fat % (US Navy method), TDEE, and water intake |
| Weight Tracker | Log daily weight with trend chart and 7-day average |
| Sleep Tracker | Log sleep hours and quality with weekly bar visualization |


## File Structure

```
macros-app/
├── index.html          ← App shell + all tab HTML
├── css/
│   └── style.css       ← All styles and design tokens
├── js/
│   ├── app.js          ← Navigation, shared utils, localStorage helpers
│   ├── api.js          ← USDA FoodData Central API integration
│   ├── trackers.js     ← Daily log, weight tracker, sleep tracker
│   ├── calculators.js  ← Macro calculator, BMI, body fat, TDEE, water, dashboard
│   └── planner.js      ← Meal planner, compare foods
├── vercel.json         ← Vercel deployment config
└── README.md
```


## How Data is Stored

All user data (food log, weight entries, sleep entries, meal plans, macro targets) is stored in **localStorage** — directly in the user's browser.

- No account required
- No data sent to any server
- Data persists between sessions on the same device/browser
- Clearing browser data will reset the app


## Formulas Used

| Calculator | Formula |
|---|---|
| BMR / Macros | Mifflin-St Jeor |
| Body Fat (Navy) | US Navy circumference method |
| Body Fat (BMI) | Deurenberg equation |
| TDEE | BMR × activity multiplier |
| Water intake | 35ml/kg bodyweight + activity + climate |
| BMI | weight(kg) / height(m)² |

