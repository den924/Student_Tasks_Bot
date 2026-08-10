const { User, GroupRequest } = require("../models");

const waitingForGroupName = new Set();

function registerGroupHandlers(bot) {

    // ==========================================
    // НАЖАТИЕ "ДОБАВИТЬ ГРУППУ"
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "add_group") {
            return;
        }

        try {

            const telegramId = query.from.id;

            waitingForGroupName.add(telegramId);

            await bot.answerCallbackQuery(query.id);

            await bot.sendMessage(
                query.message.chat.id,
                "Введите название учебной группы:\n\nНапример: ИВТ-21",
                {
                    reply_markup: {
                        keyboard: [
                            ["❌ Отмена"]
                        ],
                        resize_keyboard: true
                    }
                }
            );

        } catch (error) {

            console.error(
                "❌ Ошибка при добавлении группы:",
                error
            );
        }
    });


    // ==========================================
    // ПРОСМОТР ЗАЯВОК ЧЕРЕЗ INLINE-КНОПКУ
    // ==========================================

    bot.on("callback_query", async (query) => {

        if (query.data !== "pending_groups") {
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
                        text: "Пользователь не найден"
                    }
                );

                return;
            }

            const requests = await GroupRequest.findAll({
                where: {
                    userId: user.id
                },
                order: [
                    ["createdAt", "DESC"]
                ]
            });

            await bot.answerCallbackQuery(query.id);

            if (requests.length === 0) {

                await bot.sendMessage(
                    query.message.chat.id,
                    "📋 У вас пока нет заявок на добавление групп."
                );

                return;
            }

            let message = "📋 Ваши заявки:\n\n";

            for (const request of requests) {

                let statusText;

                switch (request.status) {

                    case "PENDING":
                        statusText = "⏳ Ожидает рассмотрения";
                        break;

                    case "APPROVED":
                        statusText = "✅ Одобрена";
                        break;

                    case "REJECTED":
                        statusText = "❌ Отклонена";
                        break;

                    default:
                        statusText = request.status;
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
                    text: "Произошла ошибка"
                }
            );
        }
    });


    // ==========================================
    // ОБРАБОТКА СООБЩЕНИЙ
    // ==========================================

    bot.on("message", async (msg) => {

        const telegramId = msg.from.id;
        const text = msg.text;

        if (!text) {
            return;
        }


        // ==========================================
        // ПРОСМОТР ЗАЯВОК ЧЕРЕЗ ОБЫЧНУЮ КНОПКУ
        // ==========================================

        if (text === "📋 Группы, ожидающие добавления") {

            try {

                const user = await User.findOne({
                    where: {
                        telegramId: telegramId
                    }
                });

                if (!user) {

                    await bot.sendMessage(
                        msg.chat.id,
                        "Пользователь не найден. Выполните /start."
                    );

                    return;
                }

                const requests = await GroupRequest.findAll({
                    where: {
                        userId: user.id
                    },
                    order: [
                        ["createdAt", "DESC"]
                    ]
                });

                if (requests.length === 0) {

                    await bot.sendMessage(
                        msg.chat.id,
                        "📋 У вас пока нет заявок на добавление групп."
                    );

                    return;
                }

                let message = "📋 Ваши заявки:\n\n";

                for (const request of requests) {

                    let statusText;

                    switch (request.status) {

                        case "PENDING":
                            statusText = "⏳ Ожидает рассмотрения";
                            break;

                        case "APPROVED":
                            statusText = "✅ Одобрена";
                            break;

                        case "REJECTED":
                            statusText = "❌ Отклонена";
                            break;

                        default:
                            statusText = request.status;
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
                    "Произошла ошибка."
                );
            }

            return;
        }


        // ==========================================
        // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ ДОБАВЛЯЕТ ГРУППУ
        // ==========================================

        if (!waitingForGroupName.has(telegramId)) {
            return;
        }


        // ==========================================
        // ОТМЕНА
        // ==========================================

        if (text === "❌ Отмена") {

            waitingForGroupName.delete(telegramId);

            await bot.sendMessage(
                msg.chat.id,
                "Добавление группы отменено.",
                {
                    reply_markup: {
                        remove_keyboard: true
                    }
                }
            );

            return;
        }


        // ==========================================
        // НАЗВАНИЕ ГРУППЫ
        // ==========================================

        const groupName = text.trim();

        if (groupName.length < 2) {

            await bot.sendMessage(
                msg.chat.id,
                "Название группы слишком короткое. Попробуйте ещё раз."
            );

            return;
        }


        // ==========================================
        // СОЗДАНИЕ ЗАЯВКИ
        // ==========================================

        try {

            const user = await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });

            if (!user) {

                waitingForGroupName.delete(telegramId);

                await bot.sendMessage(
                    msg.chat.id,
                    "Пользователь не найден. Выполните /start."
                );

                return;
            }


            const existingRequest =
                await GroupRequest.findOne({
                    where: {
                        groupName: groupName,
                        userId: user.id,
                        status: "PENDING"
                    }
                });


            if (existingRequest) {

                waitingForGroupName.delete(telegramId);

                await bot.sendMessage(
                    msg.chat.id,
                    "Вы уже отправляли заявку на добавление этой группы."
                );

                return;
            }


            await GroupRequest.create({
                groupName: groupName,
                userId: user.id,
                status: "PENDING"
            });


            waitingForGroupName.delete(telegramId);


            await bot.sendMessage(
                msg.chat.id,
                `✅ Заявка на добавление группы «${groupName}» отправлена администратору.`,
                {
                    reply_markup: {
                        remove_keyboard: true
                    }
                }
            );


            console.log(
                `📩 Новая заявка: "${groupName}" от Telegram ID ${telegramId}`
            );

        } catch (error) {

            console.error(
                "❌ Ошибка создания заявки:",
                error
            );

            waitingForGroupName.delete(telegramId);

            await bot.sendMessage(
                msg.chat.id,
                "Произошла ошибка при создании заявки."
            );
        }
    });
}

module.exports = registerGroupHandlers;