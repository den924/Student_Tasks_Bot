const {
    User,
    Group,
    GroupMember,
    Subject,
    Task,
    TaskMember,
    TaskRequest
} = require("../models");

const taskCreationState = new Map();

function getSelectedGroup(telegramId) {
    if (!global.selectedGroups) {
        global.selectedGroups = new Map();
    }

    return global.selectedGroups.get(telegramId);
}

function clearTaskState(telegramId) {
    taskCreationState.delete(telegramId);
}

function registerTaskHandlers(bot) {

    // ==========================================
    // ВСЕ CALLBACK_QUERY ОБРАБОТЧИКИ
    // ==========================================

    bot.on("callback_query", async (query) => {

        const data = query.data;

        // ==========================================
        // СПИСОК ЗАДАЧ
        // ==========================================

        if (data === "group_tasks") {

            try {

                const telegramId = query.from.id;

                const groupId = getSelectedGroup(
                    telegramId
                );

                if (!groupId) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Сначала выберите группу",
                            show_alert: true
                        }
                    );

                    return;
                }

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

                const membership =
                    await GroupMember.findOne({
                        where: {
                            userId: user.id,
                            groupId: groupId
                        }
                    });

                if (!membership) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Вы не состоите в этой группе",
                            show_alert: true
                        }
                    );

                    return;
                }

                const group = await Group.findByPk(
                    groupId
                );

                if (!group) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Группа не найдена",
                            show_alert: true
                        }
                    );

                    return;
                }

                const taskMembers =
                    await TaskMember.findAll({
                        where: {
                            userId: user.id
                        },
                        include: [
                            {
                                model: Task,
                                as: "task",
                                where: {
                                    groupId: groupId
                                },
                                include: [
                                    {
                                        model: Subject,
                                        as: "subject"
                                    }
                                ]
                            }
                        ]
                    });

                await bot.answerCallbackQuery(
                    query.id
                );

                if (taskMembers.length === 0) {

                    await bot.sendMessage(
                        query.message.chat.id,
                        `📝 В группе «${group.name}» у вас пока нет задач.`
                    );

                    return;
                }

                taskMembers.sort((a, b) => {
                    return new Date(
                        a.task.deadline
                    ) - new Date(
                        b.task.deadline
                    );
                });

                let message =
                    `📝 Задачи группы «${group.name}»:\n\n`;

                const keyboard = [];

                for (const taskMember of taskMembers) {

                    const task = taskMember.task;

                    const status =
                        taskMember.completed
                            ? "✅ Выполнено"
                            : "⏳ Не выполнено";

                    message +=
                        `📝 ${task.title}\n` +
                        `📚 ${task.subject?.name || "Без предмета"}\n` +
                        `📅 ${formatDate(task.deadline)}\n` +
                        `${status}\n`;

                    if (task.description) {
                        message +=
                            `📄 ${task.description}\n`;
                    }

                    message += "\n";

                    keyboard.push([
                        {
                            text:
                                `${taskMember.completed ? "✅" : "⬜"} ${task.title}`,

                            callback_data:
                                `task_view_${task.id}`
                        }
                    ]);
                }

                await bot.sendMessage(
                    query.message.chat.id,
                    message,
                    {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Ошибка загрузки задач:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Ошибка загрузки задач",
                        show_alert: true
                    }
                );
            }

            return;
        }


        // ==========================================
        // ПРОСМОТР КОНКРЕТНОЙ ЗАДАЧИ
        // ==========================================

        if (data.startsWith("task_view_")) {

            try {

                const telegramId = query.from.id;

                const taskId = Number(
                    data.replace(
                        "task_view_",
                        ""
                    )
                );

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

                const taskMember =
                    await TaskMember.findOne({
                        where: {
                            userId: user.id,
                            taskId: taskId
                        },
                        include: [
                            {
                                model: Task,
                                as: "task",
                                include: [
                                    {
                                        model: Subject,
                                        as: "subject"
                                    },
                                    {
                                        model: Group,
                                        as: "group"
                                    }
                                ]
                            }
                        ]
                    });

                if (!taskMember) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Задача не найдена"
                        }
                    );

                    return;
                }

                const task = taskMember.task;

                await bot.answerCallbackQuery(
                    query.id
                );

                const message =
                    `📝 ${task.title}\n\n` +

                    `📚 Предмет: ` +
                    `${task.subject?.name || "Не указан"}\n` +

                    `🏫 Группа: ` +
                    `${task.group?.name || "Не указана"}\n` +

                    `📅 Дедлайн: ` +
                    `${formatDate(task.deadline)}\n\n` +

                    `📄 Описание:\n` +
                    `${task.description || "Без описания"}\n\n` +

                    `Статус: ` +
                    `${taskMember.completed
                        ? "✅ Выполнено"
                        : "⏳ Не выполнено"}`;

                const keyboard = [];

                if (taskMember.completed) {

                    keyboard.push([
                        {
                            text:
                                "↩️ Отметить как невыполненное",

                            callback_data:
                                `task_uncomplete_${task.id}`
                        }
                    ]);

                } else {

                    keyboard.push([
                        {
                            text:
                                "✅ Отметить как выполненное",

                            callback_data:
                                `task_complete_${task.id}`
                        }
                    ]);
                }

                await bot.sendMessage(
                    query.message.chat.id,
                    message,
                    {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Ошибка просмотра задачи:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Ошибка",
                        show_alert: true
                    }
                );
            }

            return;
        }


        // ==========================================
        // ОТМЕТИТЬ ЗАДАЧУ ВЫПОЛНЕННОЙ
        // ==========================================

        if (data.startsWith("task_complete_")) {

            try {

                const telegramId = query.from.id;

                const taskId = Number(
                    data.replace(
                        "task_complete_",
                        ""
                    )
                );

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

                const taskMember =
                    await TaskMember.findOne({
                        where: {
                            taskId: taskId,
                            userId: user.id
                        }
                    });

                if (!taskMember) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Задача не найдена"
                        }
                    );

                    return;
                }

                await taskMember.update({
                    completed: true,
                    completedAt: new Date()
                });

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "Задача отмечена как выполненная"
                    }
                );

                await bot.sendMessage(
                    query.message.chat.id,
                    "✅ Задача отмечена как выполненная."
                );

            } catch (error) {

                console.error(
                    "❌ Ошибка выполнения задачи:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Ошибка",
                        show_alert: true
                    }
                );
            }

            return;
        }


        // ==========================================
        // СНЯТЬ ОТМЕТКУ ВЫПОЛНЕНИЯ
        // ==========================================

        if (data.startsWith("task_uncomplete_")) {

            try {

                const telegramId = query.from.id;

                const taskId = Number(
                    data.replace(
                        "task_uncomplete_",
                        ""
                    )
                );

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

                const taskMember =
                    await TaskMember.findOne({
                        where: {
                            taskId: taskId,
                            userId: user.id
                        }
                    });

                if (!taskMember) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text: "Задача не найдена"
                        }
                    );

                    return;
                }

                await taskMember.update({
                    completed: false,
                    completedAt: null
                });

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "Отметка выполнения снята"
                    }
                );

                await bot.sendMessage(
                    query.message.chat.id,
                    "↩️ Задача снова отмечена как невыполненная."
                );

            } catch (error) {

                console.error(
                    "❌ Ошибка изменения статуса задачи:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text: "Ошибка",
                        show_alert: true
                    }
                );
            }

            return;
        }


        // ==========================================
        // ДОБАВИТЬ ЗАДАЧУ
        // ==========================================

        if (data === "add_task") {

            try {

                const telegramId = query.from.id;

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
                            show_alert: true
                        }
                    );

                    return;
                }

                const user = await User.findOne({
                    where: {
                        telegramId: telegramId
                    }
                });

                if (!user) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Пользователь не найден",
                            show_alert: true
                        }
                    );

                    return;
                }

                const membership =
                    await GroupMember.findOne({
                        where: {
                            userId: user.id,
                            groupId: groupId
                        }
                    });

                if (!membership) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Вы не состоите в этой группе",
                            show_alert: true
                        }
                    );

                    return;
                }

                taskCreationState.set(
                    telegramId,
                    {
                        groupId: groupId,
                        step: "SUBJECT"
                    }
                );

                await bot.answerCallbackQuery(
                    query.id
                );

                const subjects =
                    await Subject.findAll({
                        where: {
                            groupId: groupId
                        },
                        order: [
                            ["name", "ASC"]
                        ]
                    });

                if (subjects.length === 0) {

                    clearTaskState(
                        telegramId
                    );

                    await bot.sendMessage(
                        query.message.chat.id,

                        "📚 В выбранной группе пока нет предметов.\n\n" +
                        "Сначала необходимо добавить хотя бы один предмет."
                    );

                    return;
                }

                const keyboard =
                    subjects.map(
                        (subject) => [
                            {
                                text:
                                    `📚 ${subject.name}`,

                                callback_data:
                                    `task_subject_${subject.id}`
                            }
                        ]
                    );

                keyboard.push([
                    {
                        text: "❌ Отмена",
                        callback_data: "cancel_task"
                    }
                ]);

                await bot.sendMessage(
                    query.message.chat.id,

                    "📚 Выберите предмет для задачи:",

                    {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "❌ Ошибка начала создания задачи:",
                    error
                );

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "Произошла ошибка",
                        show_alert: true
                    }
                );
            }

            return;
        }


        // ==========================================
        // ВЫБОР ПРЕДМЕТА
        // ==========================================

        if (data.startsWith("task_subject_")) {

            try {

                const telegramId = query.from.id;

                const state =
                    taskCreationState.get(
                        telegramId
                    );

                if (!state) {

                    await bot.answerCallbackQuery(
                        query.id,
                        {
                            text:
                                "Сессия создания задачи истекла",
                            show_alert: true
                        }
                    );

                    return;
                }

                const subjectId = Number(
                    data.replace(
                        "task_subject_",
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

                state.subjectId =
                    subject.id;

                state.subjectName =
                    subject.name;

                state.step =
                    "TITLE";

                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            `Выбран предмет: ${subject.name}`
                    }
                );

                await bot.sendMessage(
                    query.message.chat.id,

                    "📝 Введите название задачи:",

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
                    "❌ Ошибка выбора предмета:",
                    error
                );
            }

            return;
        }


        // ==========================================
        // ОТМЕНА СОЗДАНИЯ ЗАДАЧИ
        // ==========================================

        if (data === "cancel_task") {

            const telegramId =
                query.from.id;

            clearTaskState(
                telegramId
            );

            await bot.answerCallbackQuery(
                query.id,
                {
                    text:
                        "Создание задачи отменено"
                }
            );

            await bot.sendMessage(
                query.message.chat.id,

                "❌ Создание задачи отменено.",

                {
                    reply_markup: {
                        remove_keyboard: true
                    }
                }
            );

            return;
        }
    });


    // ==========================================
    // ВВОД ДАННЫХ ЗАДАЧИ
    // ==========================================

    bot.on("message", async (msg) => {

        const telegramId =
            msg.from.id;

        const text =
            msg.text;

        if (!text) {
            return;
        }

        const state =
            taskCreationState.get(
                telegramId
            );

        if (!state) {
            return;
        }


        // ==========================================
        // ОТМЕНА
        // ==========================================

        if (text === "❌ Отмена") {

            clearTaskState(
                telegramId
            );

            await bot.sendMessage(
                msg.chat.id,

                "❌ Создание задачи отменено.",

                {
                    reply_markup: {
                        remove_keyboard: true
                    }
                }
            );

            return;
        }


        // ==========================================
        // НАЗВАНИЕ
        // ==========================================

        if (state.step === "TITLE") {

            if (text.length < 2) {

                await bot.sendMessage(
                    msg.chat.id,
                    "Название слишком короткое. Попробуйте ещё раз."
                );

                return;
            }

            state.title =
                text.trim();

            state.step =
                "DESCRIPTION";

            await bot.sendMessage(
                msg.chat.id,

                "📄 Введите описание задачи.\n\n" +
                "Если описание не требуется, напишите: Нет"
            );

            return;
        }


        // ==========================================
        // ОПИСАНИЕ
        // ==========================================

        if (state.step === "DESCRIPTION") {

            state.description =
                text.trim().toLowerCase() === "нет"
                    ? null
                    : text.trim();

            state.step =
                "DEADLINE";

            await bot.sendMessage(
                msg.chat.id,

                "📅 Введите дедлайн в формате:\n\n" +
                "ДД.ММ.ГГГГ ЧЧ:ММ\n\n" +
                "Например:\n" +
                "20.08.2026 18:00"
            );

            return;
        }


        // ==========================================
        // ДЕДЛАЙН
        // ==========================================

        if (state.step === "DEADLINE") {

            const deadline =
                parseDeadline(
                    text.trim()
                );

            if (!deadline) {

                await bot.sendMessage(
                    msg.chat.id,

                    "❌ Неверный формат даты.\n\n" +
                    "Используйте:\n" +
                    "ДД.ММ.ГГГГ ЧЧ:ММ\n\n" +
                    "Например:\n" +
                    "20.08.2026 18:00"
                );

                return;
            }

            if (deadline <= new Date()) {

                await bot.sendMessage(
                    msg.chat.id,

                    "❌ Дедлайн должен быть в будущем."
                );

                return;
            }

            state.deadline =
                deadline;

            state.step =
                "TARGET";

            await bot.sendMessage(
                msg.chat.id,

                "👥 Для кого создать задачу?",

                {
                    reply_markup: {
                        keyboard: [
                            ["👤 Только для себя"],
                            ["👥 Для всей группы"],
                            ["❌ Отмена"]
                        ],
                        resize_keyboard: true
                    }
                }
            );

            return;
        }


        // ==========================================
        // КОМУ НАЗНАЧИТЬ ЗАДАЧУ
        // ==========================================

        if (state.step === "TARGET") {

            if (
                text !== "👤 Только для себя" &&
                text !== "👥 Для всей группы"
            ) {

                await bot.sendMessage(
                    msg.chat.id,
                    "Выберите один из вариантов:"
                );

                return;
            }

            state.targetType =
                text === "👤 Только для себя"
                    ? "PERSONAL"
                    : "GROUP";

            await finishTaskCreation(
                bot,
                msg,
                telegramId,
                state
            );
        }
    });
}


