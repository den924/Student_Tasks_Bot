const {
    Group,
    GroupMember,
    User
} = require("../models");

const {
    createGroupsKeyboard
} = require("../keyboards/groupsKeyboard");

const GROUPS_PER_PAGE = 3;


async function sendGroups(
    bot,
    chatId,
    page = 0
) {

    const totalGroups =
        await Group.count();


    const totalPages = Math.max(
        1,
        Math.ceil(
            totalGroups /
            GROUPS_PER_PAGE
        )
    );


    if (page < 0) {
        page = 0;
    }


    if (page >= totalPages) {
        page = totalPages - 1;
    }


    const groups =
        await Group.findAll({

            order: [
                ["name", "ASC"]
            ],

            limit:
                GROUPS_PER_PAGE,

            offset:
                page *
                GROUPS_PER_PAGE

        });


    if (groups.length === 0) {

        await bot.sendMessage(
            chatId,
            "Пока нет доступных учебных групп."
        );

        return;
    }


    await bot.sendMessage(

        chatId,

        "🏫 Выберите учебную группу:",

        {
            reply_markup:
                createGroupsKeyboard(
                    groups,
                    page,
                    totalPages
                )
        }

    );

}


function registerGroupSelectionHandlers(bot) {


    // ==========================================
    // ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
    // ==========================================

    bot.on(
        "callback_query",
        async (query) => {

            if (
                !query.data.startsWith(
                    "groups_page_"
                )
            ) {
                return;
            }


            if (
                query.data ===
                "groups_page_current"
            ) {

                await bot.answerCallbackQuery(
                    query.id
                );

                return;
            }


            const page =
                Number(
                    query.data.replace(
                        "groups_page_",
                        ""
                    )
                );


            try {

                await bot.answerCallbackQuery(
                    query.id
                );


                await bot.deleteMessage(

                    query.message.chat.id,

                    query.message.message_id

                );


                await sendGroups(

                    bot,

                    query.message.chat.id,

                    page

                );


            } catch (error) {

                console.error(
                    "❌ Ошибка переключения страницы:",
                    error
                );

            }

        }
    );


    // ==========================================
    // ВЫБОР ГРУППЫ
    // ==========================================

    bot.on(
        "callback_query",
        async (query) => {

            if (
                !query.data.startsWith(
                    "select_group_"
                )
            ) {
                return;
            }


            const groupId =
                Number(
                    query.data.replace(
                        "select_group_",
                        ""
                    )
                );


            try {

                const telegramId =
                    query.from.id;


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


                const group =
                    await Group.findByPk(
                        groupId
                    );


                if (!group) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Группа не найдена"
                        }
                    );

                    return;
                }


                const [
                    membership,
                    created
                ] =
                    await GroupMember.findOrCreate({

                        where: {

                            userId:
                                user.id,

                            groupId:
                                group.id

                        },

                        defaults: {

                            role:
                                "MEMBER"

                        }

                    });


                // ==========================================
                // СОХРАНЯЕМ ВЫБРАННУЮ ГРУППУ
                // ==========================================

                if (
                    !global.selectedGroups
                ) {

                    global.selectedGroups =
                        new Map();

                }


                global.selectedGroups.set(

                    telegramId,

                    group.id

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            `Выбрана группа ${group.name}`
                    }

                );


                // ==========================================
                // ОСНОВНОЕ МЕНЮ ГРУППЫ
                // ==========================================

                const keyboard = [

                    [
                        {
                            text:
                                "📚 Предметы",

                            callback_data:
                                "group_subjects"
                        }
                    ],

                    [
                        {
                            text:
                                "📝 Задачи",

                            callback_data:
                                "group_tasks"
                        }
                    ],

                    [
                        {
                            text:
                                "➕ Добавить задачу",

                            callback_data:
                                "add_task"
                        }
                    ]

                ];


                // ==========================================
                // ПРОВЕРЯЕМ КУРАТОРА
                // ==========================================

                if (
                    membership.role ===
                    "CURATOR"
                ) {

                    keyboard.push([

                        {
                            text:
                                "📩 Запросы на задачи",

                            callback_data:
                                "curator_task_requests"
                        }

                    ]);

                }


                await bot.sendMessage(

                    query.message.chat.id,

                    `✅ Вы выбрали группу: ${group.name}\n\n` +
                    `Выберите необходимое действие:`,

                    {

                        reply_markup: {

                            inline_keyboard:
                                keyboard

                        }

                    }

                );


                console.log(

                    `👤 Пользователь ${telegramId} выбрал группу ${group.name}`

                );


            } catch (error) {

                console.error(

                    "❌ Ошибка выбора группы:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Произошла ошибка"
                    }

                );

            }

        }

    );

}


module.exports = {

    registerGroupSelectionHandlers,

    sendGroups

};