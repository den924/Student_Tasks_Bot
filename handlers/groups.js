const {
    User,
    GroupRequest
} = require("../models");

const {
    sendGroups
} = require("./groupSelection");


const waitingForGroupName =
    new Set();


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerGroupHandlers(bot) {


    // ==========================================
    // CALLBACK_QUERY
    // ==========================================

    bot.on(
        "callback_query",
        async (query) => {

            const data =
                query.data;

            const telegramId =
                query.from.id;


            // ==========================================
            // ДОБАВИТЬ ГРУППУ
            // ==========================================

            if (
                data ===
                "add_group"
            ) {

                try {

                    waitingForGroupName.add(
                        telegramId
                    );


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        "⏳ Запрос выполняется...\n\n" +

                        "🏫 Добавление новой учебной группы\n\n" +

                        "Введите название учебной группы:\n\n" +

                        "Например: ИВТ-21",

                        {

                            reply_markup: {

                                keyboard: [

                                    [
                                        "❌ Отмена"
                                    ]

                                ],

                                resize_keyboard:
                                    true

                            }

                        }

                    );


                } catch (error) {

                    console.error(

                        "❌ Ошибка при добавлении группы:",

                        error

                    );


                    waitingForGroupName.delete(
                        telegramId
                    );

                }

                return;
            }


            // ==========================================
            // ПРОСМОТР ЗАЯВОК
            // ==========================================

            if (
                data ===
                "pending_groups"
            ) {

                try {

                    const user =
                        await User.findOne({

                            where: {

                                telegramId:
                                    telegramId

                            }

                        });


                    if (!user) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Пользователь не найден"

                            }

                        );

                        return;
                    }


                    const requests =
                        await GroupRequest.findAll({

                            where: {

                                userId:
                                    user.id

                            },

                            order: [

                                [

                                    "createdAt",

                                    "DESC"

                                ]

                            ]

                        });


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    if (
                        requests.length ===
                        0
                    ) {

                        await bot.sendMessage(

                            query.message.chat.id,

                            "📋 У вас пока нет заявок на добавление групп."

                        );

                        return;
                    }


                    let message =
                        "📋 Ваши заявки:\n\n";


                    for (
                        const request
                        of requests
                    ) {

                        let statusText;


                        switch (
                            request.status
                        ) {

                            case "PENDING":

                                statusText =
                                    "⏳ Ожидает рассмотрения";

                                break;


                            case "APPROVED":

                                statusText =
                                    "✅ Одобрена";

                                break;


                            case "REJECTED":

                                statusText =
                                    "❌ Отклонена";

                                break;


                            default:

                                statusText =
                                    request.status;

                        }


                        message +=

                            `🏫 ${request.groupName}\n` +

                            `${statusText}\n\n`;

                    }


                    await bot.sendMessage(

                        query.message.chat.id,

                        message

                    );


                } catch (error) {

                    console.error(

                        "❌ Ошибка получения заявок:",

                        error

                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Произошла ошибка",
                            show_alert:
                                true

                        }

                    );

                }

                return;
            }

        }
    );


    // ==========================================
    // ОБРАБОТКА СООБЩЕНИЙ
    // ==========================================

    bot.on(
        "message",
        async (msg) => {

            const telegramId =
                msg.from.id;

            const text =
                msg.text;


            if (!text) {
                return;
            }


            // ==========================================
            // ПРОСМОТР ЗАЯВОК
            // ==========================================

            if (
                text ===
                "📋 Группы, ожидающие добавления"
            ) {

                try {

                    const user =
                        await User.findOne({

                            where: {

                                telegramId:
                                    telegramId

                            }

                        });


                    if (!user) {

                        await bot.sendMessage(

                            msg.chat.id,

                            "Пользователь не найден. Выполните /start."

                        );

                        return;
                    }


                    const requests =
                        await GroupRequest.findAll({

                            where: {

                                userId:
                                    user.id

                            },

                            order: [

                                [

                                    "createdAt",

                                    "DESC"

                                ]

                            ]

                        });


                    if (
                        requests.length ===
                        0
                    ) {

                        await bot.sendMessage(

                            msg.chat.id,

                            "📋 У вас пока нет заявок на добавление групп."

                        );

                        return;
                    }


                    let message =
                        "📋 Ваши заявки:\n\n";


                    for (
                        const request
                        of requests
                    ) {

                        let statusText;


                        switch (
                            request.status
                        ) {

                            case "PENDING":

                                statusText =
                                    "⏳ Ожидает рассмотрения";

                                break;


                            case "APPROVED":

                                statusText =
                                    "✅ Одобрена";

                                break;


                            case "REJECTED":

                                statusText =
                                    "❌ Отклонена";

                                break;


                            default:

                                statusText =
                                    request.status;

                        }


                        message +=

                            `🏫 ${request.groupName}\n` +

                            `${statusText}\n\n`;

                    }


                    await bot.sendMessage(

                        msg.chat.id,

                        message

                    );


                } catch (error) {

                    console.error(

                        "❌ Ошибка получения заявок:",

                        error

                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        "❌ Произошла ошибка."

                    );

                }

                return;
            }


            // ==========================================
            // ПРОВЕРЯЕМ, ДОБАВЛЯЕТ ЛИ ПОЛЬЗОВАТЕЛЬ ГРУППУ
            // ==========================================

            if (
                !waitingForGroupName.has(
                    telegramId
                )
            ) {

                return;

            }


            // ==========================================
            // ОТМЕНА
            // ==========================================

            if (
                text ===
                "❌ Отмена"
            ) {

                waitingForGroupName.delete(
                    telegramId
                );


                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Действие отменено.",

                    {

                        reply_markup: {

                            remove_keyboard:
                                true

                        }

                    }

                );


                // ==========================================
                // ВОЗВРАЩАЕМ СПИСОК ГРУПП
                // ==========================================

                await sendGroups(

                    bot,

                    msg.chat.id,

                    0

                );


                console.log(

                    `❌ Пользователь ${telegramId} ` +
                    `отменил добавление группы`

                );


                return;
            }


            // ==========================================
            // НАЗВАНИЕ ГРУППЫ
            // ==========================================

            const groupName =
                text.trim();


            if (
                groupName.length <
                2
            ) {

                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Название группы слишком короткое.\n\n" +

                    "Попробуйте ещё раз или нажмите «❌ Отмена»."

                );

                return;
            }


            // ==========================================
            // СОЗДАНИЕ ЗАЯВКИ
            // ==========================================

            try {

                await bot.sendMessage(

                    msg.chat.id,

                    "⏳ Запрос выполняется..."

                );


                const user =
                    await User.findOne({

                        where: {

                            telegramId:
                                telegramId

                        }

                    });


                if (!user) {

                    waitingForGroupName.delete(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        "❌ Пользователь не найден. Выполните /start.",

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );

                    return;
                }


                // ==========================================
                // ПРОВЕРКА ДУБЛИКАТА
                // ==========================================

                const existingRequest =
                    await GroupRequest.findOne({

                        where: {

                            groupName:
                                groupName,

                            userId:
                                user.id,

                            status:
                                "PENDING"

                        }

                    });


                if (
                    existingRequest
                ) {

                    waitingForGroupName.delete(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        "⚠️ Вы уже отправляли заявку на добавление этой группы.\n\n" +

                        "Дождитесь решения администратора.",

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );


                    return;
                }


                // ==========================================
                // СОЗДАЁМ ЗАЯВКУ
                // ==========================================

                await GroupRequest.create({

                    groupName:
                        groupName,

                    userId:
                        user.id,

                    status:
                        "PENDING"

                });


                waitingForGroupName.delete(
                    telegramId
                );


                await bot.sendMessage(

                    msg.chat.id,

                    `✅ Заявка на добавление группы «${groupName}» отправлена администратору.`,

                    {

                        reply_markup: {

                            remove_keyboard:
                                true

                        }

                    }

                );


                console.log(

                    `📩 Новая заявка: "${groupName}" ` +
                    `от Telegram ID ${telegramId}`

                );


            } catch (error) {

                console.error(

                    "❌ Ошибка создания заявки:",

                    error

                );


                waitingForGroupName.delete(
                    telegramId
                );


                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Произошла ошибка при создании заявки.",

                    {

                        reply_markup: {

                            remove_keyboard:
                                true

                        }

                    }

                );

            }

        }
    );

}


module.exports =
    registerGroupHandlers;