// ==========================================
// СОЗДАНИЕ ЗАДАЧИ
// ==========================================

async function finishTaskCreation(
    bot,
    msg,
    telegramId,
    state
) {

    try {

        const user =
            await User.findOne({
                where: {
                    telegramId: telegramId
                }
            });

        if (!user) {

            clearTaskState(
                telegramId
            );

            await bot.sendMessage(
                msg.chat.id,
                "Пользователь не найден."
            );

            return;
        }

        const membership =
            await GroupMember.findOne({
                where: {
                    userId: user.id,
                    groupId: state.groupId
                }
            });

        if (!membership) {

            clearTaskState(
                telegramId
            );

            await bot.sendMessage(
                msg.chat.id,
                "Вы не состоите в выбранной группе."
            );

            return;
        }


        // ==========================================
        // ЛИЧНАЯ ЗАДАЧА
        // ==========================================

        if (state.targetType === "PERSONAL") {

            const task =
                await Task.create({

                    title:
                        state.title,

                    description:
                        state.description,

                    deadline:
                        state.deadline,

                    groupId:
                        state.groupId,

                    subjectId:
                        state.subjectId,

                    creatorId:
                        user.id,

                    targetType:
                        "PERSONAL"
                });

            await TaskMember.create({

                taskId:
                    task.id,

                userId:
                    user.id,

                completed:
                    false
            });

            clearTaskState(
                telegramId
            );

            await bot.sendMessage(

                msg.chat.id,

                `✅ Задача создана!\n\n` +

                `📝 ${task.title}\n` +

                `📚 ${state.subjectName}\n` +

                `📅 ${formatDate(task.deadline)}\n\n` +

                `👤 Задача создана только для вас.`,

                {
                    reply_markup: {
                        remove_keyboard: true
                    }
                }
            );

            console.log(
                `📝 Создана личная задача №${task.id}`
            );

            return;
        }


        // ==========================================
        // ЗАДАЧА ДЛЯ ВСЕЙ ГРУППЫ
        // ==========================================

        if (state.targetType === "GROUP") {


            // ==========================================
            // КУРАТОР
            // ==========================================

            if (membership.role === "CURATOR") {

                const task =
                    await Task.create({

                        title:
                            state.title,

                        description:
                            state.description,

                        deadline:
                            state.deadline,

                        groupId:
                            state.groupId,

                        subjectId:
                            state.subjectId,

                        creatorId:
                            user.id,

                        targetType:
                            "GROUP"
                    });

                const members =
                    await GroupMember.findAll({
                        where: {
                            groupId:
                                state.groupId
                        }
                    });

                for (
                    const member
                    of members
                ) {

                    await TaskMember.findOrCreate({

                        where: {
                            taskId:
                                task.id,

                            userId:
                                member.userId
                        },

                        defaults: {
                            completed:
                                false
                        }
                    });
                }

                clearTaskState(
                    telegramId
                );

                await bot.sendMessage(

                    msg.chat.id,

                    `✅ Задача добавлена для всей группы!\n\n` +

                    `📝 ${task.title}\n` +

                    `📚 ${state.subjectName}\n` +

                    `📅 ${formatDate(task.deadline)}\n\n` +

                    `👥 Участников: ${members.length}`,

                    {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    }
                );

                console.log(
                    `👥 Куратор создал групповую задачу №${task.id}`
                );

                return;
            }


            // ==========================================
            // MEMBER → ЗАПРОС КУРАТОРУ
            // ==========================================

            if (membership.role === "MEMBER") {

                const request =
                    await TaskRequest.create({

                        title:
                            state.title,

                        description:
                            state.description,

                        deadline:
                            state.deadline,

                        groupId:
                            state.groupId,

                        subjectId:
                            state.subjectId,

                        creatorId:
                            user.id,

                        status:
                            "PENDING"
                    });

                clearTaskState(
                    telegramId
                );

                await bot.sendMessage(

                    msg.chat.id,

                    `📩 Запрос на добавление задачи для всей группы отправлен куратору.\n\n` +

                    `📝 ${request.title}\n` +

                    `📚 ${state.subjectName}\n` +

                    `📅 ${formatDate(request.deadline)}`,

                    {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    }
                );

                console.log(
                    `📩 Создан запрос на групповую задачу №${request.id}`
                );

                return;
            }
        }

        clearTaskState(
            telegramId
        );

    } catch (error) {

        console.error(
            "❌ Ошибка создания задачи:",
            error
        );

        clearTaskState(
            telegramId
        );

        await bot.sendMessage(
            msg.chat.id,
            "❌ Не удалось создать задачу. Попробуйте ещё раз."
        );
    }
}


// ==========================================
// РАЗБОР ДАТЫ
// ==========================================

function parseDeadline(value) {

    const match =
        value.match(
            /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/
        );

    if (!match) {
        return null;
    }

    const day =
        Number(match[1]);

    const month =
        Number(match[2]);

    const year =
        Number(match[3]);

    const hour =
        Number(match[4]);

    const minute =
        Number(match[5]);

    if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    const date =
        new Date(
            year,
            month - 1,
            day,
            hour,
            minute
        );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute
    ) {
        return null;
    }

    return date;
}


// ==========================================
// ФОРМАТИРОВАНИЕ ДАТЫ
// ==========================================

function formatDate(date) {

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const year =
        date.getFullYear();

    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );

    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );

    return (
        `${day}.${month}.${year} ` +
        `${hours}:${minutes}`
    );
}


module.exports =
    registerTaskHandlers;