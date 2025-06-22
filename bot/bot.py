import logging
import json
import os # Для переменных окружения
from dotenv import load_dotenv # Для загрузки из .env файла

import smtplib
from email.mime.text import MIMEText
from email.header import Header

from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

# Загрузка переменных окружения из .env файла
load_dotenv()

# Конфигурация бота
BOT_TOKEN = os.getenv("7829060962:AAGpKvjaBFErnt5F4LCLQAew2ZFSeFlHLrg")
WEB_APP_URL = os.getenv("https://magazik.vercel.app/")
# https://github.com/9wyzzex/magazik.git
# Конфигурация Email (из переменных окружения)
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587)) # Порт по умолчанию 587
SMTP_LOGIN = os.getenv("SMTP_LOGIN")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_TO = os.getenv("EMAIL_TO") # Кому отправлять письмо с заказом
EMAIL_FROM = os.getenv("EMAIL_FROM", SMTP_LOGIN) # От кого письмо (может быть псевдонимом)

# Проверка, что все необходимые переменные установлены
if not all([BOT_TOKEN, WEB_APP_URL, SMTP_SERVER, SMTP_LOGIN, SMTP_PASSWORD, EMAIL_TO]):
    error_message = "Ошибка: Не все необходимые переменные окружения установлены (BOT_TOKEN, WEB_APP_URL, SMTP_*, EMAIL_TO)."
    print(error_message) # Вывод в консоль при запуске
    # Можно добавить логирование или выход из программы, если критично
    # exit(error_message)


logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton(
            "🛋️ Открыть магазин мебели",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        'Добро пожаловать в "Мебельный Рай"! Нажмите кнопку ниже, чтобы посмотреть наш каталог:',
        reply_markup=reply_markup
    )

def format_order_for_email(order_data: dict) -> str:
    user_info = order_data.get('user', {})
    user_details = (
        f"Пользователь: {user_info.get('firstName', 'N/A')} {user_info.get('lastName', '')}\n"
        f"Username: @{user_info.get('username', 'N/A')}\n"
        f"Telegram ID: {user_info.get('id', 'N/A')}\n\n"
    )

    items_list_html = "<ul>"
    for item in order_data.get('items', []):
        items_list_html += (
            f"<li>{item.get('name', 'Неизвестный товар')} "
            f"({item.get('quantity', 0)} шт. x {item.get('price', 0):.2f} {order_data.get('currency', 'RUB')}) = "
            f"<b>{item.get('total', 0):.2f} {order_data.get('currency', 'RUB')}</b></li>"
        )
    items_list_html += "</ul>"
    
    total_amount = order_data.get('totalAmount', 0)
    currency = order_data.get('currency', 'RUB')

    email_body_html = f"""
    <html>
        <head></head>
        <body>
            <h2>Новый заказ в "Мебельном Раю"!</h2>
            <p><strong>Детали пользователя:</strong><br>{user_details.replace("\n", "<br>")}</p>
            <p><strong>Состав заказа:</strong></p>
            {items_list_html}
            <p><strong>Итоговая сумма: {total_amount:.2f} {currency}</strong></p>
            <p><em>Время заказа (UTC): {order_data.get('timestamp', 'N/A')}</em></p>
        </body>
    </html>
    """
    return email_body_html

async def send_order_email(order_data: dict) -> bool:
    if not all([SMTP_SERVER, SMTP_LOGIN, SMTP_PASSWORD, EMAIL_TO]):
        logger.error("SMTP конфигурация не полная. Email не будет отправлен.")
        return False
        
    subject = f"Новый заказ #{order_data.get('user', {}).get('id', 'N/A')}_{order_data.get('timestamp', '').split('T')[0]}"
    body_html = format_order_for_email(order_data)

    msg = MIMEText(body_html, 'html', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = EMAIL_FROM
    msg['To'] = EMAIL_TO

    try:
        # Для Gmail и других, кто требует TLS
        if SMTP_PORT == 587:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls() # Включение шифрования
        # Для SSL (например, порт 465)
        elif SMTP_PORT == 465:
             server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else: # Для других портов без явного TLS/SSL (менее безопасно)
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)

        server.login(SMTP_LOGIN, SMTP_PASSWORD)
        server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
        server.quit()
        logger.info(f"Email с заказом успешно отправлен на {EMAIL_TO}")
        return True
    except Exception as e:
        logger.error(f"Ошибка при отправке email: {e}")
        return False

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        data_str = update.message.web_app_data.data
        user = update.message.from_user
        logger.info(f"Получены данные заказа от Web App от пользователя {user.id}: {data_str}")

        order_data = json.loads(data_str)

        # Отправляем email
        email_sent = await send_order_email(order_data)

        items_text_list = []
        for item in order_data.get('items', []):
            items_text_list.append(
                f"- {item.get('name', 'N/A')} ({item.get('quantity', 0)} шт.) = {item.get('total', 0):.2f} {order_data.get('currency', 'RUB')}"
            )
        
        items_text = "\n".join(items_text_list)
        total_amount = order_data.get('totalAmount', 0)
        currency = order_data.get('currency', 'RUB')

        reply_message = (
            f"Спасибо за ваш заказ, {user.first_name}!\n\n"
            f"Состав заказа:\n{items_text}\n\n"
            f"Итоговая сумма: {total_amount:.2f} {currency}\n\n"
        )
        if email_sent:
            reply_message += "Мы получили ваш заказ и скоро свяжемся с вами. Копия заказа отправлена на почту магазина."
        else:
            reply_message += "Мы получили ваш заказ. Если у вас есть вопросы, свяжитесь с нами. (Не удалось отправить уведомление на почту магазина)."
        
        await update.message.reply_text(reply_message)

    except json.JSONDecodeError:
        logger.error(f"Ошибка декодирования JSON от Web App: {data_str}")
        await update.message.reply_text("Произошла ошибка при обработке вашего заказа (неверный формат данных). Пожалуйста, попробуйте снова.")
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при обработке данных Web App: {e}")
        await update.message.reply_text("Произошла внутренняя ошибка при обработке заказа. Мы уже работаем над этим!")


def main() -> None:
    if not BOT_TOKEN: # Дополнительная проверка перед запуском
        logger.critical("BOT_TOKEN не найден. Пожалуйста, проверьте .env файл или переменные окружения.")
        return

    application = ApplicationBuilder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))

    logger.info("Мебельный бот запущен...")
    application.run_polling()

if __name__ == '__main__':
    main()