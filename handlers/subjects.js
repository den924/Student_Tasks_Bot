const {
    User,
    Group,
    GroupMember,
    Subject,
    SubjectRequest
} = require("../models");

const subjectCreationState = new Map();

function getSelectedGroup(telegramId) {
    if (!global.selectedGroups) {
        global.selectedGroups = new Map();
    }

    return global.selectedGroups.get(telegramId);
}

function clearSubjectState(telegramId) {
    subjectCreationState.delete(telegramId);
}

async function sendGroupMenu(bot, chatId, telegramId) {

    const groupId = getSelectedGroup(telegramId);

    if (!groupId) {
        await bot.sendMessage(
            chatId,
            "❌ Группа не выбрана. Используйте /start."
        );

        return;
    }

    const user = await User.findOne({
        where: {
            telegramId
        }
    });

    const group = await Group.findByPk(groupId);

    if (!user || !group) {
        await bot.sendMessage(
            chatId,
            "❌ Не удалось определить выбранную группу."
        );

        return;
    }

    const membership = await GroupMember.findOne({
        where: {
            userId: user.id,
            groupId: group.id
        }
    });

    if (!membership) {
        await bot.sendMessage(
            chatId,
            "❌ Вы не состоите в выбранной группе."
        );

        return;
    }

    const keyboard = [
        [
            {
                text: "📚 Предметы",
                callback_data: "group_subjects"
            }
        ],

        [
            {
                text: "📝 Задачи",
                callback_data: "group_tasks"
            }
        ],

        [
            {
                text: "➕ Добавить задачу",
                callback_data: "add_task"
            }
        ],

        [
            {
                text: "🔄 Выбрать другую группу",
                callback_data: "change_group"
            }
        ]
    ];

    if (membership.role === "CURATOR") {

        keyboard.push([
            {
                text: "📩 Запросы на задачи",
                callback_data: "curator_task_requests"
            }
        ]);

    }

    await bot.sendMessage(
        chatId,

        `🏫 Группа: ${group.name}\n\n` +
        "Выберите необходимое действие:",

        {
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
}


// ==========================================
// ПОКАЗ ПРЕДМЕТОВ
// ==========================================

async function showSubjects(
    bot,
    chatId,
    telegramId,
    queryId = null
) {

    const groupId =
        getSelectedGroup(telegramId);

    if (!groupId) {

        if (queryId) {
            await bot.answerCallbackQuery(
                queryId,
                {
                    text: "Сначала выберите группу",
                    show_alert: true
                }
            );
        }

        return;
    }

    const group =
        await Group.findByPk(groupId);

    const user =
        await User.findOne({
            where: {
                telegramId
            }
        });

    if (!group || !user) {

        if (queryId) {
            await bot.answerCallbackQuery(
                queryId,
                {
                    text:
                        "Не удалось определить группу или пользователя",
                    show_alert: true
                }
            );
        }

        return;
    }

    const membership =
        await GroupMember.findOne({
            where: {
                userId: user.id,
                groupId
            }
        });

    if (!membership) {

        if (queryId) {
            await bot.answerCallbackQuery(
                queryId,
                {
                    text:
                        "Вы не состоите в этой группе",
                    show_alert: true
                }
            );
        }

        return;
    }

    const subjects =
        await Subject.findAll({

            where: {
                groupId
            },

            order: [
                [
                    "name",
                    "ASC"
                ]
            ]

        });


    if (queryId) {
        await bot.answerCallbackQuery(
            queryId
        );
    }


    const keyboard =
        subjects.map(
            subject => [
                {
                    text:
                        `📚 ${subject.name}`,

                    callback_data:
                        `subject_${subject.id}`
                }
            ]
        );


    // ==========================================
    // КУРАТОР
    // ==========================================

    if (
        membership.role ===
        "CURATOR"
    ) {

        keyboard.push([
            {
                text:
                    "➕ Добавить предмет",

                callback_data:
                    "add_subject"
            }
        ]);

        keyboard.push([
            {
                text:
                    "🗑 Удалить предмет",

                callback_data:
                    "delete_subject_menu"
            }
        ]);

        keyboard.push([
            {
                text:
                    "📩 Запросы на предметы",

                callback_data:
                    "subject_requests"
            }
        ]);

    }

    // ==========================================
    // ОБЫЧНЫЙ УЧАСТНИК
    // ==========================================

    else {

        keyboard.push([
            {
                text:
                    "➕ Предложить предмет",

                callback_data:
                    "suggest_subject"
            }
        ]);

    }


    await bot.sendMessage(

        chatId,

        subjects.length
            ? `📚 Предметы группы «${group.name}»:`
            : `📚 В группе «${group.name}» пока нет предметов.`,

        {
            reply_markup: {
                inline_keyboard:
                    keyboard
            }
        }

    );
}


// ==========================================
// НАЧАЛО СОЗДАНИЯ / ПРЕДЛОЖЕНИЯ ПРЕДМЕТА
// ==========================================

async function startSubjectCreation(
    bot,
    query,
    type
) {

    const telegramId =
        query.from.id;

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

                groupId
            }

        });


    if (!membership) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Вы не состоите в этой группе",
                show_alert:
                    true
            }
        );

        return;
    }


    // ==========================================
    // ПРЯМОЕ ДОБАВЛЕНИЕ
    // ==========================================

    if (
        type === "DIRECT" &&
        membership.role !== "CURATOR"
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Добавлять предметы может только куратор",
                show_alert:
                    true
            }
        );

        return;
    }


    // ==========================================
    // ПРЕДЛОЖЕНИЕ
    // ==========================================

    if (
        type === "REQUEST" &&
        membership.role === "CURATOR"
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Куратор должен использовать «Добавить предмет»."
            }
        );

        return;
    }


    clearSubjectState(
        telegramId
    );


    subjectCreationState.set(

        telegramId,

        {
            groupId,
            type,
            step:
                "NAME"
        }

    );


    await bot.answerCallbackQuery(
        query.id
    );


    await bot.sendMessage(

        query.message.chat.id,

        type === "DIRECT"

            ? "⏳ Запрос выполняется...\n\n" +
              "📚 Введите название нового предмета:"

            : "⏳ Запрос выполняется...\n\n" +
              "📚 Введите название предлагаемого предмета:",

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
}


