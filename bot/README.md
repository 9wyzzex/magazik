# Telegram Бот для запуска Mini App

Этот каталог содержит Python-скрипт для Telegram-бота, который предоставляет кнопку для открытия Mini App.

## Настройка

1.  **Установите зависимости:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Настройте `bot.py`:**
    *   Замените `ВАШ_API_ТОКЕН_БОТА` на ваш реальный токен, полученный от [@BotFather](https://t.me/BotFather).
    *   Замените `WEB_APP_URL` на URL, где будет размещен ваш `frontend`. **URL должен быть HTTPS.**

## Запуск

```bash
python bot.py