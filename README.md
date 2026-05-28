# Company Dashboard

Финансовый дашборд на React + Vite. Данные берутся из Google Sheets через переменную окружения `VITE_GOOGLE_SHEET_ID`; если переменной нет, приложение показывает демо-данные.

## Запуск

```bash
npm install
npm run dev
```

Для подключения реальной Google-таблицы создайте `.env.local` по примеру `.env.example` и заполните `VITE_GOOGLE_SHEET_ID`.

## Сборка

```bash
npm run build
```

## Структура

- `src/App.jsx` - главный экран дашборда и вкладки.
- `src/main.jsx` - точка входа React.
- `src/styles.css` - глобальные стили и анимации.
- `src/data/fallbackData.js` - демо-данные для режима без Google Sheets.
- `src/services/googleSheets.js` - загрузка и парсинг данных из Google Sheets.
- `src/utils/` - форматирование чисел и палитры графиков.
- `GOOGLE_SHEETS_SETUP.md` - инструкция по подключению Google Sheets.