// ==========================================
// ЗАПРОСЫ НА ПРЕДМЕТЫ
// ==========================================

async function showSubjectRequests(
    bot,
    query
) {

    const telegramId =
        query.from.id;

    const groupId =
        getSelectedGroup(
            telegramId
        );

    const user =
        await User.findOne({
            where: {
                telegramId
            }
        });


    if (
        !groupId ||
        !user
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Не удалось определить пользователя или группу",
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

                groupId
            }

        });


    if (
        !membership ||
        membership.role !== "CURATOR"
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Доступ только для куратора",
                show_alert:
                    true
            }
        );

        return;
    }


    const requests =
        await SubjectRequest.findAll({

            where: {
                groupId,
                status:
                    "PENDING"
            },

            include: [
                {
                    model:
                        User,

                    as:
                        "creator"
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


    if (!requests.length) {

        await bot.sendMessage(
            query.message.chat.id,

            "📩 Новых запросов на добавление предметов нет."
        );

        return;
    }


    for (
        const request
        of requests
    ) {

        const creator =
            request.creator;


        const creatorName =
            `${creator?.firstName || ""} ` +
            `${creator?.lastName || ""}`.trim();


        await bot.sendMessage(

            query.message.chat.id,

            `📩 Запрос на предмет №${request.id}\n\n` +

            `📚 Предмет: ${request.name}\n` +

            `👤 От: ${creatorName || "Без имени"}\n` +

            `🆔 Telegram ID: ` +
            `${creator?.telegramId || "не указан"}\n\n` +

            `Статус: ⏳ Ожидает рассмотрения`,

            {
                reply_markup: {

                    inline_keyboard: [

                        [

                            {
                                text:
                                    "✅ Одобрить",

                                callback_data:
                                    `approve_subject_${request.id}`
                            },

                            {
                                text:
                                    "❌ Отклонить",

                                callback_data:
                                    `reject_subject_${request.id}`
                            }

                        ]

                    ]

                }
            }

        );

    }

}


// ==========================================
// ОБРАБОТКА РЕШЕНИЯ ПО ЗАПРОСУ
// ==========================================

async function handleSubjectRequestDecision(
    bot,
    query,
    approved
) {

    const prefix =
        approved
            ? "approve_subject_"
            : "reject_subject_";


    const requestId =
        Number(
            query.data.replace(
                prefix,
                ""
            )
        );


    if (
        Number.isNaN(
            requestId
        )
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Некорректный запрос",
                show_alert:
                    true
            }
        );

        return;
    }


    const request =
        await SubjectRequest.findByPk(
            requestId
        );


    if (!request) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Запрос не найден",
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
                    "Запрос уже обработан",
                show_alert:
                    true
            }
        );

        return;
    }


    const curator =
        await User.findOne({
            where: {
                telegramId:
                    query.from.id
            }
        });


    if (!curator) {

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
                    curator.id,

                groupId:
                    request.groupId

            }

        });


    if (
        !membership ||
        membership.role !==
            "CURATOR"
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Только куратор может обработать запрос",
                show_alert:
                    true
            }
        );

        return;
    }


    // ==========================================
    // ОДОБРЕНИЕ
    // ==========================================

    if (approved) {

        let subject =
            await Subject.findOne({

                where: {

                    name:
                        request.name,

                    groupId:
                        request.groupId

                }

            });


        if (!subject) {

            subject =
                await Subject.create({

                    name:
                        request.name,

                    groupId:
                        request.groupId

                });

        }


        await request.update({
            status:
                "APPROVED"
        });


        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Предмет добавлен"
            }
        );


        await bot.editMessageText(

            `✅ Запрос №${request.id} одобрен.\n\n` +

            `📚 Предмет «${subject.name}» добавлен в группу.`,

            {

                chat_id:
                    query.message.chat.id,

                message_id:
                    query.message.message_id

            }

        );


        const requester =
            await User.findByPk(
                request.creatorId
            );


        if (requester) {

            await bot.sendMessage(

                requester.telegramId,

                `🎉 Ваш запрос одобрен!\n\n` +

                `📚 Предмет «${subject.name}» добавлен в группу.`

            );

        }


        return;
    }


    // ==========================================
    // ОТКЛОНЕНИЕ
    // ==========================================

    await request.update({
        status:
            "REJECTED"
    });


    await bot.answerCallbackQuery(
        query.id,
        {
            text:
                "Запрос отклонён"
        }
    );


    await bot.editMessageText(

        `❌ Запрос №${request.id} отклонён.\n\n` +

        `📚 Предмет: ${request.name}`,

        {

            chat_id:
                query.message.chat.id,

            message_id:
                query.message.message_id

        }

    );


    const requester =
        await User.findByPk(
            request.creatorId
        );


    if (requester) {

        await bot.sendMessage(

            requester.telegramId,

            `❌ Ваш запрос на предмет ` +
            `«${request.name}» отклонён куратором.`

        );

    }

}


