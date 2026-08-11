const {
    Group,
    GroupMember,
    User
} = require("../models");

const {
    createGroupsKeyboard
} = require("../keyboards/groupsKeyboard");

const GROUPS_PER_PAGE = 3;


// ==========================================
// ПОЛУЧЕНИЕ ВЫБРАННОЙ ГРУППЫ
// ==========================================

function getSelectedGroup(telegramId) {

    if (!global.selectedGroups) {

        global.selectedGroups =
            new Map();

    }

    return global.selectedGroups.get(
        telegramId
    );

}


// ==========================================
// ПОКАЗ СПИСКА ГРУПП
// ==========================================

async function sendGroups(
    bot,
    chatId,
    page = 0
) {

    const totalGroups =
        await Group.count();


    const totalPages =
        Math.max(
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


// ==========================================
// ПОКАЗ ГЛАВНОГО МЕНЮ ГРУППЫ
// ==========================================

async function sendGroupMenu(
    bot,
    chatId,
    telegramId,
    options = {}
) {

    try {

        const groupId =
            getSelectedGroup(
                telegramId
            );


        if (!groupId) {

            await bot.sendMessage(

                chatId,

                "❌ Группа не выбрана."

            );

            return;

        }


        const group =
            await Group.findByPk(
                groupId
            );


        if (!group) {

            await bot.sendMessage(

                chatId,

                "❌ Выбранная группа не найдена."

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

            await bot.sendMessage(

                chatId,

                "❌ Пользователь не найден."

            );

            return;

        }


        const membership =
            await GroupMember.findOne({

                where: {

                    userId:
                        user.id,

                    groupId:
                        group.id

                }

            });


        if (!membership) {

            await bot.sendMessage(

                chatId,

                "❌ Вы не состоите в выбранной группе."

            );

            return;

        }


        // ==========================================
        // ОСНОВНОЕ МЕНЮ
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

            ],

            [

                {
                    text:
                        "📅 Расписание",

                    callback_data:
                        "group_schedule"
                }

            ],

            // ==========================================
            // СМЕНА ГРУППЫ
            // ==========================================

            [

                {
                    text:
                        "🔄 Выбрать другую группу",

                    callback_data:
                        "change_group"
                }

            ]

        ];


        // ==========================================
        // МЕНЮ КУРАТОРА
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


            keyboard.push([

                {

                    text:
                        "📢 Уведомление группе",

                    callback_data:
                        "curator_group_notification"

                }

            ]);

        }


        const prefix =
            options.prefix ||
            "🏫 Выбранная группа";


        const message =
            `${prefix}: ${group.name}\n\n` +
            `Выберите необходимое действие:`;


        await bot.sendMessage(

            chatId,

            message,

            {

                reply_markup: {

                    inline_keyboard:
                        keyboard

                }

            }

        );

    } catch (error) {

        console.error(

            "❌ Ошибка открытия меню группы:",

            error

        );


        await bot.sendMessage(

            chatId,

            "❌ Не удалось открыть меню группы."

        );

    }

}


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerGroupSelectionHandlers(
    bot
) {

    // ==========================================
    // ЕДИНЫЙ CALLBACK_QUERY ОБРАБОТЧИК
    // ==========================================

    bot.on(
        "callback_query",
        async (query) => {

            const data =
                query.data;


            const telegramId =
                query.from.id;


            // ==========================================
            // СМЕНА ГРУППЫ
            // ==========================================

            if (
                data ===
                "change_group"
            ) {

                try {

                    await bot.answerCallbackQuery(
                        query.id
                    );


                    await sendGroups(

                        bot,

                        query.message.chat.id,

                        0

                    );

                } catch (error) {

                    console.error(

                        "❌ Ошибка смены группы:",

                        error

                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Не удалось открыть список групп",

                            show_alert:
                                true

                        }

                    );

                }

                return;
            }


            // ==========================================
            // ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
            // ==========================================

            if (
                data.startsWith(
                    "groups_page_"
                )
            ) {

                if (
                    data ===
                    "groups_page_current"
                ) {

                    await bot.answerCallbackQuery(

                        query.id

                    );

                    return;

                }


                const page =
                    Number(

                        data.replace(

                            "groups_page_",

                            ""

                        )

                    );


                if (
                    Number.isNaN(
                        page
                    )
                ) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Некорректная страница"

                        }

                    );

                    return;

                }


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

                return;
            }


            // ==========================================
            // ВЫБОР ГРУППЫ
            // ==========================================

            if (
                data.startsWith(
                    "select_group_"
                )
            ) {

                const groupId =
                    Number(

                        data.replace(

                            "select_group_",

                            ""

                        )

                    );


                if (
                    Number.isNaN(
                        groupId
                    )
                ) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {

                            text:
                                "Некорректная группа",

                            show_alert:
                                true

                        }

                    );

                    return;

                }


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
                        membership
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
                    // СОХРАНЯЕМ НОВУЮ ГРУППУ
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
                    // ОТКРЫВАЕМ МЕНЮ НОВОЙ ГРУППЫ
                    // ==========================================

                    await sendGroupMenu(

                        bot,

                        query.message.chat.id,

                        telegramId,

                        {

                            prefix:
                                "✅ Вы выбрали группу"

                        }

                    );


                    console.log(

                        `👤 Пользователь ${telegramId} ` +
                        `выбрал группу ${group.name}`

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

}


module.exports = {

    registerGroupSelectionHandlers,

    sendGroups,

    sendGroupMenu,

    getSelectedGroup

};