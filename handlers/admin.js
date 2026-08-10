const {
    User,
    Group,
    GroupMember,
    GroupRequest
} = require("../models");

function isAdmin(telegramId) {
    return String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID);
}

function registerAdminHandlers(bot) {

    // ==========================================
    // ЕДИНЫЙ CALLBACK_QUERY ОБРАБОТЧИК
    // ==========================================

    bot.on("callback_query", async (query) => {

        const data = query.data;
        const telegramId = query.from.id;

        // ==========================================
        // ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА
        // ==========================================

        const adminActions = [
            "admin_menu",
            "admin_group_requests",
            "admin_roles"
        ];

        const isAdminAction =
            adminActions.includes(data) ||
            data.startsWith("approve_group_") ||
            data.startsWith("reject_group_") ||
            data.startsWith("admin_role_group_") ||
            data.startsWith("admin_role_user_") ||
            data.startsWith("set_curator_") ||
            data.startsWith("set_member_");

        if (!isAdminAction) {
            return;
        }

        if (!isAdmin(telegramId)) {

            await bot.answerCallbackQuery(
                query.id,
                {
                    text:
                        "У вас нет прав администратора",
                    show_alert:
                        true
                }
            );

            return;
        }


        // ==========================================
        // ГЛАВНОЕ МЕНЮ АДМИНИСТРАТОРА
        // ==========================================

        if (data === "admin_menu") {

            await bot.answerCallbackQuery(
                query.id
            );

            await bot.sendMessage(
                query.message.chat.id,

                "🛠 Панель администратора:",

                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text:
                                        "📋 Заявки на группы",

                                    callback_data:
                                        "admin_group_requests"
                                }
                            ],
                            [
                                {
                                    text:
                                        "👥 Управление ролями",

                                    callback_data:
                                        "admin_roles"
                                }
                            ]
                        ]
                    }
                }
            );

            return;
        }


        // ==========================================
        // СПИСОК ЗАЯВОК НА ГРУППЫ
        // ==========================================

        if (data === "admin_group_requests") {

            try {

                const requests =
                    await GroupRequest.findAll({

                        where: {
                            status:
                                "PENDING"
                        },

                        include: [
                            {
                                model:
                                    User,

                                as:
                                    "user"
                            }
                        ],

                        order: [
                            [
                                "createdAt",
                                "ASC"
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

                        "📋 Новых заявок на добавление групп нет."
                    );

                    return;
                }


                for (
                    const request
                    of requests
                ) {

                    const username =
                        request.user?.username
                            ? `@${request.user.username}`
                            : "без username";

                    const firstName =
                        request.user?.firstName ||
                        "Не указано";

                    const lastName =
                        request.user?.lastName ||
                        "";

                    const message =

                        `📩 Заявка №${request.id}\n\n` +

                        `🏫 Группа: ${request.groupName}\n` +

                        `👤 Пользователь: ${firstName} ${lastName}\n` +

                        `🔹 Username: ${username}\n` +

                        `🆔 Telegram ID: ${request.user?.telegramId || "не найден"}\n\n` +

                        `Статус: ⏳ Ожидает рассмотрения`;


                    await bot.sendMessage(

                        query.message.chat.id,

                        message,

                        {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text:
                                                "✅ Одобрить",

                                            callback_data:
                                                `approve_group_${request.id}`
                                        },

                                        {
                                            text:
                                                "❌ Отклонить",

                                            callback_data:
                                                `reject_group_${request.id}`
                                        }
                                    ]
                                ]
                            }
                        }

                    );

                }

            } catch (error) {

                console.error(
                    "❌ Ошибка получения заявок:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "Ошибка загрузки заявок",
                        show_alert:
                            true
                    }
                );

            }

            return;
        }


        // ==========================================
        // ОДОБРЕНИЕ ЗАЯВКИ
        // ==========================================

        if (
            data.startsWith(
                "approve_group_"
            )
        ) {

            const requestId =
                Number(
                    data.replace(
                        "approve_group_",
                        ""
                    )
                );

            try {

                const request =
                    await GroupRequest.findByPk(

                        requestId,

                        {
                            include: [
                                {
                                    model:
                                        User,

                                    as:
                                        "user"
                                }
                            ]
                        }

                    );


                if (!request) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Заявка не найдена",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                if (
                    request.status !==
                    "PENDING"
                ) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Эта заявка уже обработана",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                const [group] =
                    await Group.findOrCreate({

                        where: {
                            name:
                                request.groupName
                        },

                        defaults: {
                            name:
                                request.groupName
                        }

                    });


                await GroupMember.findOrCreate({

                    where: {

                        userId:
                            request.userId,

                        groupId:
                            group.id

                    },

                    defaults: {
                        role:
                            "MEMBER"
                    }

                });


                await request.update({
                    status:
                        "APPROVED"
                });


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Заявка одобрена"
                    }

                );


                await bot.editMessageText(

                    `✅ Заявка №${request.id} одобрена.\n\n` +

                    `🏫 Группа: ${group.name}\n` +

                    `👤 Пользователь добавлен в группу.`,

                    {
                        chat_id:
                            query.message.chat.id,

                        message_id:
                            query.message.message_id
                    }

                );


                if (request.user) {

                    await bot.sendMessage(

                        request.user.telegramId,

                        `🎉 Ваша заявка одобрена!\n\n` +

                        `🏫 Группа «${group.name}» добавлена.\n` +

                        `Вы автоматически добавлены в неё как участник.`

                    );

                }


                console.log(

                    `✅ Заявка №${request.id} ` +
                    `одобрена администратором ${telegramId}`

                );


            } catch (error) {

                console.error(

                    "❌ Ошибка одобрения заявки:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка при одобрении заявки",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }


        // ==========================================
        // ОТКЛОНЕНИЕ ЗАЯВКИ
        // ==========================================

        if (
            data.startsWith(
                "reject_group_"
            )
        ) {

            const requestId =
                Number(
                    data.replace(
                        "reject_group_",
                        ""
                    )
                );

            try {

                const request =
                    await GroupRequest.findByPk(

                        requestId,

                        {
                            include: [
                                {
                                    model:
                                        User,

                                    as:
                                        "user"
                                }
                            ]
                        }

                    );


                if (!request) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Заявка не найдена",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                if (
                    request.status !==
                    "PENDING"
                ) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Эта заявка уже обработана",
                            show_alert:
                                true
                        }
                    );

                    return;
                }


                await request.update({
                    status:
                        "REJECTED"
                });


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Заявка отклонена"
                    }

                );


                await bot.editMessageText(

                    `❌ Заявка №${request.id} отклонена.\n\n` +

                    `🏫 Группа: ${request.groupName}`,

                    {
                        chat_id:
                            query.message.chat.id,

                        message_id:
                            query.message.message_id
                    }

                );


                if (request.user) {

                    await bot.sendMessage(

                        request.user.telegramId,

                        `❌ Ваша заявка на добавление группы ` +
                        `«${request.groupName}» была отклонена администратором.`

                    );

                }


                console.log(

                    `❌ Заявка №${request.id} ` +
                    `отклонена администратором ${telegramId}`

                );


            } catch (error) {

                console.error(

                    "❌ Ошибка отклонения заявки:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка при отклонении заявки",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }


        // ==========================================
        // УПРАВЛЕНИЕ РОЛЯМИ
        // ==========================================

        if (data === "admin_roles") {

            try {

                const groups =
                    await Group.findAll({

                        order: [
                            [
                                "name",
                                "ASC"
                            ]
                        ]

                    });


                await bot.answerCallbackQuery(
                    query.id
                );


                if (
                    groups.length ===
                    0
                ) {

                    await bot.sendMessage(

                        query.message.chat.id,

                        "🏫 Пока нет учебных групп."

                    );

                    return;
                }


                const keyboard =
                    groups.map(
                        (group) => [
                            {
                                text:
                                    `🏫 ${group.name}`,

                                callback_data:
                                    `admin_role_group_${group.id}`
                            }
                        ]
                    );


                await bot.sendMessage(

                    query.message.chat.id,

                    "👥 Выберите группу для управления ролями:",

                    {
                        reply_markup: {
                            inline_keyboard:
                                keyboard
                        }
                    }

                );

            } catch (error) {

                console.error(

                    "❌ Ошибка загрузки групп:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка загрузки групп",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }


        // ==========================================
        // ВЫБОР ГРУППЫ ДЛЯ УПРАВЛЕНИЯ РОЛЯМИ
        // ==========================================

        if (
            data.startsWith(
                "admin_role_group_"
            )
        ) {

            const groupId =
                Number(
                    data.replace(
                        "admin_role_group_",
                        ""
                    )
                );


            try {

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


                const members =
                    await GroupMember.findAll({

                        where: {
                            groupId:
                                group.id
                        },

                        include: [
                            {
                                model:
                                    User,

                                as:
                                    "user"
                            }
                        ],

                        order: [
                            [
                                "id",
                                "ASC"
                            ]
                        ]

                    });


                await bot.answerCallbackQuery(
                    query.id
                );


                if (
                    members.length ===
                    0
                ) {

                    await bot.sendMessage(

                        query.message.chat.id,

                        `🏫 В группе «${group.name}» пока нет участников.`

                    );

                    return;
                }


                const keyboard = [];


                for (
                    const member
                    of members
                ) {

                    const firstName =
                        member.user?.firstName ||
                        "";

                    const lastName =
                        member.user?.lastName ||
                        "";

                    const username =
                        member.user?.username
                            ? `@${member.user.username}`
                            : "";


                    const displayName =
                        `${firstName} ${lastName}`.trim() ||
                        username ||
                        `ID ${member.userId}`;


                    keyboard.push([

                        {
                            text:
                                `${displayName} — ${member.role}`,

                            callback_data:
                                `admin_role_user_${group.id}_${member.userId}`
                        }

                    ]);

                }


                await bot.sendMessage(

                    query.message.chat.id,

                    `👥 Участники группы «${group.name}»:\n\n` +
                    `Выберите пользователя:`,

                    {
                        reply_markup: {
                            inline_keyboard:
                                keyboard
                        }
                    }

                );

            } catch (error) {

                console.error(

                    "❌ Ошибка загрузки участников:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка загрузки участников",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }


        // ==========================================
        // ВЫБОР ПОЛЬЗОВАТЕЛЯ
        // ==========================================

        if (
            data.startsWith(
                "admin_role_user_"
            )
        ) {

            const parts =
                data.split("_");

            const groupId =
                Number(parts[3]);

            const userId =
                Number(parts[4]);


            try {

                const member =
                    await GroupMember.findOne({

                        where: {

                            groupId:
                                groupId,

                            userId:
                                userId

                        },

                        include: [

                            {
                                model:
                                    User,

                                as:
                                    "user"
                            },

                            {
                                model:
                                    Group,

                                as:
                                    "group"
                            }

                        ]

                    });


                if (!member) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Участник не найден",
                            show_alert:
                                true
                        }

                    );

                    return;
                }


                const displayName =
                    `${member.user?.firstName || ""} ` +
                    `${member.user?.lastName || ""}`.trim();


                await bot.answerCallbackQuery(
                    query.id
                );


                await bot.sendMessage(

                    query.message.chat.id,

                    `👤 Пользователь: ${displayName || "Без имени"}\n` +
                    `🏫 Группа: ${member.group.name}\n` +
                    `🎓 Текущая роль: ${member.role}`,

                    {
                        reply_markup: {

                            inline_keyboard: [

                                [

                                    {
                                        text:
                                            "🎓 Назначить куратором",

                                        callback_data:
                                            `set_curator_${groupId}_${userId}`
                                    }

                                ],

                                [

                                    {
                                        text:
                                            "👤 Назначить участником",

                                        callback_data:
                                            `set_member_${groupId}_${userId}`
                                    }

                                ]

                            ]

                        }

                    }

                );

            } catch (error) {

                console.error(

                    "❌ Ошибка выбора пользователя:",

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
        // НАЗНАЧЕНИЕ КУРАТОРОМ
        // ==========================================

        if (
            data.startsWith(
                "set_curator_"
            )
        ) {

            const parts =
                data.split("_");

            const groupId =
                Number(parts[2]);

            const userId =
                Number(parts[3]);


            try {

                const member =
                    await GroupMember.findOne({

                        where: {

                            groupId:
                                groupId,

                            userId:
                                userId

                        }

                    });


                if (!member) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Участник не найден",
                            show_alert:
                                true
                        }

                    );

                    return;
                }


                await member.update({

                    role:
                        "CURATOR"

                });


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Пользователь назначен куратором"
                    }

                );


                await bot.sendMessage(

                    query.message.chat.id,

                    "✅ Пользователь успешно назначен куратором группы."

                );


                const user =
                    await User.findByPk(
                        userId
                    );

                const group =
                    await Group.findByPk(
                        groupId
                    );


                if (
                    user &&
                    group
                ) {

                    await bot.sendMessage(

                        user.telegramId,

                        `🎓 Вам назначена роль куратора группы «${group.name}».`

                    );

                }

            } catch (error) {

                console.error(

                    "❌ Ошибка назначения куратора:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка назначения роли",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }


        // ==========================================
        // НАЗНАЧЕНИЕ УЧАСТНИКОМ
        // ==========================================

        if (
            data.startsWith(
                "set_member_"
            )
        ) {

            const parts =
                data.split("_");

            const groupId =
                Number(parts[2]);

            const userId =
                Number(parts[3]);


            try {

                const member =
                    await GroupMember.findOne({

                        where: {

                            groupId:
                                groupId,

                            userId:
                                userId

                        }

                    });


                if (!member) {

                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Участник не найден",
                            show_alert:
                                true
                        }

                    );

                    return;
                }


                await member.update({

                    role:
                        "MEMBER"

                });


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Пользователь назначен участником"
                    }

                );


                await bot.sendMessage(

                    query.message.chat.id,

                    "✅ Пользователь снова назначен обычным участником группы."

                );


                const user =
                    await User.findByPk(
                        userId
                    );

                const group =
                    await Group.findByPk(
                        groupId
                    );


                if (
                    user &&
                    group
                ) {

                    await bot.sendMessage(

                        user.telegramId,

                        `👤 В группе «${group.name}» вам назначена роль участника.`

                    );

                }

            } catch (error) {

                console.error(

                    "❌ Ошибка изменения роли:",

                    error

                );


                await bot.answerCallbackQuery(

                    query.id,

                    {
                        text:
                            "Ошибка изменения роли",
                        show_alert:
                            true
                    }

                );

            }

            return;
        }

    });

}

module.exports = registerAdminHandlers;