// ==========================================
// МЕНЮ УДАЛЕНИЯ ПРЕДМЕТА
// ==========================================

async function showDeleteSubjectMenu(
    bot,
    query
) {

    const telegramId =
        query.from.id;

    const groupId =
        getSelectedGroup(
            telegramId
        );

    const user =
        await User.findOne({
            where: {
                telegramId
            }
        });


    if (
        !groupId ||
        !user
    ) {

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


    const membership =
        await GroupMember.findOne({

            where: {

                userId:
                    user.id,

                groupId

            }

        });


    if (
        !membership ||
        membership.role !==
            "CURATOR"
    ) {

        await bot.answerCallbackQuery(
            query.id,
            {
                text:
                    "Удалять предметы может только куратор",
                show_alert:
                    true
            }
        );

        return;
    }


    const subjects =
        await Subject.findAll({

            where: {
                groupId
            },

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


    if (!subjects.length) {

        await bot.sendMessage(

            query.message.chat.id,

            "📚 В группе нет предметов для удаления."

        );

        return;
    }


    const keyboard =
        subjects.map(
            subject => [
                {
                    text:
                        `🗑 ${subject.name}`,

                    callback_data:
                        `delete_subject_${subject.id}`
                }
            ]
        );


    keyboard.push([

        {
            text:
                "❌ Отмена",

            callback_data:
                "cancel_subject_action"
        }

    ]);


    await bot.sendMessage(

        query.message.chat.id,

        "🗑 Выберите предмет для удаления:",

        {
            reply_markup: {
                inline_keyboard:
                    keyboard
            }
        }

    );
}


// ==========================================
// РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
// ==========================================

function registerSubjectHandlers(bot) {

    // ==========================================
    // CALLBACK_QUERY
    // ==========================================

    bot.on(
        "callback_query",
        async (query) => {

            const data =
                query.data || "";

            const telegramId =
                query.from.id;


            try {

                // ==========================================
                // ОТКРЫТИЕ ПРЕДМЕТОВ
                // ==========================================

                if (
                    data ===
                    "group_subjects"
                ) {

                    await showSubjects(

                        bot,

                        query.message.chat.id,

                        telegramId,

                        query.id

                    );

                    return;
                }


                // ==========================================
                // ВЫБОР ПРЕДМЕТА
                // ==========================================

                if (
                    /^subject_\d+$/.test(
                        data
                    )
                ) {

                    const subjectId =
                        Number(
                            data.replace(
                                "subject_",
                                ""
                            )
                        );


                    const subject =
                        await Subject.findByPk(
                            subjectId
                        );


                    if (!subject) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {
                                text:
                                    "Предмет не найден"
                            }

                        );

                        return;
                    }


                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                subject.name
                        }

                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        `📚 Предмет: ${subject.name}\n\n` +
                        "Здесь отображаются задачи по этому предмету."

                    );


                    return;
                }


                // ==========================================
                // ДОБАВЛЕНИЕ ПРЕДМЕТА
                // ==========================================

                if (
                    data ===
                    "add_subject"
                ) {

                    await startSubjectCreation(

                        bot,

                        query,

                        "DIRECT"

                    );

                    return;
                }


                // ==========================================
                // ПРЕДЛОЖЕНИЕ ПРЕДМЕТА
                // ==========================================

                if (
                    data ===
                    "suggest_subject"
                ) {

                    await startSubjectCreation(

                        bot,

                        query,

                        "REQUEST"

                    );

                    return;
                }


                // ==========================================
                // ЗАПРОСЫ НА ПРЕДМЕТЫ
                // ==========================================

                if (
                    data ===
                    "subject_requests"
                ) {

                    await showSubjectRequests(

                        bot,

                        query

                    );

                    return;
                }


                // ==========================================
                // ОДОБРЕНИЕ
                // ==========================================

                if (
                    data.startsWith(
                        "approve_subject_"
                    )
                ) {

                    await handleSubjectRequestDecision(

                        bot,

                        query,

                        true

                    );

                    return;
                }


                // ==========================================
                // ОТКЛОНЕНИЕ
                // ==========================================

                if (
                    data.startsWith(
                        "reject_subject_"
                    )
                ) {

                    await handleSubjectRequestDecision(

                        bot,

                        query,

                        false

                    );

                    return;
                }


                // ==========================================
                // МЕНЮ УДАЛЕНИЯ
                // ==========================================

                if (
                    data ===
                    "delete_subject_menu"
                ) {

                    await showDeleteSubjectMenu(

                        bot,

                        query

                    );

                    return;
                }


                // ==========================================
                // УДАЛЕНИЕ ПРЕДМЕТА
                // ==========================================

                if (
                    /^delete_subject_\d+$/.test(
                        data
                    )
                ) {

                    const subjectId =
                        Number(
                            data.replace(
                                "delete_subject_",
                                ""
                            )
                        );


                    const user =
                        await User.findOne({

                            where: {
                                telegramId
                            }

                        });


                    const subject =
                        await Subject.findByPk(
                            subjectId
                        );


                    if (
                        !user ||
                        !subject
                    ) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Предмет не найден",
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
                                    subject.groupId

                            }

                        });


                    if (
                        !membership ||
                        membership.role !==
                            "CURATOR"
                    ) {

                        await bot.answerCallbackQuery(

                            query.id,

                            {

                                text:
                                    "Удалять предмет может только куратор",
                                show_alert:
                                    true

                            }

                        );

                        return;
                    }


                    const subjectName =
                        subject.name;


                    await subject.destroy();


                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Предмет удалён"
                        }

                    );


                    await bot.sendMessage(

                        query.message.chat.id,

                        `✅ Предмет «${subjectName}» удалён.`

                    );


                    return;
                }


                // ==========================================
                // ОТМЕНА
                // ==========================================

                if (
                    data ===
                    "cancel_subject_action"
                ) {

                    clearSubjectState(
                        telegramId
                    );


                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Действие отменено"
                        }

                    );


                    await sendGroupMenu(

                        bot,

                        query.message.chat.id,

                        telegramId

                    );


                    return;
                }

            } catch (error) {

                console.error(
                    "❌ Ошибка обработки предмета:",
                    error
                );

                try {

                    await bot.answerCallbackQuery(

                        query.id,

                        {
                            text:
                                "Произошла ошибка",
                            show_alert:
                                true
                        }

                    );

                } catch (_) {}

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
                subjectCreationState.get(
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

                clearSubjectState(
                    telegramId
                );


                await sendGroupMenu(

                    bot,

                    msg.chat.id,

                    telegramId

                );


                return;
            }


            if (
                state.step !==
                "NAME"
            ) {

                return;

            }


            const subjectName =
                text.trim();


            if (
                subjectName.length <
                2
            ) {

                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Название предмета слишком короткое. Попробуйте ещё раз."

                );

                return;
            }


            try {

                const user =
                    await User.findOne({

                        where: {
                            telegramId
                        }

                    });


                if (!user) {

                    clearSubjectState(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

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
                                state.groupId

                        }

                    });


                if (!membership) {

                    clearSubjectState(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        "❌ Вы не состоите в выбранной группе."

                    );

                    return;
                }


                // ==========================================
                // ПРЯМОЕ ДОБАВЛЕНИЕ КУРАТОРОМ
                // ==========================================

                if (
                    state.type ===
                    "DIRECT"
                ) {

                    if (
                        membership.role !==
                        "CURATOR"
                    ) {

                        clearSubjectState(
                            telegramId
                        );


                        await bot.sendMessage(

                            msg.chat.id,

                            "❌ Только куратор может добавлять предмет напрямую."

                        );

                        return;
                    }


                    const existingSubject =
                        await Subject.findOne({

                            where: {

                                name:
                                    subjectName,

                                groupId:
                                    state.groupId

                            }

                        });


                    if (
                        existingSubject
                    ) {

                        await bot.sendMessage(

                            msg.chat.id,

                            "⚠️ Такой предмет уже существует в этой группе."

                        );

                        return;
                    }


                    const subject =
                        await Subject.create({

                            name:
                                subjectName,

                            groupId:
                                state.groupId

                        });


                    clearSubjectState(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        `✅ Предмет «${subject.name}» добавлен в группу.`,

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
                // ПРЕДЛОЖЕНИЕ УЧАСТНИКА
                // ==========================================

                if (
                    state.type ===
                    "REQUEST"
                ) {

                    if (
                        membership.role ===
                        "CURATOR"
                    ) {

                        clearSubjectState(
                            telegramId
                        );


                        await bot.sendMessage(

                            msg.chat.id,

                            "ℹ️ Куратор должен использовать прямое добавление предмета.",

                            {

                                reply_markup: {

                                    remove_keyboard:
                                        true

                                }

                            }

                        );


                        return;
                    }


                    const existingSubject =
                        await Subject.findOne({

                            where: {

                                name:
                                    subjectName,

                                groupId:
                                    state.groupId

                            }

                        });


                    if (
                        existingSubject
                    ) {

                        await bot.sendMessage(

                            msg.chat.id,

                            "⚠️ Такой предмет уже существует в этой группе."

                        );

                        return;
                    }


                    const existingRequest =
                        await SubjectRequest.findOne({

                            where: {

                                name:
                                    subjectName,

                                groupId:
                                    state.groupId,

                                creatorId:
                                    user.id,

                                status:
                                    "PENDING"

                            }

                        });


                    if (
                        existingRequest
                    ) {

                        clearSubjectState(
                            telegramId
                        );


                        await bot.sendMessage(

                            msg.chat.id,

                            "⚠️ Вы уже отправляли такой запрос. Дождитесь решения куратора.",

                            {

                                reply_markup: {

                                    remove_keyboard:
                                        true

                                }

                            }

                        );

                        return;
                    }


                    const request =
                        await SubjectRequest.create({

                            name:
                                subjectName,

                            groupId:
                                state.groupId,

                            creatorId:
                                user.id,

                            status:
                                "PENDING"

                        });


                    clearSubjectState(
                        telegramId
                    );


                    await bot.sendMessage(

                        msg.chat.id,

                        `📩 Запрос на добавление предмета «${request.name}» отправлен куратору.`,

                        {

                            reply_markup: {

                                remove_keyboard:
                                    true

                            }

                        }

                    );


                    return;
                }

            } catch (error) {

                console.error(
                    "❌ Ошибка обработки предмета:",
                    error
                );


                clearSubjectState(
                    telegramId
                );


                await bot.sendMessage(

                    msg.chat.id,

                    "❌ Не удалось обработать предмет. Попробуйте ещё раз.",

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
    registerSubjectHandlers;