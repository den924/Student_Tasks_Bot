const {
    User,
    Group,
    GroupMember,
    Subject,
    Task,
    TaskMember,
    TaskRequest
} = require("../models");


// ==========================================
// ПРОВЕРКА, ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ КУРАТОРОМ
// ==========================================

async function isCurator(userId, groupId) {

    const membership = await GroupMember.findOne({
        where: {
            userId: userId,
            groupId: groupId
        }
    });

    return (
        membership &&
        membership.role === "CURATOR"
    );
}


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerTaskRequestHandlers(bot) {


    // ==========================================
    // КНОПКА "ЗАПРОСЫ НА ЗАДАЧИ"
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "curator_task_requests") {
            return;
        }

        try {

            const telegramId = query.from.id;

            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });

            if (!user) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Пользователь не найден",
                        show_alert: true
                    }
                );

                return;
            }


            // Получаем группы, где пользователь куратор
            const curatorMemberships =
                await GroupMember.findAll({
                    where: {
                        userId: user.id,
                        role: "CURATOR"
                    }
                });


            if (curatorMemberships.length === 0) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Вы не являетесь куратором",
                        show_alert: true
                    }
                );

                return;
            }


            const groupIds =
                curatorMemberships.map(
                    membership => membership.groupId
                );


            const requests =
                await TaskRequest.findAll({
                    where: {
                        groupId: groupIds,
                        status: "PENDING"
                    },
                    include: [
                        {
                            model: User,
                            as: "creator"
                        },
                        {
                            model: Group,
                            as: "group"
                        },
                        {
                            model: Subject,
                            as: "subject"
                        }
                    ],
                    order: [
                        ["deadline", "ASC"]
                    ]
                });


            await bot.answerCallbackQuery(
                query.id
            );


            if (requests.length === 0) {

                await bot.sendMessage(
                    query.message.chat.id,
                    "📋 Новых запросов на добавление задач нет."
                );

                return;
            }


            // ==========================================
            // ВЫВОД ЗАПРОСОВ
            // ==========================================

            for (const request of requests) {

                const creator =
                    request.creator;

                const creatorName =
                    `${creator?.firstName || ""} ` +
                    `${creator?.lastName || ""}`.trim();


                const deadline =
                    formatDate(
                        request.deadline
                    );


                const message =
                    `📩 Запрос на групповую задачу №${request.id}\n\n` +
                    `📝 Задача: ${request.title}\n` +
                    `📚 Предмет: ${request.subject?.name || "Не указан"}\n` +
                    `🏫 Группа: ${request.group?.name || "Не указана"}\n` +
                    `📅 Дедлайн: ${deadline}\n\n` +
                    `👤 Автор: ${creatorName || "Неизвестно"}\n` +
                    `🆔 Telegram ID: ${creator?.telegramId || "Неизвестно"}\n\n` +
                    `📄 Описание:\n` +
                    `${request.description || "Без описания"}`;


                await bot.sendMessage(
                    query.message.chat.id,
                    message,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "✅ Одобрить",
                                        callback_data:
                                            `approve_task_request_${request.id}`
                                    },
                                    {
                                        text: "❌ Отклонить",
                                        callback_data:
                                            `reject_task_request_${request.id}`
                                    }
                                ]
                            ]
                        }
                    }
                );
            }

        } catch (error) {

            console.error(
                "❌ Ошибка загрузки запросов на задачи:",
                error
            );

            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Ошибка загрузки запросов",
                    show_alert: true
                }
            );
        }
    });


    // ==========================================
    // ОДОБРЕНИЕ ЗАПРОСА
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (
            !query.data.startsWith(
                "approve_task_request_"
            )
        ) {
            return;
        }


        try {

            const telegramId = query.from.id;

            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });


            if (!user) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Пользователь не найден",
                        show_alert: true
                    }
                );

                return;
            }


            const requestId = Number(
                query.data.replace(
                    "approve_task_request_",
                    ""
                )
            );


            const request =
                await TaskRequest.findByPk(
                    requestId,
                    {
                        include: [
                            {
                                model: User,
                                as: "creator"
                            },
                            {
                                model: Group,
                                as: "group"
                            },
                            {
                                model: Subject,
                                as: "subject"
                            }
                        ]
                    }
                );


            if (!request) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Запрос не найден",
                        show_alert: true
                    }
                );

                return;
            }


            if (request.status !== "PENDING") {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Этот запрос уже обработан",
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // ПРОВЕРЯЕМ ПРАВА КУРАТОРА
            // ==========================================

            const curator =
                await isCurator(
                    user.id,
                    request.groupId
                );


            if (!curator) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Вы не являетесь куратором этой группы",
                        show_alert: true
                    }
                );

                return;
            }


            // ==========================================
            // СОЗДАЁМ ЗАДАЧУ
            // ==========================================

            const task = await Task.create({

                title: request.title,

                description: request.description,

                deadline: request.deadline,

                groupId: request.groupId,

                subjectId: request.subjectId,

                creatorId: request.creatorId,

                targetType: "GROUP"

            });


            // ==========================================
            // НАЗНАЧАЕМ ЗАДАЧУ ВСЕМ УЧАСТНИКАМ
            // ==========================================

            const members =
                await GroupMember.findAll({
                    where: {
                        groupId: request.groupId
                    }
                });


            for (const member of members) {

                await TaskMember.findOrCreate({

                    where: {
                        taskId: task.id,
                        userId: member.userId
                    },

                    defaults: {
                        completed: false
                    }

                });

            }


            // ==========================================
            // МЕНЯЕМ СТАТУС ЗАПРОСА
            // ==========================================

            await request.update({
                status: "APPROVED"
            });


            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Запрос одобрен"
                }
            );


            // ==========================================
            // ОБНОВЛЯЕМ СООБЩЕНИЕ КУРАТОРА
            // ==========================================

            await bot.editMessageText(

                `✅ Запрос №${request.id} одобрен.\n\n` +
                `📝 ${task.title}\n` +
                `📚 ${request.subject?.name || "Не указан"}\n` +
                `🏫 ${request.group?.name || "Не указана"}\n` +
                `📅 ${formatDate(task.deadline)}\n\n` +
                `👥 Задача назначена участникам группы.`,

                {
                    chat_id:
                        query.message.chat.id,

                    message_id:
                        query.message.message_id
                }

            );


            // ==========================================
            // УВЕДОМЛЯЕМ АВТОРА ЗАПРОСА
            // ==========================================

            if (request.creator) {

                await bot.sendMessage(

                    request.creator.telegramId,

                    `🎉 Ваш запрос одобрен куратором!\n\n` +

                    `📝 ${task.title}\n` +

                    `📚 ${request.subject?.name || "Не указан"}\n` +

                    `🏫 ${request.group?.name || "Не указана"}\n` +

                    `📅 ${formatDate(task.deadline)}\n\n` +

                    `Задача добавлена для всей группы.`

                );

            }


            console.log(
                `✅ Запрос на задачу №${request.id} одобрен куратором ${telegramId}`
            );


        } catch (error) {

            console.error(
                "❌ Ошибка одобрения запроса:",
                error
            );


            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Ошибка при одобрении запроса",
                    show_alert: true
                }
            );

        }

    });


    // ==========================================
    // ОТКЛОНЕНИЕ ЗАПРОСА
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (
            !query.data.startsWith(
                "reject_task_request_"
            )
        ) {
            return;
        }


        try {

            const telegramId = query.from.id;

            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });


            if (!user) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Пользователь не найден",
                        show_alert: true
                    }
                );

                return;
            }


            const requestId = Number(
                query.data.replace(
                    "reject_task_request_",
                    ""
                )
            );


            const request =
                await TaskRequest.findByPk(
                    requestId,
                    {
                        include: [
                            {
                                model: User,
                                as: "creator"
                            },
                            {
                                model: Group,
                                as: "group"
                            },
                            {
                                model: Subject,
                                as: "subject"
                            }
                        ]
                    }
                );


            if (!request) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Запрос не найден",
                        show_alert: true
                    }
                );

                return;
            }


            if (request.status !== "PENDING") {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Этот запрос уже обработан",
                        show_alert: true
                    }
                );

                return;
            }


            const curator =
                await isCurator(
                    user.id,
                    request.groupId
                );


            if (!curator) {

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Вы не являетесь куратором этой группы",
                        show_alert: true
                    }
                );

                return;
            }


            await request.update({
                status: "REJECTED"
            });


            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Запрос отклонён"
                }
            );


            await bot.editMessageText(

                `❌ Запрос №${request.id} отклонён.\n\n` +
                `📝 ${request.title}\n` +
                `🏫 ${request.group?.name || "Не указана"}`,

                {
                    chat_id:
                        query.message.chat.id,

                    message_id:
                        query.message.message_id
                }

            );


            // ==========================================
            // УВЕДОМЛЯЕМ АВТОРА
            // ==========================================

            if (request.creator) {

                await bot.sendMessage(

                    request.creator.telegramId,

                    `❌ Ваш запрос на добавление задачи ` +
                    `для группы был отклонён куратором.\n\n` +

                    `📝 ${request.title}\n` +

                    `🏫 ${request.group?.name || "Не указана"}`

                );

            }


            console.log(
                `❌ Запрос на задачу №${request.id} отклонён куратором ${telegramId}`
            );


        } catch (error) {

            console.error(
                "❌ Ошибка отклонения запроса:",
                error
            );


            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Ошибка при отклонении запроса",
                    show_alert: true
                }
            );

        }

    });

}


// ==========================================
// ФОРМАТИРОВАНИЕ ДАТЫ
// ==========================================

function formatDate(date) {

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const year =
        date.getFullYear();

    const hours = String(
        date.getHours()
    ).padStart(2, "0");

    const minutes = String(
        date.getMinutes()
    ).padStart(2, "0");


    return `${day}.${month}.${year} ${hours}:${minutes}`;

}


module.exports =
    registerTaskRequestHandlers;