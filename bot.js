const { TelegramBot } = require("node-telegram-bot-api");
require("dotenv").config();

const { connectDatabase } = require("./config/database");
const { User } = require("./models");

const registerGroupHandlers =
    require("./handlers/groups");

const registerSubjectHandlers =
    require("./handlers/subjects");

const registerTaskHandlers =
    require("./handlers/tasks");

const registerTaskRequestHandlers =
    require("./handlers/taskRequests");

const {
    startTaskNotificationScheduler,
    checkTaskNotifications
} = require("./services/taskNotifications");

const {
    registerGroupSelectionHandlers,
    sendGroups
} = require("./handlers/groupSelection");

const registerAdminHandlers =
    require("./handlers/admin");

const registerScheduleHandlers =
    require("./handlers/schedule");


const bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
        polling: true
    }
);


// ==========================================
// ЗАПУСК БОТА
// ==========================================

async function startBot() {

    try {

        await connectDatabase();

        console.log(
            "🤖 Telegram-бот запущен!"
        );

    } catch (error) {

        console.error(
            "❌ Не удалось запустить бота:"
        );

        console.error(
            error
        );
    }
}


startBot();


// ==========================================
// КОМАНДА /START
// ==========================================

bot.onText(
    /\/start/,
    async (msg) => {

        try {

            const telegramId =
                msg.from.id;


            let user =
                await User.findOne({

                    where: {
                        telegramId:
                            telegramId
                    }

                });


            // ==========================================
            // СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
            // ==========================================

            if (!user) {

                user =
                    await User.create({

                        telegramId:
                            telegramId,

                        username:
                            msg.from.username ||
                            null,

                        firstName:
                            msg.from.first_name ||
                            null,

                        lastName:
                            msg.from.last_name ||
                            null

                    });


                console.log(

                    `👤 Новый пользователь: ${telegramId}`

                );

            } else {

                await user.update({

                    username:
                        msg.from.username ||
                        null,

                    firstName:
                        msg.from.first_name ||
                        null,

                    lastName:
                        msg.from.last_name ||
                        null

                });


                console.log(

                    `👤 Пользователь вернулся: ${telegramId}`

                );
            }


            // ==========================================
            // АДМИНИСТРАТОР
            // ==========================================

            if (

                String(telegramId) ===
                String(
                    process.env.ADMIN_TELEGRAM_ID
                )

            ) {

                await bot.sendMessage(

                    msg.chat.id,

                    "🛠 Вы вошли как администратор.",

                    {
                        reply_markup: {

                            inline_keyboard: [

                                [

                                    {
                                        text:
                                            "🛠 Администрирование",

                                        callback_data:
                                            "admin_menu"
                                    }

                                ]

                            ]

                        }
                    }

                );

            }


            // ==========================================
            // СПИСОК ГРУПП
            // ==========================================

            await sendGroups(

                bot,

                msg.chat.id,

                0

            );

        } catch (error) {

            console.error(

                "❌ Ошибка при выполнении /start:",

                error

            );


            await bot.sendMessage(

                msg.chat.id,

                "Произошла ошибка. Попробуйте ещё раз."

            );

        }

    }
);


// ==========================================
// ОБРАБОТЧИК ГРУПП
// ==========================================

registerGroupHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК ВЫБОРА ГРУППЫ
// ==========================================

registerGroupSelectionHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК АДМИНИСТРАТОРА
// ==========================================

registerAdminHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК ПРЕДМЕТОВ
// ==========================================

registerSubjectHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК ЗАДАЧ
// ==========================================

registerTaskHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК ЗАПРОСОВ НА ЗАДАЧИ
// ==========================================

registerTaskRequestHandlers(
    bot
);


// ==========================================
// ОБРАБОТЧИК РАСПИСАНИЯ
// ==========================================

registerScheduleHandlers(
    bot
);


// ==========================================
// ПЛАНИРОВЩИК УВЕДОМЛЕНИЙ
// ==========================================

startTaskNotificationScheduler(
    bot
);


// ==========================================
// ТЕСТ УВЕДОМЛЕНИЙ
// ==========================================

bot.on(
    "message",
    async (msg) => {

        if (
            msg.text !==
            "/testnotifications"
        ) {

            return;
        }


        await bot.sendMessage(

            msg.chat.id,

            "🔎 Запускаю проверку уведомлений..."

        );


        await checkTaskNotifications(
            bot
        );


        await bot.sendMessage(

            msg.chat.id,

            "✅ Проверка уведомлений завершена."

        );

    }
);