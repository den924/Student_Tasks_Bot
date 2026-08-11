const {
    User,
    Group,
    GroupMember
} = require("../models");


const notificationState = new Map();


// ==========================================
// ПОЛУЧЕНИЕ ВЫБРАННОЙ ГРУППЫ
// ==========================================

function getSelectedGroup(telegramId) {

    if (!global.selectedGroups) {
        global.selectedGroups = new Map();
    }

    return global.selectedGroups.get(
        telegramId
    );

}


// ==========================================
// ОЧИСТКА СОСТОЯНИЯ
// ==========================================

function clearNotificationState(telegramId) {

    notificationState.delete(
        telegramId
    );

}


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerCuratorNotificationHandlers(bot) {


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
            // НАЖАТИЕ "УВЕДОМЛЕНИЕ ГРУППЕ"
            // ==========================================

            if (
                data ===
                "curator_group_notification"
            ) {

                try {

                    const groupId =
                        getSelectedGroup(
                            telegramId
                        );


                    if (!groupId) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {
                                text:
                                    "Сначала выберите группу",
                                show_alert:
                                    true
                            }

                        );

                        return;
                    }


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
                                    "Пользователь не найден",
                                show_alert:
                                    true
                            }

                        );

                        return;
                    }


                    const membership =
                        await GroupMember.findOne({

                            where: {

                                userId:
                                    user.id,

                                groupId:
                                    groupId

                            }

                        });


                    // ==========================================
                    // ПРОВЕРКА РОЛИ
                    // ==========================================

                    if (
                        !membership ||
                        membership.role !==
                            "CURATOR"
                    ) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {
                                text:
                                    "Отправлять уведомления может только куратор",
                                show_alert:
                                    true
                            }

                        );

                        return;
                    }


                    const group =
                        await Group.findByPk(
                            groupId
                        );


                    if (!group) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {
                                text:
                                    "Группа не найдена",
                                show_alert:
                                    true
                            }

                        );

                        return;
                    }


                    clearNotificationState(
                        telegramId
                    );


                    notificationState.set(

                        telegramId,

                        {

                            groupId:
                                groupId,

                            step:
                                "TEXT"

                        }

                    );


                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        `📢 Отправка уведомления группе «${group.name}»\n\n` +

                        `⏳ Запрос выполняется...\n\n` +

                        `Введите текст уведомления:`,

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

                        "❌ Ошибка начала отправки уведомления:",

                        error

                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Ошибка",
                            show_alert:
                                true

                        }

                    );

                }

                return;
            }


            // ==========================================
            // ПОДТВЕРЖДЕНИЕ ОТПРАВКИ
            // ==========================================

            if (
                data ===
                "confirm_group_notification"
            ) {

                try {

                    const state =
                        notificationState.get(
                            telegramId
                        );


                    if (!state) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Сессия отправки уведомления истекла",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


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
                                    "Пользователь не найден",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


                    const membership =
                        await GroupMember.findOne({

                            where: {

                                userId:
                                    user.id,

                                groupId:
                                    state.groupId

                            }

                        });


                    if (
                        !membership ||
                        membership.role !==
                            "CURATOR"
                    ) {

                        clearNotificationState(
                            telegramId
                        );


                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Недостаточно прав",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


                    const group =
                        await Group.findByPk(
                            state.groupId
                        );


                    if (!group) {

                        clearNotificationState(
                            telegramId
                        );


                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Группа не найдена",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


                    const members =
                        await GroupMember.findAll({

                            where: {

                                groupId:
                                    state.groupId

                            },

                            include: [

                                {

                                    model:
                                        User,

                                    as:
                                        "user"

                                }

                            ]

                        });


                    if (
                        members.length ===
                        0
                    ) {

                        clearNotificationState(
                            telegramId
                        );


                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "В группе нет участников",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Отправка уведомления..."

                        }

                    );


                    let sentCount =
                        0;


                    let failedCount =
                        0;


                    for (
                        const member
                        of members
                    ) {

                        const memberUser =
                            member.user;


                        if (
                            !memberUser ||
                            !memberUser.telegramId
                        ) {

                            failedCount++;

                            continue;
                        }


                        try {

                            await bot.sendMessage(

                                memberUser.telegramId,

                                `📢 Уведомление от куратора\n\n` +

                                `🏫 Группа: ${group.name}\n\n` +

                                `${state.text}`

                            );


                            sentCount++;


                        } catch (sendError) {

                            failedCount++;


                            console.error(

                                `❌ Не удалось отправить уведомление пользователю ` +
                                `${memberUser.telegramId}:`,

                                sendError.message

                            );

                        }

                    }


                    clearNotificationState(
                        telegramId
                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        `✅ Уведомление отправлено группе «${group.name}».\n\n` +

                        `👥 Получателей: ${sentCount}` +

                        (

                            failedCount > 0

                                ? `\n⚠️ Не удалось отправить: ${failedCount}`

                                : ""

                        ),

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );


                    console.log(

                        `📢 Куратор ${telegramId} отправил уведомление группе ` +
                        `${group.name}. ` +
                        `Получателей: ${sentCount}, ошибок: ${failedCount}`

                    );


                } catch (error) {

                    console.error(

                        "❌ Ошибка отправки уведомления группе:",

                        error

                    );


                    clearNotificationState(
                        telegramId
                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Ошибка отправки уведомления",
                            show_alert:
                                true

                        }

                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        "❌ Не удалось отправить уведомление.",

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );

                }

                return;
            }


            // ==========================================
            // ОТМЕНА
            // ==========================================

            if (
                data ===
                "cancel_group_notification"
            ) {

                clearNotificationState(
                    telegramId
                );


                await bot.answerCallbackQuery(

                    query.id,

                    {

                        text:
                            "Отправка отменена"

                    }

                );


                await bot.sendMessage(

                    query.message.chat.id,

                    "❌ Отправка уведомления отменена.",

                    {

                        reply_markup: {

                            remove_keyboard:
                                true

                        }

                    }

                );

                return;
            }

        }
    );


    // ==========================================
    // ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
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


            const state =
                notificationState.get(
                    telegramId
                );


            if (!state) {
                return;
            }


            // ==========================================
            // ОТМЕНА
            // ==========================================

            if (
                text ===
                "❌ Отмена"
            ) {

                clearNotificationState(
                    telegramId
                );


                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Отправка уведомления отменена.",

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
            // ВВОД ТЕКСТА
            // ==========================================

            if (
                state.step ===
                "TEXT"
            ) {

                const notificationText =
                    text.trim();


                if (
                    notificationText.length <
                    2
                ) {

                    await bot.sendMessage(

                        msg.chat.id,

                        "❌ Сообщение слишком короткое. Введите текст ещё раз."

                    );

                    return;
                }


                state.text =
                    notificationText;


                state.step =
                    "CONFIRM";


                const group =
                    await Group.findByPk(
                        state.groupId
                    );


                if (!group) {

                    clearNotificationState(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        "❌ Группа не найдена.",

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );

                    return;
                }


                await bot.sendMessage(

                    msg.chat.id,

                    `📢 Предпросмотр уведомления\n\n` +

                    `🏫 Группа: ${group.name}\n\n` +

                    `━━━━━━━━━━━━━━\n` +

                    `${state.text}\n` +

                    `━━━━━━━━━━━━━━\n\n` +

                    `Отправить это сообщение всем участникам группы?`,

                    {

                        reply_markup: {

                            inline_keyboard: [

                                [

                                    {

                                        text:
                                            "✅ Отправить",

                                        callback_data:
                                            "confirm_group_notification"

                                    }

                                ],

                                [

                                    {

                                        text:
                                            "❌ Отмена",

                                        callback_data:
                                            "cancel_group_notification"

                                    }

                                ]

                            ]

                        }

                    }

                );

            }

        }

    );

}


module.exports =
    registerCuratorNotificationHandlers;